# 08 — Background Jobs

**Files covered:** `backend/app/celery_app.py` · `backend/app/tasks/workflows.py` · `backend/app/tasks/video_tasks.py`

---

## Starting Point

The video is uploaded. The database record exists with `processing_status = "queued"`. The service called `start_video_processing(video_id)`. Now we look at what that actually does — the Celery task queue and the 6-stage pipeline that transforms a raw uploaded video into streamable HLS.

---

## `backend/app/celery_app.py` — The Task Queue

### Why a Background Queue?

Video transcoding takes minutes. An HTTP request can't wait minutes — the client would time out, proxies would cut the connection, and the user experience would be terrible.

Celery solves this by separating "queueing the work" from "doing the work":

```
API process                    Celery worker process
──────────                     ─────────────────────
POST /videos/create
  → save to DB
  → write task to Redis queue  →  worker reads task from Redis
  → return 200 immediately         worker runs FFmpeg (5 minutes)
                                   worker updates DB to "completed"
```

The API returns in milliseconds. The user gets immediate feedback. The worker does the heavy lifting asynchronously.

### The Setup

```python
celery_app = Celery(
    "vod_app",
    broker=redis_connection_url,   # tasks go into Redis
    backend=redis_connection_url   # results come back from Redis
)
```

**Broker** — where tasks are deposited. The API writes a task here; the worker reads it.
**Backend** — where results are stored. After a task finishes (or fails), Celery stores the result here so it can be retrieved later.

Both use the same Redis instance. In high-traffic production, you'd separate them.

### Key Configuration

```python
task_time_limit=3600,       # hard limit: Celery kills the task after 1 hour
task_soft_time_limit=3000,  # soft limit: raises SoftTimeLimitExceeded at 50 min
result_expires=86400,       # task results deleted from Redis after 24 hours
task_track_started=True,    # tasks have a STARTED state, not just PENDING/DONE
```

`task_time_limit=3600` — a 1-hour 4K video can realistically take that long to transcode. If it takes longer, something is wrong. Celery kills the task and frees the worker.

`result_expires=86400` — Celery stores task results in Redis. Without expiry, Redis fills up over time. Since the video's status is also tracked in PostgreSQL, losing the Celery result after 24 hours is fine.

---

## `backend/app/tasks/workflows.py` — The Pipeline Blueprint

```python
def create_video_processing_workflow(video_id: str):
    workflow = chain(
        prepare_video.s(video_id),
        chord(
            group(
                transcode_quality.s("1440p"),
                transcode_quality.s("1080p"),
                transcode_quality.s("720p"),
                transcode_quality.s("480p"),
                transcode_quality.s("360p"),
                transcode_quality.s("240p"),
                transcode_quality.s("144p"),
            ),
            on_transcode_complete.s()
        ),
        segment_videos.s(),
        create_manifest.s(),
        upload_to_minio.s(),
        finalize_processing.s()
    )
    return workflow
```

### `chain` — Sequential Steps

A `chain` means "run these tasks in order, passing each result to the next." Stage 1 → Stage 3 → 4 → 5 → 6 are a chain: the output dict of one task becomes the input dict of the next.

### `chord` — Parallel Then Collect

The `chord` is the interesting part. It has two components:
1. A `group` — multiple tasks that run simultaneously (all quality transcodes at once)
2. A callback — `on_transcode_complete` — which runs ONLY AFTER ALL group tasks finish

This is why all 6 quality versions transcode in parallel instead of one after another. On a machine with 4+ CPU cores, this cuts total transcoding time roughly in half compared to sequential processing.

### `.s()` — Signatures

`.s()` creates a "signature" — a lazy description of a task with its arguments. Think of it as a recipe card rather than actually cooking. Celery assembles the entire pipeline from recipe cards, then executes them.

### 4K Is Commented Out

```python
# transcode_quality.s("2160p"),  # 4K — slow in dev, left available
```

4K transcoding on a development machine takes 30+ minutes. It's commented out to make test cycles tolerable. The quality settings in `config.py` still include 4K — uncomment this line to enable it.

---

## `backend/app/tasks/video_tasks.py` — The Actual Work

### Stage 1: `prepare_video`

```python
@celery_app.task(bind=True, max_requests=3)
def prepare_video(self, video_id: str):
```

`bind=True` gives the function access to `self` — the Celery task object — needed to call `self.retry()`.

**Steps:**
1. Fetch video from DB. Verify `processing_status == "queued"` — if not, abort. This is a soft lock: two workers won't process the same video.
2. Update status to `"preparing"` and commit immediately. Now other workers see it's taken.
3. Create working directory: `/tmp/video_processing/{video_id}/`
4. Download raw video from MinIO to `work_dir/raw.mp4`
5. Run FFprobe to extract metadata
6. Save metadata to the database
7. Return a dict with all paths — this becomes the input for the next stage

**The temp directory structure:**
```
/tmp/video_processing/{video_id}/
  raw.mp4                  ← downloaded from MinIO
  transcoded/
    1080p.mp4              ← created in Stage 2
    720p.mp4
    ...
  segments/
    1080p/
      playlist.m3u8        ← HLS quality playlist
      segment_0000.ts      ← 6-second video chunks
      segment_0001.ts
      ...
    master.m3u8            ← HLS master playlist
```

Everything here is deleted in Stage 6 after successful upload to MinIO.

**DB sessions in tasks — always short-lived:**
```python
with get_db_session() as db:
    video = db.query(Video).filter(Video.id == video_id).first()
    video.processing_status = "preparing"
    db.commit()
    raw_video_path = video.raw_video_path  # ← extract before session closes!
# session is closed here
```

The session is held open only long enough to read/write. After the `with` block, the ORM object is detached. You must extract any values you need (like `raw_video_path`) into plain Python variables before the block exits — accessing ORM attributes on a detached object causes errors.

**Retry on download failure:**
```python
except Exception as e:
    if self.request.retries >= self.max_retries:
        update_video_processing_status(db, video_id, "failed")
        raise
    raise self.retry(exc=e, countdown=60)  # retry in 60 seconds
```

If MinIO is temporarily unavailable, the task waits 60 seconds and tries again. After 3 failures, it marks the video as failed and stops.

---

### Stage 2: `transcode_quality`

```python
@celery_app.task(bind=True, max_retries=2)
def transcode_quality(self, data: dict, quality: str):
```

**The upscaling check:**
```python
target_height = q_settings["height"]
source_height = metadata.get("height")

if target_height > source_height:
    return {"skipped": True, ...}  # don't upscale
```

If someone uploads a 480p video, generating a "1080p" version would be upscaling — making a smaller image bigger. It looks terrible and wastes disk space. Any quality level higher than the source resolution is skipped.

**The FFmpeg command:**
```python
cmd = [
    'ffmpeg',
    '-i', input_path,
    '-c:v', 'libx264',          # H.264 video codec — plays everywhere
    '-threads', '2',            # limit to 2 CPU threads per task
    '-preset', 'medium',        # encode speed vs file size balance
    '-crf', '23',               # quality: 0-51, lower = better, 23 is default
    '-vf', f"scale={width}:{height}",
    '-b:v', bitrate,            # target bitrate (e.g., "5000k" for 1080p)
    '-c:a', 'aac',              # AAC audio — universal compatibility
    '-b:a', '128k',
    '-y',                       # overwrite if output exists
    output_path
]
```

Why `-threads 2`? The worker runs with `--concurrency=2` (two worker processes). If each of the 6 parallel transcode tasks used all available CPU threads, they'd fight each other and slow everything down. Limiting to 2 threads per task keeps things orderly.

Why `libx264`? H.264 is the most compatible video codec. It plays natively in every major browser, on every phone, on every smart TV. More modern codecs (H.265, AV1) compress better but have inconsistent browser support.

Why CRF instead of just bitrate? CRF (Constant Rate Factor) gives consistent *quality* across the video, regardless of scene complexity. Action scenes with lots of motion get more bits; static scenes get fewer. This produces better visual results than a fixed bitrate at the same average file size.

---

### Stage 2.5: `on_transcode_complete`

The chord callback — runs after all `transcode_quality` tasks finish:

```python
def on_transcode_complete(self, results: list):
    # results = list of dicts, one per quality level
    successful = [r for r in results if r is not None and not r.get('skipped', False)]
    if not successful:
        raise Exception("All transcoding tasks failed!")

    video_id = successful[0]['video_id']
    transcoded_files = {
        r['quality']: {'path': r['output_path'], 'size': r['file_size']}
        for r in successful
    }
    return {'video_id': video_id, 'transcoded_files': transcoded_files}
```

It receives a list where each element is one quality's result. Skipped and failed qualities are filtered out. The results are assembled into a dict mapping quality names to file paths — this dict is passed to Stage 3.

---

### Stage 3: `segment_videos`

HLS streaming works by splitting video into small chunks. The player downloads chunks as needed and can switch quality levels at chunk boundaries.

```python
cmd = [
    'ffmpeg',
    '-i', input_path,
    '-c', 'copy',              # copy without re-encoding (fast!)
    '-f', 'hls',               # output format: HLS
    '-hls_time', '6',          # 6 seconds per segment
    '-hls_list_size', '0',     # include ALL segments in playlist
    '-hls_segment_filename', segment_pattern,
    playlist_path
]
```

`-c copy` — no re-encoding. The video was already encoded in Stage 2. Here we just chop it into 6-second pieces. This is very fast (seconds rather than minutes).

**Why 6 seconds?** Apple's HLS recommendation. Too short (1-2s): many files, frequent requests. Too long (20-30s): slow to switch quality levels. 6 seconds is the industry standard balance.

`-hls_list_size 0` — include ALL segments in the playlist file. Without this (live stream mode), only the last N segments are listed and the player can't seek to an arbitrary position.

---

### Stage 4: `create_manifest`

Writes the HLS master playlist manually:

```
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
720p/playlist.m3u8
```

This file tells the HLS player "here are all the available quality levels, their bandwidth requirements, and where to find their segment playlists." The player picks the right quality based on the user's connection speed and can switch between quality levels seamlessly.

Why write this manually instead of letting FFmpeg generate it? Because FFmpeg generates HLS by transcoding all qualities in one command — sequential. We want parallel transcoding (Stage 2), which means we handle the manifest ourselves (Stage 4).

---

### Stage 5: `upload_to_minio`

Uploads everything to the `vod-processed` bucket. For a 1-hour video at 6 quality levels, this could be hundreds or thousands of `.ts` files.

Destination paths:
```
{video_id}/segments/master.m3u8
{video_id}/segments/1080p/playlist.m3u8
{video_id}/segments/1080p/segment_0000.ts
{video_id}/segments/1080p/segment_0001.ts
...
{video_id}/segments/720p/playlist.m3u8
...
```

This uses `minio_service.upload_file()` (sync, local file → MinIO) rather than the async stream upload from the initial upload endpoint.

---

### Stage 6: `finalize_processing`

```python
video.processing_status = "completed"
video.manifest_url = master_url        # "/vod-processed/{id}/segments/master.m3u8"
video.available_qualities = sorted_qualities  # ["1440p", "1080p", "720p", ...]
video.processing_error = None
video.celery_task_id = None            # workflow complete, no more polling needed

shutil.rmtree(work_dir)               # delete /tmp/video_processing/{video_id}/
```

`celery_task_id` is cleared because the workflow is done. Keeping it would be misleading, and Celery deletes task results after 24 hours anyway.

The temp directory cleanup is marked as "non-critical" — if it fails, the task doesn't fail. The video is already fully processed and stored in MinIO. A failed cleanup just means some temporary files linger on disk, which is a minor issue compared to losing the processed video.

---

## The Full Status Progression

```
uploading         ← frontend uploads the file (before API call returns)
queued            ← DB record created, task enqueued
preparing         ← Stage 1 starts: downloading from MinIO
transcoding       ← Stage 2: parallel FFmpeg encode for all qualities
aggregating       ← Stage 2.5: collecting results from all quality tasks
segmenting        ← Stage 3: FFmpeg HLS segmentation
creating_manifest ← Stage 4: writing master.m3u8
uploading_to_storage ← Stage 5: sending all files to MinIO
finalizing        ← Stage 6 starts
completed         ← all done, ready for playback
failed            ← something went wrong
```

---

## Where We Go Next

The backend is fully covered. The video is processed and the database has the `manifest_url` and `available_qualities`. Now we switch to the frontend — how it authenticates, makes API calls, and tracks the processing status.

**➡️ [09 — Frontend Foundation](./09_FRONTEND_FOUNDATION.md)**
