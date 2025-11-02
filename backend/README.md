# Backend (FastAPI) – Directory Guide

This folder is the backend for the VOD MVP. It’s organised so that HTTP stuff (routes), business logic, and database code are not mixed together. Below is what each folder/file is for.

## High-level flow

1. **`app/main.py`** creates the FastAPI app.
2. It **registers routers** from `api/` (like `/auth`, `/videos`, `/users`).
3. Routers call **service functions** in `services/` to do real work.
4. Services talk to the **database layer** (`db/`, `models/`, `schemas/`).
5. Database structure is kept in **Alembic migrations** (`alembic/` + `alembic.ini`).

So: **request → `api/` → `services/` → `db/` + `models/` + `schemas/`**

---

## Folder / file explanations

### 1. `app/`
- **`app/main.py`** – the entrypoint of the backend.
  - creates the FastAPI instance
  - adds middleware (CORS etc.)
  - includes routers from `api/`
  - good place for startup/shutdown events
- **`app/__init__.py`** – just marks this as a Python package.

**Think of `app/` as “where the FastAPI app actually starts.”**

---

### 2. `api/`
- This folder is the **HTTP layer**.
- Everything here is about **endpoints** (what URL, what method, what path).

#### `api/routes/`
- This is where you put **modular routers**.
- Example (later): `users.py`, `auth.py`, `videos.py`, `uploads.py`
- Each file defines routes like:

  ```python
  router = APIRouter(prefix="/videos", tags=["videos"])
  ```

- Then `app/main.py` will include these routers.

**So: `api/` = “what the client calls.” `routes/` = “grouped endpoints.”**

---

### 3. `core/`
- Place for **project-wide stuff**.
- Typical things that live here:
  - settings / config loading (env vars, secrets)
  - security / auth helpers
  - custom exceptions
  - utils you need in many places
- Idea: **keep common logic here so routes and services stay clean.**

---

### 4. `db/`
- All **database setup** goes here.
- Typical files you’ll add:
  - `session.py` or `database.py` → creates SQLAlchemy engine + session
  - `base.py` → SQLAlchemy `Base` for models
  - dependency for FastAPI: `get_db()`
- **Goal:** have **one** place that knows how to talk to Postgres.

---

### 5. `models/`
- SQLAlchemy **database models** live here.
- These represent **tables** in the DB.
- Example: `User`, `Video`, `Playlist`, `Subscription`
- They map 1-to-1 (or close) with your migrations in `alembic/`.

**Short: `models/` = “how data is stored.”**

---

### 6. `schemas/`
- Pydantic models (request/response bodies).
- Used for:
  - validating incoming JSON from the frontend
  - shaping the outgoing response
- You usually create pairs like:
  - `VideoCreate` (input)
  - `VideoRead` (output)
  - `VideoUpdate` (partial update)
- This keeps API contracts **separate** from DB models.

**Short: `schemas/` = “how data is sent/received.”**

---

### 7. `services/`
- **Business logic / use-cases** live here.
- A route should not do heavy work. Instead it should call a service.
- Example service responsibilities:
  - create a video record + enqueue transcoding
  - check user permissions
  - list videos with filters/pagination
  - talk to S3 / storage
- This makes testing easier: you can test services without hitting HTTP.

**Short: `services/` = “real work happens here.”**

---

### 8. `alembic/` and `alembic/versions/`
- **Alembic** is the migration tool for SQLAlchemy.
- `alembic/` – internal Alembic project folder (env, script runner)
- `alembic/versions/` – this is where **each migration file** gets created.
  - every time DB schema changes → add a migration here
  - files are timestamped

**Short: this folder = “history of your database changes.”**

---

### 9. `alembic.ini`
- Root Alembic config file.
- Tells Alembic how to connect to DB, where migrations live, etc.
- You run commands like:

  ```bash
  alembic revision --autogenerate -m "create videos table"
  alembic upgrade head
  ```

  and this file is used.

---

### 10. `requirements.txt`
- List of Python packages the backend needs.
- Install with:

  ```bash
  pip install -r requirements.txt
  ```

---

### 11. `.python-version`
- Used by tools like **pyenv** to pin the Python version for this project.
- Helps everyone on the team use the same Python.

---

### 12. `__pycache__/`
- Auto-generated Python bytecode.
- Not important for project structure.
- Should be ignored in git.

---

## Mental model (TL;DR)

- **app** → starts FastAPI  
- **api** → URL endpoints  
- **services** → business logic  
- **schemas** → data in/out of API  
- **models** → data in DB  
- **db** → DB connection/session  
- **core** → shared config/utilities  
- **alembic** → migrations  

That’s it. Clean, layered, and ready to grow.
