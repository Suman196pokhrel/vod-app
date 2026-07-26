# Design Spec: Resumable Large-File Uploads (tusd + Uppy)

- Date: 2026-07-26
- Builds on: [`docs/adr/resumable-uploads-tusd.md`](../../adr/resumable-uploads-tusd.md) (Accepted)
- Status: Draft, pending approval

This spec does not re-litigate the ADR's decision (tusd + Uppy, data-plane/control-plane
split). It binds that decision to this codebase's actual files, config, and schema so it's
directly implementable. It maps 1:1 onto the ADR's Phase 2–5 rollout plan and the user's
7-step instruction set.

**Scope note on testing:** per explicit instruction, this feature adds no automated tests.
The repo has none today (verified: no `backend/tests/`, no pytest in `requirements.txt`, no
frontend test config). Every step's "verify" below is a manual/scripted check — `docker
compose` health, `curl`, `psql`/`redis-cli` inspection, app boot — not a test suite run.

## 1. Config & feature flag (Step 1)

New fields in `backend/app/core/config.py`'s `Settings` class, following the existing
lowercase-snake-case-matches-env-var convention:

```python
# Resumable upload (tusd) settings — all inert until uploads_tus_enabled is true
uploads_tus_enabled: bool = False

tusd_endpoint_url: str = "http://tusd:1080"       # internal, service-to-service
tus_part_size_mb: int = 50
tus_max_concurrent_uploads: int = 5
tus_max_file_size_gb: int = 50
tus_allowed_mime_types: list[str] = ["video/mp4", "video/quicktime", "video/webm"]
tus_hook_shared_secret: str = ""                  # required when uploads_tus_enabled=true
tus_admission_ttl_hours: int = 24                 # admission-control slot lifetime, not tied to storage cleanup
```

`tus_allowed_mime_types` intentionally matches the existing multipart path's
`ALLOWED_VIDEO_TYPES` (`video_service.py:496`) exactly, so a file rejected by one path would
be rejected by the other.

Mirrored in `infra/local.env` / `infra/*.env.example` at their existing lowercase block,
with `uploads_tus_enabled=false` committed as the default everywhere. `tus_hook_shared_secret`
is a new secret — generated locally, never hardcoded, following the same pattern as
`jwt_secret_key`.

Frontend mirror: `NEXT_PUBLIC_UPLOADS_TUS_ENABLED` (build-time env var), the first
feature flag on either side of this app — there's no existing flag mechanism to match,
backend or frontend, so this establishes the pattern rather than following one.

**Verify:** app boots, `GET /health` unaffected, `Settings().uploads_tus_enabled is False` by
default, no other endpoint's behavior changes.

## 2. Database (Step 2)

New table, not new columns on `Video` — a tus upload's lifecycle starts before a `Video` row
should exist (we don't have confirmed metadata until `post-finish`), so overloading `Video`
with pre-completion upload state would mean nullable columns that are only ever populated
for one code path. A separate table mirrors how `Video` itself is only created once upload
data is actually available.

```python
# backend/app/models/tus_upload.py
class TusUpload(Base):
    __tablename__ = "tus_uploads"

    upload_id = Column(String, primary_key=True)          # tusd's own upload ID
    user_id = Column(String(100), ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=True, index=True)  # set on post-finish
    object_key = Column(String(500), nullable=True)       # final MinIO key, set on post-finish
    declared_size = Column(Integer, nullable=False)
    status = Column(String(30), default="created", index=True)  # created|completed|failed|terminated
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
```

Registered in `app/models/__init__.py` alongside the other models. Migration follows the
existing autogenerate shape (see `bdc80bbbc0c9_add_storyboard_url_to_video_table.py`):
`upgrade()` does `op.create_table(...)`, `downgrade()` does `op.drop_table("tus_uploads")`.

**Known project-specific hazard, must be handled explicitly:** `main.py`'s lifespan runs
`Base.metadata.create_all(bind=engine)` on every boot, and `create_all()` *does* create
tables that don't exist yet (it only skips existing ones). The local `api` container runs
with `--reload`, so saving the new model file restarts uvicorn and `create_all()` will
create `tus_uploads` immediately — before `alembic upgrade head` is ever run by hand. Running
the migration afterward would then fail with "relation already exists."

Handling: this isn't a maybe — on the local dev box, `create_all()` **will** win, every time,
because saving the new model file is what triggers uvicorn's `--reload` restart, and that
restart's lifespan is what runs `create_all()`. So the expected, primary sequence for the dev
DB is: add the model, let `--reload` restart (table now exists via `create_all()`), then run
`alembic stamp <revision>` — **not** `alembic upgrade head`, which would fail with "relation
already exists" and look like a bug when it isn't. This exactly mirrors this repo's own
history, which did the same `stamp head` maneuver for its pre-Alembic schema (see `main.py`'s
lifespan comment).

Correctness (up/down actually work) is verified separately, never on the live dev DB: a
disposable DB copy (`pg_dump` the dev DB into a scratch container, or a throwaway schema via
`make db`) where `create_all()` hasn't run, so `alembic upgrade head` → `downgrade -1` →
`upgrade head` again all execute for real instead of being short-circuited by `stamp`.

**Verify:** upgrade + downgrade + upgrade again on the scratch copy, `\d videos` unchanged,
existing `videos` rows untouched, app boots normally.

## 3. tusd service (Step 3)

New service in `infra/docker-compose.local.yml` (and mirrored, but not started, in the prod
compose file) on the existing `backend_net` bridge network — no new network:

```yaml
tusd:
  image: tusproject/tusd:v2.9.2   # pinned
  command:
    - -s3-bucket=${minio_bucket_videos}
    - -s3-endpoint=http://minio:9000
    - -s3-part-size=${tus_part_size_mb}000000
    - -s3-object-prefix=tus-uploads/
    - -hooks-http=http://api:8000/internal/tus/hooks?secret=${tus_hook_shared_secret}
    - -hooks-enabled-events=pre-create,post-finish,post-terminate
    - -upload-dir=/srv/tusd-data
  environment:
    AWS_ACCESS_KEY_ID: ${minio_access_key}
    AWS_SECRET_ACCESS_KEY: ${minio_secret_key}
    AWS_REGION: us-east-1
  volumes:
    - tusd_data:/srv/tusd-data     # temp part buffering, new named volume
  networks:
    - backend_net
  # No `ports:` — not exposed to the host or Caddy yet. Step 6 adds the Caddy route
  # *and* the `-behind-proxy` flag together — adding `-behind-proxy` here, before
  # anything actually proxies to tusd, would be inert and misleading about what's
  # actually protecting this service at this stage (nothing proxies here yet;
  # the network boundary is the only control until Step 6).
```

`local.env` uses lowercase keys matching pydantic's `Settings` fields exactly (confirmed:
`minio_bucket_videos`, `minio_access_key`, etc. — no uppercase duplicates exist), and `make
dev`/`make build` invoke `docker compose --env-file local.env`, so YAML-level `${...}`
interpolation is case-sensitive against those exact lowercase keys. New tus vars are added to
`local.env` in the same lowercase form so both this interpolation and the api container's
`Settings` (via the same `env_file:` injection every other service already uses) read from
one consistent source, no duplicate uppercase copies.

Object key prefix inside the bucket: `tus-uploads/`, set via tusd's own `-s3-object-prefix`
flag (confirmed to exist against the pinned version's docs) rather than per-upload override —
distinct from the existing `user-{user_id}/{uuid}.{ext}` convention used by direct multipart
uploads, so the two paths' objects are trivially distinguishable in the bucket during the
parallel-run period.

Pinned image: `tusproject/tusd:v2.9.2` (confirmed current stable on Docker Hub at design
time), not a floating tag.

Credentials reused from existing MinIO secrets (`minio_access_key`/`minio_secret_key` already
in `infra/local.env`) — no new secret for storage access, only the new
`tus_hook_shared_secret` from Step 1.

**Verify:** `docker compose up` — `tusd` container healthy, `postgres`/`redis`/`minio`/`api`/
`worker` all unaffected (same startup behavior as before this service existed). `tusd` is not
reachable from the host — a curl from outside the compose network fails to connect, which is
correct at this stage.

## 4. FastAPI hook endpoints (Step 4)

Three new backend files total for this step, matching the existing routes/services split
(no separate schemas file — the hook payload is handled as a plain dict, since it's an
internal contract with tusd, not user input needing Pydantic validation):
- `backend/app/services/tus_service.py` — all logic: admission control, the three hook
  handlers, and the status lookup used by Step 7's frontend bridge (below).
- `backend/app/apis/routes/tus_hooks.py` — thin router with two routes: the internal
  `POST /internal/tus/hooks` (secret-protected, dispatches by `Type` to `tus_service`), and
  `GET /internal/tus/hooks/uploads/{upload_id}` (normal admin JWT auth, matching
  `get_current_admin_user` like every other admin endpoint) — the one new public-facing read
  the frontend needs to bridge from "upload finished" to "here's the video_id," since tusd's
  own protocol never hands the client a hook-computed value. Two different auth mechanisms in
  one small router is intentional here rather than a third file for one GET.
- `backend/app/models/tus_upload.py` — the `TusUpload` model (already shown above).

Registered in `main.py` alongside the other routers. The hook route is not part of the public
API surface —
protected by two layers: (1) network scope, since `tusd` calls it over `backend_net` and
Caddy never proxies this path to the internet, and (2) `tus_hook_shared_secret`, embedded as
a `?secret=` query parameter in the static `-hooks-http` URL tusd is started with (Step 3) —
tusd has no config flag to attach a custom outgoing header to hook requests, so the query
string is the mechanism, checked on every request against `tus_hook_shared_secret`. Network
scope is the primary control; the secret is defense-in-depth against anything else that lands
on `backend_net`.

The hook request body's exact shape (confirmed against tusd's docs, not assumed): a top-level
envelope `{"Type": "<event-name>", "Event": {"Upload": {...}, "HTTPRequest": {...}}}` — the
event name is a field in the body, not a header. `Event.Upload` carries `ID`, `Size`,
`Offset`, `MetaData` (a flat string-to-string map decoded from the client's
`Upload-Metadata` header), and `Storage`. Rejection is signaled by responding `200 OK` with
`{"RejectUpload": true, "HTTPResponse": {"StatusCode": ..., "Body": ..., "Header": {...}}}` —
tusd relays that `StatusCode`/`Header`/`Body` straight through to the client, which is how the
503 + `Retry-After` requirement is satisfied.

**pre-create** (`payload["Type"] == "pre-create"`):
- Extract the JWT, plus `title` and `category`, from `payload["Event"]["Upload"]["MetaData"]`.
  Uppy sets these as upload `metadata` when the file is added; `tus-js-client` sends that as
  the `Upload-Metadata` header on tusd's creation request, and tusd decodes it into every hook
  payload for that upload, pre-create included — no header-forwarding config needed, it's part
  of the standard hook contract. `title`/`category` ride along here because `Video.title` and
  `Video.category` are `nullable=False` — `post-finish` needs them to create a valid row, and
  they're the only two required fields the tus flow's minimal pre-upload form collects (see
  Step 7 — everything else is filled in afterward via the *existing*
  `PATCH /videos/by-id/{id}` edit-details endpoint, unmodified, already admin-only, already
  doing exactly this kind of partial update).
- `verify_token(token, expected_type="access")` — the existing plain function in
  `app/core/jwt.py`, callable directly outside the FastAPI dependency graph.
- Reject (`RejectUpload: true`) if: token invalid, declared `Upload.Size` exceeds
  `tus_max_file_size_gb`, or declared MIME type (from `MetaData.filetype`) isn't in
  `tus_allowed_mime_types`.
- Admission control: check the count of live `tus:active:{upload_id}` Redis keys (see below)
  against `tus_max_concurrent_uploads`. At the cap, reject with `HTTPResponse.StatusCode: 503`
  and `HTTPResponse.Header: {"Retry-After": "..."}` so the client backs off instead of holding
  a connection open.
- On accept: insert a `TusUpload` row (`status="created"`), `SET tus:active:{upload_id} 1 EX
  <ttl>`. `<ttl>` is a new standalone setting (`tus_admission_ttl_hours`, default 24) sized to
  a generous worst-case upload duration for a 50GB file — **not** tied to any tusd-native
  incomplete-upload expiration, because tusd (the Go implementation) has no documented
  built-in flag for that; abandoned-upload storage cleanup stays a separate, out-of-scope
  concern (MinIO lifecycle rules, per the ADR). The TTL key is what makes admission control
  self-healing: it's per-upload keys rather than a plain `INCR`/`DECR` counter specifically so
  an abandoned upload (browser closed, no `post-terminate` fired) frees its slot automatically
  instead of leaking forever. `redis-py` (already in `requirements.txt` as a Celery transitive
  dependency) gets its first direct use in this codebase here — a small standalone connection
  helper, not routed through Celery's app object.

**post-finish** (`payload["Type"] == "post-finish"`):
- Idempotency key: the upload ID. Look up the `TusUpload` row first; if `status` is already
  `"completed"`, return success immediately without re-inserting or re-enqueuing (hooks can be
  retried by tusd on delivery failure).
- Otherwise: create the `Video` row with the four columns that are actually `nullable=False`
  (`title`, `category` — from `MetaData`, captured above; `user_id` — from the JWT;
  `raw_video_path`), plus `processing_status="queued"` (required by `prepare_video`'s own
  assertion before it'll touch the row) — everything else (`description`, `director`, tags,
  etc.) stays at its column default/NULL until the admin fills it in later via the existing
  edit-details endpoint, exactly the same as a freshly-created row from the multipart path
  looks before anyone's touched "Edit Details."
  `raw_video_path` is built from `payload["Event"]["Upload"]["Storage"]`
  (`f"{storage['Bucket']}/{storage['Key']}"`) — confirmed against tusd's s3store source
  (`Storage: {"Type": "s3store", "Bucket": ..., "Key": ...}`), **not** hand-reconstructed from
  the `-s3-object-prefix` convention, so it stays correct even if tusd's actual key shape ever
  changes. This matches the *shape* `minio_service.upload_video` already produces
  (`f"{bucket}/{key}"`), which is what `download_video_to_file` expects — it strips the first
  `/`-segment and always downloads from `settings.minio_bucket_videos` regardless of that
  segment's value, so using the real bucket here is both correct and consistent with the
  existing (slightly redundant) convention rather than fighting it.
  Then: update the `TusUpload` row (`status="completed"`, `video_id`, `object_key`,
  `completed_at`), `DEL tus:active:{upload_id}`, then call
  `workflows.start_video_processing(video_id)` — the same Celery entrypoint the existing path
  uses (Step 5).

**post-terminate** (explicit client cancel) and any hook indicating failure: `DEL
tus:active:{upload_id}`, mark `TusUpload.status="terminated"` or `"failed"`. This is the
second of the two decrement paths — the TTL is the backstop for the case where neither hook
fires at all.

**Verify:** manual `curl` against `/internal/tus/hooks` with hand-built pre-create/post-finish
JSON payloads for each case (accept, reject-bad-token, reject-over-cap, replay-idempotency) —
confirm DB and Redis state after each, per the "no automated tests" scope note. Existing
routers (`auth`, `video`, `user`, `health`) untouched.

## 5. Celery wiring (Step 5)

No new task. `post-finish` calls `workflows.start_video_processing(video_id)` — the identical
function the existing multipart path calls at `video.py`'s create-video flow, requiring only
that a `Video` row already exists with `processing_status="queued"` (checked by
`prepare_video`'s assertion). No changes to `video_tasks.py` or `workflows.py`.

**Verify:** manually create a `TusUpload` + `Video` row, call `start_video_processing`
directly on it in a shell (`make shell`), confirm the Celery chain runs against a real object
in the `raw` bucket the same way it does for an existing multipart-uploaded video. Existing
task behavior unaffected — zero lines changed in the tasks module.

## 6. Caddy routing (Step 6)

New block in `infra/caddy/Caddyfile.local` (and `.example`), alongside the existing
`/storage/*` block — the tus data-plane route, distinct from the internal hook route (which
is never proxied by Caddy at all, only reachable service-to-service):

```
handle_path /files/* {
    reverse_proxy tusd:1080 {
        flush_interval -1
    }
}
```

`flush_interval -1` streams rather than buffers, matching the ADR's requirement. Existing
Caddyfiles have no global timeout/body-size directives to conflict with, so this is purely
additive — the `/storage/*` and default `reverse_proxy api:8000` blocks are untouched.

**Verify:** existing routes behave identically (`/`, `/storage/*` still proxy correctly). A
manual tus upload via `curl` (raw tus protocol POST/PATCH/HEAD sequence) through Caddy reaches
tusd, lands in MinIO, and fires both hooks — inspected via `docker logs` and `psql`.

## 7. Frontend Uppy integration (Step 7)

**A new route, not a spliced-in component of the existing form:**
`app/(protected)/admin/videos/upload/resumable/page.tsx`. The existing upload page
(`upload/page.tsx`) and `UploadForm.tsx` and every file under `uploadForm/` stay completely
untouched — zero shared-file risk. The only change to any existing file is one small,
flag-gated link/button on the existing upload page pointing at the new route; with the flag
off that link doesn't render, so the existing page is byte-identical to today.

The new page is self-contained: a minimal pre-upload form (`title` + `category` — the exact
same category list `BasicInformationSection.tsx` already hardcodes: action, drama, comedy,
scifi, thriller, documentary, fantasy, horror) gates a dropzone that only activates once both
are filled in. This is deliberately smaller than the full multi-section `UploadForm` — the
tus flow's job is just to get bytes into MinIO reliably; the rest of the metadata (description,
director, cast, etc.) is filled in afterward via the *existing, unmodified*
`PATCH /videos/by-id/{id}` edit-details endpoint, the same one the admin table's row-actions
menu already uses. No new backend endpoint needed for that part.

Uses `@uppy/core` + `@uppy/tus` with a hand-rolled progress UI rather than `@uppy/dashboard` —
avoids fighting the dark/cyan design system (`docs/DESIGN_SYSTEM.md`) with Uppy's bundled CSS,
and sidesteps checking `@uppy/react` against React 19 peer-dep constraints. Installed with
`pnpm`. The whole page is loaded via `next/dynamic` with `ssr: false` from wherever it's
linked, gated on `process.env.NEXT_PUBLIC_UPLOADS_TUS_ENABLED === "true"` — with the flag off,
Uppy's JS is never fetched by the browser at all, not just hidden.

Uppy's `tus` plugin points at `/files/*` through Caddy (Step 6) and carries the JWT (read from
the same `tokenManager` the axios client already uses) plus `title`/`category` as upload
`metadata` — this is what `pre-create` and `post-finish` consume (Step 4). Progress,
pause/resume, and error states use Uppy's own event API (`upload-progress`, `error`,
`complete`) — this is also the first real byte-progress UI in the app, since the existing
multipart path never wired `onUploadProgress` at all.

**Closing the loop back to the existing processing UI:** tus's own protocol never hands the
client a hook-computed value, so the client doesn't learn the new `video_id` through the
upload itself. On Uppy's `complete` event, the page polls the new
`GET /internal/tus/hooks/uploads/{upload_id}` endpoint (Step 4) — using the `upload_id` Uppy
already has from creating the upload — until it returns a `video_id`, then hands off to the
*existing* `useVideoProcessing` hook and `VideoProcessingDialog`, unmodified, pointed at that
ID. The resumable flow rejoins the exact same processing UI the multipart flow already has;
no new dialog or status-polling code.

**Verify:** with the flag off, the admin upload page is pixel-identical to today, the new
route link doesn't render, and no Uppy code appears in the network tab. With the flag on
locally, start an upload, kill network mid-transfer, confirm the resume completes without
re-sending finished bytes (byte offset via tusd's `HEAD` response), confirm the bridge to
`video_id` works, and confirm the video appears in the admin table processing normally
afterward.

## Out of scope for this spec

Matches the ADR's own "follow-up decisions" and later phases — explicitly not part of this
work: MinIO lifecycle rules for abandoned multipart uploads, multi-instance tusd / sticky
sessions, the Phase 5 default-path cutover, and Phase 6 decommissioning the existing endpoint.
The existing multipart path is untouched and remains the default in every phase covered here.

## As-built corrections

Implementation surfaced several places where this spec's design assumptions didn't hold.
Rather than silently editing the sections above, they're recorded here — the sections above
describe the design as planned; this section describes where the built system actually
diverged and why.

- **§4's "network scope" claim was false as built.** Caddy's `/files/*` route (§6) shares the
  same `:80` server block as the catch-all `reverse_proxy api:8000`, which proxies
  `/internal/tus/hooks` from the public internet exactly like every other route — tusd calling
  the hook route over `backend_net` doesn't make it *unreachable* from outside, just
  *additionally* reachable that way too. With the flag on, the shared secret query param was
  briefly the sole control. Fixed post-implementation: both Caddyfiles now explicitly
  `respond 404` for `/internal/*`, with a narrow carve-out for the one legitimately
  public-facing route, `GET /internal/tus/hooks/uploads/{upload_id}` (admin-JWT-protected, no
  secret in its URL — the frontend polls it directly through Caddy per §7). The POST hook
  route stays blocked at the Caddy layer entirely now, on top of its own secret check.
- **tusd's `Event.Upload.ID` is empty/null at pre-create time** — not populated the way §4
  originally assumed. Fixed: `handle_pre_create` generates its own UUID and returns it via
  tusd's documented `ChangeFileInfo.ID` hook-response field, which tusd then genuinely assigns
  to the upload from that point forward.
- **tusd's S3 store composes a *different*, longer ID (`<baseId>+<multipartUploadId>`) at
  `post-finish`/`post-terminate` time**, once the underlying S3 multipart upload exists — not
  the base UUID from the fix above. Fixed: a `_base_upload_id()` helper normalizes by splitting
  on the first `+` at every post-pre-create lookup site.
- **`pre-create`'s admin check was missing at first pass** — §4 as originally written let any
  authenticated user (not just admins) create a `TusUpload`/`Video` row, unlike the multipart
  path's `get_current_admin_user` requirement. Fixed to match.
- **`post-finish`'s `Video(...)` construction left `is_public`/`status` at their raw column
  defaults** (`is_public=True`, `status="draft"`) — a combination the multipart path can never
  produce, since it always derives both together from submitted metadata. This made a
  tus-uploaded video publicly fetchable by ID immediately after processing, before any admin
  review. Fixed: `post-finish` now explicitly sets `is_public=False, status="draft"`.
- **`tus_admission_ttl_hours` (24h default) was too long relative to `tus_max_concurrent_uploads`
  (5)** given that the shipped frontend (§7) has no cancel control, so an abandoned upload's
  Redis admission slot only ever expires via TTL, never via `post-terminate`. Reduced default to
  2 hours; cap raised to 8 as a secondary buffer.
- **The pre-create accept response now also strips `token` from the metadata tusd retains**,
  via `ChangeFileInfo.MetaData` (which *replaces*, not merges, tusd's stored map — the
  replacement retains `title`/`category`/`filetype`, everything `post-finish` reads). Without
  this, the admin's access JWT was confirmed, empirically, to persist in both tusd's S3 `.info`
  sidecar object and the underlying S3 object's own user-metadata.
- **Both hook route handlers were `async def` performing blocking synchronous I/O** (sync
  SQLAlchemy sessions, sync redis-py calls) — since FastAPI runs `async def` route bodies
  directly on the event loop, a slow hook call could stall every other concurrent request the
  API process was handling. Fixed: the GET status route is now plain `def` (FastAPI
  auto-threadpools it); the POST hook route stays `async def` (needed for `await
  request.json()`) but wraps its synchronous dispatch calls in `run_in_threadpool`.
- **ADR §6's "no redeploy required" rollback claim is optimistic.** `Settings` is
  `@lru_cache`'d per-process, so flipping `uploads_tus_enabled` requires at minimum an API
  process restart, not a live config change with zero process impact.
- **§3's prod-compose mirroring never happened** — the tusd service exists only in
  `docker-compose.local.yml`. This matches the plan's actual Task 3 scope (local dev only), but
  means the ADR's Phase 5 cutover can't proceed until a prod compose entry and `Caddyfile.prod`
  route are added.
