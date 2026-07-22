# 00 — Getting Started

Welcome to the VOD platform. This is a full-stack Video on Demand application where admins upload videos, the system automatically transcodes them into streamable HLS format at multiple quality levels, and authenticated users watch them on demand. If you're a new developer — or returning after some time away — this guide gets you from zero to a running local stack.

---

## Prerequisites

Make sure you have these installed before you begin:

- **Docker and Docker Compose** — every backend service runs in containers (PostgreSQL, Redis, MinIO, FastAPI, Celery, Caddy). You don't need any of these installed locally.
- **Node.js 18+ and pnpm** — the frontend (Next.js) runs locally, not in Docker. Install pnpm with `npm install -g pnpm`.
- **Git** — to clone the repo.

You do **not** need Python, FFmpeg, PostgreSQL, or Redis installed on your machine. FFmpeg runs inside the Celery worker container.

---

## Cloning and First-Time Setup

```bash
git clone <repo-url>
cd vod-app
```

Two config files need to be copied before the stack starts. Neither is tracked in git (for good reason — they contain secrets):

```bash
# The main environment file
cp infra/.env.example infra/local.env

# The Caddy reverse proxy config
cp infra/caddy/Caddyfile.example infra/caddy/Caddyfile.local
```

Open `infra/local.env` in your editor. Most values have working defaults for local dev. The one you should know about:

- **`RESEND_API_KEY`** — Leave this as `dummy_key` to start. The app runs fine, but verification and password reset emails won't actually send. Sign up for a free Resend account if you want real email.
- **`JWT_SECRET_KEY`** — The placeholder is fine for local dev. For production, generate a real one: `openssl rand -hex 32`.
- Everything else (database passwords, MinIO credentials, Redis password) has a working local default.

---

## Starting the Backend Stack

From the project root:

```bash
make dev
```

This starts every backend service using the local Docker Compose configuration. On first run it will pull images and build the API and worker containers — expect a few minutes. Subsequent starts are fast.

### What's Running After `make dev`

| Service | URL | Credentials |
|---------|-----|-------------|
| API (via Caddy proxy) | http://localhost | — |
| Swagger / OpenAPI docs | http://localhost/docs | — |
| MinIO console | http://localhost:9001 | minioadmin / minioadmin123 |
| pgAdmin (DB browser) | http://localhost:5050 | admin@local.dev / admin |
| Flower (Celery monitor) | http://localhost:5555 | — |
| RedisInsight | http://localhost:5540 | — |

The Caddy reverse proxy listens on port 80 and routes all requests to the FastAPI backend running on port 8000 inside Docker. The frontend talks to Caddy, not directly to FastAPI.

---

## Starting the Frontend

The Next.js app runs locally (not in Docker). In a separate terminal:

```bash
cd app
pnpm install    # first time only
pnpm dev
```

The app is at **http://localhost:3000**.

Create `app/.env.local` to tell the frontend where the API is:

```
NEXT_PUBLIC_API_URL=http://localhost
```

This points at Caddy on port 80. You can also use `http://localhost:8000` to bypass Caddy and go directly to FastAPI — either works for local dev.

---

## Verifying Everything Works

1. **http://localhost:3000** — the browse feed should appear (the root route is the public video feed; it'll be empty until an admin uploads something)
2. **http://localhost/docs** — Swagger UI loads with all API endpoints
3. Hit `GET /health` in Swagger — it should return `{"status": "ok"}`
4. **http://localhost:9001** — MinIO console loads with the minioadmin credentials
5. Register a test account at http://localhost:3000/auth/sign-up

If the API fails to start, run `make logs s=api` to see the error. If MinIO isn't reachable, check that ports 9000 and 9001 are free.

---

## Key Makefile Commands

The `makefile` at the project root is your day-to-day interface with the stack:

```bash
make dev              # Start all containers (local compose, includes monitoring tools)
make build            # Rebuild Docker images — run this after changing Python dependencies
make logs s=api       # Tail logs for a service. s=worker, s=postgres, s=redis also work
make shell            # Bash into the API container — use this to run Alembic migrations
make db               # Open a psql session inside the PostgreSQL container
make down             # Stop all containers
make restart          # Stop then start (make down + make dev)
make clean            # Stop containers AND delete volumes — you lose all stored data
```

When you add a new Python package to `requirements.txt`, you must run `make build` (not just `make dev`) so Docker rebuilds the image with the new dependency.

When you need to run a database migration, use `make shell` to get inside the API container, then:

```bash
alembic upgrade head
```

---

## Why Docker for the Backend, but Not the Frontend?

The backend services have specific version and configuration requirements that are painful to manage locally. Docker gives every developer an identical, isolated environment where FFmpeg, Redis, MinIO, and PostgreSQL are pre-configured and ready.

The frontend stays local because Next.js hot-reload works best with direct filesystem access and local `node_modules`. Running it in Docker would add complexity (volume mounts, rebuild cycles) with no real benefit during development.

---

## Known Gap: No Health Checks

One thing to know right away: the Docker Compose `depends_on` setting only waits for a container to *start*, not for the service inside it to be *ready*. This means the Celery worker might try to connect to Redis before Redis is fully initialized, causing a brief crash-loop on first boot. In practice it recovers on its own within a few seconds, but it's worth knowing if you see connection errors in `make logs s=worker` on first start.

---

## Future Upgrades

- Add Docker health checks to all services so `depends_on` waits for readiness, not just container start
- Provide a Docker-managed frontend option for CI and environments without local Node.js
- Use a proper secrets manager (Vault, AWS Secrets Manager) instead of `.env` files for production deployments

---

## What's Next

Now that your stack is running and you can reach the app, the next document steps back and explains the full architecture — what each service does, why we made the technology choices we did, and how data flows through the system from an admin's upload all the way to a user pressing play.
