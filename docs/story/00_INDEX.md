# Codebase Story — Reading Order

Each file picks up exactly where the previous one left off. Read them in order.

| # | File | Domain |
|---|------|--------|
| 01 | [INFRASTRUCTURE.md](./01_INFRASTRUCTURE.md) | Docker, networking, how all services connect |
| 02 | [CONFIG_AND_DATABASE.md](./02_CONFIG_AND_DATABASE.md) | Settings loading, database connection, why sync not async |
| 03 | [DATA_MODELS.md](./03_DATA_MODELS.md) | Every database table — what it stores and why |
| 04 | [APP_BOOT_AND_SECURITY.md](./04_APP_BOOT_AND_SECURITY.md) | App startup, password hashing, JWT tokens |
| 05 | [AUTH_SYSTEM.md](./05_AUTH_SYSTEM.md) | Sign-up, sign-in, refresh, logout — the full auth flow |
| 06 | [STORAGE_AND_MEDIA.md](./06_STORAGE_AND_MEDIA.md) | MinIO object storage, FFmpeg metadata extraction |
| 07 | [VIDEO_SYSTEM.md](./07_VIDEO_SYSTEM.md) | Video upload orchestration, API endpoints |
| 08 | [BACKGROUND_JOBS.md](./08_BACKGROUND_JOBS.md) | Celery, the 6-stage processing pipeline |
| 09 | [FRONTEND_FOUNDATION.md](./09_FRONTEND_FOUNDATION.md) | API client, token storage, auth state (Zustand) |
| 10 | [FRONTEND_PAGES.md](./10_FRONTEND_PAGES.md) | Route protection, upload form, processing hook, video player |
