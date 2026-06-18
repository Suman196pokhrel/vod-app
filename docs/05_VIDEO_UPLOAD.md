# 05 — Video Upload

With authentication working, we have users who can log in. Now let's look at what admins do once they're in: uploading a video. The upload flow is the entry point for all content in this system, and it has some specific design decisions worth understanding before you touch it.

---

## The Upload Endpoint

**`POST /videos/create`** — defined in `backend/app/apis/routes/video.py`

This endpoint is admin-only (requires `get_current_admin_user` dependency). It accepts a `multipart/form-data` request — not a JSON body.

Here's why: HTTP multipart is the standard way to upload binary files. But our upload also needs structured metadata (title, description, category, etc.). You can't cleanly mix a JSON object with file fields in a single multipart request. The solution we use: encode the metadata as a JSON-serialized **string** in a form field called `data`.

So the request looks like this:

```
Content-Type: multipart/form-data

video_file: <binary file data>
thumbnail: <binary image data> (optional)
data: '{"title": "My Video", "description": "...", "category": "Drama", ...}'
```

The `data` field is a string that gets parsed on the server with `json.loads(data)`. This is unconventional but practical. The Swagger UI at `/docs` can test this, but you need to manually serialize the metadata as a string.

---

## What Happens on the Server

The handler in `video.py` calls `VideoService.create_video_with_files()` in `backend/app/services/video_service.py`. Here's the sequence:

**1. Validate the video file**

Checks that the file is a supported format (MP4, MOV, MKV, AVI) and within the size limit (5GB). If the format isn't accepted or the file exceeds the limit, a 400 error is returned immediately.

**2. Upload the raw video to MinIO**

The file is streamed directly from the request to MinIO — it's not written to disk on the API server first. The object name (MinIO path) is:

```
user-{user_id}/{uuid}.{extension}
```

For example: `user-abc123/f47ac10b-58cc-4372-a567-0e02b2c3d479.mp4`

The `user-` prefix groups files by uploader, which makes it easy to list or delete all files for a user. The UUID prevents filename collisions when the same user uploads two videos with the same filename.

**3. Upload the thumbnail (if provided)**

If a thumbnail image was included in the request, it's uploaded to the thumbnails bucket with a similar path. If no thumbnail is provided, `thumbnail_url` stays null. Note: the upload form frontend effectively requires a thumbnail (it won't submit without one), so this will almost always be populated.

**4. Parse and validate metadata**

The `data` JSON string is parsed. Required fields: `title` (max 255 chars), `description` (max 2000 chars), `category`. The Pydantic schema `VideoCreateSchema` validates all fields and returns a 422 if anything is invalid.

**5. Save to the database**

A new `Video` record is created in PostgreSQL with:
- `processing_status = "queued"` 
- `raw_video_path = <minio object name>` (not a full URL)
- `thumbnail_url = <minio object name>` (if provided)
- All metadata fields (title, description, category, tags, etc.)
- `uploader_id = current_user.id`

**6. Enqueue the Celery processing workflow**

The workflow is started synchronously by calling `start_video_processing()`:

```python
# video_service.py
workflow = build_video_processing_workflow(video.id)
result = workflow.delay()
video.celery_task_id = result.id
```

This is a synchronous call that submits the task to Redis and returns immediately with a task ID. The actual processing starts in the Celery worker asynchronously.

**7. Return the video record**

The API responds with the created video data (including the ID, status, and all metadata) while processing happens in the background. The frontend uses the returned `id` to poll the status endpoint.

---

## The Video Status Endpoint

**`GET /videos/{video_id}/status`** — used by the frontend to track processing progress.

Returns:
```json
{
  "id": "video-uuid",
  "processing_status": "transcoding",
  "processing_error": null,
  "available_qualities": null,
  "manifest_url": null,
  "celery_task_id": "task-uuid"
}
```

The frontend polls this every 3 seconds while processing is in progress. When `processing_status` becomes `"completed"`, the manifest URL and available qualities are populated and the player can load the video.

---

## Other Video Endpoints

**`GET /videos/`** — public video feed. Returns paginated videos with `processing_status = "completed"`. Supports filtering by category, sorting by date/views, and pagination via `page` and `page_size` query params.

**`GET /videos/by-id/{video_id}`** — get a specific video by ID. Public, but increments view count. Returns 404 if not found.

**`GET /videos/user/me`** — returns all videos uploaded by the current user (admin only meaningful here). Requires auth.

**`DELETE /videos/by-id/{video_id}`** — delete a video. Requires admin. Has a known bug (covered in the Known Bugs doc): calls `minio_service.delete_video(video.video_url)` but the field is `video.raw_video_path`. The delete endpoint will crash until this is fixed.

**`POST /videos/{video_id}/view`** — increments the view count. Called by the frontend when a user starts watching.

**`GET /videos/list-all`** — admin-only endpoint. Returns all videos (any status) with full metadata, filtering, sorting, and pagination. Used by the admin panel.

---

## Why Not Stream to Disk First?

Some systems write uploaded files to a temp directory, then upload to storage. We skip the intermediate step and stream directly from the HTTP request to MinIO. This is more efficient (no double I/O) but means we can't report upload progress — the frontend shows a spinner, not a progress bar.

---

## The `video_url` Bug

One gotcha in the current codebase: the `delete_video` endpoint in `video_service.py` (around line 389) references `video.video_url`, but no such field exists on the `Video` model. The correct field is `video.raw_video_path`. This is a clear typo that causes a runtime `AttributeError` whenever someone tries to delete a video. It's documented in Known Bugs and is a safe, one-line fix.

---

## Future Upgrades

- **Upload progress tracking** — write to a temp file on disk first, track progress with a secondary endpoint
- **Multi-file upload** — allow admins to queue multiple videos at once
- **Resumable uploads** — for large files over slow connections, support chunked upload with resume capability (TUS protocol)
- **Video preview generation** — extract a short preview clip in addition to the thumbnail
- **Draft videos** — allow admins to save metadata without uploading the video yet

---

## What's Next

The video is now sitting in MinIO and the database record says `queued`. The hard work starts now. The next document covers the six-stage Celery processing pipeline that turns that raw video file into a streamable HLS feed.
