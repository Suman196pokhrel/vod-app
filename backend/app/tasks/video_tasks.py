from app.celery_app import celery_app
from .dependencies import get_db_session, get_minio_client
from app.models.videos import Video
from app.core.config import get_settings
from app.services.ffmpeg_service import extract_metadata
import os
import time
import logging


logger = logging.getLogger(__name__)
settings = get_settings()


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

    logger.info(f"Starting prepare_video for video_id: {video_id}")

    with get_db_session() as db:
        video = db.query(Video).filter(Video.id == video_id).first()

        if not video:
            raise ValueError(f"Video not found : {video_id}")
        
        if video.processing_status != "uploaded":
            raise ValueError(f"Video not ready for processing. Current status : {video.processing_status}")

        # update status to proessing so that no other worker picks this up
        video.processing_status = "processing"
        db.commit()


        # store what we need (we get this value here because we cannot use ORM object outside the session)
        raw_video_path = video.raw_video_path

    logger.info(f"Video validated. MinIo path: {raw_video_path}")
    
    # create a working dir for this video
    work_dir_path = os.path.join(settings.processing_temp_dir , video_id)
    os.makedirs(work_dir_path)

    # Create subdirectories 
    transcoded_dir = os.path.join(work_dir_path, "transcoded")
    segments_dir = os.path.join(work_dir_path, "segments")
    manifests_dir = os.path.join(work_dir_path,"manifests")


    os.makedirs(transcoded_dir, exist_ok=True)
    os.makedirs(segments_dir, exist_ok=True)
    os.makedirs(manifests_dir, exist_ok=True)


    # Local path where raw video will be stored
    # get the original extension of the video
    original_extension = os.path.splitext(raw_video_path)[1]
    # minio_video_name = str(raw_video_path).split("/")[1]
    local_video_path = os.path.join(work_dir_path,f"raw{original_extension}")

    logger.info(f"Downloading video from minio to : {local_video_path}")

        
    try:
        minio_client = get_minio_client()
        bytes_downloaded = minio_client.download_video_to_file(raw_video_path, local_video_path)
        logger.info(f"Download complete: {bytes_downloaded / (1024*1024):.2f} MB")
    except Exception as e:
        logger.error(f"Download failed for {raw_video_path}: {str(e)}")

        # Check: Are we out of retries?
        if self.request.retries >= self.max_retries:
            # Final failure - update DB
            with get_db_session() as db:
                video = db.query(Video).filter(Video.id == video_id).first()
                video.processing_status = "failed"
                video.processing_error = f"Download failed after {self.max_retries} retries: {str(e)}"
                db.commit()
            raise  # Let Celery know it's a final failure
        
        # Not final - retry
        raise self.retry(exc=e, countdown=60)  # Retry in 60 seconds


    try:
        metadata = extract_metadata(local_video_path)
        logger.info(f"Metadata extracted: {metadata.width}x{metadata.height},  {metadata.duration_seconds:2f}s")

    except Exception as e:
        logger.error(f"Metadata extraction failed for {video_id}: {str(e)}")


        # No retry for metadata extraction if file is corrupt , retrying wont help
        with get_db_session() as db:
            video = db.query(Video).filter(Video.id == video_id).first()
            video.processing_status = "failed"
            video.processing_error=f"Metadata extraction failed : {str(e)}"
            raise


    # Update DB with metadata 
    with get_db_session() as db:
        video = db.query(Video).filter(Video.id == video_id).first()
        video.processing_metadata = metadata.to_dict()
        db.commit()

    logger.info(f"prepare_video complete for {video_id}")

    return {
        "video_id": video_id,
        "local_path":local_video_path,
        "work_dir":work_dir_path,
        "transcoded_dir": transcoded_dir,  
        "segments_dir": segments_dir,      
        "manifests_dir": manifests_dir,    
        "metadata":metadata.to_dict()
    }






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