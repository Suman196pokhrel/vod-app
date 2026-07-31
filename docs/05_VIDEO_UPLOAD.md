# 05 - Video Upload

With authentication working, we have users who can log in. Now let's look at what admins do once they're in: uploading a video. This document covers the original, still-functioning upload endpoint. It is no longer the default path an admin actually hits - that's now the resumable (tusd + Uppy) flow described in [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md). This endpoint is the fallback, used when `NEXT_PUBLIC_UPLOADS_TUS_ENABLED=false`, and it's still worth understanding on its own terms.

---

## The Upload Endpoint

**`POST /videos/create`** - defined in `backend/app/apis/routes/video.py`

This endpoint is admin-only (requires `get_current_admin_user` dependency). It accepts a `multipart/form-data` request - not a JSON body.

Here's why: HTTP multipart is the standard way to upload binary files. But our upload also needs structured metadata (title, description, category, etc.). You can't cleanly mix a JSON object with file fields in a single multipart request. The solution we use: encode the metadata as a JSON-serialized **string** in a form field called `data`.

So the request looks like this:

```
Content-Type: multipart/form-data

video: <binary file data>
thumbnail: <binary image data> (optional)
data: '{"title": "My Video", "description": "...", "category": "Drama", ...}'
```

Note the video field is named `video`, not `video_file`. The `data` field is a string that gets parsed on the server with `json.loads(data)`. This is unconventional but practical. The Swagger UI at `/docs` can test this, but you need to manually serialize the metadata as a string.

---

## What Happens on the Server

The handler in `video.py` calls `VideoService.create_video_with_files()` in `backend/app/services/video/service.py`, which delegates file validation to `validate_video_file`/`validate_thumbnail_file` in `backend/app/services/video/validation.py`. Here's the sequence:

**1. Validate the video file**

Validation only checks `content_type` against `video/mp4`, `video/quicktime`, and `video/webm` - no MKV or AVI, and **no size limit is enforced at the application level at all**. Thumbnail validation is the same shape: content-type check only (jpeg/png/webp), no dimension or size check. Worth knowing before you rely on either as a real gate.

**2. Upload the raw video to MinIO**

The file is streamed directly from the request to MinIO - it's not written to disk on the API server first. The object name (MinIO path) is:

```
user-{user_id}/{uuid}.{extension}
```

For example: `user-abc123/f47ac10b-58cc-4372-a567-0e02b2c3d479.mp4`

The `user-` prefix groups files by uploader, which makes it easy to list or delete all files for a user. The UUID prevents filename collisions when the same user uploads two videos with the same filename.

**3. Upload the thumbnail (if provided)**

If a thumbnail image was included in the request, it's uploaded to the thumbnails bucket with a similar path. If no thumbnail is provided, `thumbnail_url` stays null. Note: the upload form frontend effectively requires a thumbnail (it won't submit without one), so this will almost always be populated.

**4. Parse and validate metadata**

The `data` JSON string is parsed. Required fields: `title` (5-200 chars), `description` (10-5000 chars), `category`. The Pydantic schema `VideoMetadata` validates all fields and returns a 422 if anything is invalid.

**5. Save to the database**

A new `Video` record is created in PostgreSQL with:
- `processing_status = "queued"` 
- `raw_video_path = <minio object name>` (not a full URL)
- `thumbnail_url = <minio object name>` (if provided)
- All metadata fields (title, description, category, tags, etc.)
- `user_id = current_user.id`

**6. Try to enqueue the Celery processing workflow**

The API calls `try_advance_queue()` (`app/tasks/workflows.py`), not `start_video_processing()` directly:

```python
# services/video/service.py
try_advance_queue()
```

Only one video's pipeline processes at a time (see [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md#multiple-videos-one-pipeline-at-a-time)), so `try_advance_queue()` first checks whether anything else is already running. If nothing is, it dispatches the oldest `"queued"` video's chain via `start_video_processing()` (which builds the chain with `create_video_processing_workflow()`, submits it with `.apply_async()`, and stamps `video.celery_task_id` on whichever row actually got dispatched). If something else is already processing, this call is a no-op and the video simply stays at `processing_status = "queued"` until its turn. Either way, this is synchronous and returns immediately, it never blocks the upload response. This is the exact same entry point the resumable-upload flow's post-finish hook calls, so from this point on a video's journey through the pipeline is identical regardless of which upload path created it.

**7. Return the video record**

The API responds with the created video data (including the ID, status, and all metadata) while processing happens in the background. The frontend uses the returned `id` to poll the status endpoint.

---

## The Video Status Endpoint

**`GET /videos/{video_id}/status`** - used by the frontend to track processing progress.

Returns (the actual response model, `VideoProcessingStatusResponse`):
```json
{
  "video_id": "video-uuid",
  "status": "transcoding",
  "progress": 45,
  "message": "Transcoding video qualities",
  "error": null,
  "is_completed": false,
  "is_failed": false
}
```

The frontend polls this every 3 seconds while processing is in progress. When `status` becomes `"completed"` (`is_completed: true`), the frontend fetches the full video record separately to get the manifest URL and available qualities.

---

## Other Video Endpoints

**`GET /videos/`** - public video feed. Returns all public videos (lightweight `VideoList` shape), paginated via `skip`/`limit`. No auth required.

**`GET /videos/by-id/{video_id}`** - get a specific video by ID. Uses optional auth (`get_current_user_optional`): a public video is visible to anyone; a private video is visible only to its owner or an admin. Anyone else gets a **404**, not a 403 - the API never confirms that a private video exists to someone who can't see it.

**`GET /videos/user/me`** - returns all videos uploaded by the current user. Requires auth.

**`DELETE /videos/by-id/{video_id}`** - **soft-deletes** a video. Requires admin. Sets `deleted_at` to the current time; the row and every MinIO file are left in place, and permanent cleanup is left to a separate process that doesn't exist yet. Every listing and lookup path filters out rows with a non-null `deleted_at`. (A `VideoService.delete_video` hard-delete method also exists - correctly using `raw_video_path`, not the old `video_url` field the schema dropped two migrations ago - but nothing in the running app calls it; it's dead code kept for whenever a real purge process gets built.)

**`PATCH /videos/by-id/{video_id}/visibility`** - flips a video between public and private (`{"is_public": true|false}`) without touching anything else. Requires admin. This is how the admin videos table's visibility toggle works - it does not go through the upload form, since the form itself has no public/private field.

**`PATCH /videos/by-id/{video_id}`** - the admin "Edit Details" form. Every field is optional; only fields present in the request body are changed (`exclude_unset` on the backend). Requires admin.

**`GET /videos/by-id/{video_id}/download-url`** - returns a presigned MinIO URL (15-minute expiry) for the original raw file, with `Content-Disposition: attachment` already set so the browser downloads rather than plays it. Requires admin. The host/scheme for the presigned signature are read from the incoming request (Caddy forwards `Host` and sets `X-Forwarded-Proto`) rather than hardcoded, so the same code signs correctly in both dev and production.

**`POST /videos/{video_id}/view`** - increments the view count. Uses optional auth so anonymous viewers count too. As of this writing the frontend watch page doesn't actually call this endpoint yet - it exists and works, but nothing invokes it (see [13_KNOWN_BUGS_AND_NEXT_STEPS.md](./13_KNOWN_BUGS_AND_NEXT_STEPS.md)).

**`GET /videos/list-all`** - admin-only endpoint. Returns all videos (any status) with full metadata, filtering, sorting, and pagination. Used by the admin panel.

**`POST /videos/{video_id}/thumbnail`** - attaches or replaces a thumbnail on an existing video record. Requires admin. This endpoint exists specifically for the resumable-upload flow: since a tus-created video's row only has title+category at creation time, the thumbnail is sent as a separate follow-up request once the frontend knows the new `video_id`. See [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md).

---

## Why Not Stream to Disk First?

Some systems write uploaded files to a temp directory, then upload to storage. We skip the intermediate step and stream directly from the HTTP request to MinIO. This is more efficient (no double I/O) but means we can't report upload progress - the frontend shows a spinner, not a progress bar.

---

## A Resolved Bug, and a New One in Its Place

An earlier version of this document described a crash: `delete_video` referenced `video.video_url`, a field the `Video` model doesn't have. That's now resolved on the live code path - the delete endpoint calls `soft_delete_video`, which only ever touches `deleted_at`, and the surviving hard-delete helper correctly uses `raw_video_path`. The stale `video_url` reference used to also survive inside a second, unreachable legacy helper (`create_video()`); that dead helper has since been deleted, so the reference is gone from the codebase entirely, not just unreachable.

A smaller, previously undocumented gap took its place: the frontend's `saveDraft()` function (`lib/apis/video.ts`) posts to `POST /videos/draft` - a route that doesn't exist anywhere in `video.py`. It's currently harmless because the upload form's "Save Draft" button doesn't call `saveDraft()` yet (see [11_FRONTEND_VIDEO_UPLOAD.md](./11_FRONTEND_VIDEO_UPLOAD.md)), but wiring the button to the existing function as-is would 404.

---

## Future Upgrades

- **Multi-file upload** - allow admins to queue multiple videos at once
- **Video preview generation** - extract a short preview clip in addition to the thumbnail
- **Real draft saving** - either build the missing `POST /videos/draft` endpoint the frontend already expects, or point `saveDraft()` at an existing endpoint and drop the dead code
- **Hard-delete / cleanup job** - a scheduled task that actually purges soft-deleted videos (row + MinIO files) after a retention window
- **Real size/format enforcement on this endpoint** - validation today only checks `content_type`; there's no magic-byte sniffing, no `ffprobe` check, and no size cap anywhere on this fallback path. A deeper validation pass (a former dead duplicate of the live check) was removed as cleanup rather than kept as a starting point, so this would be new work, not just re-wiring existing code

Resumable, chunked uploads with pause/resume are not a future upgrade - they already shipped and are the default path. See [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md).

---

## What's Next

The video is now sitting in MinIO and the database record says `queued`. The hard work starts now. The next document covers the Celery processing pipeline - storyboard generation plus the multi-stage transcode/segment/manifest chain - that turns that raw video file into a streamable HLS feed with scrubbing-preview thumbnails.
