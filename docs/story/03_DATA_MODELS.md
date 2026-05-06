# 03 — Data Models

**Files covered:** `backend/app/models/enums.py` · `users.py` · `videos.py` · `tokens.py` · `email_verification.py` · `password_reset.py`

---

## Starting Point

We have a database connection (chapter 02). Now we define what actually lives in the database. Each model file is a Python class that maps directly to a PostgreSQL table. Every attribute is a column; every instance is a row.

---

## `models/enums.py` — User Roles

```python
class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
```

There are exactly two roles: regular viewers and admins who can upload content.

**Why inherit from `str`?**
Without `str`, `UserRole.USER` is a Python enum object. The database would store `<UserRole.USER: 'user'>` — messy. By inheriting from `str`, the enum value *is* a string. `UserRole.USER == "user"` is true. The database stores just `"user"`. Serialization and comparison work naturally.

**Why an enum at all?**
Free-text strings in a role column can hold anything — `"moderator"`, `"superadmin"`, a typo. An enum creates a contract enforced at both the Python and PostgreSQL levels. SQLAlchemy tells Postgres to only allow `"user"` or `"admin"`. Anything else raises an error immediately.

---

## `models/users.py` — The User Table

```python
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), server_default="USER", nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    videos = relationship("Video", back_populates="user")
```

### UUID Primary Keys

`default=lambda: str(uuid.uuid4())` generates a random UUID like `a8f2c1d4-3b7e-...` for each new user.

Why not auto-increment integers (1, 2, 3...)? Because integers are predictable. A user who sees `/users/42` might guess `/users/43` exists. With UUIDs, there's nothing to guess. UUIDs are also safe in distributed systems — you can generate them anywhere without coordination.

The `lambda` wrapper is required because `default` needs a *callable*. `default=str(uuid.uuid4())` would generate **one UUID at module load time** and reuse it forever. `lambda: str(uuid.uuid4())` generates a fresh UUID each time a User is created.

### `is_verified = False` by Default

New users can't log in until they verify their email. The signup flow sends a verification email; clicking the link sets `is_verified = True`. The login flow checks this and returns `403 Forbidden` if it's still False. This prevents throwaway accounts.

### `is_active` — Soft Delete

Setting `is_active = False` suspends an account without deleting the row. Actual deletion is risky (what about their videos? foreign key constraints?). Soft delete lets you reverse the decision by flipping the flag back.

### `updated_at` vs `created_at`

`server_default=func.now()` — the database sets this value at INSERT time (once, never changes).
`onupdate=func.now()` — the database updates this every time the row is changed.

### `videos = relationship(...)`

This is not a database column. It's a Python-level shortcut that lets you write `user.videos` to get a list of all videos belonging to that user. SQLAlchemy generates the SQL JOIN automatically. `back_populates="user"` means the Video model has a matching `user` relationship pointing back.

---

## `models/videos.py` — The Video Table

The most complex model. Fields are grouped by purpose:

### Identity and Processing State

```python
id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
celery_task_id = Column(String, nullable=True)
```

`celery_task_id` stores the Celery workflow ID while processing is in progress. Once processing completes, it's set to `None`. This lets you look up the Celery task if you need to check its raw status, and clearing it signals "no ongoing job."

### Storage Paths — Object Names, Not URLs

```python
raw_video_path = Column(String(500), nullable=False)
# Stores: "user-abc123/9f1e2a3b-....mp4"
# Does NOT store: "http://minio:9000/vod-videos/user-abc123/..."

thumbnail_url = Column(String(500), nullable=True)
manifest_url = Column(String(500), nullable=True)
# Stores: "/vod-processed/{id}/segments/master.m3u8"
```

Only the MinIO *object name* is stored, not a full URL. If you ever change the MinIO endpoint (different server, move to AWS S3, change port), all the URLs would need to change. With just the object name, the URL is constructed at read time from current configuration. The data stays valid forever.

### `processing_status` — A State Machine

```python
processing_status = Column(String(30), default="uploading")
```

This field moves through these states in order:
```
uploading → queued → preparing → transcoding → aggregating →
segmenting → creating_manifest → uploading_to_storage → finalizing → completed
```
Or on failure: `→ failed`

The frontend polls this field to show progress. Each status maps to a progress percentage and user-friendly message in the UI.

**A quirk:** the processing tasks sometimes write `"Failed"` (capital F) and sometimes `"failed"` (lowercase). This inconsistency is a bug — the status comparison in `get_video_processing_status_service` would fail to match if cases don't align. The fix is to use an Enum instead of a raw string.

### `processing_metadata` — JSON Column

```python
processing_metadata = Column(JSON, nullable=True)
# After Stage 1 (prepare_video): {"duration_seconds": 3600, "width": 1920, "height": 1080, "codec": "h264", "bitrate": 5000000}
```

After FFprobe analyzes the video, this is populated with technical specs. Using a JSON column means you can add new fields (like `audio_codec`) to future videos without a database migration. Existing rows just have `null` for the new field.

### `available_qualities` — JSON Array

```python
available_qualities = Column(JSON, nullable=True)
# After processing: ["1440p", "1080p", "720p", "480p"]
```

Not all quality levels are generated for every video. A 480p source won't get a 1080p version (no upscaling). This field records exactly which qualities were produced. The player reads this to know what options to offer.

---

## `models/tokens.py` — Refresh Token Table

```python
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
```

JWTs are stateless — the server normally doesn't remember them. That creates a problem: if a refresh token is stolen, how do you invalidate it? You can't — unless you track them.

Solution: every time a user logs in, the refresh token is hashed (SHA-256) and stored here. On logout, `is_revoked` is set to `True`. When a refresh request comes in, the hash is looked up in this table. Revoked → denied.

**Why hash instead of store the raw token?**
If someone reads your database, you don't want them to find raw tokens they could use immediately. The SHA-256 hash is one-way — you can check "does this incoming token hash to the stored value?" but you can't reverse it to get the original token.

**`ondelete="CASCADE"`**
If a user is deleted, all their refresh tokens are automatically deleted too. No orphaned rows.

**Tokens are marked revoked, not deleted**
Logout flips `is_revoked = True` rather than deleting the row. This gives you an audit trail: you can see that a session existed and was explicitly terminated.

---

## `models/email_verification.py` and `models/password_reset.py`

Both follow the same pattern:

```python
class EmailVerificationToken(Base):
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)  # 24 hours
    used = Column(Boolean, default=False)

class PasswordResetToken(Base):
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)  # 1 hour
    used = Column(Boolean, default=False)
```

- Email verification: 24-hour expiry. The user clicks a link with the token in the URL.
- Password reset: 1-hour expiry. The user gets a 6-digit numeric code they type in manually.

`used = True` after the token is consumed prevents replay attacks — you can't click the same verification link twice, or enter the same reset code twice.

Password reset is shorter-lived (1 hour vs 24 hours) because it's a higher-stakes operation — it lets someone change a password without knowing the old one.

---

## Where We Go Next

We know what's in the database. Now we look at how the application actually starts — what FastAPI does at boot, and how passwords and tokens are created and verified.

**➡️ [04 — App Boot and Security](./04_APP_BOOT_AND_SECURITY.md)**
