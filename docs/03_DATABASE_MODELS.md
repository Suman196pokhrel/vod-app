# 03 — Database Models

With the infrastructure running, let's look at what lives inside the database — the tables that store every user, every video, and every authentication token in the system. Understanding the data model is the foundation for understanding everything else.

---

## How We Manage the Database

There are two layers here: **SQLAlchemy** (the ORM) and **Alembic** (the migration tool).

SQLAlchemy lets us define database tables as Python classes. Instead of writing `CREATE TABLE users (...)` in SQL, we write a `User` class with typed fields, and SQLAlchemy handles the SQL. All models inherit from a shared `Base` class defined in `core/database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base

engine = create_engine(settings.database_url_sync)  # sync driver (psycopg2)
Base = declarative_base()
```

**Why sync and not async?** We use `psycopg2` (the synchronous PostgreSQL driver), not `asyncpg`. FastAPI supports async database access, but mixing asyncpg with a synchronous `create_engine` causes `MissingGreenlet` errors. We chose sync for simplicity and stability. The performance difference is negligible at this scale.

Alembic tracks schema changes over time as versioned migration files. When you add a new column or table, you generate a migration:

```bash
# Inside the API container (make shell)
alembic revision --autogenerate -m "add watch_history table"
alembic upgrade head
```

For local dev convenience, `Base.metadata.create_all(bind=engine)` also runs on every API startup (in `main.py`'s lifespan function). This is idempotent — it only creates tables that don't exist yet — so it won't overwrite anything. In production, you'd rely on Alembic exclusively.

---

## The `users` Table

Defined in `backend/app/models/users.py`. Every person who uses the platform has a row here.

```python
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), server_default="USER", nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

**`id`** — UUID string, not an auto-increment integer. Why? Sequential integers are predictable — someone can guess that `user/2` exists if they know `user/1` does. UUIDs prevent enumeration.

**`hashed_password`** — bcrypt hash, never the plain text password. bcrypt is slow by design, which makes brute-force attacks impractical.

**`role`** — a PostgreSQL enum (`USER` or `ADMIN`) defined at the database level. Indexed for fast role-based queries. The `UserRole` Python enum has lowercase values (`"user"`, `"admin"`), but the DB enum and `server_default` use uppercase (`'USER'`). This asymmetry exists in the code — something to be aware of.

**`is_active`** — allows soft suspension of accounts without deleting data. A suspended user's history and content stays intact.

**`is_verified`** — starts as `False`. Users must click a verification link before they can log in. This prevents abuse with fake email addresses.

**`videos`** — not a database column. It's a SQLAlchemy relationship that lets you access `user.videos` in Python as a list. No extra SQL column is created.

---

## The `videos` Table

The most complex table, defined in `backend/app/models/videos.py`. It tracks a video through its entire lifecycle from upload to streamable playback.

**Identity:**
- `id` — UUID primary key
- `celery_task_id` — the ID of the active Celery task processing this video. Cleared when processing completes.

**Content metadata:**
- `title`, `description`, `category` — basic info, all indexed or queryable
- `age_rating` — G, PG, PG-13, R, TV-14, TV-MA
- `release_date`, `director`, `cast` — editorial metadata
- `tags` — stored as a JSON array (e.g., `["action", "thriller"]`). Simple for MVP; a proper many-to-many tags table would be better long-term.

**Storage paths (MinIO object names, not full URLs):**
- `raw_video_path` — object name in the raw bucket (e.g., `user-abc123/uuid.mp4`)
- `thumbnail_url` — object name in the thumbnails bucket
- `manifest_url` — path to `master.m3u8` in the processed bucket. Set after processing completes.
- `available_qualities` — JSON array like `["1440p", "1080p", "720p", "480p"]`. Set after processing.

We store object names (not full URLs) so that changing the MinIO endpoint doesn't require a database migration.

**Processing lifecycle:**

The `processing_status` field tracks exactly where the video is in the pipeline:

| Status | What's Happening |
|--------|-----------------|
| `uploading` | File being uploaded by admin (managed by frontend) |
| `queued` | Upload complete, Celery task enqueued |
| `preparing` | Worker downloading file, extracting metadata |
| `transcoding` | FFmpeg running for all quality levels (parallel) |
| `aggregating` | Collecting parallel transcoding results |
| `segmenting` | Splitting each quality into HLS .ts segments |
| `creating_manifest` | Writing master.m3u8 and quality playlists |
| `uploading_to_storage` | Uploading HLS files to MinIO processed bucket |
| `finalizing` | Updating DB, cleaning up temp files |
| `completed` | Video is ready to stream ✅ |
| `failed` | Something went wrong ❌ |

`processing_metadata` is a JSON field that stores what FFprobe extracted about the raw video: `{"duration_seconds": 3600, "width": 1920, "height": 1080, "codec": "h264", "bitrate": 5000000}`. The worker uses this to skip transcoding to qualities higher than the source resolution (no upscaling).

`processing_error` stores the error message if status becomes `failed`.

---

## The `refresh_tokens` Table

Defined in `backend/app/models/tokens.py`. Access tokens are stateless JWTs — we don't store them. But refresh tokens are different.

A refresh token is long-lived (7 days) and lets users get new access tokens without logging in again. The problem with stateless refresh tokens: you can't revoke them (you can't "unsign" a JWT). The solution: store them in the database.

But we don't store the token itself — we store a **SHA256 hash** of it. This way, even if the database is compromised, the tokens can't be used (you'd need the original string to make API calls).

```python
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

On logout, `is_revoked` is set to `True`. Every token refresh checks this flag. A user can have multiple active refresh tokens (multiple devices/sessions), and each can be revoked independently.

---

## The `email_verification_tokens` Table

Defined in `backend/app/models/email_verification.py`. When a user signs up, we generate a unique token, store it here, and send an email with a link like `/auth/verify-email?token=<uuid>`.

When the user clicks the link, the API looks up the token, checks it hasn't expired or been used, sets `users.is_verified = True`, and marks the token as consumed. One-time use, expires after a set period.

---

## The `password_reset_tokens` Table

Defined in `backend/app/models/password_reset.py`. Similar to email verification but for password reset. When an admin requests a password reset, a token is generated, stored here, and emailed to them.

The token is stored in the DB, and the `used` flag prevents replay. After a successful password reset, all refresh tokens for that user are also revoked (logged out of all devices).

---

## Table Relationships

```
users ──────────< videos               (one user → many videos)
users ──────────< refresh_tokens       (one user → many sessions)
users ──────────< email_verification_tokens
users ──────────< password_reset_tokens
```

All foreign keys reference `users.id` (UUID string).

---

## Migration History

The Alembic migrations tell the story of how the schema evolved:

1. **`e28f8af22e7f`** — initial tables: users, videos, refresh_tokens
2. **`34419c05503e`** — added email_verification_tokens table
3. **`c8a105f8d90a`** — added video metadata fields (director, cast, age_rating, tags, etc.)
4. **`2944b960c15e`** — added video processing status fields and processing_metadata
5. **`4838fc1c2ea9`** — added celery_task_id to videos table

Each migration represents a feature being added to the system. Reading them in order is a useful way to understand what was built and when.

---

## Future Upgrades

- **Categories table** — currently `category` is just a string field on videos. A proper `categories` table with slug, name, and description would enable better browsing and admin management.
- **Tags table** — move tags from a JSON array to a proper many-to-many `video_tags` table for queryability.
- **Comments table** — `user_id`, `video_id`, `content`, `created_at`. The frontend UI exists, the backend doesn't.
- **Watch history table** — `user_id`, `video_id`, `watched_at`, `progress_seconds`. Needed for "continue watching" and AI recommendations.
- **Playlists table** — curated collections of videos.

---

## What's Next

Now that you know what data we store and why, let's see the first real feature built on top of this schema: the authentication system — how users sign up, verify their email, log in, and stay logged in across sessions.
