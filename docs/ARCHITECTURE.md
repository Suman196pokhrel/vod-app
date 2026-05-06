# Architecture

> **New here?** Read [CODEBASE_WALKTHROUGH.md](./CODEBASE_WALKTHROUGH.md) first — it explains every decision and concept in this file in plain language, file by file. This document is the reference summary.

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                     CLIENT                          │
│         Next.js 16 (App Router) + React 19          │
│    Zustand (auth) · TanStack Query · Axios          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (JWT Bearer)
                       ▼
┌──────────────────────────────────────────────────────┐
│                  Caddy 2 (Reverse Proxy)             │
│   Dev: :80 → api:8000  |  Prod: host network + TLS  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              FastAPI (Python 3.12)                   │
│   /auth  /videos  /user  /health                     │
│   SQLAlchemy (sync/psycopg2) · Pydantic Settings     │
└────┬────────────────────────────┬────────────────────┘
     │                            │
     ▼                            ▼
┌──────────┐              ┌──────────────┐
│ PostgreSQL│              │    Redis     │
│    16     │              │   (broker    │
│ (primary  │              │  + results)  │
│   store)  │              └──────┬───────┘
└──────────┘                     │
                                 ▼
                    ┌────────────────────────┐
                    │    Celery Worker       │
                    │  (same Docker image    │
                    │   as API, diff CMD)    │
                    │                        │
                    │  FFmpeg: transcode     │
                    │  HLS: segment+manifest │
                    └──────────┬─────────────┘
                               │
                               ▼
                    ┌────────────────────────┐
                    │        MinIO           │
                    │  vod-videos (raw)      │
                    │  vod-thumbnails        │
                    │  vod-processed (HLS)   │
                    └────────────────────────┘
```

---

## Services

| Service | Technology | Role |
|---------|-----------|------|
| **api** | FastAPI on Uvicorn | REST API — auth, video CRUD, status |
| **worker** | Celery (same image as api) | Async video processing — FFmpeg |
| **postgres** | PostgreSQL 16 | Source of truth for all entities |
| **redis** | Redis 7 | Celery broker (DB 0) + result backend (DB 1) |
| **minio** | MinIO | Object storage for video files + HLS segments |
| **caddy** | Caddy 2 | Reverse proxy, TLS termination in prod |
| **flower** | mher/flower | Celery task monitoring UI (dev only) |
| **pgadmin** | dpage/pgadmin4 | Postgres GUI (dev only) |
| **redisinsight** | redis/redisinsight | Redis browser (dev only) |

---

## Request Lifecycle

### 1. Authentication — Sign In

```
POST /auth/signin {email, password}
  → auth.py:signin()
  → auth_service.authenticate_user()  — bcrypt verify
  → jwt.create_access_token()          — HS256, 60 min TTL
  → jwt.create_refresh_token()         — HS256, 7 day TTL
  → tokens.py RefreshToken stored      — SHA-256 hashed in DB
  ← { access_token, refresh_token, user }
```

**Token refresh flow** (handled by Axios interceptor on frontend):
```
401 from any endpoint
  → POST /auth/refresh { refresh_token }
  → Validate refresh token hash in DB
  → Issue new access token
  → Retry original request
```

### 2. Upload — Video Ingestion

```
POST /videos/create  (multipart/form-data)
  Fields: video (file), thumbnail (file), data (JSON string)
  Header: Authorization: Bearer <access_token>

  → Validate MIME types (video: mp4/mov/avi/mkv; image: jpg/png/webp)
  → Upload video to MinIO: vod-videos/user-{id}/{uuid}.mp4
  → Upload thumbnail to MinIO: vod-thumbnails/user-{id}/{uuid}.jpg
  → INSERT Video row: processing_status="queued"
  → start_video_processing(video_id) → Celery workflow dispatched
  → UPDATE Video.celery_task_id
  ← 200 VideoResponse { id, title, ... }

  If DB commit fails before workflow dispatch:
    → delete_video() + delete_thumbnail() from MinIO (rollback)
    ← 500 error
```

### 3. Video Processing — Celery Pipeline

The processing pipeline is a **Celery chain with a chord** for parallel transcoding:

```
prepare_video(video_id)
  → Download raw video from MinIO to /tmp/video_processing/{video_id}/
  → FFprobe: extract duration, resolution, codec, bitrate
  → Store metadata in Video.processing_metadata
  ↓

chord([
  transcode_quality("1440p"),
  transcode_quality("1080p"),
  transcode_quality("720p"),
  transcode_quality("480p"),
  transcode_quality("360p"),
  transcode_quality("240p"),
  transcode_quality("144p"),
])(on_transcode_complete)
  → Each quality: FFmpeg H.264 encode (libx264, medium preset, CRF 23)
  → Qualities where source < target resolution are skipped
  → on_transcode_complete: aggregate results, build transcoded_files dict
  ↓

segment_videos(data)
  → FFmpeg: -f hls -hls_time 6 per quality
  → Output: {quality}/playlist.m3u8 + {quality}/segment_NNNN.ts
  ↓

create_manifest(data)
  → Write master.m3u8: EXT-X-STREAM-INF entries for each quality
  ↓

upload_to_minio(data)
  → Upload master.m3u8 + all quality playlists + all .ts segments
  → Destination: vod-processed/{video_id}/segments/...
  ↓

finalize_processing(data)
  → UPDATE Video: processing_status="completed", manifest_url, available_qualities
  → Delete /tmp/video_processing/{video_id}/ (cleanup)
```

**Processing status progression:**
`uploading → queued → preparing → transcoding → aggregating → segmenting → creating_manifest → uploading_to_storage → finalizing → completed`

### 4. Status Polling

```
GET /videos/{video_id}/status
  → Query Video.processing_status + Celery task result
  ← { video_id, status, progress (0-100), message, is_completed, is_failed }
```

Frontend polls this every 3 seconds while the `VideoProcessingDialog` is open.

### 5. Video Playback — Current State

**Note: Not yet implemented.** The player at `/home/watch/[video_id]` is a UI mock that shows controls over a static thumbnail. No HLS.js or streaming library is integrated.

**Intended flow (once implemented):**
```
GET /videos/by-id/{video_id}
  ← { manifest_url: "/vod-processed/{id}/segments/master.m3u8", ... }
  → Construct full MinIO URL
  → HLS.js loads master.m3u8
  → Browser selects quality tier based on bandwidth
  → Requests .ts segments on demand
```

---

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | UUID4 |
| email | String UNIQUE | Login identifier |
| username | String UNIQUE | Display name |
| hashed_password | String | bcrypt |
| role | Enum | USER or ADMIN |
| is_active | Boolean | default True |
| is_verified | Boolean | default False — email verification required |
| created_at | DateTime(tz) | |
| updated_at | DateTime(tz) | |

### videos
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| celery_task_id | String | Cleared on completion |
| title | String(200) | |
| description | String(5000) | |
| category | String(50) | |
| raw_video_path | String(500) | MinIO object name in vod-videos |
| thumbnail_url | String(500) | MinIO object name in vod-thumbnails |
| age_rating | String(10) | G / PG / PG-13 / R / TV-MA etc. |
| release_date | Date | |
| director | String(200) | |
| cast | String(500) | comma-separated |
| tags | JSON | array of strings |
| views_count | Integer | |
| likes_count | Integer | |
| is_public | Boolean | |
| status | String(20) | draft / published / scheduled |
| processing_status | String(30) | see pipeline stages above |
| processing_metadata | JSON | FFprobe output (duration, codec, bitrate, fps) |
| processing_error | String(1000) | set on failure |
| manifest_url | String(500) | path to master.m3u8 in MinIO |
| available_qualities | JSON | ["1080p","720p","480p",...] |
| user_id | FK → users.id | |

### refresh_tokens
Stores SHA-256 hashed refresh tokens with expiry and revocation flag. On logout, token is marked `is_revoked=True` without deletion.

### email_verification_tokens
UUID token sent via email link. One-time use, 24h expiry.

### password_reset_tokens
6-digit OTP sent via email. One-time use, 1h expiry. Password reset invalidates all refresh tokens (logs out all devices).

---

## Background Job Architecture

```
┌─────────────────────────────────────────────────────┐
│               Celery App (celery_app.py)             │
│  Broker:  redis://:pw@redis:6379/0                   │
│  Backend: redis://:pw@redis:6379/1                   │
│  Hard timeout: 3600s · Soft timeout: 3000s           │
│  Task result TTL: 86400s (24h)                       │
└─────────────────────────────────────────────────────┘

Task execution model:
- prepare_video: sequential, with 3 retries on download failure
- transcode_quality: 7 tasks in parallel chord, 2 retries each
- on_transcode_complete: chord callback, aggregates results
- segment_videos: sequential, 2 retries
- create_manifest: sequential, 2 retries
- upload_to_minio: sequential, 3 retries
- finalize_processing: sequential, no retries (failure logged)

Concurrency: worker starts with --concurrency=2
  → 2 videos can process simultaneously
  → each video spawns 7 parallel transcode tasks (within those 2 workers)
```
