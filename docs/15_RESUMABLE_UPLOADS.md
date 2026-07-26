# 15 - Resumable Uploads (tusd + Uppy)

Videos larger than a couple hundred MB do not upload well as a single HTTP request. A dropped connection means starting over, and the whole file has to pass through the FastAPI process before it reaches MinIO, tying up backend resources for the duration.

This is why the platform has a second upload path built on the [tus protocol](https://tus.io), using tusd (the reference server) as a dedicated ingest service and [Uppy](https://uppy.io) as the browser-side client. As of this doc, it is the **default** path for admin video uploads. Design rationale and alternatives considered live in [docs/adr/resumable-uploads-tusd.md](./adr/resumable-uploads-tusd.md) - this doc describes what actually shipped.

## Why two upload paths exist

`POST /videos/create` (the original multipart endpoint, described in [05_VIDEO_UPLOAD.md](./05_VIDEO_UPLOAD.md)) still exists and still works. It's the fallback, not a leftover. Whether the admin upload page renders the resumable form or the legacy one is controlled by a feature flag:

```
NEXT_PUBLIC_UPLOADS_TUS_ENABLED=true   # app/.env.example
uploads_tus_enabled: bool = True       # backend/app/core/config.py
```

Both default to `true` when unset, so a fresh clone gets the resumable flow without any extra setup. Set `NEXT_PUBLIC_UPLOADS_TUS_ENABLED=false` to fall back to the legacy multipart form, and `uploads_tus_enabled=false` on the backend to 404 the entire tusd hook surface (see "Feature flag" below for what that gate actually protects).

## Architecture

```
Browser (Uppy)
  |
  |  chunked PUT/PATCH, resumable via HEAD offset check
  v
Caddy  --/files/*-->  tusd (own container)
  |                      |
  |  hook POST            |  S3 multipart upload, direct to MinIO
  |  (pre-create,         v
  |   post-finish,     MinIO
  |   post-terminate)
  v
FastAPI (/internal/tus/hooks)
  |
  |  writes TusUpload + Video rows, enqueues Celery
  v
PostgreSQL + Redis + Celery worker (same processing pipeline as any other video)
```

The video's bytes never touch the FastAPI process. tusd streams chunks to local disk briefly, then pushes each part directly to MinIO as an S3 multipart upload part. FastAPI is only in the control plane: it decides whether an upload is allowed to start (pre-create) and reacts once one finishes (post-finish).

## Backend pieces

**`backend/app/services/tus_service.py`** - the actual hook logic:

- `handle_pre_create(event)` - reads a JWT out of the upload's metadata (not an `Authorization` header, since tusd's hook payload doesn't carry one), verifies it, requires admin role, requires `title`/`category` metadata, checks declared size against `tus_max_file_size_gb`, checks MIME type against `tus_allowed_mime_types`, and enforces a concurrency cap (`tus_max_concurrent_uploads`) via a Redis-backed counter. Generates the upload's real ID here (tusd hasn't assigned one yet at this point) and hands it back via `ChangeFileInfo.ID`. Also strips the JWT out of the metadata it echoes back - without this, the token would sit in MinIO's `.info` sidecar object in plaintext for as long as that object exists.
- `handle_post_finish(event)` - idempotent (tusd can retry hook delivery). Creates the `Video` row with `is_public=False, status="draft"` - deliberately more conservative than the multipart path, since nothing has reviewed this video yet. Then calls `start_video_processing(video.id)`, the exact same Celery entry point the legacy upload path uses (see [06_VIDEO_PROCESSING_PIPELINE.md](./06_VIDEO_PROCESSING_PIPELINE.md) - from this point on, a tus-uploaded video is indistinguishable from any other video in the pipeline).
- `handle_post_terminate(event)` - marks the `TusUpload` row `terminated` if an upload is abandoned or cancelled before finishing.
- `get_upload_status(upload_id)` - looks up a `TusUpload` row's `status` and resolved `video_id`, used by the frontend to learn the `video_id` a completed upload produced (tus's own protocol has no way to hand that back).

**`backend/app/apis/routes/tus_hooks.py`** - `POST /internal/tus/hooks` (what tusd calls) and `GET /internal/tus/hooks/uploads/{upload_id}` (what the frontend polls). Both routes are gated by `uploads_tus_enabled` at the dependency level - with the flag off, this entire surface 404s rather than revealing that a protected endpoint exists there. The hook POST route is additionally protected by an HMAC-compared shared secret (`tus_hook_shared_secret`) passed as a query param, since tusd has no way to attach a custom header to its hook calls.

**`backend/app/models/tus_upload.py`** - the `TusUpload` model: `upload_id` (tusd's own ID, primary key), `user_id`, `video_id` (nullable, set on post-finish), `object_key`, `declared_size`, `status` (`created` / `completed` / `failed` / `terminated`), `created_at`, `completed_at`.

## Frontend pieces

**`app/(protected)/admin/videos/upload/page.tsx`** picks the form:

```tsx
{isResumableUploadsEnabled() ? <TusUploadForm /> : <LegacyUploadForm />}
```

**`TusUploadForm.tsx`** (`app/(protected)/admin/videos/_components/uploadForm/`) - the resumable flow. Shares the same Zod schema and form sections (`BasicInformationSection`, `AdditionalDetailsSection`, `PublishingSection`) as the legacy form; what differs is submission mechanics:

1. On submit, the video file is handed to an Uppy instance (`@uppy/core` + `@uppy/tus`) with only `title`/`category`/access-token in its tus metadata - not the full form.
2. Uppy uploads directly to tusd at `/files/` behind Caddy, in 50MB chunks, with pause/resume support (`handleTogglePause`, wired to Uppy's own `pauseResume()`).
3. On completion, the frontend polls `GET /internal/tus/hooks/uploads/{upload_id}` (via `lib/apis/tusUpload.ts`'s `getTusUploadStatus()`) until the post-finish hook has resolved a `video_id` - up to 20 attempts, 1.5s apart.
4. Once a `video_id` is known, the thumbnail (`POST /videos/{video_id}/thumbnail`) and the rest of the form's metadata (`PATCH` via `updateVideoDetails()`) are sent as two separate follow-up requests, since the video row already exists with just title+category by this point.

**`LegacyUploadForm.tsx`** - the original multipart flow, preserved behaviorally as-is, rendered only when the flag is off.

## Infrastructure

tusd runs as its own Docker service (`infra/docker-compose.local.yml` and `infra/docker-compose.yml`, not yet added to `infra/docker-compose.staging.yml`):

```yaml
tusd:
  image: tusproject/tusd:v2.9.2
  command:
    - -behind-proxy
    - -s3-bucket=${minio_bucket_videos}
    - -s3-endpoint=http://minio:9000
    - -hooks-http=http://api:8000/internal/tus/hooks?secret=${tus_hook_shared_secret}
    - -hooks-enabled-events=pre-create,post-finish,post-terminate
```

It writes directly to MinIO using the same `minio_bucket_videos` bucket every other upload path uses, under an `tus-uploads/` object prefix. Caddy fronts it at `/files/*` (`infra/caddy/Caddyfile.local`), and separately proxies `GET /internal/tus/hooks/uploads/*` (the frontend-polled status route) while blocking public access to the rest of the `/internal/*` surface, since the hook POST route carries a secret in its query string that should never appear in a public-facing access log. tusd calls the hook POST route directly over the internal Docker network, never through Caddy.

## Configuration reference

All settings live in `backend/app/core/config.py`, sourced from `infra/local.env` / `infra/.env.example`:

| Setting | Default | What it controls |
|---|---|---|
| `uploads_tus_enabled` | `true` | Master flag - gates the entire hook route surface (404s when off) |
| `tusd_endpoint_url` | `http://tusd:1080` | Internal service-to-service URL (not used by the browser, which goes through Caddy) |
| `tus_part_size_mb` | `50` | S3 multipart part size |
| `tus_max_concurrent_uploads` | `8` | Admission-control cap, enforced via a Redis counter in the pre-create hook |
| `tus_max_file_size_gb` | `50` | Rejected in pre-create if the declared size exceeds this |
| `tus_allowed_mime_types` | `video/mp4`, `video/quicktime`, `video/webm` | Rejected in pre-create if the file's type isn't in this list |
| `tus_hook_shared_secret` | (required) | Validates that hook POSTs actually came from tusd |
| `tus_admission_ttl_hours` | `2` | How long an admitted upload counts against the concurrency cap |

The admission TTL was deliberately shortened from an original 24h down to 2h - see the known gap below for why.

## Known gaps

- **No cancel button in the upload UI.** This is the reason `tus_admission_ttl_hours` is 2 hours instead of something longer: without a way for an admin to explicitly cancel an in-progress upload, an abandoned one (closed tab, never resumed) would otherwise hold its concurrency slot for as long as the TTL allows. 2 hours bounds the blast radius without cutting off a legitimately slow, large upload.
- **`docker-compose.staging.yml` has no `tusd` service** and no `staging.env` file exists in `infra/` at all - every service in that compose file references `env_file: staging.env`, so the staging environment currently cannot boot, tus-enabled or not. See [13_KNOWN_BUGS_AND_NEXT_STEPS.md](./13_KNOWN_BUGS_AND_NEXT_STEPS.md).
- **Save Draft is still simulated** on both upload forms - see [11_FRONTEND_VIDEO_UPLOAD.md](./11_FRONTEND_VIDEO_UPLOAD.md) for the existing `POST /videos/draft` gap, which affects the tus form the same way it affects the legacy one.

## What's next

Continue to [00_GETTING_STARTED.md](./00_GETTING_STARTED.md) if you haven't set up the stack yet (the tusd container starts automatically with `make dev`), or [13_KNOWN_BUGS_AND_NEXT_STEPS.md](./13_KNOWN_BUGS_AND_NEXT_STEPS.md) for the full list of known gaps across the platform.
