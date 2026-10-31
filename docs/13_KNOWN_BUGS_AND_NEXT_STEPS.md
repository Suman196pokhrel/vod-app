# 13 - Known Bugs and Next Steps

This is the honest status document. Every known bug is listed with its exact location and current status, every incomplete feature is categorized, and the next steps are prioritized so you can pick up and contribute without needing to audit the codebase yourself.

The platform has reached MVP since this document was last substantially revised - the video player, home feed, and public browse/watch routes described as bugs or gaps in an earlier revision are now real and working. The frontend has also since gone through an HBO Max-style redesign (see [09_FRONTEND_HOME_AND_WATCH.md](./09_FRONTEND_HOME_AND_WATCH.md)) and a resumable-upload rollout (see [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md)) since the bug list below was last current. What follows is the re-verified list: several bugs resolved, several still live, and a handful of newly surfaced gaps from those two changes.

---

## Active Bugs

### Bug 1: Staging Compose Exposes Database to All Interfaces - still live

**File:** `infra/docker-compose.staging.yml`
**Severity:** High - security issue

```yaml
# Current (insecure) - bare host:container port syntax binds to 0.0.0.0:
postgres:
  ports:
    - "5432:5432"
redis:
  ports:
    - "6379:6379"

# api in the same file already does this correctly:
api:
  ports:
    - "127.0.0.1:8001:8000"
```

Both PostgreSQL and Redis remain reachable from outside the host machine in staging. The fix is the same one-line change already applied to `api` in the same file: prefix each port mapping with `127.0.0.1:`. This is currently somewhat moot in practice: see Bug 2 below - the file can't even start yet.

### Bug 2: Staging Compose Cannot Currently Start At All

**File:** `infra/docker-compose.staging.yml`
**Severity:** High - blocks any staging deployment, independent of Bug 1 above

Every service in this file references `env_file: staging.env`, but no `staging.env` exists anywhere in `infra/` - only `.env.example`, `local.env`, and `prod.env` do. `docker compose -f docker-compose.staging.yml up` fails immediately as written. This file also has no `tusd` service and no Caddy routes for it, so even once the missing env file is added, resumable uploads won't work in staging without further changes. See [02_INFRASTRUCTURE.md](./02_INFRASTRUCTURE.md).

### Resolved: `on_transcode_complete` NameError on Total Transcoding Failure

**File:** `backend/app/tasks/video/transcode.py`, `on_transcode_complete(self, results: list)`

`video_id` used to be referenced inside the `if not successful_results:` branch before it was ever assigned - the assignment only happened on the next line, which never executed if every quality level failed. That produced `NameError: name 'video_id' is not defined` instead of a clean `"failed"` status update whenever all 7 quality levels failed simultaneously. This is fixed: every `transcode_quality` failure path now returns an identity-carrying dict instead of bare `None`, and the all-failed branch safely extracts `video_id` via `next((r['video_id'] for r in results if r), None)` before using it.

### Resolved: A Second `get_current_user` Doesn't Check Token Type and Can 500 Instead of 401

**File:** `backend/app/core/security.py`

There used to be two different functions named `get_current_user` in this codebase. `core/dependencies.py`'s version (used by every `/videos/*` route) calls `verify_token(token, expected_type="access")` and cleanly rejects invalid/expired/wrong-type tokens with a 401. A second version in `core/security.py`, used only by `GET /user/profile`, called `decode_token()` directly instead - it never checked the token was actually an access token, and it had a live crash: `decode_token()` swallows JWT errors and returns `None` on any invalid/expired token, and that `get_current_user` then called `.get("user_id")` on the `None` with no guard, an unhandled `AttributeError` that surfaced as a 500 instead of a 401. This is fixed: the duplicate function was deleted entirely. `core/security.py` now holds only `hash_password`/`verify_password`; the single canonical `get_current_user` lives in `core/dependencies.py`, and a new `get_current_verified_user` wrapper there preserves the email-verification check `GET /user/profile` needed. See [04_AUTH_SYSTEM.md](./04_AUTH_SYSTEM.md) for the full detail.

### Resolved: `uploading to storage` vs. `uploading_to_storage` String Mismatch

**File:** `backend/app/tasks/video/upload.py` (`upload_to_minio`)

`upload_to_minio` used to write the status string `"uploading to storage"` (with a space) while the `ProcessingStatus` enum value it needed to match was `uploading_to_storage` (an underscore). `GET /videos/{id}/status` wraps its enum lookup in a try/except that falls back to `queued` on a mismatch, so while this stage was actually running, the API reported `queued` at ~15% progress instead of `uploading_to_storage` at ~90%. This is fixed: the task now writes the `ProcessingStatus.uploading_to_storage` enum member directly, not a string literal. See [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md).

### Resolved: Videos Uploaded Close Together Interleaved Their Processing

**File:** `backend/app/tasks/workflows.py`

Every upload dispatched its own Celery chain independently the moment it finished, with nothing coordinating between videos. On production, where the worker runs `--concurrency=1`, that meant every task from every video's chain competed for the same single execution slot in the same shared broker queue. Uploading two or three videos close together made each one's transcode chord (7 tasks) land in that queue around the same time, so a short video that finished transcoding first still had its later stages (`segment_videos`, `create_manifest`, `upload_to_minio`, `finalize_processing`) queued behind other videos' still-pending transcode tasks. In the admin table it looked frozen on whatever stage it last reached, sometimes for as long as every other queued video took to finish transcoding. This is fixed: a Redis lock now ensures only one video's pipeline is dispatched at a time, and every pipeline hands the lock to the next oldest `"queued"` video the moment it ends, whether it succeeded or failed. Uploading is unaffected, videos still get created immediately; they just wait their turn to actually process. The first version of this fix wired the hand-off as a `link=` callback and broke every pipeline - see the next entry. The queue now lives in `backend/app/tasks/processing_queue.py`. See [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md#multiple-videos-one-pipeline-at-a-time).

### Resolved: Every Pipeline Crashed Right After `generate_storyboard`

**Files:** `backend/app/tasks/workflows.py` (before), `backend/app/tasks/processing_queue.py` (now)

From the deploy of the processing lock (commit `46dd5eb`, 31 July 2026) until this fix, **no uploaded video could finish processing**. The thumbnail showed up on the browse page (it's stored at upload time, not by the pipeline), but opening the video showed "This video is still processing. Check back shortly." forever. In the database, the video sat at `processing_status = "generating_storyboard"` with `storyboard_url` filled in (the storyboard stage itself had succeeded), `manifest_url` null and an empty `processing_error`. The worker log showed:

```
[storyboard] ✓ Complete for <video_id>: 1 sheet(s), 9 cues
RuntimeWarning: Exception raised outside body: TypeError('Cannot add link to group: use a chord')
Task app.tasks.video_tasks.generate_storyboard[...] raised unexpected: TypeError('Cannot add link to group: use a chord')
Task app.tasks.video_tasks.advance_processing_queue[...] received
```

**Root cause:** `start_video_processing()` dispatched the chain with `apply_async(link=advance_processing_queue.si(), link_error=advance_processing_queue.si())`. Celery folds every step after the transcode chord into the chord's body, so a chain-level `link` gets attached to the chord itself. When the chord was launched after `generate_storyboard`, it passed that option on to its `group` of 7 transcode tasks, and `group.apply_async()` raises `TypeError` for any `link` (Celery 5.6.3, `celery/canvas.py`). The error happened while Celery was handing off between steps, outside any task body, so no transcode task was ever created and no task's own `try/except` could mark the video failed. The `link_error` callback did run, but it only released the lock. It reproduced on every upload, locally and in production, and inspecting the dispatched message showed `link` set on the chord.

**Fix:** releasing the lock is now `on_pipeline_success`, appended as the **last step of the chain** instead of a `link` callback, so nothing is attached to the chord any more. Rule of thumb for this codebase: never pass `link=` to the pipeline's `apply_async()`. See [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md#multiple-videos-one-pipeline-at-a-time).

**Recovering a video that hit this:** it stays at `generating_storyboard` until the worker restarts with the fix, at which point [worker startup recovery](./06_VIDEO_PROCESSING_PIPELINE.md#worker-startup-recovery) marks it failed as "interrupted". Set it back to `queued` to reprocess it (see "Debugging the Queue" in the same doc).

### Resolved: Pipeline Crashes Left Videos "Still Processing" Forever

**File:** `backend/app/tasks/processing_queue.py` (`on_pipeline_failed`)

Each task marks its own failures, but anything a task didn't catch - the `TypeError` above being the worst case - left the video at its last in-progress status with an empty `processing_error`, because the chain's `link_error` only released the lock. The watch page and the admin progress dialog then waited forever. Fixed: the chain's `link_error` is now `on_pipeline_failed`, which marks the video `"failed"` (never overwriting `"completed"`), writes the stage, failing task and exception into `processing_error` unless a task already wrote a more specific message, and then advances the queue.

### Resolved: A Worker Restart Mid-Pipeline Stalled the Whole Queue

**File:** `backend/app/tasks/processing_queue.py` (`recover_after_worker_restart`)

If the worker died or was redeployed while a pipeline was running, nothing ever ran that pipeline's callbacks: the video stayed in progress forever, and the queue behind it only moved again once the lock's 6-hour TTL expired *and* someone uploaded another video. Fixed: a `worker_init` handler now purges leftover broker messages, clears the lock, marks every in-progress video `"failed"` ("interrupted by a worker restart") and starts the oldest queued video. It assumes a single worker container - see [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md#worker-startup-recovery) before scaling workers out.

### Resolved: Delete Video Crash (was Bug 1 in an earlier revision)

The `delete_video` endpoint used to call `minio_service.delete_video(video.video_url)` against a field the `Video` model doesn't have, crashing on every attempt. This is resolved: `DELETE /videos/by-id/{video_id}` now calls `VideoService.soft_delete_video`, which only ever sets `deleted_at` - it doesn't touch MinIO or `raw_video_path`/`video_url` at all. A separate `VideoService.delete_video` hard-delete method exists (`backend/app/services/video/mutations.py`) and correctly uses `raw_video_path`, but nothing in the running app calls it. The stale `video_url` reference used to also survive in a dead, unreachable legacy helper (`create_video()`, at the bottom of the old single-file `video_service.py`) - that helper has since been deleted along with the rest of the file it lived in, which was split into the `backend/app/services/video/` package.

### Resolved: Watch Page Read the Wrong Route Parameter (was Bug 3)

The watch page used to read `params.id` on a route folder named `[video_id]`, so the parameter was always `undefined`. Also resolved: the current page destructures the correct key -

```tsx
const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  useEffect(() => { getVideoById(video_id).then(setVideo) /* ... */ }, [video_id])
```

- and `getVideoById()` is a real, implemented function, not a stub. This bug is gone.

### Bug 3: `saveDraft()` Points at a Route That Doesn't Exist

**Files:** `app/lib/apis/video.ts` (`saveDraft`), `backend/app/apis/routes/video.py` (no `/draft` route)
**Severity:** Low - currently dormant, would 404 if exercised

```typescript
// lib/apis/video.ts - this function exists and is exported:
export const saveDraft = async (data: Partial<VideoFormData>) => {
  const response = await api.post("/videos/draft", data)
  // ...
}
```

There is no `POST /videos/draft` route anywhere in `video.py`. This is currently harmless because neither upload form's "Save Draft" button calls `saveDraft()` - both still run a fake `setTimeout` (see [11_FRONTEND_VIDEO_UPLOAD.md](./11_FRONTEND_VIDEO_UPLOAD.md)). But it's a trap waiting for whoever wires the button up expecting the function to just work: it won't, until the backend route is built (or `saveDraft()` is repointed at a route that already exists).

### Bug 4: `prepare_video`'s Download Retry Can Never Succeed

**File:** `backend/app/tasks/video/prepare.py` (`prepare_video`)
**Severity:** Medium - a transient MinIO hiccup fails the video instead of being retried

```python
if video.processing_status != "queued":
    raise ValueError(f"Video not ready for processing. Current status : {video.processing_status}")

video.processing_status = "preparing"   # committed before the download
...
except Exception as e:                  # download failed
    raise self.retry(exc=e, countdown=60)
```

The first attempt commits `processing_status = "preparing"` *before* downloading. When the download fails, the task schedules a retry 60 seconds later - but the retried attempt runs the same guard, sees `"preparing"` instead of `"queued"`, and raises `ValueError: Video not ready for processing. Current status : preparing`. Found while testing the processing-queue fix: a video with a missing raw object sat at `preparing` for exactly 60 seconds and then failed with that misleading "not ready" message (the chain's `link_error` now at least marks it failed instead of leaving it stuck). The fix is to let the guard accept a retry of the same task, e.g. allow `"preparing"` when `self.request.retries > 0`.

**Partly fixed:** the same retry path used to crash one line later too - `os.makedirs(work_dir_path)` raised `FileExistsError` on the directory the first attempt created. More importantly, that also made it impossible to re-queue *any* video whose earlier run failed or was interrupted, because its working directory was still on disk (`Pipeline stopped during 'preparing' (app.tasks.video_tasks.prepare_video): FileExistsError(17, 'File exists')`). `prepare_video` now removes a leftover working directory before creating it. That's safe because only one pipeline runs at a time. The status guard above is still open.

### Bug 5: `transcode_quality`'s Outer `except Exception: pass` Swallows Retries and Validation Errors

**File:** `backend/app/tasks/video/transcode.py` (`transcode_quality`)
**Severity:** Medium - found by reading the code, not reproduced yet

```python
try:
    ...                                   # input validation raises ValueError / FileNotFoundError / ...
    try:
        ...                               # FFmpeg
    except subprocess.CalledProcessError as e:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60)
        ...
except Exception as exc:
    # Retry logic
    pass                                  # → task returns None
```

`self.retry()` works by publishing a new copy of the task and then raising a `Retry` exception, which Celery needs to see to record the attempt as "retrying". Here that `Retry` is raised inside the inner `except`, so it lands in the outer `except Exception` and is silently dropped: the current attempt reports *success* with a `None` result while the retry copy also runs, so the chord can see the same quality complete twice. The input-validation errors above the inner `try` (missing input file, empty file, invalid quality, missing height) end up in the same `pass`: the quality is silently treated as a failed transcode (`on_transcode_complete` filters out `None`) without any log line or status update. The fix is to re-raise `Retry` (`except Retry: raise`) and to log or return an identity-carrying `{"failed": True}` dict for everything else, like the inner handlers already do.

---

## Incomplete Features

These aren't bugs - the code runs without crashing - but they're mocked, unwired, or missing their backend entirely.

### Content and engagement

- **Comments** - not started. There was a `CommentSection` component on the watch page at one point, rendering hardcoded mock data; it was deleted outright (not left as a mock) during the watch-page minimalist redesign. Rebuilding this means a new component and a new `comments` table + endpoints, not resurrecting anything.
- **View counting isn't actually happening** - `POST /videos/{id}/view` is implemented on the backend and works anonymously (via `get_current_user_optional`), but nothing in the frontend calls it. The plumbing exists on both ends of a wire that isn't connected.
- **Watch history** - no backend table, no tracking. Prerequisite for "continue watching" and any recommendation feature beyond simple tag overlap.
- **Is Public toggle only exists after the fact** - the upload form has no visibility control; `is_public` can only be flipped later from the admin videos table.
- **Draft saving** - see Bug 3 above; the button is fake and the endpoint it would need doesn't exist yet either.
- **No cancel button for in-progress resumable uploads** - this is a code-acknowledged gap, not speculation: `backend/app/core/config.py` explicitly documents that `tus_admission_ttl_hours` was shortened from 24h to 2h specifically because an abandoned upload has no way to be cancelled from the UI yet. See [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md).

### Admin surfaces

- **Admin user management has no backend** - no `GET /admin/users` or equivalent exists anywhere in the API. The admin Users page is UI only.
- **Admin dashboard stats, analytics charts, settings save** - all UI only, hardcoded or non-functional. Categories management got a real, restyled icon-picker UI during the design migration, but categories themselves are still a plain string field on `Video` - no database table, no CRUD API.

### Dead/orphaned components (not bugs, but worth knowing about if you're hunting for where a feature lives)

- The AI mock components (scene timeline, mood analysis, recommendations, watch party, content warnings, mood selector, continue watching, top 10, content journey, quick access sidebar) still exist as files but are no longer imported into any page. See [12_AI_FEATURES.md](./12_AI_FEATURES.md).
- The original marketing landing page components (`Landing*.tsx` under `app/(public)/_components/`) are similarly orphaned - the standalone landing page was deleted when the browse feed became the root route.
- Google's "Continue with Google" button was removed entirely (not merely unwired) during the auth-screens redesign - there's no placeholder left.

---

## Infrastructure Gaps

**No health checks on most services** - `depends_on` only waits for containers to start, not for them to be ready. The API and worker can fail on first boot while waiting for PostgreSQL to initialize. Redis is the only service with a `healthcheck` block, across all three compose files. The fix is adding `healthcheck` blocks to postgres/api/worker/minio and using `condition: service_healthy` in `depends_on`.

**Worker crash-loops on cold start** - related to the above. The first `make dev` sometimes shows the Celery worker failing to connect to Redis. It auto-recovers within seconds, but it's disruptive.

---

## Prioritized Roadmap

The "make videos watchable" phase is done. What's left is genuinely secondary - polish, admin completeness, and features nobody strictly needs to have a working VOD platform.

### Near-term: Fix what's flagged above

1. **Fix the staging compose port binding** (Bug 1) - a few minutes
2. **Create `infra/staging.env`** (Bug 2) so the staging compose can start at all
3. **Resolve the `saveDraft()` dead end** (Bug 3) - either build `POST /videos/draft` or repoint the function; then wire both upload forms' buttons to it
4. **Wire `incrementVideoView`** from the play page - the backend half of this already works
5. **Add a cancel button for in-progress resumable uploads**
6. **Fix `prepare_video`'s download retry** (Bug 4) - let the status guard accept a retry of the same task and make `os.makedirs` idempotent
7. **Fix `transcode_quality`'s swallowed retries** (Bug 5) - re-raise `Retry` and log or report everything else
8. **Clean up the temp directory on failure** - from `on_pipeline_failed`, which now runs for every failed pipeline

### Admin completeness

9. **Admin user-management API** - `GET /admin/users` with filtering and pagination; role/active-status updates
10. **Real analytics** - start with simple DB aggregations on the videos table; graduate to event streaming for real-time dashboards later
11. **Categories as a proper entity** - database table, CRUD endpoints, and update the video create/edit schemas to reference category IDs
12. **Settings save** - wire the settings page to an actual persistence layer
13. **Is Public at creation time** - add the toggle to the upload form itself

### Content completeness

14. **Comments** - new component, new table, new endpoints (there's no old UI to reconnect to)
15. **Watch history table** - prerequisite for personalization and "continue watching"

### Infrastructure hardening

16. **Docker health checks** on PostgreSQL, MinIO, API, and worker, wired into `depends_on: condition: service_healthy`
17. **Enable 4K transcoding** if/when the processing time tradeoff is acceptable
18. **Backfill storyboards** for videos processed before the scrubbing-preview feature shipped
19. **Add `tusd` and Caddy routes to the staging compose file** once Bug 2 is fixed, so staging matches local/prod capability

### Future sprint: AI foundation

20. **Tag-based related videos** - simple SQL, no ML required
21. **Whisper transcription task** - runs in Celery after transcoding
22. **Chapter generation** using an LLM on the transcript
23. Reintroducing any orphaned AI component means re-adding its import/JSX to a page *and* giving it a real data source - not just fixing the data source in place.

---

## Quick Health Check Commands

When you come back to this codebase after time away, run these to confirm the system is healthy:

```bash
make dev                    # Start the stack
make logs s=api             # Check API started without errors
make logs s=worker           # Check worker connected to Redis, and its "[queue] Worker startup recovery" line
curl http://localhost/health # Should return {"status": "Ok!"}

# In pgAdmin (localhost:5050) or via make db:
SELECT id, title, processing_status, is_public, deleted_at FROM videos ORDER BY created_at DESC LIMIT 10;

# In MinIO console (localhost:9001):
# Check that vod-videos/, vod-thumbnails/, and vod-processed/ buckets exist,
# and that a recently-processed video has a storyboard/ prefix under vod-thumbnails/
```

---

## What's Next

You've now read the complete documentation chain - from first-time setup through infrastructure, data models, authentication, video upload, processing pipeline, every frontend page, AI features, and finally this status document. The system reached MVP with a real playback experience, a public browse/watch surface, and a genuinely functional admin video workflow. The remaining gaps are documented above, not hidden. The next document is the API reference - a compact lookup for every endpoint when you're writing frontend code.
