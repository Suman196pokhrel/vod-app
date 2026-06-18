# 06 — Video Processing Pipeline

The raw video is uploaded. Now begins the most complex and CPU-intensive part of the entire system: the background processing pipeline. This document walks through every stage — what it does, why it's designed that way, and what can go wrong.

---

## Why a Background Pipeline?

Transcoding a one-hour video to six quality levels takes minutes of CPU time, even on powerful hardware. You can't do that in an HTTP request — the connection would time out, the user's browser would give up, and you'd have no way to report progress.

The solution: as soon as the upload finishes, the API enqueues a job and returns immediately. A separate Celery worker process picks up the job and does the heavy lifting. The frontend polls a status endpoint every 3 seconds to show progress.

Celery was chosen for this because:
- It runs in a completely separate process (no blocking the API)
- It supports complex workflow primitives (run tasks in parallel, then run a callback when all complete)
- It handles retries automatically
- It has Flower, a built-in dashboard at http://localhost:5555

---

## The Workflow

Defined in `backend/app/tasks/workflows.py`. The full pipeline is a Celery chain:

```python
chain(
    prepare_video.s(video_id),
    chord(
        group(
            transcode_1440p.s(video_id),
            transcode_1080p.s(video_id),
            transcode_720p.s(video_id),
            transcode_480p.s(video_id),
            transcode_360p.s(video_id),
            transcode_240p.s(video_id),
            transcode_144p.s(video_id),
        ),
        on_transcode_complete.s(video_id)
    ),
    segment_videos.s(video_id),
    create_manifest.s(video_id),
    upload_to_minio.s(video_id),
    finalize_processing.s(video_id),
)
```

This is sequential at the top level — each stage runs after the previous one completes — except for the transcoding step, which runs all seven quality levels in parallel simultaneously (via `chord` + `group`). 4K (2160p) transcoding is commented out to speed up local development.

Let's walk through each stage.

---

## Stage 1: `prepare_video` (status: `preparing`)

**Task:** `backend/app/tasks/video_tasks.py` → `prepare_video`

This task:
1. Updates `processing_status` to `"preparing"`
2. Downloads the raw video from MinIO to a local temp directory (`/tmp/vod_processing/{video_id}/`)
3. Runs `ffprobe` on the file to extract metadata: codec, duration (seconds), resolution (width × height), bitrate
4. Saves this metadata to `video.processing_metadata` as a JSON object
5. Determines which quality levels to transcode — skips any quality higher than the source resolution (no upscaling; transcoding 480p source to 1440p makes no sense)

The retry config uses `max_requests=3` (not `max_retries` — this is a Celery-specific kwarg name). If the task fails (MinIO is unavailable, FFprobe crashes), it retries up to 3 times with exponential backoff.

---

## Stage 2: Parallel Transcoding (status: `transcoding`)

Seven individual tasks run in parallel using Celery's `group` primitive:

- `transcode_1440p`, `transcode_1080p`, `transcode_720p`, `transcode_480p`, `transcode_360p`, `transcode_240p`, `transcode_144p`

Each task calls FFmpeg with settings from `config.QUALITY_SETTINGS`, which looks like:

```python
QUALITY_SETTINGS = {
    "1440p": {"width": 2560, "height": 1440, "video_bitrate": "8000k", "audio_bitrate": "192k"},
    "1080p": {"width": 1920, "height": 1080, "video_bitrate": "5000k", "audio_bitrate": "192k"},
    "720p":  {"width": 1280, "height": 720,  "video_bitrate": "2800k", "audio_bitrate": "128k"},
    "480p":  {"width": 854,  "height": 480,  "video_bitrate": "1400k", "audio_bitrate": "128k"},
    "360p":  {"width": 640,  "height": 360,  "video_bitrate": "800k",  "audio_bitrate": "96k"},
    "240p":  {"width": 426,  "height": 240,  "video_bitrate": "400k",  "audio_bitrate": "64k"},
    "144p":  {"width": 256,  "height": 144,  "video_bitrate": "200k",  "audio_bitrate": "64k"},
}
```

The FFmpeg command for each quality is roughly:
```bash
ffmpeg -i input.mp4 \
  -vf scale={width}:{height} \
  -c:v libx264 -b:v {video_bitrate} \
  -c:a aac -b:a {audio_bitrate} \
  -preset fast \
  -threads {FFMPEG_THREADS} \
  output_{quality}.mp4
```

H.264 codec is used for maximum compatibility. The `fast` preset is a balance between encoding speed and compression efficiency. `FFMPEG_THREADS` is configurable — defaults to half of available CPU threads.

Each transcode task outputs a single MP4 file per quality level into the temp directory.

---

## Stage 2.5: `on_transcode_complete` (Chord Callback — status: `aggregating`)

This is the callback of the `chord`. When ALL parallel transcoding tasks complete, this task runs.

It receives the list of results from all parallel tasks and:
1. Updates status to `"aggregating"`
2. Counts how many qualities succeeded
3. Logs failures

**Known Bug:** In the failure-handling branch around line 317–327 of `video_tasks.py`, the code references `video_id` before it's assigned in that branch. If every single quality level fails (total failure), this causes a `NameError: name 'video_id' is not defined` rather than a clean failure message. This is documented in Known Bugs.

---

## Stage 3: `segment_videos` (status: `segmenting`)

Takes each transcoded MP4 and splits it into 6-second `.ts` segments using FFmpeg:

```bash
ffmpeg -i {quality}.mp4 \
  -c copy \
  -f hls \
  -hls_time 6 \
  -hls_list_size 0 \
  -hls_segment_filename {quality}/segment_%03d.ts \
  {quality}/playlist.m3u8
```

6 seconds is the standard HLS segment duration — short enough for the player to switch quality levels quickly, long enough that the number of segments doesn't become unmanageable. The `-c copy` flag means no re-encoding happens here (just demuxing), so this stage is fast.

The output for a 10-minute video at one quality level: ~100 segment files (`segment_000.ts` through `segment_099.ts`) and a `playlist.m3u8` that lists them all.

---

## Stage 4: `create_manifest` (status: `creating_manifest`)

Creates the **master manifest**: a single `master.m3u8` file that lists all the quality-specific playlists and their bandwidth. This is the file the video player loads first.

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=8000000,RESOLUTION=2560x1440
1440p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/playlist.m3u8
...
```

When a player (like HLS.js) loads this file, it picks the quality level that matches the viewer's connection speed and resolution. It can switch mid-playback if bandwidth changes.

---

## Stage 5: `upload_to_minio` (status: `uploading_to_storage`)

Uploads everything from the temp directory to MinIO's processed bucket:

```
{video_id}/segments/master.m3u8
{video_id}/segments/1440p/playlist.m3u8
{video_id}/segments/1440p/segment_000.ts
{video_id}/segments/1440p/segment_001.ts
...
{video_id}/segments/144p/playlist.m3u8
{video_id}/segments/144p/segment_000.ts
...
```

For a long video at all quality levels, this could be thousands of files. The upload is done file-by-file with error handling — if any upload fails, the task retries.

The `manifest_url` stored in the database is the MinIO object path to `master.m3u8`, not a full URL. The full URL is constructed at query time from the MinIO endpoint + bucket + object path.

---

## Stage 6: `finalize_processing` (status: `finalizing` → `completed`)

The final cleanup step:
1. Updates `video.manifest_url` with the path to `master.m3u8`
2. Updates `video.available_qualities` with the list of successfully transcoded qualities (e.g., `["1440p", "1080p", "720p", "480p", "360p"]`)
3. Updates `video.processing_status` to `"completed"`
4. Clears `video.celery_task_id`
5. Deletes the entire temp directory

If any earlier stage set the status to `"failed"`, this task still runs (at the end of the chain) and does the temp file cleanup.

---

## Error Handling and Failures

Every task catches exceptions and updates `video.processing_status` to `"failed"` with the error message in `video.processing_error`. The frontend's polling hook treats `"failed"` as a terminal state and shows an error to the user.

The retry logic uses exponential backoff — a failing task waits longer between each attempt. After exhausting retries, the exception propagates and the task is marked as failed in Celery.

Monitor processing in real time via Flower at http://localhost:5555. You can see each task, its status, retry count, and error messages. It's the primary debugging tool for pipeline failures.

---

## Checking Logs During Processing

```bash
make logs s=worker     # Celery worker logs (shows FFmpeg output, stage transitions)
make logs s=api        # API logs (shows task enqueueing, status updates)
```

You can also check MinIO directly at http://localhost:9001 — if processing completed, you should see files under the `processed` bucket at `{video_id}/segments/`.

---

## Future Upgrades

- **Enable 4K transcoding** — uncomment the 2160p step in `workflows.py` (adds significant processing time)
- **Webhook notifications** — push a webhook when processing completes instead of requiring the client to poll
- **Multiple workers** — scale horizontally by running more Celery worker containers
- **Progress percentage** — expose per-stage progress within each task (e.g., FFmpeg progress parsing)
- **Cancel task** — use `celery_task_id` to revoke an in-progress task when a video is deleted
- **Priority queues** — give higher-priority content faster processing

---

## What's Next

The backend pipeline is complete. Now let's cross to the other side: the Next.js frontend. The next document covers the frontend foundation — how the API client works, how auth state is managed, and the architectural decisions that underpin every page.
