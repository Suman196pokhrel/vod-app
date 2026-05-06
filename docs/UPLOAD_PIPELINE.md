# Upload & Processing Pipeline

End-to-end journey of a video from browser upload to playable HLS stream.

## Phase 1 — Frontend Upload

```
User selects MP4 (max 5 GB) + thumbnail + fills form
  → Zod validation (title 5-200 chars, description 10-2000 chars, etc.)
  → FormData assembled: video file + thumbnail file + JSON metadata string
  → POST /videos/create (multipart/form-data)
  → VideoProcessingDialog opens with video_id
  → Frontend polls GET /videos/{id}/status every 3 seconds
```

No chunked upload — single multipart POST. No client-side progress bar (code commented out).

---

## Phase 2 — API Ingestion (`POST /videos/create`)

**File:** `backend/app/apis/routes/video.py:27`

```
1. Validate MIME types
   Video allowed: video/mp4, video/mpeg, video/quicktime, video/x-msvideo, video/x-matroska
   Thumbnail allowed: image/jpeg, image/png, image/webp

2. Upload to MinIO
   video     → vod-videos/user-{user_id}/{uuid}.{ext}
   thumbnail → vod-thumbnails/user-{user_id}/{uuid}.{ext}
   (verify upload with stat_object after each put_object)

3. INSERT Video row
   raw_video_path  = MinIO object name (NOT full URL)
   thumbnail_url   = MinIO object name
   processing_status = "queued"
   status          = metadata.status (draft/published/scheduled)

4. start_video_processing(video_id) → dispatch Celery chain
5. UPDATE Video.celery_task_id

Rollback: if DB commit fails → delete both MinIO objects before raising error
```

---

## Phase 3 — Celery Processing Chain

**File:** `backend/app/tasks/video_tasks.py`
**Workflow:** `backend/app/tasks/workflows.py:create_video_processing_workflow()`

### Task 1: prepare_video
`processing_status → "preparing"`

```
- Validate video exists in DB and status is "queued"
- Create temp work dirs:
    /tmp/video_processing/{video_id}/
    /tmp/video_processing/{video_id}/transcoded/
    /tmp/video_processing/{video_id}/segments/
- Download raw video from MinIO → {work_dir}/raw.{ext}
- FFprobe extract metadata:
    duration, width, height, codec, bitrate, frame_rate,
    file_size, audio_codec, audio_bitrate
- Store metadata in Video.processing_metadata (JSON)
- Return: { video_id, local_path, work_dir, transcoded_dir, segments_dir, metadata }
```

Retries: 3 (on download failure). Hard fail on FFprobe error.

---

### Tasks 2–8: transcode_quality (parallel chord)
`processing_status → "transcoding"`

7 tasks run **simultaneously**. Each transcodes to one quality tier:

| Quality | Resolution | Target Bitrate |
|---------|-----------|---------------|
| 1440p | 2560×1440 | 10000k |
| 1080p | 1920×1080 | 5000k |
| 720p | 1280×720 | 2500k |
| 480p | 854×480 | 1000k |
| 360p | 640×360 | 500k |
| 240p | 426×240 | 300k |
| 144p | 256×144 | 200k |

> 2160p (4K) is present in config but **commented out** in workflows.py to save dev time.

**FFmpeg command per quality:**
```bash
ffmpeg -i {input.mp4} \
  -c:v libx264 -threads 2 -preset medium -crf 23 \
  -vf scale={W}:{H} -b:v {BITRATE} \
  -c:a aac -b:a 128k \
  -y {output.mp4}
```

- If source resolution < target resolution → task is **skipped** (no upscaling)
- Retries: 2 per quality task

---

### Task 8.5: on_transcode_complete (chord callback)
`processing_status → "aggregating"`

```
- Receives results from all 7 transcode tasks
- Filters out None/skipped results
- Ensures at least 1 successful transcode (fails pipeline otherwise)
- Returns: { video_id, transcoded_files: {quality: {path, size}}, total_qualities }
```

---

### Task 9: segment_videos
`processing_status → "segmenting"`

```
For each successfully transcoded quality:
  FFmpeg HLS segmentation:
    ffmpeg -i {quality.mp4} \
      -c copy -f hls \
      -hls_time 6 \
      -hls_list_size 0 \
      -hls_segment_filename segment_%4d.ts \
      -y {quality}/playlist.m3u8

  Output: {segments_dir}/{quality}/playlist.m3u8
          {segments_dir}/{quality}/segment_0001.ts
          {segments_dir}/{quality}/segment_0002.ts ...

  Segment duration: 6 seconds (Apple HLS recommendation)
```

Retries: 2.

---

### Task 10: create_manifest
`processing_status → "creating_manifest"`

Generates `master.m3u8` (HLS master playlist):

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=10000000,RESOLUTION=2560x1440
1440p/playlist.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/playlist.m3u8

... (one entry per available quality, highest first)
```

Written to `{segments_dir}/master.m3u8`. Retries: 2.

---

### Task 11: upload_to_minio
`processing_status → "uploading_to_storage"`

```
Upload order per quality:
  1. {quality}/playlist.m3u8
  2. {quality}/segment_NNNN.ts × N

Then upload master.m3u8

Destination bucket: vod-processed
Path: {video_id}/segments/{quality}/{filename}
Master: {video_id}/segments/master.m3u8
```

Returns `master_url = /{bucket}/{video_id}/segments/master.m3u8`. Retries: 3.

---

### Task 12: finalize_processing
`processing_status → "completed"`

```
- UPDATE Video:
    processing_status = "completed"
    manifest_url = master_url (e.g. "/vod-processed/abc123/segments/master.m3u8")
    available_qualities = ["1440p", "1080p", "720p", ...]
    processing_error = None
    celery_task_id = None
- Delete /tmp/video_processing/{video_id}/ (best-effort cleanup)
```

No retries. Errors are logged but don't re-trigger the pipeline.

---

## Status → Progress Mapping (Frontend)

The frontend `VideoProcessingDialog` maps status strings to visual progress:

| Backend Status | Frontend Phase Label | Progress % |
|---------------|---------------------|-----------|
| uploading | Upload | 5% |
| queued | Queue | 15% |
| preparing | Analyze | 25% |
| transcoding / aggregating | Transcode | 50% |
| segmenting | Segment | 60–70% |
| creating_manifest | Package | 80% |
| uploading_to_storage / finalizing | Deploy | 90–95% |
| completed | — | 100% |
| failed | — | error state |

---

## Error Handling

| Stage | On Failure |
|-------|-----------|
| API ingestion | MinIO objects deleted, HTTP 500 returned |
| prepare_video | Retry 3×; marks video failed if all retries exhausted |
| transcode_quality | Retry 2×; individual quality failure doesn't fail pipeline |
| segment_videos | Retry 2×; marks video failed |
| create_manifest | Retry 2×; marks video failed |
| upload_to_minio | Retry 3×; marks video failed |
| finalize_processing | No retry; logs error, pipeline considered failed |

When a task marks a video failed:
- `Video.processing_status = "failed"`
- `Video.processing_error = error message`
- Temp directory cleanup attempted

---

## MinIO Storage Layout

```
vod-videos/
  user-{user_id}/
    {uuid}.mp4          ← raw uploaded video

vod-thumbnails/
  user-{user_id}/
    {uuid}.jpg          ← user-provided thumbnail

vod-processed/
  {video_id}/
    segments/
      master.m3u8       ← HLS master playlist (referenced in DB)
      1080p/
        playlist.m3u8
        segment_0001.ts
        segment_0002.ts
        ...
      720p/
        playlist.m3u8
        segment_0001.ts
        ...
```

---

## What's Complete vs Incomplete

| Step | Status |
|------|--------|
| Frontend upload form | Complete |
| Zod form validation | Complete |
| API MIME validation | Complete |
| MinIO raw video upload | Complete |
| DB record creation | Complete |
| Celery task dispatch | Complete |
| FFprobe metadata extraction | Complete |
| H.264 transcoding (7 qualities) | Complete |
| HLS segmentation (6-second segments) | Complete |
| Master playlist generation | Complete |
| MinIO HLS upload | Complete |
| DB finalization (manifest_url, qualities) | Complete |
| Status polling API | Complete |
| Frontend processing dialog | Complete |
| Frontend draft saving | **TODO — fake delay, no API call** |
| Frontend upload progress bar | **Commented out** |
| Frontend retry on failure | **Button renders, handler missing** |
| Frontend video playback (HLS.js) | **Not implemented — mock player only** |
