# app/tasks/video/storyboard.py - generates the scrubbing-preview sprite sheet and WebVTT storyboard

from app.celery_app import celery_app
from app.tasks.celery_dependencies import get_db_session, get_minio_client
from app.models.videos import Video
from app.core.config import get_settings
from app.utils.video_helpers import update_video_processing_status
import os
import logging
import subprocess


logger = logging.getLogger(__name__)
settings = get_settings()


# STAGE 1.5: Storyboard generation (scrubbing timeline previews)

def _format_vtt_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


@celery_app.task(bind=True, name="app.tasks.video_tasks.generate_storyboard")
def generate_storyboard(self, data: dict) -> dict:
    """
    Generate a sprite-sheet + WebVTT storyboard for timeline scrubbing
    previews (video.js reads `<track kind="metadata">` cues in the
    `url#xywh=x,y,w,h` media-fragment convention).

    Best-effort: this is a cosmetic feature, not core playback, so any
    failure is logged and swallowed here rather than raised - a broken
    scrubbing preview must never block the actual transcode pipeline.
    Returns `data` unchanged either way, since downstream tasks
    (transcode_quality onward) don't need anything this stage produces.
    """
    video_id = data.get("video_id")
    logger.info(f"[storyboard] Starting for video_id: {video_id}")

    try:
        input_path = data["local_path"]
        metadata = data["metadata"]
        work_dir = data["work_dir"]
        duration = metadata.get("duration_seconds") or 0

        if duration <= 0:
            logger.warning(f"[storyboard] No duration in metadata, skipping for {video_id}")
            return data

        with get_db_session() as db:
            update_video_processing_status(db, video_id, "generating_storyboard")

        INTERVAL_SECONDS = 5
        TILE_WIDTH = 160
        GRID_COLS, GRID_ROWS = 10, 10
        TILES_PER_SHEET = GRID_COLS * GRID_ROWS

        storyboard_dir = os.path.join(work_dir, "storyboard")
        os.makedirs(storyboard_dir, exist_ok=True)
        sprite_pattern = os.path.join(storyboard_dir, "sprite_%03d.jpg")

        cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-vf', f'fps=1/{INTERVAL_SECONDS},scale={TILE_WIDTH}:-2,tile={GRID_COLS}x{GRID_ROWS}',
            '-vsync', '0',
            '-start_number', '0',
            '-q:v', '4',
            sprite_pattern,
        ]
        logger.info(f"[storyboard] Running FFmpeg: {' '.join(cmd)}")
        subprocess.run(cmd, capture_output=True, text=True, check=True)

        sprite_files = sorted(
            f for f in os.listdir(storyboard_dir) if f.startswith('sprite_') and f.endswith('.jpg')
        )
        if not sprite_files:
            raise RuntimeError("No sprite sheets were generated")

        # Measure the actual tile pixel size from the real output instead of
        # trusting the scale filter's aspect-ratio rounding - an off-by-one
        # here would silently misalign every cue's crop coordinates.
        first_sprite_path = os.path.join(storyboard_dir, sprite_files[0])
        probe = subprocess.run(
            ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
             '-show_entries', 'stream=width,height', '-of', 'csv=p=0', first_sprite_path],
            capture_output=True, text=True, check=True,
        )
        sheet_width, sheet_height = (int(v) for v in probe.stdout.strip().split(','))
        tile_width = sheet_width // GRID_COLS
        tile_height = sheet_height // GRID_ROWS

        num_cues = int(duration // INTERVAL_SECONDS) + 1
        vtt_lines = ["WEBVTT", ""]

        for i in range(num_cues):
            start = i * INTERVAL_SECONDS
            end = min((i + 1) * INTERVAL_SECONDS, duration)
            sheet_index = i // TILES_PER_SHEET
            position = i % TILES_PER_SHEET
            col = position % GRID_COLS
            row = position // GRID_COLS
            x, y = col * tile_width, row * tile_height

            vtt_lines.append(f"{_format_vtt_timestamp(start)} --> {_format_vtt_timestamp(end)}")
            vtt_lines.append(f"sprite_{sheet_index:03d}.jpg#xywh={x},{y},{tile_width},{tile_height}")
            vtt_lines.append("")

        vtt_path = os.path.join(storyboard_dir, "storyboard.vtt")
        with open(vtt_path, 'w') as f:
            f.write('\n'.join(vtt_lines))

        # Upload sprite sheets + VTT to MinIO (same bucket as the single
        # poster thumbnail - this is thumbnail-shaped data too)
        minio_client = get_minio_client()
        bucket_name = settings.minio_bucket_thumbnails
        base_path = f"{video_id}/storyboard"

        for filename in sprite_files + ["storyboard.vtt"]:
            content_type = "text/vtt" if filename.endswith(".vtt") else "image/jpeg"
            minio_client.upload_file(
                bucket_name=bucket_name,
                object_name=f"{base_path}/{filename}",
                file_path=os.path.join(storyboard_dir, filename),
                content_type=content_type,
            )

        storyboard_url = f"/{bucket_name}/{base_path}/storyboard.vtt"

        with get_db_session() as db:
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.storyboard_url = storyboard_url
                db.commit()

        logger.info(
            f"[storyboard] ✓ Complete for {video_id}: {len(sprite_files)} sheet(s), {num_cues} cues"
        )

    except Exception as e:
        logger.warning(f"[storyboard] Failed for {video_id}, continuing without scrubbing preview: {str(e)}")

    return data
