from app.celery_app import celery_app
from .dependencies import get_db_session, get_minio_client
from app.models.videos import Video
from app.core.config import get_settings
from app.services.ffmpeg_service import extract_metadata
from app.utils.video_helpers import update_video_processing_status
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
        
        if video.processing_status != "queued":
            raise ValueError(f"Video not ready for processing. Current status : {video.processing_status}")

        # update status to proessing so that no other worker picks this up
        video.processing_status = "preparing"
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
    # manifests_dir = os.path.join(work_dir_path,"manifests")


    os.makedirs(transcoded_dir, exist_ok=True)
    os.makedirs(segments_dir, exist_ok=True)
    # os.makedirs(manifests_dir, exist_ok=True)


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
                update_video_processing_status(
                    db, video_id, "failed"
                )
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
            update_video_processing_status(
                    db, video_id, "Failed",f"{str(e)}"
                )
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
        # "manifests_dir": manifests_dir,    
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
            with get_db_session() as db:
                update_video_processing_status(
                        db, video_id, "Failed",f"{str(e)}"
                    )

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
    successful_results = [r for r in results if r is not None and not r.get('skipped',False)]

    logger.info(f"Successful transcodes: {len(successful_results)}/{len(results)}")

    if not successful_results:
        logger.error("All transcoding tasks failed!")
        with get_db_session() as db:
            update_video_processing_status(
                    db, video_id, "Failed",f"All transcoding tasks failed!"
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


# Stage 5: Upload to MinIO

@celery_app.task(bind=True, max_retries=3)
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
                db, video_id, "uploading to storage")
        
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

# Stage 6: Finalization

@celery_app.task(bind=True)
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