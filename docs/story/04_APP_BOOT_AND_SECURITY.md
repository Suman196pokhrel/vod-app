# 04 — App Boot and Security

**Files covered:** `backend/app/main.py` · `backend/app/core/security.py` · `backend/app/core/jwt.py`

---

## Starting Point

Models are defined (chapter 03). Now the FastAPI application actually boots, creates the tables, and sets up the security primitives — password hashing and JWT tokens — that the auth system will use.

---

## `backend/app/main.py`

### Logging First, Everything Else Second

```python
from app.core.logging_config import setup_logging
setup_logging()
import os
# ... everything else
```

Logging is configured before any other imports. Python's import system runs module-level code as modules are loaded. If any imported module tries to log something during import and logging isn't configured yet, those messages go nowhere. By calling `setup_logging()` first, every log message from every module is captured.

### The Lifespan — Startup and Shutdown Logic

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # runs on startup
    yield
    # runs on shutdown (nothing here yet)

app = FastAPI(lifespan=lifespan)
```

`lifespan` is the modern replacement for the old `@app.on_event("startup")` pattern. Code before `yield` runs when the server starts; code after runs when it shuts down.

`Base.metadata.create_all(bind=engine)` inspects all models that inherit from `Base` and creates their tables in PostgreSQL if they don't exist. It's safe to run repeatedly — it does nothing to tables that already exist. This is why `main.py` imports `User` and `Video` before calling this: those imports register the classes with `Base`, and `create_all` only knows about registered models.

**This is not Alembic.** There are two database management strategies:
- `create_all()` — looks at current models and creates missing tables. Fast for development but can't rename columns, add constraints to existing tables, etc.
- **Alembic** — versioned migration scripts. Can track every change to the schema history and apply them in order.

The project uses `create_all()` on startup for developer convenience. Alembic is set up and has 5 migration files for when you need a coordinated schema change. In production you'd run `alembic upgrade head` during deployment instead.

### CORS — Allowing the Frontend to Call the Backend

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

CORS (Cross-Origin Resource Sharing) is a browser security rule. When your Next.js app at `http://localhost:3000` calls the API at `http://localhost:8000`, the browser checks if the API allows requests from `localhost:3000`. Without the CORS middleware, the browser blocks every API call from the frontend.

`allow_credentials=True` is needed because the requests include an `Authorization` header (the JWT). Without this, credentialed requests would be blocked.

### Routers — Splitting Routes Across Files

```python
app.include_router(auth_router)    # handles /auth/*
app.include_router(video_router)   # handles /videos/*
app.include_router(user_router)    # handles /user/*
app.include_router(healthRouter)   # handles /health
```

If all routes were defined directly on `app` in `main.py`, that file would be thousands of lines long. Routers let you define routes in separate files (`auth.py`, `video.py`, etc.) and mount them all here. Each router has a `prefix`, so everything in `auth.py` automatically gets the `/auth` prefix.

---

## `backend/app/core/security.py` — Password Hashing

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**Never store plain passwords.** When a user registers with password `"hello123"`, you store something like `"$2b$12$LM5C5G3V5KL..."` instead.

**Why bcrypt?**
bcrypt is designed to be slow. That sounds wrong, but it's intentional. Password crackers try billions of combinations. A fast hash (MD5, SHA-256) lets them try ~10 billion passwords per second. bcrypt takes ~100ms per attempt — meaning 10 attempts per second per machine. Making brute-force attacks take 1 billion times longer turns "crackable in minutes" into "crackable in centuries."

bcrypt also handles **salting** automatically. A "salt" is random data added to each password before hashing. This means two users with the same password get completely different hashes. Attackers can't use precomputed hash databases (rainbow tables).

---

## `backend/app/core/jwt.py` — Token Creation and Verification

JWTs (JSON Web Tokens) are the mechanism for authenticating API requests. After login, the server gives you a token. You send that token with every request to prove who you are.

### The Structure of a JWT

A JWT has three parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiYWJjIn0.TJVA95OrM7E2cBab30
 ^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^
 Header (base64)      Payload (base64)         Signature (HMAC)
```

The header says which algorithm was used. The payload carries the actual data. The signature is a cryptographic proof that the header and payload haven't been tampered with. Anyone can decode and read the payload, but only the server — which knows the secret key — can create a valid signature.

### Two Types of Tokens

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
```

**Access token** — short-lived (30 minutes by default). Sent with every API request. Contains `user_id`, `email`, and `role`. If stolen, it works for at most 30 minutes.

**Refresh token** — long-lived (7 days). Only used to get a new access token. Contains only `user_id`. Stored in the database so it can be revoked on logout.

Why two separate tokens? Because security is about limiting damage. If an access token is intercepted on a compromised network, it works for 30 minutes then dies. If you only had one long-lived token, a single interception means weeks of access.

### `verify_token` — The Type Check

```python
def verify_token(token: str, expected_type: str = "access") -> Optional[dict]:
    payload = decode_token(token)
    if not payload:
        return None
    if payload.get("type") != expected_type:
        return None  # ← reject if wrong type
    return payload
```

The `type` field (`"access"` or `"refresh"`) is embedded in the token. `verify_token` checks that you're using the right kind of token for the right purpose. This prevents someone from using a refresh token where an access token is expected — they contain different data and have different lifetimes.

### `hash_token` — For Database Storage

```python
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
```

Refresh tokens are stored in the database as SHA-256 hashes, not as raw strings. If someone reads the database, they can't use the hashes to log in anywhere. SHA-256 is used (not bcrypt) because tokens are already long random strings — brute-forcing them is impossible regardless of hash speed. SHA-256 is simply much faster.

---

## A Note on Duplicate Code

There are two implementations of `get_current_user` in the codebase — one in `security.py` and one in `core/dependencies.py`. The `dependencies.py` version is the correct one (it properly calls `verify_token` with `expected_type="access"`). The version in `security.py` is older and not used by any route. It should be deleted.

---

## Where We Go Next

We have passwords we can hash and verify, and tokens we can create and validate. Now we wire those together into the authentication flows — signup, login, refresh, and logout.

**➡️ [05 — Auth System](./05_AUTH_SYSTEM.md)**
