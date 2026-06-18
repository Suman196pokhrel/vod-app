# 02 — Infrastructure

With the big picture clear, let's pull back the curtain on the infrastructure — the Docker services, networking, and configuration that hold everything together. Understanding this layer will save you a lot of debugging time later.

---

## Three Compose Files, Three Environments

The `infra/` directory has three Docker Compose files, one for each stage of the development lifecycle:

**`docker-compose.local.yml`** — your day-to-day dev setup. It starts the full stack plus monitoring tools: Flower (Celery dashboard), pgAdmin (PostgreSQL UI), RedisInsight (Redis UI), and the MinIO console. Source code is mounted into containers where appropriate for faster iteration.

**`docker-compose.yml`** — the production-oriented setup. Leaner: no monitoring tools. CPU shares are allocated explicitly (the API gets priority over the worker). Ports are bound to `127.0.0.1` only, not exposed publicly.

**`docker-compose.staging.yml`** — a middle ground. Note a known security gap: postgres and redis ports are bound to `0.0.0.0` instead of `127.0.0.1`, which makes them reachable from outside the host. This should be fixed before any real staging deployment.

`make dev` starts the local compose. `make build` rebuilds images if you change dependencies.

---

## The Services, One by One

### PostgreSQL

The primary data store. Stores users, videos, auth tokens, and every other piece of structured data. Uses a named Docker volume (`postgres_data`) so your database survives container restarts. The Alpine-based image is used for a smaller footprint.

In local dev, pgAdmin is available at http://localhost:5050 — a browser-based database explorer that's useful for inspecting tables without writing raw SQL.

### Redis

The message broker between FastAPI and the Celery worker. When the API enqueues a video processing task, it writes a message to Redis. The worker reads from Redis and processes it. Redis is also used as Celery's result backend (stores task results).

Redis is password-protected via `requirepass`. It's the only service with a Docker healthcheck in the local compose:

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "-a", "redis_dev_password", "ping"]
  interval: 30s
  timeout: 3s
  retries: 3
```

### MinIO

Self-hosted, S3-compatible object storage. This is where all the video files live — raw uploads, thumbnails, and processed HLS segments.

MinIO uses three buckets (created at startup or manually via the console):
- **raw bucket** (`minio_bucket_videos`) — the original uploaded video file, stored as `user-{user_id}/{uuid}.{ext}`
- **thumbnails bucket** (`minio_bucket_thumbnails`) — cover images, stored similarly
- **processed bucket** (`minio_bucket_processed_videos`) — HLS segments and manifests, organized as `{video_id}/segments/master.m3u8` and `{video_id}/segments/{quality}/playlist.m3u8`

The MinIO console at http://localhost:9001 lets you browse files, manage buckets, and verify uploads. Credentials: `minioadmin` / `minioadmin123`.

Why MinIO instead of a filesystem? Object storage is the right abstraction for immutable blobs. The MinIO Python client uses the same API as `boto3` (AWS S3) — swapping to S3 in production is just a configuration change.

### FastAPI (the API service)

Built from `backend/Dockerfile`. Starts with:
```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

In production (`docker-compose.yml`), the port is bound to `127.0.0.1:8000` — not accessible from the internet. Only Caddy talks to it. The `depends_on` setting ensures postgres, redis, and minio start first (though it only waits for container start, not service readiness — see Known Gaps below).

`cpu_shares: 1024` in production gives the API 4× more CPU scheduling priority than the worker (`cpu_shares: 256`), so transcoding can't starve the API of resources.

### Celery Worker

Uses the same Dockerfile as the API but starts with a different command:
```
celery -A app.celery_app:celery_app worker --loglevel=INFO --concurrency=2
```

`concurrency=2` means the worker processes two videos simultaneously. Each video processing run is CPU-intensive (FFmpeg), so more concurrency without more CPU just causes slowdowns. Tune this to match your hardware.

### Caddy

The reverse proxy and TLS terminator. In local dev, the `Caddyfile.local` proxies `localhost` → `api:8000`. In production, Caddy handles HTTPS automatically using Let's Encrypt — you just point your domain at the server and Caddy takes care of certificate provisioning and renewal.

Caddy uses `network_mode: "host"` in production so it can bind directly to ports 80 and 443 on the host without NAT. This is important for Let's Encrypt's HTTP challenge to work correctly.

```
# Caddyfile.local (simplified)
localhost {
    reverse_proxy api:8000
}
```

---

## Environment Variables

`infra/.env.example` is the template. Copy it to `infra/local.env` (which is git-ignored). Here's what matters:

**Database:**
```
POSTGRES_USER=vod_user
POSTGRES_PASSWORD=vod_password
POSTGRES_DB=vod_db
DATABASE_URL_SYNC=postgresql://vod_user:vod_password@postgres:5432/vod_db
```
The `DATABASE_URL_SYNC` uses the `postgresql://` scheme (sync psycopg2 driver). Don't use `postgresql+asyncpg://` — mixing async driver with sync SQLAlchemy causes MissingGreenlet crashes.

**JWT:**
```
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```
The `JWT_SECRET_KEY` must be a strong random string in production. Generate one: `openssl rand -hex 32`.

**MinIO:**
```
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_VIDEOS=raw
MINIO_BUCKET_THUMBNAILS=thumbnails
MINIO_BUCKET_PROCESSED_VIDEOS=processed
MINIO_SECURE=false   # true in production (HTTPS)
```

**Redis:**
```
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password
```
Note: `REDIS_PORT` in the codebase was previously `6739` (a typo) and has since been corrected to `6379`.

**Email:**
```
RESEND_API_KEY=dummy_key
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```
Email won't actually send with `dummy_key`, but the app boots fine.

**CORS:**
```
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## Networking

All backend services communicate over the `backend_net` Docker bridge network. Service names become DNS names within this network — `api` can reach `postgres` at `postgres:5432`, and the `worker` reaches `redis` at `redis:6379`. No ports need to be exposed to the host for inter-service communication.

The frontend (running on your machine) connects to the backend through Caddy at `http://localhost:80` or directly to FastAPI at `http://localhost:8000`. `NEXT_PUBLIC_API_URL` in `app/.env.local` controls which one.

---

## Local Monitoring Tools

These only run in local dev (docker-compose.local.yml):

- **Flower at :5555** — the Celery task dashboard. Watch video processing jobs in real time: task state, retry count, execution time, which worker picked it up. Your primary debugging tool when processing fails.
- **pgAdmin at :5050** — browser-based PostgreSQL explorer. Log in with `admin@local.dev` / `admin`. Useful for inspecting table contents without raw SQL.
- **RedisInsight at :5540** — Redis browser. See what's queued, inspect task messages.
- **MinIO Console at :9001** — browse all three buckets, verify files were uploaded correctly after processing.

---

## Known Infrastructure Gaps

**No health checks on most services** — `depends_on` only waits for containers to start, not for services to be ready. On first boot, the Celery worker might attempt to connect to Redis before Redis accepts connections. It recovers on its own but logs connection errors. The fix is adding proper `healthcheck` blocks to each service.

**Staging exposes database ports** — `docker-compose.staging.yml` binds postgres and redis to `0.0.0.0`. These should be `127.0.0.1` (or removed entirely, since the services don't need external access).

**No Docker health checks on the API or worker** — a fresh start after a long pause can occasionally leave the API in a restart loop until PostgreSQL is ready.

---

## Future Upgrades

- Add `healthcheck` to all services and use `condition: service_healthy` in `depends_on`
- Move secrets out of `.env` files into Docker secrets or a secrets manager (HashiCorp Vault, AWS Parameter Store)
- Add a CDN (Cloudflare, AWS CloudFront) in front of MinIO for video delivery at scale
- Consider Kubernetes for horizontal scaling of the worker fleet

---

## What's Next

Now that you understand how the services are wired together, it's time to meet the data they work with. The next document walks through every database table — what it stores, why it's designed that way, and how the tables relate to each other.
