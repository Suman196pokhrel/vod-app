# app/tasks/processing_queue.py - runs one video's processing pipeline at a time, oldest upload first
"""
How the queue works (full write-up:
docs-site/content/docs/pipeline/processing-queue.mdx):

1. Uploading only creates the Video row with processing_status="queued" and
   calls start_next_video_if_idle(). It never blocks the upload.
2. start_next_video_if_idle() takes a Redis lock whose value is the id of the
   video it starts. While that lock exists, every other call is a no-op.
3. The pipeline hands the lock back itself, however it ends:
   - success: on_pipeline_success, appended as the chain's LAST STEP
   - failure: on_pipeline_failed, attached as the chain's link_error, which
     also marks the video "failed" with the real exception
   Both release the lock and call start_next_video_if_idle() again.
4. When the worker starts, recover_after_worker_restart() cleans up whatever
   a crashed or redeployed worker left behind, then starts the queue again.

Never pass `link=` to the pipeline's apply_async(). Celery attaches it to the
transcode chord, the chord forwards it to its group of 7 transcode tasks, and
group.apply_async() raises "Cannot add link to group: use a chord" - every
pipeline then dies silently right after generate_storyboard. That is exactly
why success is a chain step here instead of a link callback.
"""

from celery import signals
from app.celery_app import celery_app
from app.core.database import engine
from app.models.videos import Video
from app.tasks.celery_dependencies import get_db_session, get_redis_client
from app.tasks.workflows import create_video_processing_workflow
import logging


logger = logging.getLogger(__name__)


# Holds the id of the video currently processing. The TTL is a dead-man's
# switch, not the normal release path: it only matters if nothing runs to
# release the lock (e.g. the worker dies mid-pipeline). 6 hours is far beyond
# any realistic single video's processing time, so it can't fire during
# normal operation.
PROCESSING_LOCK_KEY = "video_processing:active_lock"
PROCESSING_LOCK_TTL_SECONDS = 6 * 60 * 60

# Every status a video passes through while its pipeline is actually running
# (see ProcessingStatus in app/utils/video_helpers.py). A video still in one
# of these when the worker starts was interrupted mid-pipeline.
IN_PROGRESS_STATUSES = (
    "preparing",
    "generating_storyboard",
    "transcoding",
    "aggregating",
    "segmenting",
    "creating_manifest",
    "uploading_to_storage",
    "finalizing",
)

# Deletes the lock only if it still holds this video's id, so a late or
# duplicate callback from one video can never free the slot of the video
# that started after it. Done in Lua so the check and the delete are atomic.
_RELEASE_IF_OWNER = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
"""


def _release_lock(video_id: str):
    get_redis_client().eval(_RELEASE_IF_OWNER, 1, PROCESSING_LOCK_KEY, video_id)


def _get_oldest_queued_video_id() -> str | None:
    with get_db_session() as db:
        video = (
            db.query(Video)
            .filter(Video.processing_status == "queued")
            .order_by(Video.created_at.asc())
            .first()
        )
        return video.id if video else None


def start_next_video_if_idle() -> str | None:
    """
    Start the oldest queued video's pipeline, but only if no other video is
    currently processing. Safe to call any number of times from anywhere
    (after an upload, when a pipeline ends) - it's a no-op unless it finds a
    queued video AND wins the lock. Returns the started video's id, or None.
    """
    video_id = _get_oldest_queued_video_id()
    if video_id is None:
        return None

    # SET NX: only succeeds if no lock exists, i.e. nothing is processing.
    # Two callers racing for the same video can't both start it - only one
    # of them gets the lock.
    if not get_redis_client().set(PROCESSING_LOCK_KEY, video_id, nx=True, ex=PROCESSING_LOCK_TTL_SECONDS):
        return None

    try:
        pipeline = create_video_processing_workflow(video_id) | on_pipeline_success.si(video_id)
        result = pipeline.apply_async(link_error=on_pipeline_failed.s(video_id))
    except Exception:
        # Nothing was dispatched, so nothing would ever release the lock -
        # give it back now instead of wedging the queue for 6 hours.
        _release_lock(video_id)
        raise

    with get_db_session() as db:
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.celery_task_id = result.id

    logger.info(f"[queue] Started processing pipeline for video_id: {video_id}")
    return video_id


@celery_app.task(name="app.tasks.video_tasks.on_pipeline_success")
def on_pipeline_success(video_id: str):
    """
    Last step of every pipeline chain, runs after finalize_processing
    succeeds: hands the processing slot to the next queued video.
    """
    logger.info(f"[queue] Pipeline finished for video_id: {video_id}")
    _release_lock(video_id)
    start_next_video_if_idle()


@celery_app.task(name="app.tasks.video_tasks.on_pipeline_failed")
def on_pipeline_failed(request, exc, traceback, video_id: str):
    """
    link_error of every pipeline chain, runs when any step raises - including
    errors Celery hits *between* steps, which no task's own try/except can
    catch. Marks the video failed, then hands the processing slot to the next
    queued video, so one bad upload never jams everything queued behind it.

    Because this task's signature starts with (request, exc, traceback),
    Celery calls it directly inside the failing worker process with the real
    exception, instead of as a separate task that only gets a task id.
    video_id is the partial argument bound by on_pipeline_failed.s(video_id).
    """
    logger.error(f"[queue] Pipeline failed for video_id: {video_id} in {request.task}: {exc!r}")

    try:
        with get_db_session() as db:
            video = db.query(Video).filter(Video.id == video_id).first()
            # Never overwrite a video that already finished - e.g. if only the
            # on_pipeline_success step itself failed.
            if video and video.processing_status != "completed":
                stage = video.processing_status
                video.processing_status = "failed"
                # Keep a more specific message a task already wrote
                # (segment_videos, create_manifest, ... set their own).
                if not video.processing_error:
                    video.processing_error = (
                        f"Pipeline stopped during '{stage}' ({request.task}): {exc!r}"
                    )[:1000]
    finally:
        _release_lock(video_id)
        start_next_video_if_idle()


@signals.worker_init.connect
def recover_after_worker_restart(**kwargs):
    """
    Runs once when the Celery worker starts - after task modules are imported,
    before it consumes a single message.

    Assumes exactly ONE worker container (production and local both run one).
    With a single worker, nothing can be processing at the moment it starts,
    so anything that still looks in-flight was interrupted by a crash, an OOM
    kill or a redeploy. Without this, an interrupted video stayed at its last
    in-progress status forever, and the queue behind it didn't move again
    until the lock's 6h TTL expired AND someone uploaded another video.

    If the worker is ever scaled to more than one container, remove this:
    a second worker starting up would fail and purge the first one's
    in-flight pipeline.
    """
    try:
        # 1. Drop leftover messages of the interrupted pipeline (e.g. transcode
        #    tasks that were queued but never ran). Run on their own they can
        #    never finish the chord, and would only flip the video's status
        #    back to "transcoding" after step 3 marks it failed.
        purged = celery_app.control.purge()

        # 2. Nothing is processing, so any lock is a leftover.
        get_redis_client().delete(PROCESSING_LOCK_KEY)

        # 3. Mark interrupted videos failed, with a message saying so.
        with get_db_session() as db:
            interrupted = (
                db.query(Video)
                .filter(Video.processing_status.in_(IN_PROGRESS_STATUSES))
                .all()
            )
            for video in interrupted:
                video.processing_error = (
                    f"Processing was interrupted during '{video.processing_status}' "
                    f"by a worker restart. Set the video back to 'queued' to retry."
                )
                video.processing_status = "failed"
            interrupted_ids = [video.id for video in interrupted]

        logger.info(
            f"[queue] Worker startup recovery: purged {purged} message(s), "
            f"marked {len(interrupted_ids)} interrupted video(s) failed: {interrupted_ids}"
        )

        # 4. Start the oldest queued video, if any.
        start_next_video_if_idle()

    except Exception as e:
        # Never stop the worker from starting - worst case we're back to
        # the old behaviour, with the 6h lock TTL as the safety net.
        logger.error(f"[queue] Worker startup recovery failed: {str(e)}")

    finally:
        # This runs in the parent process, before the pool forks its child
        # processes. Close every pooled Postgres connection opened here, so
        # forked children never share (and corrupt) the parent's sockets.
        engine.dispose()
