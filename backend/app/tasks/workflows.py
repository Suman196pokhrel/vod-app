from celery import chain, chord, group
from app.tasks.video_tasks import (
    prepare_video,
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
    2. Transcode all qualities (parallel) → Collect results
    3. Segment videos (sequential)
    4. Create manifest (sequential)
    5. Upload to MinIO (sequential)
    6. Finalize (sequential)
    
    """

    workflow = chain(

        prepare_video.s(video_id),
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


def start_video_processing(video_id:str):
    """
    Helper function to start the workflow
    Returns the AsyncResult object for tracking
    """

    workflow = create_video_processing_workflow(video_id)
    result = workflow.apply_async()
    return result