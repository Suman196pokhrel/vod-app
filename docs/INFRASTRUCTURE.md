# Infrastructure

## Docker Compose Environments

| File | Used For | Network | Env File |
|------|---------|---------|---------|
| `docker-compose.local.yml` | Local development | `backend_net` | `local.env` |
| `docker-compose.staging.yml` | Staging server | `backend_net_staging` | `staging.env` |
| `docker-compose.yml` | Production | `backend_net` | `prod.env` |

All compose files live in `infra/`. Run via `make` targets or `cd infra && docker compose -f ...`.

---

## Service Map — Local Dev

| Container | Image | Ports | Purpose |
|-----------|-------|-------|---------|
| postgres | postgres:16-alpine | 5432:5432 | Primary database |
| pgadmin | dpage/pgadmin4 | 5050:80 | Postgres GUI |
| minio | minio/minio:latest | 9000:9000, 9001:9001 | Object storage |
| redis | redis:7-alpine | 6379:6379 | Celery broker + results |
| redisinsight | redis/redisinsight | 5540:5540 | Redis browser |
| api | built from `backend/` | 8000:8000 | FastAPI |
| worker | built from `backend/` | — | Celery worker |
| flower | mher/flower | 5555:5555 | Celery task monitor |
| caddy | caddy:2-alpine | 80:80 | Reverse proxy |

All on `backend_net` bridge. Services communicate by container name (e.g., `postgres:5432`, `minio:9000`).

---

## Environment Differences

| Feature | Local | Staging | Prod |
|---------|-------|---------|------|
| Postgres port | 0.0.0.0:5432 | 0.0.0.0:5432 | not exposed |
| Redis port | 0.0.0.0:6379 | 0.0.0.0:6379 | not exposed |
| MinIO ports | 0.0.0.0:9000/9001 | 0.0.0.0:9000/9001 | not exposed |
| API port | 0.0.0.0:8000 | 127.0.0.1:8001 | 127.0.0.1:8000 |
| Caddy | :80 (bridge) | none | host network + TLS |
| Admin tools | pgAdmin, Flower, RedisInsight | none | none |
| Network name | backend_net | backend_net_staging | backend_net |
| Volume suffix | none | _staging | none |

Staging exposes postgres and redis on `0.0.0.0` — a security risk if server firewall isn't locked down.

---

## Makefile Commands

```bash
make dev          # start all services (detached)
make build        # rebuild images and start
make down         # stop containers (keep volumes)
make restart      # down + dev
make logs s=api   # tail logs for a service (s= sets which one)
make shell        # bash inside api container
make db           # psql session inside postgres container
make clean        # stop containers AND delete all volumes (destructive)
```

---

## Backend Dockerfile

`backend/Dockerfile` — single image used by both `api` and `worker` containers:

```dockerfile
FROM python:3.12-slim
# OS packages: build-essential, libpq-dev, curl, ffmpeg
# pip install -r requirements.txt
# EXPOSE 8000
# Default CMD: uvicorn app.main:app --host 0.0.0.0 --port 8000
# Worker overrides CMD to: celery -A app.celery_app:celery_app worker ...
```

- `PYTHONDONTWRITEBYTECODE=1` · `PYTHONUNBUFFERED=1` set for container friendliness
- FFmpeg installed at image build time (not runtime download)
- No multi-stage build — single stage includes build tools in final image (acceptable for internal tooling)

---

## Environment Variables

Copy `infra/.env.example` to `infra/local.env` and fill in values:

```env
# Postgres
POSTGRES_USER=vod_user
POSTGRES_PASSWORD=vod_password
POSTGRES_DB=vod_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://vod_user:vod_password@postgres:5432/vod_db
DATABASE_URL_SYNC=postgresql://vod_user:vod_password@postgres:5432/vod_db

# Redis
REDIS_PASSWORD=redis_dev_password
REDIS_HOST=redis
REDIS_PORT=6379
CELERY_BROKER_URL=redis://:redis_dev_password@redis:6379/0
CELERY_RESULT_BACKEND=redis://:redis_dev_password@redis:6379/1

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
minio_endpoint=minio:9000
minio_access_key=minioadmin
minio_secret_key=minioadmin123
minio_bucket_videos=vod-videos
minio_bucket_processed_videos=vod-processed
minio_bucket_thumbnails=vod-thumbnails

# JWT (lowercase — matches Pydantic field names)
jwt_secret_key=change-me-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
APP_ENV=local
DEBUG=true
SECRET_KEY=change-me-in-prod
CORS_ALLOW_ORIGINS=http://localhost,http://localhost:3000,http://127.0.0.1:3000
FRONTEND_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=dummy_key
from_email=noreply@example.com

FFMPEG_THREADS=2
```

**Note:** Pydantic reads env vars case-insensitively, but `jwt_secret_key` and `from_email` are lowercase in the Settings class — keep them lowercase.

---

## Caddy Setup (Local)

Create `infra/caddy/Caddyfile.local` (must be a **file**, not a directory — Docker will create a directory if the file doesn't exist, causing an OCI mount error):

```
:80 {
    reverse_proxy api:8000
    log {
        output stdout
        format console
        level INFO
    }
}
```

---

## Database Migrations (Alembic)

Migration files in `backend/alembic/versions/`:

| Migration | What it adds |
|-----------|-------------|
| `e28f8af` | Initial schema — User + Video tables |
| `c8a105f` | Video metadata fields |
| `4838fc1` | `celery_task_id` column on Video |
| `34419c0` | `email_verification_tokens` table |
| `2944b96` | Video processing fields |

**On startup**, the API runs `Base.metadata.create_all(bind=engine)` — creates any missing tables. Alembic is used for versioned migrations when you need coordinated schema changes.

Run migrations manually:
```bash
# inside api container or with DATABASE_URL_SYNC pointed at postgres
alembic upgrade head
```

---

## Known Infrastructure Gaps

### Missing Health Checks
Only Redis has a health check. PostgreSQL, API, Worker, and MinIO have none. This means `depends_on` doesn't actually wait for services to be ready — the API might start before postgres is accepting connections.

**Fix:**
```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U vod_user -d vod_db"]
    interval: 10s
    timeout: 5s
    retries: 5

api:
  depends_on:
    postgres:
      condition: service_healthy
```

### Hardcoded Redis Password in Health Check
```yaml
test: ["CMD", "redis-cli", "-a", "redis_dev_password", "ping"]
```
This breaks if `REDIS_PASSWORD` changes. Use `$$REDIS_PASSWORD` variable instead.

### No Resource Limits
`cpu_shares` is set but no `mem_limit` or `cpus`. Any container can consume unbounded memory.

### No Log Rotation
Default Docker json-file driver with no `max-size`/`max-file`. Logs can fill disk on active instances.

### MinIO Image Uses `latest` Tag
`minio/minio:latest` — pin to a specific version to prevent unexpected breaking changes.

### Staging Port Exposure
Staging exposes postgres (5432), redis (6379), and minio (9000/9001) on `0.0.0.0`. On a cloud VM without a firewall, these are publicly accessible.

### No Secrets Management
All secrets in plain `.env` files. Fine for dev; production should use Docker Secrets, Vault, or a cloud secrets manager.
