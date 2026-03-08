# VOD App — Local Dev Setup & Architecture Guide


---

## Quick Start (fresh machine)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd vod-app

# 2. Create the env file (copy from the template or recreate — see section below)
cp infra/local.env.example infra/local.env   # if you have a template
# OR manually create infra/local.env — see "Environment Variables" section

# 3. Create the Caddy config (must exist or Docker mount fails)
mkdir -p infra/caddy
# paste Caddyfile.local contents — see "Caddy" section below

# 4. Build and start everything
make dev-build   # first time always needs --build
make dev         # subsequent starts (no code changes)
```

That's it. If something blows up, read the rest of this doc.



## What Happens When You Run `make dev`

```
make dev
  └── cd infra && docker compose -f docker-compose.local.yml --env-file local.env up -d
```

Docker reads `docker-compose.local.yml`, substitutes variables from `local.env`, and starts all containers in the background. Here's the exact boot order and what each service does:

### Boot Order

```
postgres ──┐
minio    ──┤──► api ──► caddy
redis    ──┤──► worker
           └──► flower
                redisinsight
                pgadmin
```

1. **postgres, minio, redis** start first (no dependencies)
2. **api and worker** wait for postgres + redis + minio to be ready
3. **caddy** waits for api
4. **flower, redisinsight, pgadmin** start alongside everything else

---

## Container Map

| Container | Image | Port | What it does |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | Primary database |
| `pgadmin` | dpage/pgadmin4 | 5050 | Postgres GUI (browser) |
| `minio` | minio/minio | 9000 (API), 9001 (UI) | S3-compatible object storage for video files |
| `redis` | redis:7-alpine | 6379 | Celery broker + result backend |
| `redisinsight` | redis/redisinsight | 5540 | Redis GUI (browser) |
| `api` | built from `backend/` | 8000 | FastAPI application server |
| `worker` | built from `backend/` | — | Celery worker (video processing) |
| `flower` | mher/flower | 5555 | Celery task monitor (browser) |
| `caddy` | caddy:2-alpine | 80 | Reverse proxy in front of api |

All containers are on the `backend_net` bridge network. They talk to each other by **container/service name**, not `localhost`. So the API connects to postgres at `postgres:5432`, Redis at `redis:6379`, MinIO at `minio:9000`.

---

## How the API Starts (`backend/app/main.py`)

When the `api` container boots, uvicorn runs `app.main:app`. Here's what happens in order:

```
1. setup_logging()             — configure loggers before anything else
2. Import models               — User, Video etc. register with SQLAlchemy's Base
3. Import routers              — auth, health, video, user
4. FastAPI app created         — with lifespan handler attached
5. Middleware added            — CORS
6. Routers included
7. lifespan() runs:
   └── Base.metadata.create_all(bind=engine)
       — creates any missing DB tables (safe to run repeatedly, won't overwrite)
8. App starts accepting requests on :8000
```

### Why lifespan instead of module-level `create_all`

The old code had `Base.metadata.create_all(bind=engine)` at the top of `main.py`, which runs at **import time** — before the event loop exists. This works fine with a sync driver, but crashes with `MissingGreenlet` if the engine URL uses an async driver (`asyncpg`). The `lifespan` context manager is the FastAPI-recommended pattern and runs at the right time.

---

## Database Setup (`backend/app/core/database.py`)

The project uses **synchronous SQLAlchemy** throughout (sync sessions, sync queries). This is important:

```
DATABASE_URL      = postgresql+asyncpg://...   ← async driver, DO NOT use with sync create_engine
DATABASE_URL_SYNC = postgresql://...           ← psycopg2 driver, used everywhere in this app
```

The engine is built with `DATABASE_URL_SYNC`. The async URL exists in the env file for future use if you ever switch to async SQLAlchemy, but nothing uses it yet.

```python
engine = create_engine(settings.database_url_sync, ...)
SessionLocal = sessionmaker(bind=engine, ...)

def get_db():           # FastAPI dependency
    db = SessionLocal() # new session per request
    try:
        yield db
    finally:
        db.close()      # always closed, even on exception
```

Every route that needs the DB injects it via `Depends(get_db)`. Never create a `SessionLocal()` manually outside of this dependency.

---

## Celery + Redis (Task Queue)

Video processing is slow — encoding a video can take minutes. This is handled async via Celery so the API doesn't block.

```
User uploads video
       ↓
API saves to MinIO + creates DB record
       ↓
API dispatches Celery task → Redis (broker)
       ↓                          ↓
API returns 202 immediately    Worker picks up task
                                   ↓
                               Processes video (ffmpeg)
                                   ↓
                               Saves output to MinIO
                                   ↓
                               Updates DB record
                                   ↓
                               Saves result → Redis (result backend)
```

The `worker` container runs the exact same Docker image as `api` but with a different command:
```
celery -A app.celery_app:celery_app worker --loglevel=INFO --concurrency=2
```

Both api and worker share the same `local.env`, so they connect to the same Redis and Postgres.

---

## MinIO (Object Storage)

MinIO is an S3-compatible storage server running locally. The app uses three buckets:

| Bucket | Purpose |
|---|---|
| `vod-videos` | Raw uploaded videos |
| `vod-thumbnails` | Generated thumbnail images |
| `vod-processed` | Encoded/processed video output |

Buckets are **auto-created on API startup** by `MinioService`. If you wipe the `minio_data` Docker volume, buckets disappear and get recreated on next start — but all your stored files go with them.

Access the MinIO browser UI at `http://localhost:9001` (login: `minioadmin` / `minioadmin123`).

---

## Caddy (Reverse Proxy)

Caddy sits in front of the API on port 80. In local dev it just forwards everything:

```
browser → http://localhost → caddy:80 → api:8000
```

The Caddyfile.local must exist as a **file** (not a directory) at `infra/caddy/Caddyfile.local` before `make dev`. If it doesn't exist, Docker tries to create a directory at that path and the mount fails with a confusing OCI error.

Contents of `infra/caddy/Caddyfile.local`:
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

## Environment Variables (`infra/local.env`)

This file is never committed to git. Create it manually on each new machine. Full contents:

```env
# Postgres
POSTGRES_USER=vod_user
POSTGRES_PASSWORD=vod_password
POSTGRES_DB=vod_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://vod_user:vod_password@postgres:5432/vod_db
DATABASE_URL_SYNC=postgresql://vod_user:vod_password@postgres:5432/vod_db

# pgAdmin
PGADMIN_DEFAULT_EMAIL=admin@local.dev
PGADMIN_DEFAULT_PASSWORD=admin

# Redis
REDIS_PASSWORD=redis_dev_password
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_URL=redis://:redis_dev_password@redis:6379/0

# Celery
CELERY_BROKER_URL=redis://:redis_dev_password@redis:6379/0
CELERY_RESULT_BACKEND=redis://:redis_dev_password@redis:6379/1

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_HOST=minio
MINIO_PORT=9000
minio_endpoint=minio:9000
minio_access_key=minioadmin
minio_secret_key=minioadmin123
minio_bucket_videos=vod-videos
minio_bucket_processed_videos=vod-processed
minio_bucket_thumbnails=vod-thumbnails

# FastAPI / App
APP_ENV=local
DEBUG=true
SECRET_KEY=super-secret-local-key-change-me-in-prod
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ORIGINS=http://localhost,http://localhost:3000

# JWT
jwt_secret_key=local-jwt-secret-change-me-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend
FRONTEND_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_local_dummy_key
from_email=noreply@localhost

# FFmpeg
FFMPEG_THREADS=2
```

> **Important:** Pydantic reads env var names case-insensitively by default, but match the case shown above to be safe. Fields like `jwt_secret_key` and `from_email` are lowercase in the `Settings` class — they must be lowercase in the env file too.

---

## Makefile Command Reference

| Command | What it does |
|---|---|
| `make dev` | Start all containers (no rebuild) |
| `make dev-build` | Rebuild API/worker image then start — **use this after any Python code or requirements change** |
| `make down` | Stop all containers (volumes kept) |
| `make restart` | `down` + `dev` |
| `make clean` | Stop containers AND delete all volumes (wipes DB and MinIO data) |
| `make logs s=api` | Tail logs for a specific service (`s=worker`, `s=postgres`, etc.) |
| `make ps` | List running containers and their status |
| `make shell` | Open a bash shell inside the api container |
| `make worker-shell` | Open a bash shell inside the worker container |
| `make db-shell` | Open a psql shell connected to the database |
| `make redis-cli` | Open redis-cli connected to the Redis instance |

---

## Browser UI Access

Once `make dev` is running:

| Service | URL | Login |
|---|---|---|
| API docs (Swagger) | http://localhost/docs | — |
| API (direct) | http://localhost:8000 | — |
| MinIO console | http://localhost:9001 | minioadmin / minioadmin123 |
| pgAdmin | http://localhost:5050 | admin@local.dev / admin |
| Flower (Celery) | http://localhost:5555 | — |
| RedisInsight | http://localhost:5540 | — |

---

## Common Errors and Fixes

### `OCI runtime create failed: not a directory`
Caddy mount failed. `infra/caddy/Caddyfile.local` doesn't exist.
```bash
mkdir -p infra/caddy
# then create the file with the Caddyfile contents shown above
```

### `ValidationError: Field required` on startup
A required env var is missing from `local.env`. Read the field name from the error and add it.

### `ModuleNotFoundError: No module named 'X'`
A Python package is missing from `backend/requirements.txt`. Add it, then:
```bash
make dev-build  # must rebuild — make dev alone won't pick up requirements changes
```

### `MissingGreenlet: greenlet_spawn has not been called`
The SQLAlchemy engine is using an async driver URL (`asyncpg`) but `create_all` or a query is being called synchronously. Check that `database.py` uses `settings.database_url_sync` (psycopg2), not `settings.database_url` (asyncpg).

### `FFMPEG_THREADS` validation error (tuple instead of int)
Trailing comma in `config.py`: `FFMPEG_THREADS: int = 1,` — remove the comma.

### pgAdmin won't start — invalid email
`PGADMIN_DEFAULT_EMAIL` must have a proper TLD. `admin@local` fails validation. Use `admin@local.dev`.

### Changes to Python code not reflected
You ran `make dev` instead of `make dev-build`. The image is cached. Always use `make dev-build` after touching any `.py` file or `requirements.txt`.

---

## Things to Know Before Going to Production

- Replace all `local-*` secret values in the env file with real secrets
- Switch `minio_secure=true` and point at a real S3 or MinIO instance with TLS
- Set `RESEND_API_KEY` to a real key and `from_email` to a verified sender domain
- Use Alembic for schema migrations instead of `create_all` (Alembic is already in requirements)
- Remove `echo=False` → keep it False (it's already off), just don't accidentally turn it on in prod
- The `make redis-cli` command in the Makefile has a hardcoded password — keep it in sync with `REDIS_PASSWORD` in the env file