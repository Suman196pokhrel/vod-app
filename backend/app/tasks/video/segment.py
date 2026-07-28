# app/tasks/video/segment.py - splits transcoded output into HLS segments per quality

from app.celery_app import celery_app
from app.tasks.celery_dependencies import get_db_session
from app.core.config import get_settings
from app.utils.video_helpers import update_video_processing_status
import os
import logging
import subprocess


logger = logging.getLogger(__name__)
settings = get_settings()


# Stage 3: Segmentation

@celery_app.task(bind=True, max_retries=2, name="app.tasks.video_tasks.segment_videos")
def segment_videos(self, data: dict):
    """
    Create HLS segments for all qualities
    - Input: transcoded_files from on_transcode_complete
    - Process: Use FFmpeg to create .ts segments
    - Return: video_id, segmented_files dict
    """
    logger.info("=" * 60)
    logger.info("Starting HLS segmentation for all qualities")



    try:
        # Extract data from previous task
        video_id = data["video_id"]
        transcoded_files = data['transcoded_files']
        # From prepare_video_task
        segments_dir = os.path.join(settings.processing_temp_dir, video_id, "segments")
        
        logger.info(f"Video ID: {video_id}")
        logger.info(f"Qualities to segment: {len(transcoded_files)}")

        with get_db_session() as db:
            update_video_processing_status(
                db, video_id, "segmenting"
            )
        
        
        # basic validation
        if not segments_dir or not os.path.exists(segments_dir):
            raise ValueError(f"Segments directory not fonnd: {segments_dir}")
        
        segmented_files = {}

        for quality, file_info in transcoded_files.items():
            logger.info(f"[{quality}] Starting segmentation")

            input_path = file_info["path"]

            # validate input file exists
            if not os.path.exists(input_path):
                logger.error(f"[{quality}] Input file not found: {input_path}")
                continue


            # Create quality-specific directory
            quality_dir = os.path.join(segments_dir,quality)
            os.makedirs(quality_dir, exist_ok=True)

            # Paths for HLS output
            playlist_path = os.path.join(quality_dir,"playlist.m3u8")
            segment_pattern = os.path.join(quality_dir, "segment_%4d.ts")

            # Build FFMPEG  command for HLS segmentaion
            cmd = [
                'ffmpeg',
                '-i', input_path,
                '-c', 'copy',                    # Copy codec (no re-encoding)
                '-f', 'hls',                     # Output format: HLS
                '-hls_time', '6',                # 6 seconds per segment (Apple recommendation)
                '-hls_list_size', '0',           # Include all segments in playlist
                '-hls_segment_filename', segment_pattern,
                '-y',                            # Overwrite if exists
                playlist_path
            ]
            logger.info(f"[{quality}] FFmpeg command: {' '.join(cmd)}")


            try:
                # Run ffmpeg
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    check=True
                )

                # Verify playlist was created

                if not os.path.exists(playlist_path):
                    raise FileNotFoundError(f"Playlist not created: {playlist_path}")

                # Count segments created
                segment_files = [f for f in os.listdir(quality_dir) if f.endswith('.ts')]
                segment_count = len(segment_files)

                logger.info(f"[{quality}] ✓ Segmentation complete")
                logger.info(f"[{quality}] Created {segment_count} segments")
                logger.info(f"[{quality}] Playlist: {playlist_path}")
                
                # Store segmentation info
                segmented_files[quality] = {
                    'playlist_path': playlist_path,
                    'segment_dir': quality_dir,
                    'segment_count': segment_count
                }


            except subprocess.CalledProcessError as e:
                logger.error(f"[{quality}] FFmpeg segmentation failed")
                logger.error(f"[{quality}] Error: {e.stderr[-500:] if e.stderr else 'No error output'}")


                # Retry logic
                if self.request.retries < self.max_retries:
                    logger.info(f"[{quality}] Scheduling retry {self.request.retries + 1}/{self.max_retries}")
                    raise self.retry(exc=e, countdown=60)
                else:
                    logger.error(f"[{quality}] Max retries reached, skipping this quality")
                    continue
            
        
        # Check for successful segmentation
        if not segmented_files:
            raise Exception("All segmentation tasks failed!")
        
        logger.info(f"Segmentation complete: {len(segmented_files)}/{len(transcoded_files)} qualities")
        logger.info("="*60)


        return {
            'video_id': video_id,
            'segmented_files': segmented_files,
            'segments_dir': segments_dir
        }

    
    except Exception as e:
        logger.error(f"Segmentation task failed: {str(e)}")
        
        # Retry entire task if not final attempt
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying entire segmentation task (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)
        else:
            with get_db_session() as db:
                update_video_processing_status(
                db, video_id, "failed",f"{str(e)}")
            raise
