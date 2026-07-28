# app/tasks/video/finalize.py - marks processing complete and records final video metadata

from app.celery_app import celery_app
from app.tasks.celery_dependencies import get_db_session
from app.models.videos import Video
from app.core.config import get_settings
from app.utils.video_helpers import update_video_processing_status
import os
import logging


logger = logging.getLogger(__name__)
settings = get_settings()


# Stage 6: Finalization

@celery_app.task(bind=True, name="app.tasks.video_tasks.finalize_processing")
def finalize_processing(self, data: dict):
    """
    Final step: Update database and cleanup temporary files.
    - Mark video as 'completed'
    - Save manifest URL and available qualities
    - Clean up temporary files from /tmp
    - Clear celery_task_id (workflow complete)
    """
    logger.info("=" * 60)
    logger.info("Starting finalization")
    
    try:
        # Extract data from previous task
        video_id = data['video_id']
        master_url = data['master_url']
        total_files = data.get('total_files', 0)
        total_bytes = data.get('total_bytes', 0)
        
        # Get available qualities (from create_manifest, passed through)
        available_qualities = data.get('available_qualities', [])
        
        logger.info(f"Video ID: {video_id}")
        logger.info(f"Master URL: {master_url}")
        logger.info(f"Available qualities: {available_qualities}")

        with get_db_session() as db:
            update_video_processing_status(
                db, video_id, "finalizing")
        
        # Update database
        with get_db_session() as db:
            video = db.query(Video).filter(Video.id == video_id).first()
            
            if not video:
                raise ValueError(f"Video not found in database: {video_id}")
            
            logger.info(f"Updating database for video: {video.title}")
            
            # Update processing status and results
            video.processing_status = "completed"
            video.manifest_url = master_url
            video.available_qualities = available_qualities
            video.processing_error = None  # Clear any previous errors
            video.celery_task_id = None  # Workflow complete, clear task ID
            
            db.commit()
            logger.info("✓ Database updated successfully")
        
        # Clean up temporary files
        work_dir = os.path.join(settings.processing_temp_dir, video_id)
        
        if os.path.exists(work_dir):
            logger.info(f"Cleaning up temporary files: {work_dir}")
            
            try:
                import shutil
                shutil.rmtree(work_dir)
                logger.info(f"✓ Deleted temporary directory: {work_dir}")
            except Exception as e:
                logger.warning(f"Failed to delete temp directory (non-critical): {str(e)}")
                # Don't fail the task if cleanup fails - video is already processed
        else:
            logger.info("No temporary files to clean up")
        
        logger.info("=" * 60)
        logger.info(" ✓ VIDEO PROCESSING COMPLETE!")
        logger.info(f"Video ID: {video_id}")
        logger.info(f"Total files uploaded: {total_files}")
        logger.info(f"Total size: {total_bytes / (1024*1024):.2f} MB")
        logger.info(f"Available qualities: {', '.join(available_qualities)}")
        logger.info(f"Manifest URL: {master_url}")
        logger.info("=" * 60)


        with get_db_session() as db:
            update_video_processing_status(
                db, video_id, "completed")
        
        return {
            'video_id': video_id,
            'status': 'completed',
            'manifest_url': master_url,
            'available_qualities': available_qualities,
            'total_files': total_files,
            'total_bytes': total_bytes,
            'message': 'Video processing completed successfully!'
        }
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(" FINALIZATION FAILED")
        logger.error(f"Error: {str(e)}")
        logger.error("=" * 60)
        
        # Try to mark video as failed in database
        try:
            with get_db_session() as db:
                video = db.query(Video).filter(Video.id == video_id).first()
                if video:
                    video.processing_status = "failed"
                    video.processing_error = f"Finalization failed: {str(e)}"
                    db.commit()
                    logger.info("Marked video as failed in database")
        except Exception as db_error:
            logger.error(f"Failed to update database with error status: {str(db_error)}")
        
        with get_db_session() as db:
            update_video_processing_status(
                db, video_id, "failed",f"{str(e)}")
        raise
