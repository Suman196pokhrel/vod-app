from app.celery_app import celery_app
from .dependencies import get_db_session, get_minio_client
from app.models.videos import Video
from app.core.config import get_settings
from app.services.ffmpeg_service import extract_metadata
import os
import time
import logging
import subprocess


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
    logger.info(f"[{quality}] Starting transcode task")
    logger.info(f"[{quality}] Task ID: {self.request.id}")
    logger.info(f"[{quality}] Retry attempt: {self.request.retries}/{self.max_retries}")
    try:
    
        # Extract data from previous task
        video_id = data["video_id"]
        input_path = data["local_path"]
        transcoded_dir = data['transcoded_dir']
        metadata = data['metadata']

        
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
            '-preset', 'medium',         # Encoding speed
            '-crf', '23',                # Quality (lower = better, 18-28 range)
            '-vf', f"scale={q_settings['width']}:{q_settings['height']}",  # Resolution
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
                return None  # Don't break entire workflow

        except Exception as e:
            logger.error(f"Unexpected error for {quality}: {str(e)}")
            return None

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
    logger.info("Collecting transcoding results from all qualities")
    logger.info(f"Received {len(results)} results")

    # Filter out None/failed results
    successful_results = [r for r in results if r is not None]

    logger.info(f"Successful transcodes: {len(successful_results)}/{len(results)}")

    if not successful_results:
        logger.error("All transcoding tasks failed!")
        raise Exception("No successful transcodes - cannot continue workflow")


    # Get video_id (same across all results)
    video_id = successful_results[0]['video_id']


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




# Stage 3: Segmentation

@celery_app.task(bind=True, max_retries=2)
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
            raise



# Stage 4: Manifest Creation
@celery_app.task(bind=True, max_retries=2)
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
            raise


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