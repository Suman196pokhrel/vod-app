# Resumable tus Uploads (tusd + Uppy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a resumable, flag-gated upload path for large (up to 50GB) video files using tusd + Uppy, running alongside the existing multipart upload path without changing its behavior.

**Architecture:** tusd runs as a dedicated data-plane service, writing directly to MinIO via S3 multipart upload — file bytes never cross FastAPI. FastAPI participates only as a control plane, reacting to tusd's HTTP hooks (`pre-create` for auth/admission, `post-finish`/`post-terminate` for bookkeeping and enqueuing). The existing Celery processing pipeline (`workflows.start_video_processing`) is reused unchanged.

**Tech Stack:** FastAPI, SQLAlchemy + Alembic, Celery + Redis (`redis-py`, already a dependency), MinIO, tusd v2.9.2 (Docker), Caddy, Next.js 16 / React 19, `@uppy/core` + `@uppy/tus`.

## Global Constraints

- The existing multipart upload endpoint (`POST /videos/create`), its routes, and its behavior are never modified — it remains the default path.
- Every new capability is gated by `uploads_tus_enabled` (backend, default `False`) or `NEXT_PUBLIC_UPLOADS_TUS_ENABLED` (frontend, default unset/`"false"`).
- All schema changes are additive: new table (`tus_uploads`), never altering or dropping existing columns/tables.
- No secrets hardcoded — new secrets (`tus_hook_shared_secret`) go through the same `Settings`/`.env` mechanism as `jwt_secret_key`.
- No automated tests are added. The repo has no test framework on either side today; every "Verify" step below is a manual/scripted check (`docker`, `curl`, `psql`, `redis-cli`) — never `pytest`.
- One task = one commit, except Task 5 (no code changes, verification only — explicitly no commit).
- Files stay at or under ~300 lines; split further if a task's file would exceed that.
- Commits: Conventional Commits style (`feat:`, `fix:`, `docs:`), no `Co-Authored-By` trailer, the repo owner's own git identity only.
- Full design rationale: [`docs/superpowers/specs/2026-07-26-resumable-uploads-tusd-design.md`](../specs/2026-07-26-resumable-uploads-tusd-design.md). Original decision record: [`docs/adr/resumable-uploads-tusd.md`](../../adr/resumable-uploads-tusd.md).

---

### Task 1: Config & feature flag

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `infra/.env.example` (committed template)
- Modify: `infra/local.env` (gitignored — real dev secret goes here, not committed)
- Create: `app/.env.example` (new, committed — frontend has no template file today)
- Modify: `app/.env` (gitignored — not committed)

**Interfaces:**
- Produces: `Settings.uploads_tus_enabled: bool`, `Settings.tusd_endpoint_url: str`, `Settings.tus_part_size_mb: int`, `Settings.tus_max_concurrent_uploads: int`, `Settings.tus_max_file_size_gb: int`, `Settings.tus_allowed_mime_types: list[str]`, `Settings.tus_hook_shared_secret: str`, `Settings.tus_admission_ttl_hours: int` — every later backend task reads these via `get_settings()`.
- Produces: `process.env.NEXT_PUBLIC_UPLOADS_TUS_ENABLED` — Task 7 reads this.

- [ ] **Step 1: Add the new settings fields**

In `backend/app/core/config.py`, inside the `Settings` class, after the existing `# Redis Settings` block and before `# video settings`:

```python
    # Resumable upload (tusd) settings — all inert until uploads_tus_enabled is true
    uploads_tus_enabled: bool = False

    tusd_endpoint_url: str = "http://tusd:1080"       # internal, service-to-service
    tus_part_size_mb: int = 50
    tus_max_concurrent_uploads: int = 5
    tus_max_file_size_gb: int = 50
    tus_allowed_mime_types: list[str] = ["video/mp4", "video/quicktime", "video/webm"]
    tus_hook_shared_secret: str = ""                  # required when uploads_tus_enabled=true
    tus_admission_ttl_hours: int = 24                 # admission-control slot lifetime, independent of storage cleanup
```

- [ ] **Step 2: Document the new vars in the committed env template**

In `infra/.env.example`, after the `# FFMPEG` block at the end of the file, append:

```bash
# -----------------------------------------------------------------------------
# RESUMABLE UPLOADS (tusd) — off by default, safe to leave as-is
# -----------------------------------------------------------------------------
uploads_tus_enabled=false
tusd_endpoint_url=http://tusd:1080
tus_part_size_mb=50
tus_max_concurrent_uploads=5
tus_max_file_size_gb=50
tus_hook_shared_secret=change-me-generate-a-real-secret
tus_admission_ttl_hours=24
```

- [ ] **Step 3: Add real local values to your own (gitignored) `infra/local.env`**

Append the same block to `infra/local.env`, but generate a real secret instead of the placeholder:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Paste that value in for `tus_hook_shared_secret`. This file is gitignored (`infra/.gitignore` pattern `.env*`), so this step produces no git diff — it's a local machine-setup action, not part of the commit.

- [ ] **Step 4: Create the frontend env template**

Create `app/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_UPLOADS_TUS_ENABLED=false
```

- [ ] **Step 5: Add the flag to your own (gitignored) `app/.env`**

Add `NEXT_PUBLIC_UPLOADS_TUS_ENABLED=false` to `app/.env`. Also gitignored, no git diff from this step.

- [ ] **Step 6: Verify — app boots, flag reads false, nothing else changed**

```bash
cd infra && make build   # picks up the config.py change; --reload alone is enough if api is already running
curl -s http://localhost/health
docker compose -f docker-compose.local.yml --env-file local.env exec api \
  python -c "from app.core.config import get_settings; s = get_settings(); print(s.uploads_tus_enabled, s.tus_part_size_mb, s.tus_max_file_size_gb, s.tus_max_concurrent_uploads)"
```

Expected: `/health` returns 200. The python one-liner prints `False 50 50 5`. Also spot-check an existing endpoint still works: `curl -s http://localhost/videos | head -c 200` returns real JSON, not an error.

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/config.py infra/.env.example app/.env.example
git commit -m "feat: add tus upload feature flag and config settings"
```

(`infra/local.env` and `app/.env` are gitignored and won't show up in `git status` — that's expected, not a missed file.)

---

### Task 2: Additive database migration — `tus_uploads` table

**Files:**
- Create: `backend/app/models/tus_upload.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/f4a7c1e9b2d6_add_tus_uploads_table.py`

**Interfaces:**
- Produces: `TusUpload` model (`app.models.tus_upload.TusUpload`) with columns `upload_id` (PK, str), `user_id`, `video_id` (nullable), `object_key` (nullable), `declared_size`, `status`, `created_at`, `completed_at` — Task 4's service module imports and queries this directly.

- [ ] **Step 1: Write the model**

Create `backend/app/models/tus_upload.py`:

```python
# /app/models/tus_upload.py
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class TusUpload(Base):
    __tablename__ = "tus_uploads"

    upload_id = Column(String, primary_key=True)  # tusd's own upload ID
    user_id = Column(String(100), ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(String, ForeignKey("videos.id"), nullable=True, index=True)  # set on post-finish
    object_key = Column(String(500), nullable=True)  # final MinIO key, set on post-finish
    declared_size = Column(Integer, nullable=False)
    status = Column(String(30), default="created", index=True)  # created|completed|failed|terminated
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
```

- [ ] **Step 2: Register the model**

In `backend/app/models/__init__.py`:

```python
# Makes this directory a Python package and simplifies imports
from app.models.enums import UserRole
from app.models.users import User
from app.models.videos import Video
from app.models.tokens import RefreshToken
from app.models.email_verification import EmailVerificationToken
from app.models.password_reset import PasswordResetToken
from app.models.tus_upload import TusUpload

__all__ = ["User", "Video", "UserRole","RefreshToken","EmailVerificationToken","PasswordResetToken", "TusUpload"]
```

- [ ] **Step 3: Write the migration**

Current alembic head is `bdc80bbbc0c9` (`add storyboard_url to video table`). Create `backend/alembic/versions/f4a7c1e9b2d6_add_tus_uploads_table.py`:

```python
"""add tus_uploads table

Revision ID: f4a7c1e9b2d6
Revises: bdc80bbbc0c9
Create Date: 2026-07-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a7c1e9b2d6'
down_revision: Union[str, Sequence[str], None] = 'bdc80bbbc0c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('tus_uploads',
    sa.Column('upload_id', sa.String(), nullable=False),
    sa.Column('user_id', sa.String(length=100), nullable=False),
    sa.Column('video_id', sa.String(), nullable=True),
    sa.Column('object_key', sa.String(length=500), nullable=True),
    sa.Column('declared_size', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ),
    sa.PrimaryKeyConstraint('upload_id')
    )
    op.create_index(op.f('ix_tus_uploads_created_at'), 'tus_uploads', ['created_at'], unique=False)
    op.create_index(op.f('ix_tus_uploads_status'), 'tus_uploads', ['status'], unique=False)
    op.create_index(op.f('ix_tus_uploads_user_id'), 'tus_uploads', ['user_id'], unique=False)
    op.create_index(op.f('ix_tus_uploads_video_id'), 'tus_uploads', ['video_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tus_uploads_video_id'), table_name='tus_uploads')
    op.drop_index(op.f('ix_tus_uploads_user_id'), table_name='tus_uploads')
    op.drop_index(op.f('ix_tus_uploads_status'), table_name='tus_uploads')
    op.drop_index(op.f('ix_tus_uploads_created_at'), table_name='tus_uploads')
    op.drop_table('tus_uploads')
```

- [ ] **Step 4: Verify correctness on a disposable DB copy (never the live dev DB for this check)**

```bash
cd infra
docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  bash -c "pg_dump -U vod_user -d vod_db -F c -f /tmp/scratch.dump && createdb -U vod_user vod_db_scratch && pg_restore -U vod_user -d vod_db_scratch /tmp/scratch.dump"

docker compose -f docker-compose.local.yml --env-file local.env exec \
  -e DATABASE_URL_SYNC=postgresql://vod_user:vod_password@postgres:5432/vod_db_scratch \
  api alembic upgrade head

docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db_scratch -c "\d tus_uploads"

docker compose -f docker-compose.local.yml --env-file local.env exec \
  -e DATABASE_URL_SYNC=postgresql://vod_user:vod_password@postgres:5432/vod_db_scratch \
  api alembic downgrade -1

docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db_scratch -c "\dt tus_uploads"   # expect: does not exist

docker compose -f docker-compose.local.yml --env-file local.env exec \
  -e DATABASE_URL_SYNC=postgresql://vod_user:vod_password@postgres:5432/vod_db_scratch \
  api alembic upgrade head

docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db_scratch -c "\d videos"   # expect: identical to before, no changes

docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  dropdb -U vod_user vod_db_scratch
```

Expected: `tus_uploads` appears after the first `upgrade`, disappears after `downgrade -1`, reappears after the second `upgrade`, and `videos` is untouched throughout.

- [ ] **Step 5: Apply to the actual dev DB — expect `create_all()` to have already won the race**

Saving `tus_upload.py` and `models/__init__.py` triggers uvicorn's `--reload`, whose `lifespan` runs `Base.metadata.create_all(bind=engine)` — this **will** create `tus_uploads` on the live dev DB before you run Alembic by hand. `alembic upgrade head` at this point fails with "relation already exists" — that's expected, not a bug. Use `stamp` instead, exactly like this repo's own history did for its pre-Alembic schema:

```bash
docker compose -f docker-compose.local.yml --env-file local.env exec api \
  psql postgresql://vod_user:vod_password@postgres:5432/vod_db -c "\dt tus_uploads"   # confirm create_all() already made it

docker compose -f docker-compose.local.yml --env-file local.env exec api alembic stamp f4a7c1e9b2d6

docker compose -f docker-compose.local.yml --env-file local.env exec api alembic current   # expect: f4a7c1e9b2d6 (head)
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/tus_upload.py backend/app/models/__init__.py backend/alembic/versions/f4a7c1e9b2d6_add_tus_uploads_table.py
git commit -m "feat: add tus_uploads table for resumable upload tracking"
```

---

### Task 3: tusd service (infrastructure, dormant)

**Files:**
- Modify: `infra/docker-compose.local.yml`
- Modify: `infra/.env.example` (already has the needed keys from Task 1 — no further change here)

**Interfaces:**
- Produces: a `tusd` container reachable at `http://tusd:1080` from other `backend_net` services — Task 4's hooks and Task 6's Caddy route depend on this hostname.

- [ ] **Step 1: Add the tusd service**

In `infra/docker-compose.local.yml`, add a new service alongside `redis`/`minio` (before the `networks:`/`volumes:` top-level blocks):

```yaml
  tusd:
    image: tusproject/tusd:v2.9.2   # pinned, not floating
    restart: unless-stopped
    command:
      - -s3-bucket=${minio_bucket_videos}
      - -s3-endpoint=http://minio:9000
      - -s3-part-size=${tus_part_size_mb}000000
      - -s3-object-prefix=tus-uploads/
      - -hooks-http=http://api:8000/internal/tus/hooks?secret=${tus_hook_shared_secret}
      - -hooks-enabled-events=pre-create,post-finish,post-terminate
      - -upload-dir=/srv/tusd-data
      - -port=1080
    environment:
      AWS_ACCESS_KEY_ID: ${minio_access_key}
      AWS_SECRET_ACCESS_KEY: ${minio_secret_key}
      AWS_REGION: us-east-1
    volumes:
      - tusd_data:/srv/tusd-data
    networks:
      - backend_net
    depends_on:
      - minio
      - api
    # No `ports:` — not reachable from the host yet. Task 6 adds the Caddy
    # route (and `-behind-proxy`, which only makes sense once something
    # actually proxies to this service).
```

- [ ] **Step 2: Register the new named volume**

In the same file's `volumes:` block at the bottom, add:

```yaml
  tusd_data:
```

- [ ] **Step 3: Verify — tusd starts healthy, nothing else regresses**

```bash
cd infra
make build
docker compose -f docker-compose.local.yml --env-file local.env ps
```

Expected: `tusd` shows `Up`/running alongside `postgres`, `redis`, `minio`, `api`, `worker`, `caddy` — all others unchanged from before this step.

```bash
docker compose -f docker-compose.local.yml --env-file local.env logs tusd | tail -30
```

Expected: no crash loop, no fatal S3-connection errors (a benign warning about the hooks endpoint being unreachable is fine at this stage, since `/internal/tus/hooks` doesn't exist until Task 4).

```bash
curl -sS -o /dev/null -w "%{http_code}\n" --max-time 3 http://localhost:1080/ ; echo "exit code: $?"
```

Expected: connection failure / timeout from the host (no `ports:` published) — this confirms tusd is not reachable from outside the compose network yet, which is correct at this stage.

- [ ] **Step 4: Commit**

```bash
git add infra/docker-compose.local.yml
git commit -m "feat: add dormant tusd service to local compose stack"
```

---

### Task 4: FastAPI hook endpoints (control plane)

**Files:**
- Create: `backend/app/services/tus_service.py`
- Create: `backend/app/apis/routes/tus_hooks.py`
- Modify: `backend/app/apis/routes/__init__.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `TusUpload`, `Video` (Task 2 models); `verify_token` (`app/core/jwt.py`, existing); `start_video_processing` (`app/tasks/workflows.py`, existing, unchanged); `get_current_admin_user` (`app/core/dependencies.py`, existing).
- Produces: `tus_service.handle_pre_create(event: dict) -> dict`, `tus_service.handle_post_finish(event: dict) -> dict`, `tus_service.handle_post_terminate(event: dict) -> dict`, `tus_service.get_upload_status(upload_id: str) -> dict | None` — used only by `tus_hooks.py` in this task. `tus_hooks_router` (`APIRouter`) — Task 6/7 rely on its two routes existing: `POST /internal/tus/hooks` and `GET /internal/tus/hooks/uploads/{upload_id}`.

- [ ] **Step 1: Write the service module**

Create `backend/app/services/tus_service.py`:

```python
# /app/services/tus_service.py
import json
import logging
from datetime import datetime, timezone

import redis

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.jwt import verify_token
from app.models.tus_upload import TusUpload
from app.models.videos import Video
from app.tasks.workflows import start_video_processing

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_client = None
ADMISSION_KEY_PREFIX = "tus:active:"


def get_redis_client():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password,
            db=settings.redis_db,
            decode_responses=True,
        )
    return _redis_client


def _admission_key(upload_id: str) -> str:
    return f"{ADMISSION_KEY_PREFIX}{upload_id}"


def count_active_uploads() -> int:
    # Bounded by tus_max_concurrent_uploads (small, single digits to low tens) —
    # KEYS is fine at this scale and simpler than a SCAN cursor loop.
    return len(get_redis_client().keys(f"{ADMISSION_KEY_PREFIX}*"))


def admit_upload(upload_id: str) -> None:
    get_redis_client().set(_admission_key(upload_id), "1", ex=settings.tus_admission_ttl_hours * 3600)


def release_upload(upload_id: str) -> None:
    get_redis_client().delete(_admission_key(upload_id))


def _reject(status_code: int, message: str, headers: dict | None = None) -> dict:
    return {
        "RejectUpload": True,
        "HTTPResponse": {
            "StatusCode": status_code,
            "Body": json.dumps({"message": message}),
            "Header": {"Content-Type": "application/json", **(headers or {})},
        },
    }


def handle_pre_create(event: dict) -> dict:
    upload = event.get("Upload", {})
    metadata = upload.get("MetaData") or {}

    token = metadata.get("token")
    if not token:
        return _reject(401, "Missing auth token in upload metadata")

    payload = verify_token(token, expected_type="access")
    if not payload or not payload.get("user_id"):
        return _reject(401, "Invalid or expired token")
    user_id = payload["user_id"]

    title = (metadata.get("title") or "").strip()
    category = (metadata.get("category") or "").strip()
    if not title or not category:
        return _reject(400, "title and category are required upload metadata")

    declared_size = upload.get("Size") or 0
    max_bytes = settings.tus_max_file_size_gb * 1024 ** 3
    if declared_size <= 0 or declared_size > max_bytes:
        return _reject(400, f"File size must be between 1 byte and {settings.tus_max_file_size_gb}GB")

    mime_type = metadata.get("filetype")
    if mime_type not in settings.tus_allowed_mime_types:
        return _reject(400, f"File type '{mime_type}' not allowed")

    if count_active_uploads() >= settings.tus_max_concurrent_uploads:
        return _reject(503, "Too many concurrent uploads, try again shortly", headers={"Retry-After": "30"})

    upload_id = upload.get("ID")
    db = SessionLocal()
    try:
        db.add(TusUpload(
            upload_id=upload_id,
            user_id=user_id,
            declared_size=declared_size,
            status="created",
        ))
        db.commit()
    finally:
        db.close()

    admit_upload(upload_id)
    return {"RejectUpload": False}


def handle_post_finish(event: dict) -> dict:
    upload = event.get("Upload", {})
    upload_id = upload.get("ID")
    metadata = upload.get("MetaData") or {}

    db = SessionLocal()
    try:
        tus_upload = db.query(TusUpload).filter(TusUpload.upload_id == upload_id).first()
        if tus_upload is None:
            logger.error(f"post-finish for unknown upload_id: {upload_id}")
            return {"RejectUpload": False}

        if tus_upload.status == "completed":
            # Idempotent replay — tusd can retry a hook delivery, don't double-create.
            return {"RejectUpload": False}

        storage = upload.get("Storage") or {}
        raw_video_path = f"{storage.get('Bucket')}/{storage.get('Key')}"

        video = Video(
            title=metadata.get("title", "Untitled"),
            category=metadata.get("category", "uncategorized"),
            raw_video_path=raw_video_path,
            user_id=tus_upload.user_id,
            processing_status="queued",
        )
        db.add(video)
        db.flush()  # populate video.id before referencing it below

        tus_upload.status = "completed"
        tus_upload.video_id = video.id
        tus_upload.object_key = raw_video_path
        tus_upload.completed_at = datetime.now(timezone.utc)
        db.commit()

        release_upload(upload_id)

        try:
            task_result = start_video_processing(video.id)
            video.celery_task_id = task_result.id
            db.commit()
        except Exception as e:
            logger.error(f"Failed to start processing workflow for {video.id}: {str(e)}")

        return {"RejectUpload": False}
    finally:
        db.close()


def handle_post_terminate(event: dict) -> dict:
    upload_id = event.get("Upload", {}).get("ID")

    db = SessionLocal()
    try:
        tus_upload = db.query(TusUpload).filter(TusUpload.upload_id == upload_id).first()
        if tus_upload and tus_upload.status not in ("completed", "terminated"):
            tus_upload.status = "terminated"
            db.commit()
    finally:
        db.close()

    release_upload(upload_id)
    return {"RejectUpload": False}


def get_upload_status(upload_id: str) -> dict | None:
    db = SessionLocal()
    try:
        tus_upload = db.query(TusUpload).filter(TusUpload.upload_id == upload_id).first()
        if tus_upload is None:
            return None
        return {"status": tus_upload.status, "video_id": tus_upload.video_id}
    finally:
        db.close()
```

- [ ] **Step 2: Write the router**

Create `backend/app/apis/routes/tus_hooks.py`:

```python
# /app/apis/routes/tus_hooks.py
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.config import get_settings
from app.core.dependencies import get_current_admin_user
from app.models.users import User
from app.services import tus_service

settings = get_settings()

tus_hooks_router = APIRouter(prefix="/internal/tus/hooks", tags=["tus-hooks-internal"])


@tus_hooks_router.post("")
async def handle_tus_hook(request: Request, secret: str = ""):
    """Internal-only endpoint tusd calls directly over backend_net. Not part
    of the public API — protected by network scope plus this shared secret,
    which tusd sends as a query param on its statically-configured hook URL
    (tusd has no mechanism to attach a custom outgoing header)."""
    if not settings.tus_hook_shared_secret or secret != settings.tus_hook_shared_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid hook secret")

    payload = await request.json()
    event_type = payload.get("Type")
    event = payload.get("Event", {})

    if event_type == "pre-create":
        return tus_service.handle_pre_create(event)
    if event_type == "post-finish":
        return tus_service.handle_post_finish(event)
    if event_type == "post-terminate":
        return tus_service.handle_post_terminate(event)

    return {"RejectUpload": False}


@tus_hooks_router.get("/uploads/{upload_id}")
async def get_tus_upload_status(
    upload_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    """Admin-authenticated bridge the frontend polls after an Uppy upload
    completes, to learn the video_id the post-finish hook created — tus's
    own protocol never hands the client a hook-computed value."""
    result = tus_service.get_upload_status(upload_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Upload not found")
    return result
```

- [ ] **Step 3: Register the router**

In `backend/app/apis/routes/__init__.py`:

```python
#/backend/app/apis/__init__.py
from app.apis.routes.auth import auth_router
from app.apis.routes.health import healthRouter
from app.apis.routes.video import video_router
from app.apis.routes.user import user_router
from app.apis.routes.tus_hooks import tus_hooks_router



__all__ = ["auth_router","healthRouter","video_router","user_router","tus_hooks_router"]
```

In `backend/app/main.py`, update the routers import and add the include:

```python
from app.apis.routes import auth_router, healthRouter, video_router, user_router, tus_hooks_router
```

and, near the other `app.include_router(...)` calls:

```python
app.include_router(tus_hooks_router)
```

- [ ] **Step 4: Verify — pre-create accept, reject cases, post-finish, idempotent replay**

Restart api to pick up the new router:

```bash
cd infra && docker compose -f docker-compose.local.yml --env-file local.env restart api
```

Get an admin JWT and the configured secret for use below:

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost/auth/login -H "Content-Type: application/json" \
  -d '{"email":"<your-admin-email>","password":"<your-admin-password>"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

SECRET=$(grep '^tus_hook_shared_secret=' infra/local.env | cut -d= -f2)
```

**Reject — bad token:**

```bash
curl -s -X POST "http://localhost/internal/tus/hooks?secret=$SECRET" \
  -H "Content-Type: application/json" \
  -d '{"Type":"pre-create","Event":{"Upload":{"ID":"test-upload-1","Size":1000000,"MetaData":{"token":"garbage","title":"Test","category":"drama","filetype":"video/mp4"}}}}'
```

Expected: `{"RejectUpload": true, "HTTPResponse": {"StatusCode": 401, ...}}`.

**Accept:**

```bash
curl -s -X POST "http://localhost/internal/tus/hooks?secret=$SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"Type\":\"pre-create\",\"Event\":{\"Upload\":{\"ID\":\"test-upload-1\",\"Size\":1000000,\"MetaData\":{\"token\":\"$ADMIN_TOKEN\",\"title\":\"Test\",\"category\":\"drama\",\"filetype\":\"video/mp4\"}}}}"
```

Expected: `{"RejectUpload": false}`. Then confirm side effects:

```bash
docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db -c "SELECT upload_id, status, user_id FROM tus_uploads WHERE upload_id='test-upload-1';"

docker compose -f docker-compose.local.yml --env-file local.env exec redis \
  redis-cli -a redis_dev_password GET tus:active:test-upload-1
```

Expected: one row with `status=created`; Redis key returns `"1"`.

**Admission limit:** repeat the accept call 5 times total (default `tus_max_concurrent_uploads=5`) with different `ID`s (`test-upload-2`..`test-upload-5`), then send a 6th — expect `{"RejectUpload": true, "HTTPResponse": {"StatusCode": 503, "Header": {"Retry-After": "30", ...}}}`.

**post-finish:**

```bash
curl -s -X POST "http://localhost/internal/tus/hooks?secret=$SECRET" \
  -H "Content-Type: application/json" \
  -d '{"Type":"post-finish","Event":{"Upload":{"ID":"test-upload-1","MetaData":{"title":"Test","category":"drama"},"Storage":{"Type":"s3store","Bucket":"vod-videos","Key":"tus-uploads/test-upload-1"}}}}'
```

Expected: `{"RejectUpload": false}`. Confirm:

```bash
docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db -c "SELECT status, video_id, object_key FROM tus_uploads WHERE upload_id='test-upload-1';"

docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db -c "SELECT id, title, category, raw_video_path, processing_status FROM videos WHERE raw_video_path='vod-videos/tus-uploads/test-upload-1';"

docker compose -f docker-compose.local.yml --env-file local.env exec redis \
  redis-cli -a redis_dev_password GET tus:active:test-upload-1
```

Expected: `tus_uploads.status=completed`, `video_id` populated; a matching `videos` row with `processing_status=queued`; the Redis key is gone (`(nil)`).

**Idempotent replay** — send the exact same `post-finish` payload again:

```bash
docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db -c "SELECT count(*) FROM videos WHERE raw_video_path='vod-videos/tus-uploads/test-upload-1';"
```

Expected: still exactly `1` row — no duplicate insert.

**Status endpoint:**

```bash
curl -s http://localhost/internal/tus/hooks/uploads/test-upload-1 -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected: `{"status": "completed", "video_id": "<uuid>"}`.

Clean up test rows:

```bash
docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db -c "DELETE FROM videos WHERE raw_video_path LIKE 'vod-videos/tus-uploads/test-upload-%'; DELETE FROM tus_uploads WHERE upload_id LIKE 'test-upload-%';"
```

Existing routers unaffected — spot check: `curl -s http://localhost/videos | head -c 200` still returns real JSON.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/tus_service.py backend/app/apis/routes/tus_hooks.py backend/app/apis/routes/__init__.py backend/app/main.py
git commit -m "feat: add tusd hook endpoints for pre-create, post-finish, post-terminate"
```

---

### Task 5: Celery wiring verification (no new code)

**Files:** none — this task verifies that Task 4's `post-finish` handler correctly drives the *existing*, unmodified `workflows.start_video_processing`.

**Interfaces:**
- Consumes: `start_video_processing(video_id: str)` from `app/tasks/workflows.py` (existing, unchanged).

- [ ] **Step 1: Verify the existing pipeline runs against a tus-created row**

Reuses the `test-upload-1` flow from Task 4 (recreate it if you already cleaned it up):

```bash
cd infra
docker compose -f docker-compose.local.yml --env-file local.env exec api python3 -c "
from app.core.database import SessionLocal
from app.models.videos import Video
from app.tasks.workflows import start_video_processing

db = SessionLocal()
video = Video(title='Celery Wiring Test', category='drama', raw_video_path='vod-videos/user-test/some-real-object.mp4', user_id='<a-real-user-id>', processing_status='queued')
db.add(video)
db.commit()
video_id = video.id
db.close()

result = start_video_processing(video_id)
print('video_id:', video_id, 'task_id:', result.id)
"
```

(Use a `raw_video_path` that actually exists in the `vod-videos` bucket — e.g. copy the path from an existing successfully-uploaded video's row via `psql`, so `prepare_video`'s MinIO download step has something real to fetch.)

```bash
make logs s=worker
```

Expected: the worker log shows `prepare_video` picking up the task, downloading from MinIO, and proceeding through the chain exactly as it does for a video created by the existing multipart endpoint. Confirm in `psql`:

```bash
docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db -c "SELECT processing_status FROM videos WHERE id='<video_id from above>';"
```

Expected: `processing_status` advances past `queued` (`preparing`, then further stages) — proof the tus path and the multipart path drive the identical Celery pipeline.

No commit for this task — nothing in the codebase changed; this step exists purely to confirm Task 4's integration point works end to end before moving on.

---

### Task 6: Caddy routing

**Files:**
- Modify: `infra/caddy/Caddyfile.local`
- Modify: `infra/caddy/Caddyfile.example`
- Modify: `infra/docker-compose.local.yml` (add `-behind-proxy` to the tusd command, now that something actually proxies to it)

**Interfaces:**
- Produces: `http://localhost/files/*` reverse-proxied to `tusd:1080` — Task 7's frontend Uppy config depends on this path.

- [ ] **Step 1: Add the tus route to Caddy**

In `infra/caddy/Caddyfile.local`, alongside the existing `handle_path /storage/*` block:

```
:80 {
    handle_path /storage/* {
        reverse_proxy minio:9000
    }
    handle_path /files/* {
        reverse_proxy tusd:1080 {
            flush_interval -1
        }
    }
    reverse_proxy api:8000
    log { output stdout; format console; level INFO }
}
```

Apply the identical `handle_path /files/*` block to `infra/caddy/Caddyfile.example`.

- [ ] **Step 2: Add `-behind-proxy` to the tusd service now that Caddy fronts it**

In `infra/docker-compose.local.yml`, in the `tusd` service's `command:` list (added in Task 3), add as the first entry:

```yaml
    command:
      - -behind-proxy
      - -s3-bucket=${minio_bucket_videos}
      ... (rest unchanged)
```

- [ ] **Step 3: Verify — existing routes unchanged, tus reaches MinIO through Caddy**

```bash
cd infra
make build
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/health          # expect 200, unchanged
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/storage/vod-videos/  # expect same response as before this change
```

Manual raw tus protocol upload through Caddy (small test file, proves the full path end to end):

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost/auth/login -H "Content-Type: application/json" \
  -d '{"email":"<your-admin-email>","password":"<your-admin-password>"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

echo -n "hello tus" > /tmp/tus-test.txt
SIZE=$(stat -c%s /tmp/tus-test.txt)
META=$(printf 'token %s,title %s,category %s,filetype %s' \
  "$(echo -n $ADMIN_TOKEN | base64 -w0)" \
  "$(echo -n 'Caddy Route Test' | base64 -w0)" \
  "$(echo -n 'drama' | base64 -w0)" \
  "$(echo -n 'video/mp4' | base64 -w0)")

LOCATION=$(curl -sS -D - -o /dev/null -X POST http://localhost/files/ \
  -H "Tus-Resumable: 1.0.0" -H "Upload-Length: $SIZE" -H "Upload-Metadata: $META" \
  | grep -i '^location:' | tr -d '\r' | awk '{print $2}')

curl -sS -X PATCH "$LOCATION" \
  -H "Tus-Resumable: 1.0.0" -H "Upload-Offset: 0" -H "Content-Type: application/offset+octet-stream" \
  --data-binary @/tmp/tus-test.txt
```

Expected: the `POST` returns `201 Created` with a `Location` header; the `PATCH` returns `204`. Then confirm the hooks actually fired:

```bash
docker compose -f docker-compose.local.yml --env-file local.env logs api | grep -i "tus\|post-finish" | tail -20
docker compose -f docker-compose.local.yml --env-file local.env exec postgres \
  psql -U vod_user -d vod_db -c "SELECT upload_id, status FROM tus_uploads ORDER BY created_at DESC LIMIT 1;"
```

Expected: a `tus_uploads` row with `status=completed`. Clean up the test row and its `videos` counterpart as in Task 4.

- [ ] **Step 4: Commit**

```bash
git add infra/caddy/Caddyfile.local infra/caddy/Caddyfile.example infra/docker-compose.local.yml
git commit -m "feat: proxy /files/* to tusd through Caddy"
```

---

### Task 7: Frontend Uppy integration (behind the flag)

**Files:**
- Modify: `app/package.json` (via `pnpm add`)
- Create: `app/lib/utils/featureFlags.ts`
- Create: `app/lib/apis/tusUpload.ts`
- Create: `app/app/(protected)/admin/videos/upload/resumable/page.tsx`
- Modify: `app/app/(protected)/admin/videos/upload/page.tsx` (one small flag-gated link — everything else untouched)

**Interfaces:**
- Consumes: `tokenManager.getAccessToken()` (existing, `lib/utils/tokenManager.ts`); `useVideoProcessing` + `VideoProcessingDialog` (existing, unmodified, from the admin videos component tree); `GET /internal/tus/hooks/uploads/{upload_id}` (Task 4).
- Produces: `isResumableUploadsEnabled(): boolean`; `getTusUploadStatus(uploadId: string): Promise<{status: string; video_id: string | null}>`.

A separate **route** (not a prop/slot spliced into the existing `UploadForm`) is the mechanism that satisfies "Uppy's JS never ships when the flag is off": Next.js's App Router code-splits per route automatically, so `@uppy/core`/`@uppy/tus` are only ever fetched by a browser that navigates to `/admin/videos/upload/resumable`. No `next/dynamic` wrapper is needed on top of that — the route boundary already does the job.

- [ ] **Step 1: Install Uppy**

```bash
cd app
pnpm add @uppy/core @uppy/tus
```

- [ ] **Step 2: Add the flag helper**

Create `app/lib/utils/featureFlags.ts`:

```typescript
export const isResumableUploadsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_UPLOADS_TUS_ENABLED === "true"
```

- [ ] **Step 3: Add the status-bridge API call**

Create `app/lib/apis/tusUpload.ts`:

```typescript
import api from "./client"
import { AxiosError } from "axios"
import { ApiError } from "./video"

export interface TusUploadStatus {
  status: string
  video_id: string | null
}

export const getTusUploadStatus = async (uploadId: string): Promise<TusUploadStatus> => {
  try {
    const response = await api.get<TusUploadStatus>(`/internal/tus/hooks/uploads/${uploadId}`)
    return response.data
  } catch (error) {
    if (error instanceof AxiosError) {
      const apiError: ApiError = {
        message: error.response?.data?.detail || "Failed to fetch upload status",
        status: error.response?.status,
      }
      throw apiError
    }
    throw error
  }
}
```

- [ ] **Step 4: Build the resumable upload page**

Create `app/app/(protected)/admin/videos/upload/resumable/page.tsx`:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Uppy } from "@uppy/core"
import Tus from "@uppy/tus"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VideoProcessingDialog } from "@/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog"
import { useVideoProcessing } from "@/hooks/video/use-video-processing"
import { tokenManager } from "@/lib/utils/tokenManager"
import { isResumableUploadsEnabled } from "@/lib/utils/featureFlags"
import { getTusUploadStatus } from "@/lib/apis/tusUpload"
import { toast } from "sonner"

const CATEGORIES = ["action", "drama", "comedy", "scifi", "thriller", "documentary", "fantasy", "horror"]
const TUS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost"}/files/`

export default function ResumableUploadPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const uppyRef = useRef<Uppy | null>(null)

  const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
    pollingInterval: 3000,
    onComplete: () => toast.success("Processing complete"),
    onError: (error) => toast.error("Processing failed", { description: error.message }),
  })

  useEffect(() => {
    if (!isResumableUploadsEnabled()) {
      router.replace("/admin/videos/upload")
    }
  }, [router])

  useEffect(() => {
    const uppy = new Uppy({ restrictions: { maxNumberOfFiles: 1 } })
    uppy.use(Tus, { endpoint: TUS_ENDPOINT, chunkSize: 50 * 1024 * 1024 })

    uppy.on("upload-progress", (_file, p) => {
      if (p.bytesTotal) setProgress(Math.round((p.bytesUploaded / p.bytesTotal) * 100))
    })

    uppy.on("complete", async (result) => {
      const file = result.successful?.[0]
      if (!file) return
      setIsUploading(false)

      const pollForVideoId = async (attempt = 0): Promise<void> => {
        try {
          const status = await getTusUploadStatus(String(file.id))
          if (status.video_id) {
            openDialog(status.video_id)
            return
          }
        } catch {
          // not found yet — keep polling briefly, post-finish may still be in flight
        }
        if (attempt < 20) {
          setTimeout(() => pollForVideoId(attempt + 1), 1500)
        } else {
          toast.error("Upload finished but processing didn't start — check the admin videos table")
        }
      }
      pollForVideoId()
    })

    uppy.on("error", (error) => {
      setIsUploading(false)
      toast.error("Upload failed", { description: error.message })
    })

    uppyRef.current = uppy
    return () => uppy.destroy()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uppyRef.current) return
    if (!title.trim() || !category) {
      toast.error("Enter a title and category before selecting a file")
      return
    }

    const token = tokenManager.getAccessToken() || ""
    uppyRef.current.addFile({
      name: file.name,
      type: file.type,
      data: file,
      meta: { token, title, category, filetype: file.type },
    })
    setIsUploading(true)
    uppyRef.current.upload()
  }

  if (!isResumableUploadsEnabled()) return null

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Resumable Upload (Beta)</h1>

      <div className="space-y-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isUploading} />
        <Select value={category} onValueChange={setCategory} disabled={isUploading}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          disabled={isUploading || !title.trim() || !category}
          onChange={handleFileSelect}
        />
        {isUploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><span>Uploading...</span><span>{progress}%</span></div>
            <Progress value={progress} />
          </div>
        )}
      </div>

      <VideoProcessingDialog
        isOpen={isOpen}
        onClose={closeDialog}
        currentStatus={currentStatus}
        videoId={videoId}
        fileName={title}
        onRetry={() => {}}
      />
    </div>
  )
}
```

- [ ] **Step 5: Add a flag-gated link from the existing upload page**

In `app/app/(protected)/admin/videos/upload/page.tsx`, add the import:

```typescript
import Link from 'next/link'
import { isResumableUploadsEnabled } from '@/lib/utils/featureFlags'
```

(`Link` may already be imported — check before duplicating.) Then, inside the returned JSX, near the page header, add:

```tsx
{isResumableUploadsEnabled() && (
  <Link href="/admin/videos/upload/resumable" className="text-sm text-primary underline">
    Try resumable upload (beta)
  </Link>
)}
```

This is the only change to this file — with the flag off, `isResumableUploadsEnabled()` returns `false` and this renders nothing, leaving the page identical to today.

- [ ] **Step 6: Verify — flag off is a no-op, flag on works, resume survives a drop**

```bash
cd app
pnpm build 2>&1 | tail -30   # confirm it still compiles with the new route present but flag off
```

With `NEXT_PUBLIC_UPLOADS_TUS_ENABLED` unset or `false` in `app/.env`, run `pnpm dev`, load `/admin/videos/upload`: confirm no "Try resumable upload" link appears, and confirm in the browser's Network tab that no `@uppy` chunk loads on that page. Directly navigating to `/admin/videos/upload/resumable` should immediately redirect back to `/admin/videos/upload` (the `useEffect` guard).

Set `NEXT_PUBLIC_UPLOADS_TUS_ENABLED=true` in `app/.env`, restart `pnpm dev`: confirm the link appears, navigate to the resumable page, fill in title/category, select a video file, watch progress advance. Mid-upload, stop and restart the dev server's network (or use browser devtools' "Offline" toggle) to simulate a drop, then go back online — confirm the upload resumes from its last byte offset (progress doesn't reset to 0) rather than restarting. After completion, confirm the processing dialog opens and the video eventually shows up in the admin videos table with `processing_status` advancing normally.

- [ ] **Step 7: Commit**

```bash
git add app/package.json app/pnpm-lock.yaml app/lib/utils/featureFlags.ts app/lib/apis/tusUpload.ts "app/app/(protected)/admin/videos/upload/resumable/page.tsx" "app/app/(protected)/admin/videos/upload/page.tsx"
git commit -m "feat: add flag-gated resumable upload page using Uppy"
```

---

## Final Verification Checklist

Run this after all seven tasks land, flag still off by default:

- [ ] Existing multipart upload still works manually: sign in as admin, upload a video via the existing `/admin/videos/upload` form, confirm it processes and plays exactly as before.
- [ ] Existing videos still list (`/`) and play (`/watch/[video_id]`) with no change.
- [ ] With `uploads_tus_enabled=false` / `NEXT_PUBLIC_UPLOADS_TUS_ENABLED=false`: no new backend route is reachable from outside `backend_net` beyond what Task 6 exposes at `/files/*` (tusd itself has no auth of its own — this is expected, since admission/validation happens in the `pre-create` hook, not at the transport layer); the frontend shows no resumable-upload UI and ships no Uppy code.
- [ ] With the flag on (Task 4 + Task 6 + Task 7 verify steps above, re-run together): a large upload completes, a mid-transfer drop resumes without re-sending finished bytes, a 6th concurrent upload gets `503` + `Retry-After`.
- [ ] `post-finish` replay (Task 4, Step 4) does not double-insert a `videos` row or double-set `celery_task_id`.
- [ ] The `tus:active:*` Redis key count returns to zero after a batch of test uploads completes or is terminated (`redis-cli --scan --pattern 'tus:active:*' | wc -l`).

## Not part of this plan (explicitly out of scope, per the spec)

MinIO lifecycle rules for abandoned multipart uploads, multi-instance tusd/sticky sessions, making tus the default path, and removing the existing multipart endpoint — all later ADR phases, not this one.
