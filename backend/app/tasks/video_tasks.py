from app.celery_app import celery_app
import time
import logging


logger = logging.getLogger(__name__)

@celery_app.task
def test_task(name: str):
    """Simple test task to verify Celery is working"""
    time.sleep(10)  # Sleep for 10 seconds
    return f"Hello, {name}! Celery is working!"



@celery_app.task(bind=True, max_requests=3)
# STAGE 1: Prepration 
def prepare_video(self, video_id:str):
    """
    - validate video exists in DB
    - Download raw video from MINIO
    - Extract metadata (duration , resolution)
    - Return: video_id, file_path, metaadata
    """

    try:
        pass
    except Exception as exc:
        pass



# STAGE 2: Transcoding 

@celery_app.task(bind=True, max_retries=2)
def transcode_quality(self, data:dict, quality:str):
    """
    Transcode video to specific quality
    - Input: data from prepare_video, quality (1080p/720p/480p/360p)
    - Process: Use FFmpeg to transcode
    - Track progress with self.update_state()
    - Return: video_id, quality, output_file_path
    """
    try:
        # Your code here
        pass
    except Exception as exc:
        # Retry logic
        pass



# Stage 2.5: Collect Transcoding Results (Chord Callback)

@celery_app.task(bind=True)
def on_transcode_complete(self, results: list):
    """
    Called after all parallel transcoding tasks finish
    - Input: list of results from all transcode_quality tasks
    - Combine results into single dict
    - Return: video_id, transcoded_files dict
    """
    try:
        # Your code here
        pass
    except Exception as exc:
        # Handle error
        pass





# Stage 3: Segmentation

@celery_app.task(bind=True, max_retries=2)
def segment_videos(self, data: dict):
    """
    Create HLS segments for all qualities
    - Input: transcoded_files from on_transcode_complete
    - Process: Use FFmpeg to create .ts segments
    - Return: video_id, segmented_files dict
    """
    try:
        # Your code here
        pass
    except Exception as exc:
        # Retry logic
        pass



# Stage 4: Manifest Creation

@celery_app.task(bind=True, max_retries=2)
def create_manifest(self, data: dict):
    """
    Create HLS manifest files (.m3u8)
    - Master playlist (lists all qualities)
    - Media playlists (lists segments for each quality)
    - Return: video_id, manifest_paths
    """
    try:
        # Your code here
        pass
    except Exception as exc:
        # Retry logic
        pass


# Stage 5: Upload to MinIO

@celery_app.task(bind=True, max_retries=3)
def upload_to_minio(self, data: dict):
    """
    Upload all processed files to MinIO
    - Segments (.ts files)
    - Manifests (.m3u8 files)
    - Track upload progress
    - Return: video_id, uploaded_urls
    """
    try:
        # Your code here
        pass
    except Exception as exc:
        # Retry logic
        pass


# Stage 6: Finalization

@celery_app.task(bind=True)
def finalize_processing(self, data: dict):
    """
    Update database with final status
    - Mark video as 'completed'
    - Save manifest URL
    - Save available qualities
    - Clean up temporary files
    - Return: final result
    """
    try:
        # Your code here
        pass
    except Exception as exc:
        # Handle error, mark as failed
        pass