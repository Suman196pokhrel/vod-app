# 01 — Infrastructure

**Files covered:** `infra/docker-compose.local.yml` · `makefile`

---

## What We're Building

This is a video-on-demand platform. Admins upload videos; the system transcodes them to multiple quality levels and stores them for streaming. Here's the full picture before we look at any code:

```
Browser
  ↓ HTTP request
Caddy (reverse proxy, port 80)
  ↓ forwards to
FastAPI (the backend API, port 8000)
  ↓ saves files to          ↓ queues background jobs in
MinIO (file storage)        Redis
                              ↓ picked up by
                            Celery Worker
                              ↓ processes with FFmpeg
                              ↓ uploads result to MinIO
```

Every piece of this runs as a Docker container. `docker-compose.local.yml` is the file that defines all of them and wires them together.

---

## `infra/docker-compose.local.yml`

### The Services

There are 9 services in development. Some are infrastructure you always need; some are dev-only tools:

**Always needed:**
- `postgres` — the database
- `minio` — file storage for video files
- `redis` — the message queue
- `api` — the FastAPI backend
- `worker` — the Celery background job runner
- `caddy` — the reverse proxy (the "front door")

**Dev-only (not in production):**
- `pgadmin` — a web UI to browse the database
- `redisinsight` — a web UI to browse Redis
- `flower` — a dashboard to monitor Celery tasks

### The Network

```yaml
networks:
  backend_net:
    driver: bridge
```

All services share one Docker bridge network called `backend_net`. Inside this network, containers talk to each other using their service names as hostnames. So the API container doesn't connect to `localhost:5432` — it connects to `postgres:5432`. MinIO is at `minio:9000`. This is how Docker networking works.

Why does this matter? Nothing outside this network can reach postgres or redis directly. The only thing exposed to your machine is Caddy on port 80. Everything else is private. This is good security practice even in development.

### The API and Worker — Same Image, Different Command

This is the most important architectural decision in the compose file:

```yaml
api:
  build:
    context: ../backend
    dockerfile: Dockerfile
  command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

worker:
  build:
    context: ../backend   # ← same Dockerfile as api!
    dockerfile: Dockerfile
  command: ["celery", "-A", "app.celery_app:celery_app", "worker", "--loglevel=INFO", "--concurrency=2"]
```

Both `api` and `worker` build from the same `backend/Dockerfile`. They run the same Python code. The only difference is what command they run at startup.

Why? Because the Celery worker needs access to all the same models, services, and logic as the API. If they were separate codebases you'd maintain twice the code. With one image, any change to the backend is automatically available to both.

`--concurrency=2` on the worker means it can process 2 videos simultaneously. Each video spawns parallel transcoding tasks, so this doesn't limit parallelism inside a single video — it limits how many videos can be in-flight at once.

### Volumes — Where Data Lives

```yaml
volumes:
  postgres_data:
  minio_data:
  pgadmin_data:
  redisinsight_data:
  caddy_data:
  caddy_config:
```

Without volumes, every container restart wipes all data. Volumes are persistent storage that survive restarts. `postgres_data` holds your database tables and rows; `minio_data` holds your video files.

### The `depends_on` Problem

```yaml
api:
  depends_on:
    - postgres
    - redis
    - minio
```

`depends_on` tells Docker to start those containers before the API. But "started" doesn't mean "ready." PostgreSQL takes a few seconds to initialize after its container starts. If the API boots before Postgres is fully ready, database connections fail at startup.

The correct fix is Docker health checks — make Postgres declare itself "healthy" only once it's accepting connections, then make the API wait for that health status. Only Redis has a health check right now. This is a known gap.

### The Caddy Caddyfile Gotcha

You must create `infra/caddy/Caddyfile.local` as a **file**, not a directory. If this file doesn't exist and Docker tries to mount it as a volume, Docker will create a directory there instead — and Caddy will crash with an OCI mount error. Always pre-create the file:

```
:80 {
    reverse_proxy api:8000
}
```

---

## `makefile`

The Makefile is just shortcuts. Every `make` command is a `docker compose` command pointing at `infra/docker-compose.local.yml` with `infra/local.env` as the environment file.

```bash
make dev                # start all containers (detached)
make build              # rebuild images from scratch, then start
make down               # stop containers (volumes kept)
make logs s=api         # tail logs for a specific service
make shell              # bash shell inside the api container
make db                 # psql session directly in the postgres container
make clean              # stop containers AND delete all volumes (destructive)
```

`make clean` deletes your database and all uploaded files. Use it only when you want a completely fresh slate.

---

## Where We Go Next

The services are running. Now we need to understand how the backend application itself is configured — how it reads secrets, database URLs, and API keys. That's the next file.

**➡️ [02 — Config and Database](./02_CONFIG_AND_DATABASE.md)**
