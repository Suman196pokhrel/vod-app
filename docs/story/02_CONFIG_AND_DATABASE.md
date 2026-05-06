# 02 — Config and Database

**Files covered:** `backend/app/core/config.py` · `backend/app/core/database.py`

---

## Starting Point

The containers are running (from chapter 01). When the `api` container starts, Uvicorn loads the FastAPI app from `backend/app/main.py`. The very first thing that happens — before routes, before middleware — is configuration loading.

---

## `backend/app/core/config.py`

### What It Does

This file reads environment variables and turns them into a typed, validated Python object. Every other part of the app calls `get_settings()` to get configuration values.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    database_url_sync: str
    jwt_secret_key: str
    minio_endpoint: str
    redis_host: str
    redis_port: int = 6379
    FFMPEG_THREADS: int = 2
    # ... 20+ more fields

    model_config = SettingsConfigDict(env_file=".env")
```

`BaseSettings` (from the `pydantic-settings` library) reads environment variables automatically. Field names in the class become the env var names it looks for. `redis_port: int = 6379` means: look for `REDIS_PORT` in the environment; if found, parse it as an integer; if not found, default to `6379`.

### Why Pydantic for Settings?

If `REDIS_PORT` was set to `"six-thousand"` by mistake, Pydantic would throw a clear error at startup: `"redis_port: value is not a valid integer"`. Without validation, you'd get a mysterious crash deep inside the Redis connection code. Fail early, fail loudly.

### `@lru_cache` — Load Once

```python
@lru_cache
def get_settings() -> Settings:
    return Settings()
```

`lru_cache` means the function runs exactly once. The first call creates the `Settings` object (reads all env vars, validates them). Every subsequent call — from any module, in any request — returns the same already-built object. Without this, every API request would re-read and re-validate all environment variables.

### The Two Database URLs — A Quirk

```python
database_url: str       # postgresql+asyncpg://...  (async driver)
database_url_sync: str  # postgresql://...           (sync driver)
```

Only `database_url_sync` is used. Both exist because the project originally tried to use the async PostgreSQL driver (`asyncpg`). When you use async SQLAlchemy, there's a known trap: if you call synchronous SQLAlchemy functions inside an async context, Python raises a `MissingGreenlet` error and crashes. The fix was switching to the sync `psycopg2` driver. `database_url` was kept in the env file in case someone adds async support later — but right now it's unused.

### The Comma Bug (Documented in Code)

There's a comment warning: don't put a trailing comma after a value in the `Settings` class definition. In Python, `value = 1,` is a tuple `(1,)`, not the integer `1`. Pydantic then fails validation because it expected `int` but got `tuple`. This exact bug broke `FFMPEG_THREADS` at some point, which is why the warning is there.

### Quality Settings

```python
QUALITY_SETTINGS: dict = {
    "1440p": {"width": 2560, "height": 1440, "bitrate": "10000k"},
    "1080p": {"width": 1920, "height": 1080, "bitrate": "5000k"},
    "720p":  {"width": 1280, "height": 720,  "bitrate": "2500k"},
    "480p":  {"width": 854,  "height": 480,  "bitrate": "1000k"},
    "360p":  {"width": 640,  "height": 360,  "bitrate": "500k"},
    "240p":  {"width": 426,  "height": 240,  "bitrate": "300k"},
    "144p":  {"width": 256,  "height": 144,  "bitrate": "200k"},
}
```

The video processing pipeline uses this to know what dimensions and bitrate to target for each quality level. Storing it in the settings object means you can override it per-environment if needed.

---

## `backend/app/core/database.py`

### What It Does

Creates the SQLAlchemy database engine (the connection pool) and defines the `get_db` dependency that every route uses to get a database session.

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()  # ← all models inherit from this

engine = create_engine(
    settings.database_url_sync,
    future=True,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
```

### What Is an Engine?

The engine is a connection pool manager. Instead of opening a new TCP connection to PostgreSQL on every single API request (slow and expensive), the pool keeps a handful of connections alive and lends them out. When a request finishes, the connection goes back to the pool for the next request.

`pool_pre_ping=True` sends a "SELECT 1" before giving a connection to any code. If the connection is dead (Postgres restarted, network blip), the pool quietly gets a fresh one rather than handing you a broken connection that crashes your code.

### What Is a Session?

A session is a scratch pad for database operations. You accumulate changes — insert a user, update a video status — and then either `commit()` them all at once (they all go to the database together) or `rollback()` to discard them all.

`autoflush=False` and `autocommit=False` mean nothing goes to the database until you explicitly call `db.commit()`. This gives you full control. You can make 5 changes and commit them atomically.

### The `get_db` Dependency

```python
def get_db():
    db = SessionLocal()
    try:
        yield db        # ← FastAPI injects this into route functions
    finally:
        db.close()      # ← always runs, even if an exception occurred
```

`yield` turns this into a context manager. FastAPI calls `get_db()`, the code up to `yield` runs (creates a session), and the session is passed to your route. When the route finishes — whether it succeeded or threw an exception — the `finally` block runs and closes the session. This guarantees sessions are never leaked.

### `Base` — The Model Registry

```python
Base = declarative_base()
```

Every SQLAlchemy model class inherits from `Base`. This registers the model in a metadata object that SQLAlchemy uses internally. When `main.py` calls `Base.metadata.create_all(bind=engine)` at startup, SQLAlchemy looks at everything that inherits from `Base` and creates the corresponding database tables.

This is why `main.py` imports `User` and `Video` before calling `create_all()` — the imports are what register those classes with `Base`.

---

## Where We Go Next

We have a database connection. Now we need to define what's actually in the database — the models (tables). Each model is a Python class; each instance is a row.

**➡️ [03 — Data Models](./03_DATA_MODELS.md)**
