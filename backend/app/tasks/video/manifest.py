# app/tasks/video/manifest.py - builds the HLS master and per-quality playlists

from app.celery_app import celery_app
from app.tasks.celery_dependencies import get_db_session
from app.core.config import get_settings
from app.utils.video_helpers import update_video_processing_status
import os
import logging


logger = logging.getLogger(__name__)
settings = get_settings()


# Stage 4: Manifest Creation
@celery_app.task(bind=True, max_retries=2, name="app.tasks.video_tasks.create_manifest")
def create_manifest(self, data: dict):
    """
    Create HLS playlist files (.m3u8)
    - Master playlist (lists all qualities)
    - Media playlists (lists segments for each quality)
    - Return: video_id, manifest_paths
    """

    logger.info("="*60)
    logger.info(f"Creating HLS master playlist")

    try:
        # extract data from previous task
        video_id = data["video_id"]
        segmented_files= data["segmented_files"]

        with get_db_session() as db:
                update_video_processing_status(
                db, video_id, "creating_manifest")

        # Reconstruct path - master.m3u8 goes in segments/
        segments_dir = os.path.join(settings.processing_temp_dir, video_id, "segments")
        
        logger.info(f"Video ID: {video_id}")
        logger.info(f"Segments directory: {segments_dir}")
        logger.info(f"Available qualities: {len(segmented_files)}")

        # validate segments directory exists
        if not os.path.exists(segments_dir):
            raise ValueError(f"Segments directory not found : {segments_dir}")
        
        # Master playlist path
        master_playlist_path = os.path.join(segments_dir,"master.m3u8")

        # Build master playlist content
        playlist_lines = ["#EXTM3U", "#EXT-X-VERSION:3", ""]

        # Quality settings for bandwidth and resolution info
        quality_order = ["2160p", "1440p", "1080p", "720p", "480p", "360p", "240p", "144p"]
        
        # filter to skip if qualities are not included
        sorted_qualities = [q for q in quality_order if q in segmented_files]

        logger.info(f"Creating master playlist with {len(sorted_qualities)} quality levels")

        for quality in sorted_qualities:
            segment_info = segmented_files[quality]
            q_settings = settings.QUALITY_SETTINGS.get(quality)

            if not q_settings:
                logger.warning(f"[{quality}] Quality settings not found , skipping")
                continue

            # Get bitrate (converting "500K" to 500000)
            bitrate = int(q_settings['bitrate'].replace('k',''))*1000
            width = q_settings['width']
            height = q_settings['height']

            # Relative path 
            relative_playlist_path = f"{quality}/playlist.m3u8"

            # add quality level to master playlist
            playlist_lines.append(
                f'#EXT-X-STREAM-INF:BANDWIDTH={bitrate},RESOLUTION={width}x{height}'
            )
            playlist_lines.append(relative_playlist_path)
            playlist_lines.append("")

            logger.info(f"  ✓ Added {quality}: {width}x{height} @ {bitrate/1000}kbps")

        # Write master playlist file
        with open(master_playlist_path, 'w') as f:
            f.write('\n'.join(playlist_lines))
        
        # Verify file was created
        if not os.path.exists(master_playlist_path):
            raise FileNotFoundError(f"Master playlist not created: {master_playlist_path}")
        
        logger.info(f"✓ Master playlist created: {master_playlist_path}")
        logger.info("=" * 60)
        
        return {
            'video_id': video_id,
            'master_playlist_path': master_playlist_path,
            'segments_dir': segments_dir,
            'available_qualities': sorted_qualities
        }



    except Exception as e:
        logger.error(f"Manifest creation failed: {str(e)}")
        
        # Retry if not final attempt
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying manifest creation (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)
        else:
            with get_db_session() as db:
                update_video_processing_status(
                db, video_id, "failed",f"{str(e)}")
            raise
