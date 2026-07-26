# 13 - Known Bugs and Next Steps

This is the honest status document. Every known bug is listed with its exact location and current status, every incomplete feature is categorized, and the next steps are prioritized so you can pick up and contribute without needing to audit the codebase yourself.

The platform has reached MVP since this document was last substantially revised - the video player, home feed, and public browse/watch routes described as bugs or gaps in an earlier revision are now real and working. The frontend has also since gone through an HBO Max-style redesign (see [09_FRONTEND_HOME_AND_WATCH.md](./09_FRONTEND_HOME_AND_WATCH.md)) and a resumable-upload rollout (see [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md)) since the bug list below was last current. What follows is the re-verified list: several bugs resolved, several still live, and a handful of newly surfaced gaps from those two changes.

---

## Active Bugs

### Bug 1: `on_transcode_complete` NameError on Total Transcoding Failure - still live

**File:** `backend/app/tasks/video_tasks.py`, `on_transcode_complete(self, results: list)`
**Severity:** Medium - causes a confusing error on total processing failure, not a common-path issue

```python
successful_results = [r for r in results if r is not None and not r.get('skipped', False)]

if not successful_results:
    logger.error("All transcoding tasks failed!")
    with get_db_session() as db:
        update_video_processing_status(db, video_id, "Failed", "All transcoding tasks failed!")  # video_id undefined here
    raise Exception("No successful transcodes - cannot continue workflow")

video_id = successful_results[0]['video_id']  # only assigned here, one line too late
```

`video_id` is referenced inside the `if not successful_results:` branch before it's ever assigned - assignment only happens on the next line, which never executes if every quality level failed. The result: instead of a clean `"failed"` status update, you get `NameError: name 'video_id' is not defined`. This only triggers when all 7 quality levels fail simultaneously (a corrupted source file is the realistic trigger) - rare, but confirmed still present as of this writing. Fix: pull `video_id` from the raw `results` list before the failure check, e.g. `video_id = results[0]['video_id'] if results else None`.

### Bug 2: Staging Compose Exposes Database to All Interfaces - still live

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

Both PostgreSQL and Redis remain reachable from outside the host machine in staging. The fix is the same one-line change already applied to `api` in the same file: prefix each port mapping with `127.0.0.1:`. This is currently somewhat moot in practice: see Bug 4 below - the file can't even start yet.

### Bug 3: A Second `get_current_user` Doesn't Check Token Type and Can 500 Instead of 401 - still live

**File:** `backend/app/core/security.py`, used by `apis/routes/user.py`
**Severity:** Medium - affects `GET /user/profile`, which the frontend calls on every app load

There are two different functions named `get_current_user` in this codebase. `core/dependencies.py`'s version (used by every `/videos/*` route) calls `verify_token(token, expected_type="access")` and cleanly rejects invalid/expired/wrong-type tokens with a 401. `core/security.py`'s version, used only by `GET /user/profile`, calls `decode_token()` directly instead - it never checks the token is actually an access token (a refresh token works here), and it has a live crash: `decode_token()` swallows JWT errors and returns `None` on any invalid/expired token, and `core/security.py`'s `get_current_user` then calls `.get("user_id")` on that `None` with no guard. That's an unhandled `AttributeError`, which surfaces as a **500**, not a 401. Since `GET /user/profile` is exactly the endpoint the frontend's `initialize()` calls on every app load, an expired token there doesn't cleanly trigger the axios client's refresh-and-retry interceptor the way it does everywhere else. See [04_AUTH_SYSTEM.md](./04_AUTH_SYSTEM.md) for the full detail.

### Bug 4: Staging Compose Cannot Currently Start At All

**File:** `infra/docker-compose.staging.yml`
**Severity:** High - blocks any staging deployment, independent of Bug 2 above

Every service in this file references `env_file: staging.env`, but no `staging.env` exists anywhere in `infra/` - only `.env.example`, `local.env`, and `prod.env` do. `docker compose -f docker-compose.staging.yml up` fails immediately as written. This file also has no `tusd` service and no Caddy routes for it, so even once the missing env file is added, resumable uploads won't work in staging without further changes. See [02_INFRASTRUCTURE.md](./02_INFRASTRUCTURE.md).

### Bug 5: `uploading to storage` vs. `uploading_to_storage` String Mismatch

**File:** `backend/app/tasks/video_tasks.py` (`upload_to_minio`) vs. `backend/app/utils/video_helpers.py` (`ProcessingStatus` enum)
**Severity:** Low - cosmetic misreport during one processing stage, not a functional failure

`upload_to_minio` writes the status string `"uploading to storage"` (with a space). The enum value it's meant to match is `uploading_to_storage` (an underscore). `GET /videos/{id}/status` wraps its enum lookup in a try/except that falls back to `queued` on a mismatch, so while this stage is actually running, the API reports `queued` at ~15% progress instead of `uploading_to_storage` at ~90%. The video still completes normally; only the reported progress is wrong for the duration of this one stage. See [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md).

### Resolved: Delete Video Crash (was Bug 1 in an earlier revision)

The `delete_video` endpoint used to call `minio_service.delete_video(video.video_url)` against a field the `Video` model doesn't have, crashing on every attempt. This is resolved: `DELETE /videos/by-id/{video_id}` now calls `VideoService.soft_delete_video`, which only ever sets `deleted_at` - it doesn't touch MinIO or `raw_video_path`/`video_url` at all. A separate `VideoService.delete_video` hard-delete method exists and correctly uses `raw_video_path`, but nothing in the running app calls it. The stale `video_url` reference survives in exactly one place: a dead, unreachable legacy helper (`create_video()` at the bottom of `video_service.py`, never imported by any route) - worth deleting as cleanup, but not a live bug.

### Resolved: Watch Page Read the Wrong Route Parameter (was Bug 3)

The watch page used to read `params.id` on a route folder named `[video_id]`, so the parameter was always `undefined`. Also resolved: the current page destructures the correct key -

```tsx
const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  useEffect(() => { getVideoById(video_id).then(setVideo) /* ... */ }, [video_id])
```

- and `getVideoById()` is a real, implemented function, not a stub. This bug is gone.

### Bug 6: `saveDraft()` Points at a Route That Doesn't Exist

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

---

## Incomplete Features

These aren't bugs - the code runs without crashing - but they're mocked, unwired, or missing their backend entirely.

### Content and engagement

- **Comments** - not started. There was a `CommentSection` component on the watch page at one point, rendering hardcoded mock data; it was deleted outright (not left as a mock) during the watch-page minimalist redesign. Rebuilding this means a new component and a new `comments` table + endpoints, not resurrecting anything.
- **View counting isn't actually happening** - `POST /videos/{id}/view` is implemented on the backend and works anonymously (via `get_current_user_optional`), but nothing in the frontend calls it. The plumbing exists on both ends of a wire that isn't connected.
- **Watch history** - no backend table, no tracking. Prerequisite for "continue watching" and any recommendation feature beyond simple tag overlap.
- **Is Public toggle only exists after the fact** - the upload form has no visibility control; `is_public` can only be flipped later from the admin videos table.
- **Draft saving** - see Bug 6 above; the button is fake and the endpoint it would need doesn't exist yet either.
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

1. **Fix the `on_transcode_complete` NameError** (Bug 1) - a few minutes
2. **Fix the staging compose port binding** (Bug 2) - a few minutes
3. **Create `infra/staging.env`** (Bug 4) so the staging compose can start at all
4. **Fix the `uploading to storage` string mismatch** (Bug 5) - a few minutes
5. **Consolidate the two `get_current_user` implementations** (Bug 3) onto one, closing the 500-vs-401 gap
6. **Resolve the `saveDraft()` dead end** (Bug 6) - either build `POST /videos/draft` or repoint the function; then wire both upload forms' buttons to it
7. **Wire `incrementVideoView`** from the play page - the backend half of this already works
8. **Add a cancel button for in-progress resumable uploads**

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
19. **Add `tusd` and Caddy routes to the staging compose file** once Bug 4 is fixed, so staging matches local/prod capability

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
make logs s=worker           # Check worker connected to Redis
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
