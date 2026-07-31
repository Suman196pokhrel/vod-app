# Builds the Celery chain/chord workflow that orchestrates the full video-processing pipeline
from celery import chain, chord, group
from app.celery_app import celery_app
from app.tasks.celery_dependencies import get_db_session, get_redis_client
from app.models.videos import Video
from app.tasks.video import (
    prepare_video,
    generate_storyboard,
    transcode_quality,
    on_transcode_complete,
    segment_videos,
    create_manifest,
    upload_to_minio,
    finalize_processing
)


def create_video_processing_workflow(video_id: str):
    """
    Main workflow that orchestrates all video processing tasks

    Flow:
    1. Prepare video (sequential)
    1.5. Generate scrubbing-preview storyboard (sequential, best-effort)
    2. Transcode all qualities (parallel) → Collect results
    3. Segment videos (sequential)
    4. Create manifest (sequential)
    5. Upload to MinIO (sequential)
    6. Finalize (sequential)

    """

    workflow = chain(

        prepare_video.s(video_id),
        generate_storyboard.s(),
        chord(
            group(
                # transcode_quality.s("2160p"),  # 4K available for for development purpose its commented as testing would take a lot of time.
                transcode_quality.s("1440p"),  # 2K
                transcode_quality.s("1080p"),
                transcode_quality.s("720p"),
                transcode_quality.s("480p"),
                transcode_quality.s("360p"),
                transcode_quality.s("240p"),
                transcode_quality.s("144p"),
            ),
            on_transcode_complete.s()
        ),
        segment_videos.s(),
        create_manifest.s(),
        upload_to_minio.s(),
        finalize_processing.s()

    )

    return workflow


# Only one video's pipeline runs at a time (see try_advance_queue below). This
# lock is what enforces that: whoever holds it is the current processor.
# TTL is a dead-man's switch, not the normal release path - normal release
# happens via advance_processing_queue when a pipeline ends. The TTL only
# matters if a worker dies mid-task (OOM, or a redeploy killing the container
# mid-pipeline) and nothing runs to release it; 6 hours is far beyond any
# realistic single video's processing time, so it can't fire during normal
# operation, but it stops a crash from queueing videos forever.
PROCESSING_LOCK_KEY = "video_processing:active_lock"
PROCESSING_LOCK_TTL_SECONDS = 6 * 60 * 60


def _try_acquire_processing_lock() -> bool:
    return bool(get_redis_client().set(PROCESSING_LOCK_KEY, "1", nx=True, ex=PROCESSING_LOCK_TTL_SECONDS))


def _release_processing_lock():
    get_redis_client().delete(PROCESSING_LOCK_KEY)


def _get_next_queued_video_id(db) -> str | None:
    video = (
        db.query(Video)
        .filter(Video.processing_status == "queued")
        .order_by(Video.created_at.asc())
        .first()
    )
    return video.id if video else None


def try_advance_queue():
    """
    Start the oldest queued video's pipeline, but only if no other video is
    currently processing. Safe to call any number of times from anywhere
    (on upload, and when a pipeline finishes) - it's a no-op unless it can
    both acquire the lock and find something queued.
    """
    if not _try_acquire_processing_lock():
        return  # something else is already processing

    with get_db_session() as db:
        next_video_id = _get_next_queued_video_id(db)

    if next_video_id:
        start_video_processing(next_video_id)
    else:
        _release_processing_lock()  # nothing to do right now


@celery_app.task(name="app.tasks.video_tasks.advance_processing_queue")
def advance_processing_queue():
    """
    Chain link/link_error callback - runs once a video's pipeline ends,
    whether it succeeded or failed, and hands the processing slot to the
    next queued video, if any.
    """
    _release_processing_lock()
    try_advance_queue()


def start_video_processing(video_id: str):
    """
    Helper function to start the workflow
    Returns the AsyncResult object for tracking
    """

    workflow = create_video_processing_workflow(video_id)
    result = workflow.apply_async(
        link=advance_processing_queue.si(),
        link_error=advance_processing_queue.si(),
    )

    with get_db_session() as db:
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.celery_task_id = result.id

    return result
