# app/tasks/video/transcode.py - parallel per-quality FFmpeg transcoding and the chord callback that collects results

from app.celery_app import celery_app
from app.tasks.celery_dependencies import get_db_session
from app.core.config import get_settings
from app.utils.video_helpers import update_video_processing_status
import os
import logging
import subprocess


logger = logging.getLogger(__name__)
settings = get_settings()


# STAGE 2: Transcoding 

@celery_app.task(bind=True, max_retries=2, name="app.tasks.video_tasks.transcode_quality")
def transcode_quality(self, data:dict, quality:str):
    """
    Transcode video to specific quality
    - Input: data from prepare_video, quality (1080p/720p/480p/360p)
    - Process: Use FFmpeg to transcode
    - Track progress with self.update_state()
    - Return: video_id, quality, output_file_path
    """
    logger.info(f"[{quality}] Starting transcode task")
    logger.info(f"[{quality}] Task ID: {self.request.id}")
    logger.info(f"[{quality}] Retry attempt: {self.request.retries}/{self.max_retries}")
    try:


    
        # Extract data from previous task
        video_id = data["video_id"]
        input_path = data["local_path"]
        transcoded_dir = data['transcoded_dir']
        metadata = data['metadata']

        # UPDATE processing status
        with get_db_session() as db:
            update_video_processing_status(
                db, video_id, "transcoding"
            )
        
        # Validate all required data
        if not all([video_id, input_path, transcoded_dir, metadata]):
            missing = [k for k,v in {
                "video_id": video_id,
                "input_path": input_path,
                "transcoded_dir": transcoded_dir,
                "metadata": metadata
            }.items() if not v]
            raise ValueError(f"Missing required data: {', '.join(missing)}")

        logger.info(f"[{quality}] Video ID: {video_id}")
        logger.info(f"[{quality}] Input: {input_path}")


        # INPUT FILE VALIDATION
        
        # Check if input file exists
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Check if input file is readable
        if not os.access(input_path, os.R_OK):
            raise PermissionError(f"Cannot read input file: {input_path}")
        
        # Verify input file size
        input_size = os.path.getsize(input_path)
        logger.info(f"[{quality}] Input file size: {input_size / (1024*1024):.2f} MB")
        
        if input_size == 0:
            raise ValueError(f"Input file is empty: {input_path}")



        # QUALITY SETTINGS & UPSCALING CHECK
        
        q_settings = settings.QUALITY_SETTINGS.get(quality)
        if not q_settings:
            raise ValueError(f"Invalid quality setting: {quality}")
        
        # Check if we should skip (no upscaling)
        source_height = metadata.get("height")
        if not source_height:
            raise ValueError("Missing height in metadata")
        
        target_height = q_settings["height"]
        
        if target_height > source_height:
            logger.info(f"[{quality}] Skipping - source is {source_height}p, target is {target_height}p (no upscaling)")
            return {
                "video_id": video_id,
                "quality": quality,
                "skipped": True,
                "reason": f"Source resolution ({source_height}p) lower than target ({target_height}p)"
            }
        
        
        # output path
        output_path = os.path.join(transcoded_dir,f"{quality}.mp4")
        logger.info(f"Output path: {output_path}")

        # Build FFmpeg command
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',           # Video codec
            '-threads', f'{settings.FFMPEG_THREADS}',             # THREAD LIMIT HERE
            '-preset', 'medium',         # Encoding speed
            '-crf', '23',                # Quality (lower = better, 18-28 range)
            # Fit within the target box preserving source aspect ratio, then
            # pad with black to the exact target dimensions (letterbox/pillarbox)
            # instead of stretching mismatched aspect ratios (e.g. 9:16 phone video).
            '-vf', (
                f"scale=w={q_settings['width']}:h={q_settings['height']}:force_original_aspect_ratio=decrease,"
                f"pad=w={q_settings['width']}:h={q_settings['height']}:x=(ow-iw)/2:y=(oh-ih)/2:color=black"
            ),
            '-b:v', q_settings['bitrate'], # Target bitrate
            '-c:a', 'aac',               # Audio codec
            '-b:a', '128k',              # Audio bitrate
            '-y',                        # Overwrite output file
            output_path      
            ]
        
        logger.info(f"Runnign FFmpeg: {' '.join(cmd)}")

        try:

            # Run FFmpeg
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )

            logger.info(f"Transcoding complete for {quality}")

            # Verify output exists
            if not os.path.exists(output_path):
                raise Exception (f"Output file not created: {output_path}")
            
            file_size = os.path.getsize(output_path)
            logger.info(f"Cretaed {quality}.mp4 - Size: {file_size / (1024*1024):.2f} MB")

            return {
                "video_id": video_id,
                "quality": quality,
                "output_path": output_path,
                "file_size": file_size
            }
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg failed for {quality}: {str(e.stderr)}")

            # Retry if not final attempt
            if self.request.retries < self.max_retries:
                logger.info(f"Retrying {quality} (attempt {self.request.retries + 1}/{self.max_retries})")
                raise self.retry(exc=e, countdown=60)
            else:
                logger.error(f"Final failure for {quality} after {self.max_retries} retries")
                return {"video_id": video_id, "quality": quality, "failed": True}  # Don't break entire workflow

        except Exception as e:
            with get_db_session() as db:
                update_video_processing_status(
                        db, video_id, "failed",f"{str(e)}"
                    )

            return {"video_id": video_id, "quality": quality, "failed": True}

    except Exception as exc:
        # Retry logic
        pass



# Stage 2.5: Collect Transcoding Results (Chord Callback)

@celery_app.task(bind=True, name="app.tasks.video_tasks.on_transcode_complete")
def on_transcode_complete(self, results: list):
    """
    Called after all parallel transcoding tasks finish
    - Input: list of results from all transcode_quality tasks
    - Combine results into single dict
    - Return: video_id, transcoded_files dict
    """
    logger.info("Collecting transcoding results from all qualities")
    logger.info(f"Received {len(results)} results")

 

    # Filter out None/failed results
    successful_results = [
        r for r in results
        if r is not None and not r.get('skipped', False) and not r.get('failed', False)
    ]

    logger.info(f"Successful transcodes: {len(successful_results)}/{len(results)}")

    if not successful_results:
        logger.error("All transcoding tasks failed!")
        video_id = next((r['video_id'] for r in results if r), None)
        with get_db_session() as db:
            update_video_processing_status(
                    db, video_id, "failed", "All transcoding tasks failed!"
                )
        raise Exception("No successful transcodes - cannot continue workflow")


    # Get video_id (same across all results)
    video_id = successful_results[0]['video_id']
    with get_db_session() as db:
        update_video_processing_status(
                    db, video_id, "aggregating",
                )


    # Build transcoded files dict
    transcoded_files = {}
    for result in successful_results:
        quality = result['quality']
        transcoded_files[quality] = {
            'path':result['output_path'],
            'size': result['file_size']
        }
        logger.info(f"  ✓ {quality}: {result['file_size'] / (1024*1024):.2f} MB")
    
    
    logger.info(f"Transcoding complete for video: {video_id}")
    return {
        'video_id': video_id,
        'transcoded_files': transcoded_files,
        'total_qualities': len(transcoded_files)
    }
