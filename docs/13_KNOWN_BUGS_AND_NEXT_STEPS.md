# 13 — Known Bugs and Next Steps

This is the honest status document. Every known bug is listed with its exact location, every incomplete feature is categorized, and the next steps are prioritized so you can pick up and contribute without needing to audit the codebase yourself.

---

## Active Bugs

These are confirmed bugs that will cause failures at runtime. Fix these before building on top of them.

### Bug 1: Delete Video Crashes with AttributeError

**File:** `backend/app/services/video_service.py`, around line 389  
**Severity:** High — the delete endpoint is broken

```python
# Current (broken):
minio_service.delete_video(video.video_url)

# Fix:
minio_service.delete_video(video.raw_video_path)
```

The `Video` model has no `video_url` field. The correct field is `raw_video_path`. This causes an `AttributeError` whenever anyone tries to delete a video. The fix is a one-character change. After deleting from MinIO, the processed bucket files should also be deleted (all files under `{video_id}/segments/`) — this cleanup is missing from the current implementation even once the attribute name is fixed.

### Bug 2: NameError in Transcoding Failure Handler

**File:** `backend/app/tasks/video_tasks.py`, around lines 317–327  
**Severity:** Medium — causes a confusing error on total processing failure

In the `on_transcode_complete` task (the chord callback that collects parallel transcoding results), there's a branch that handles the case where every quality level fails. In this branch, `video_id` is referenced before it's assigned in that scope, causing:

```
NameError: name 'video_id' is not defined
```

This only triggers on complete transcoding failure (all 7 quality levels fail simultaneously) — a rare but possible case (e.g., corrupted video file). When it does happen, instead of a clean `"failed"` status update on the video record, you get an unhandled exception in the task. The fix is to assign `video_id` before it's used in the failure branch.

### Bug 3: Watch Page Reads Wrong Route Parameter

**File:** `app/app/(protected)/home/watch/[video_id]/page.tsx`  
**Severity:** High — the watch page can't work with real data

The page reads `params.id` but the route folder is `[video_id]`, so the parameter name is `video_id`:

```typescript
// Current (broken):
const videoId = params.id  // always undefined

// Fix:
const videoId = params.video_id
```

Because the watch page currently uses hardcoded mock data, this bug isn't visible yet. It will become immediately apparent the moment anyone tries to fetch real video data on the watch page.

### Bug 4: Staging Compose Exposes Database to All Interfaces

**File:** `infra/docker-compose.staging.yml`  
**Severity:** High — security issue

Both PostgreSQL and Redis are bound to `0.0.0.0` in the staging compose file, making them reachable from outside the host machine:

```yaml
# Current (insecure):
ports:
  - "5432:5432"    # ← binds to 0.0.0.0

# Fix:
ports:
  - "127.0.0.1:5432:5432"   # ← binds to localhost only
```

The API service in the same file correctly uses `127.0.0.1:8001:8000`. The same should be applied to postgres and redis.

---

## Incomplete Frontend Features

These aren't bugs — the code runs without crashing — but they're mocked or unfinished and need work before the platform functions end-to-end.

### Critical Missing Pieces

**HLS.js video player** — the most important missing feature. `VideoPlayer.tsx` shows a thumbnail and fake controls. No `<video>` element exists. No HLS.js library is installed. The backend generates valid HLS manifests that are sitting in MinIO unused. This is the first thing to implement.

**Home feed API connection** — `VideoGrid.tsx` renders a single hardcoded mock video. `lib/apis/video.ts` has no `getPublicVideos()` function. Two steps to fix: add the API function, then update VideoGrid to call it.

**Watch page real data** — the watch page loads a hardcoded mock object and ignores the `video_id` route parameter. Once Bug 3 is fixed, wire up `getVideoById(video_id)` to fetch real video data.

**Save Draft** — `FormActions.tsx`'s Save Draft button has a 1-second fake delay and a success toast, but no API call. Needs `status: "draft"` support in the create endpoint or a separate draft endpoint.

### Secondary Missing Features

- **No `getPublicVideos()` in `lib/apis/video.ts`** — needs to be added before the home feed can show real videos
- **No `getVideoById()` in `lib/apis/video.ts`** — needs to be added before the watch page can fetch real video data
- **No MinIO URL proxy in Caddy** — video thumbnails and manifests are stored as MinIO object paths. The frontend can't construct working URLs for them without either a Caddy proxy rule (`/storage/* → minio:9000`) or backend-generated presigned URLs
- **No `is_public` toggle in the upload form** — all videos default to private; there's no way for an admin to make a video publicly visible through the UI
- **Google OAuth button** — has no `onClick` handler. It renders but does nothing
- **Admin user management** — the admin users page has a table UI but there's no `GET /admin/users` endpoint on the backend to populate it

---

## Infrastructure Gaps

**No health checks on most services** — `depends_on` only waits for containers to start, not for them to be ready. The API and worker can fail on first boot while waiting for PostgreSQL to initialize. The fix is adding `healthcheck` blocks to each service and using `condition: service_healthy` in `depends_on`. Redis already has a healthcheck in the local and staging composes — extend the same pattern to the others.

**Worker crash-loops on cold start** — related to the above. The first `make dev` sometimes shows the Celery worker failing to connect to Redis. It auto-recovers within seconds, but it's disruptive.

---

## Prioritized Roadmap

Here's a suggested order for resuming work, from highest impact to lowest:

### Week 1: Make Videos Watchable

1. **Fix Bug 1** (video_url → raw_video_path) — 5 minutes
2. **Fix Bug 3** (params.id → params.video_id) — 5 minutes
3. **Integrate HLS.js** — install `hls.js`, implement real VideoPlayer — this makes the platform actually play videos
4. **Add Caddy proxy rule** for MinIO storage so thumbnail URLs work
5. **Wire home feed** — add `getPublicVideos()` to the API module, update VideoGrid

### Week 2: Complete the Watch Page

6. **Add `getVideoById()`** to the API module
7. **Wire up the watch page** to fetch real video data by ID
8. **Increment view count** when playback starts

### Week 3: Fix Infrastructure

9. **Fix Bug 2** (video_tasks.py NameError)
10. **Fix Bug 4** (staging compose security)
11. **Add Docker health checks** to PostgreSQL, MinIO, API, and worker

### Week 4: Admin Completeness

12. **Fix video delete** (also needs MinIO cleanup for processed files)
13. **Save Draft** — real API call with draft status
14. **Add `is_public` toggle** to upload form
15. **Backend user management endpoint** for admin user list

### Future Sprint: AI Foundation

16. **Watch history table** — prerequisite for personalization
17. **Tag-based related videos** — simple SQL, no ML required
18. **Whisper transcription task** — runs in Celery after transcoding
19. **Chapter generation** using Claude API on transcript

---

## Quick Health Check Commands

When you come back to this codebase after time away, run these to confirm the system is healthy:

```bash
make dev                    # Start the stack
make logs s=api             # Check API started without errors
make logs s=worker          # Check worker connected to Redis
curl http://localhost/health # Should return {"status": "Ok!"}

# In pgAdmin (localhost:5050) or via make db:
SELECT id, title, processing_status FROM videos ORDER BY created_at DESC LIMIT 10;

# In MinIO console (localhost:9001):
# Check that raw/, thumbnails/, and processed/ buckets exist
```

---

## What's Next

You've now read the complete documentation chain — from first-time setup through infrastructure, data models, authentication, video upload, processing pipeline, every frontend page, AI features, and finally this status document. The system is well-designed, the backend is solid, and the frontend just needs its remaining connective tissue. The next document is the API reference — a compact lookup for every endpoint when you're writing frontend code.
