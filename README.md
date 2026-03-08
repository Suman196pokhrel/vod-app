# VOD App – Video on Demand

Full-stack Video on Demand app: **Next.js** frontend, **FastAPI** backend, **PostgreSQL**, **MinIO**, **Redis**, and **Celery** for video processing.

---

## Quick start (run everything & test upload)

### Prerequisites

- **Docker** and **Docker Compose**
- **Node.js** 20+ and **npm**
- **infra/local.env** in place (you already added this)

### 1. Start backend, DB, and services (Docker)

From the **project root**:

```bash
cd infra
docker compose -f docker-compose.local.yml up -d --build
```

This starts:

| Service   | Port(s)        | Purpose                          |
|----------|-----------------|----------------------------------|
| Postgres | 5432            | Database                         |
| MinIO    | 9000 (API), 9001 (Console) | Video/thumbnail storage   |
| Redis    | 6379            | Celery broker                    |
| API      | 8000            | FastAPI backend                  |
| Worker   | —               | Celery video processing          |
| Flower   | 5555            | Celery monitoring                |
| pgAdmin  | 5050            | DB UI (optional)                 |
| Caddy    | 80              | Reverse proxy to API (optional)  |

Wait until the API is healthy (e.g. 30–60 seconds), then check:

```bash
curl http://localhost:8000/
# => {"message":"Hello world!, VOD here.","version":"1.0.0","docs":"/docs"}
```

API docs: **http://localhost:8000/docs**

### 2. Initialize the frontend

From the **project root**:

```bash
cd app
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**. It talks to the API at `http://localhost:8000` by default (see `NEXT_PUBLIC_API_URL` in the app if you need to change it).

### 3. Create an account and make yourself admin

1. Open **http://localhost:3000**
2. Sign up (e.g. **Sign up** → email, username, password)
3. Check your email for the verification link, or in local dev you may need to **log in** and handle verification depending on your email setup
4. Sign in at **http://localhost:3000/auth/sign-in**

The **Upload** page lives under the **admin** area, which only allows users with role `admin`. New signups get role `user`, so promote your user once:

- **Option A – pgAdmin:**  
  - Open **http://localhost:5050**  
  - Login: `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` from `infra/local.env`  
  - Add server: host `postgres`, user `vod_user`, password `vod_password`, db `vod_db`  
  - Run:  
    `UPDATE users SET role = 'admin' WHERE email = 'your@email.com';`

- **Option B – psql:**  
  From **infra** directory:  
  `docker compose -f docker-compose.local.yml exec postgres psql -U vod_user -d vod_db -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"`

### 4. Test video upload

1. Log in as the admin user.
2. Go to **Admin** (sidebar) → **Videos** → **Upload** (or **http://localhost:3000/admin/videos/upload**).
3. Fill in:
   - **Title**, **Description**, **Category**, etc.
   - **Video file** (e.g. MP4)
   - **Thumbnail** (e.g. JPEG/PNG)
4. Submit the form.

The backend stores the file in MinIO, creates a DB record, and enqueues Celery processing. You should see a processing dialog and, when done, the video in the list.

- **MinIO Console:** **http://localhost:9001** (login: `minioadmin` / `minioadmin123` from `local.env`) to see buckets and uploaded files.
- **Flower:** **http://localhost:5555** to see Celery tasks.

---

## Project layout

```
vod-app/
├── app/                    # Next.js 16 frontend (React 19, TypeScript, Tailwind)
│   ├── app/
│   │   ├── (public)/       # Auth (sign-in, sign-up, verify-email, forgot/reset password)
│   │   └── (protected)/    # Home, Admin (videos, upload, analytics, categories)
│   └── lib/                # API client, store (Zustand), utils
├── backend/                # FastAPI app
│   ├── app/
│   │   ├── apis/routes/    # auth, health, video, user
│   │   ├── core/           # config, database, security, dependencies
│   │   ├── models/         # SQLAlchemy models (User, Video, …)
│   │   ├── schemas/        # Pydantic request/response
│   │   ├── services/       # Business logic (auth, video, minio, …)
│   │   └── utils/
│   ├── alembic/            # DB migrations
│   └── requirements.txt
└── infra/
    ├── local.env           # Local env vars (do not commit secrets)
    ├── docker-compose.local.yml
    └── caddy/
        └── Caddyfile.local # Caddy proxy to API (used by compose)
```

---

## Env and config

- **Backend (Docker):** All settings come from **infra/local.env** via `docker-compose.local.yml` (`env_file: local.env`). The API uses `DATABASE_URL_SYNC` for the DB, MinIO and Redis vars for storage and Celery.
- **Frontend:** Optional **app/.env.local**:  
  `NEXT_PUBLIC_API_URL=http://localhost:8000`  
  If unset, the app uses `http://localhost:8000` (see `app/lib/utils/constants.ts` and `app/lib/apis/client.ts`).

---

## Useful commands

| Task              | Command |
|-------------------|--------|
| Start all services | `cd infra && docker compose -f docker-compose.local.yml up -d --build` |
| Stop all          | `cd infra && docker compose -f docker-compose.local.yml down` |
| View API logs     | `docker compose -f infra/docker-compose.local.yml -f infra/docker-compose.local.yml logs -f api` |
| Frontend dev      | `cd app && npm run dev` |
| Run migrations    | From `backend/`: ensure `DATABASE_URL_SYNC` points to DB (e.g. `postgres:5432` inside Docker or `localhost:5432` on host), then `alembic upgrade head` |

---

## Video upload flow (for reference)

1. **Frontend:** User submits the form on `/admin/videos/upload`; the app sends `POST /videos/create` with `multipart/form-data` (video file, thumbnail file, JSON metadata).
2. **Backend:** `POST /videos/create` (auth required) → `video_service.create_video_with_files()` → uploads to MinIO, creates `Video` row, enqueues Celery task for processing.
3. **Celery worker:** Picks up the task, runs FFmpeg (transcode, thumbnails, etc.), writes outputs to MinIO, updates video status in the DB.
4. **Frontend:** Can poll `GET /videos/{id}/status` to show processing progress (as in the upload page dialog).

If something fails, check API logs, Flower for failed tasks, and MinIO for objects; ensure the user is logged in and has `admin` role when using the admin upload UI.
