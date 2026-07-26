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

Handling: verify the migration's up/down correctness against a disposable DB copy (`pg_dump`
the dev DB into a scratch container, or a throwaway schema via `make db`), never against the
live dev DB directly — this sidesteps the race entirely and is what "migrate on a database
copy" already implies. For applying it to the actual dev DB, expect the race: if
`create_all()` wins, `alembic stamp <revision>` instead of `upgrade head` (exact precedent:
this repo's own history did the same `stamp head` maneuver for its pre-Alembic schema, per
`main.py`'s lifespan comment).

**Verify:** upgrade + downgrade + upgrade again on the scratch copy, `\d videos` unchanged,
existing `videos` rows untouched, app boots normally.

## 3. tusd service (Step 3)

New service in `infra/docker-compose.local.yml` (and mirrored, but not started, in the prod
compose file) on the existing `backend_net` bridge network — no new network:

```yaml
tusd:
  image: tusproject/tusd:v2.9.2   # pinned
  command:
    - -behind-proxy
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
  # No `ports:` — not exposed to the host or Caddy yet. Step 6 adds the Caddy route.
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

New router, `backend/app/apis/routes/tus_hooks.py`, mounted at `/internal/tus/hooks`,
registered in `main.py` alongside the other routers. Not part of the public API surface —
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
- Extract the JWT from `payload["Event"]["Upload"]["MetaData"]`. Uppy sets it as upload
  `metadata` when the file is added; `tus-js-client` sends that as the `Upload-Metadata`
  header on tusd's creation request, and tusd decodes it into every hook payload for that
  upload, pre-create included — no header-forwarding config needed, it's part of the standard
  hook contract.
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
- Otherwise: create the `Video` row exactly as `create_video_with_files` does today
  (`raw_video_path` = the MinIO object key, `processing_status="queued"`, `user_id` from the
  upload's JWT), update the `TusUpload` row (`status="completed"`, `video_id`, `object_key`,
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

New component, `app/(protected)/admin/videos/upload/_components/ResumableUploadZone.tsx` (or
sibling to the existing `VideoUploadZone.tsx`), using `@uppy/core` + `@uppy/tus` with a
hand-rolled progress UI rather than `@uppy/dashboard` — avoids fighting the dark/cyan design
system (`docs/DESIGN_SYSTEM.md`) with Uppy's bundled CSS, and sidesteps checking `@uppy/react`
against React 19 peer-dep constraints. Installed with `pnpm`.

Loaded via `next/dynamic` with `ssr: false`, gated on `process.env
.NEXT_PUBLIC_UPLOADS_TUS_ENABLED === "true"` — with the flag off, Uppy's JS is never fetched
by the browser at all, not just hidden. The existing `VideoUploadZone` stays the unconditional
default; this is an alternate path on the same upload page, not a replacement.

Uppy's `tus` plugin points at `/files/*` through Caddy (Step 6) and carries the JWT (read from
the same `tokenManager` the axios client already uses) as upload `metadata`, which tusd
forwards to the pre-create hook. Progress, pause/resume, and error states use Uppy's own event
API (`upload-progress`, `error`, `complete`) — this is also the first real byte-progress UI in
the app, since the existing multipart path never wired `onUploadProgress` at all.

**Verify:** with the flag off, the admin upload page is pixel-identical to today and no Uppy
code appears in the network tab. With the flag on locally, start an upload, kill network
mid-transfer, confirm the resume completes without re-sending finished bytes (byte offset via
tusd's `HEAD` response), and confirm the video appears in the admin table processing normally
afterward.

## Out of scope for this spec

Matches the ADR's own "follow-up decisions" and later phases — explicitly not part of this
work: MinIO lifecycle rules for abandoned multipart uploads, multi-instance tusd / sticky
sessions, the Phase 5 default-path cutover, and Phase 6 decommissioning the existing endpoint.
The existing multipart path is untouched and remains the default in every phase covered here.
