# app/tasks/processing_queue.py - runs one video's processing pipeline at a time, oldest upload first
"""
How the queue works (full write-up: docs/06_VIDEO_PROCESSING_PIPELINE.md,
"Multiple Videos: One Pipeline at a Time"):

1. Uploading only creates the Video row with processing_status="queued" and
   calls start_next_video_if_idle(). It never blocks the upload.
2. start_next_video_if_idle() takes a Redis lock whose value is the id of the
   video it starts. While that lock exists, every other call is a no-op.
3. The pipeline hands the lock back itself, however it ends:
   - success: on_pipeline_success, appended as the chain's LAST STEP
   - failure: on_pipeline_failed, attached as the chain's link_error
   Both release the lock and call start_next_video_if_idle() again.

Never pass `link=` to the pipeline's apply_async(). Celery attaches it to the
transcode chord, the chord forwards it to its group of 7 transcode tasks, and
group.apply_async() raises "Cannot add link to group: use a chord" - every
pipeline then dies silently right after generate_storyboard. That is exactly
why success is a chain step here instead of a link callback.
"""

from app.celery_app import celery_app
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
        result = pipeline.apply_async(link_error=on_pipeline_failed.si(video_id))
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
def on_pipeline_failed(video_id: str):
    """
    link_error of every pipeline chain, runs when any step raises: hands the
    processing slot to the next queued video, so one bad upload never jams
    everything queued behind it.
    """
    logger.warning(f"[queue] Pipeline failed for video_id: {video_id}")
    _release_lock(video_id)
    start_next_video_if_idle()
