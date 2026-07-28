# app/tasks/video/upload.py - uploads segmented HLS output and manifests to MinIO

from app.celery_app import celery_app
from app.tasks.celery_dependencies import get_db_session, get_minio_client
from app.core.config import get_settings
from app.utils.video_helpers import update_video_processing_status, ProcessingStatus
import os
import logging


logger = logging.getLogger(__name__)
settings = get_settings()


# Stage 5: Upload to MinIO

@celery_app.task(bind=True, max_retries=3, name="app.tasks.video_tasks.upload_to_minio")
def upload_to_minio(self, data: dict):
    """
    Upload all HLS segments and playlists to MinIO for permanent storage.
    Uploads: master.m3u8, quality playlists, and all .ts segments.
    """
    logger.info("=" * 60)
    logger.info("Starting upload to MinIO")
    
    try:
        # Extract data from previous task
        video_id = data['video_id']
        master_playlist_path = data['master_playlist_path']
        segments_dir = data['segments_dir']
        available_qualities = data['available_qualities']
        
        logger.info(f"Video ID: {video_id}")
        logger.info(f"Segments directory: {segments_dir}")
        logger.info(f"Qualities to upload: {len(available_qualities)}")

        with get_db_session() as db:
            update_video_processing_status(
                db, video_id, ProcessingStatus.uploading_to_storage)
        
        # Validate segments directory exists
        if not os.path.exists(segments_dir):
            raise ValueError(f"Segments directory not found: {segments_dir}")
        
        # Get MinIO client
        minio_client = get_minio_client()
        
        # MinIO bucket and base path for this video
        bucket_name = settings.minio_bucket_processed_videos
        base_path = f"{video_id}/segments"
        
        uploaded_files = []
        total_bytes = 0
        
        # Upload master playlist
        logger.info("Uploading master playlist...")
        master_minio_path = f"{base_path}/master.m3u8"
        
        try:
            file_size = os.path.getsize(master_playlist_path)
            minio_client.upload_file(
                bucket_name=bucket_name,
                object_name=master_minio_path,
                file_path=master_playlist_path
            )
            total_bytes += file_size
            uploaded_files.append(master_minio_path)
            logger.info(f"✓ Uploaded master.m3u8")
        except Exception as e:
            logger.error(f"Failed to upload master playlist: {str(e)}")
            raise
        
        # Upload each quality's files
        for quality in available_qualities:
            logger.info(f"[{quality}] Starting upload...")
            
            # Reconstruct quality directory path
            quality_dir = os.path.join(segments_dir, quality)
            
            # Validate quality directory exists
            if not os.path.exists(quality_dir):
                logger.warning(f"[{quality}] Directory not found: {quality_dir}, skipping")
                continue
            
            # Get all files in quality directory
            quality_files = os.listdir(quality_dir)
            
            # Filter for playlist and segments
            playlist_file = [f for f in quality_files if f == 'playlist.m3u8']
            segment_files = [f for f in quality_files if f.endswith('.ts')]
            
            files_to_upload = playlist_file + sorted(segment_files)
            uploaded_count = 0
            quality_bytes = 0
            
            # Upload each file
            for filename in files_to_upload:
                local_path = os.path.join(quality_dir, filename)
                minio_path = f"{base_path}/{quality}/{filename}"
                
                try:
                    file_size = os.path.getsize(local_path)
                    minio_client.upload_file(
                        bucket_name=bucket_name,
                        object_name=minio_path,
                        file_path=local_path
                    )
                    uploaded_count += 1
                    quality_bytes += file_size
                    total_bytes += file_size
                    uploaded_files.append(minio_path)
                    
                    # Log progress every 10 files
                    if uploaded_count % 10 == 0:
                        logger.info(f"[{quality}] Uploaded {uploaded_count}/{len(files_to_upload)} files...")
                        
                except Exception as e:
                    logger.error(f"[{quality}] Failed to upload {filename}: {str(e)}")
                    # Retry entire task if upload fails
                    if self.request.retries < self.max_retries:
                        raise self.retry(exc=e, countdown=60)
                    else:
                        raise
            
            logger.info(f"[{quality}] ✓ Upload complete: {uploaded_count} files ({quality_bytes / (1024*1024):.2f} MB)")
        
        # Generate master playlist URL
        master_url = f"/{bucket_name}/{base_path}/master.m3u8"
        
        logger.info(f"✓ Upload complete!")
        logger.info(f"Total files uploaded: {len(uploaded_files)}")
        logger.info(f"Total size: {total_bytes / (1024*1024):.2f} MB")
        logger.info(f"Master playlist URL: {master_url}")
        logger.info("=" * 60)
        
        return {
            'video_id': video_id,
            'master_url': master_url,
            'bucket_name': bucket_name,
            'base_path': base_path,
            'total_files': len(uploaded_files),
            'total_bytes': total_bytes,
            'available_qualities': available_qualities
        }
        
    except Exception as e:
        logger.error(f"MinIO upload failed: {str(e)}")
        
        # Retry if not final attempt
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying upload (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)
        else:
            with get_db_session() as db:
                update_video_processing_status(
                db, video_id, "failed",f"{str(e)}")
            raise
