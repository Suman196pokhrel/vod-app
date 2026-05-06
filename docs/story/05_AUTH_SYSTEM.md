# 05 — Auth System

**Files covered:** `backend/app/services/auth_service.py` · `backend/app/apis/routes/auth.py` · `backend/app/core/dependencies.py`

---

## Starting Point

We have password hashing and JWT creation (chapter 04). Now we build the authentication flows on top of those primitives: signup, sign-in, token refresh, logout, email verification, and password reset.

The auth system is split across two layers intentionally:
- **Routes** (`auth.py`) handle HTTP — parsing requests, returning responses
- **Service** (`auth_service.py`) handles logic — checking credentials, creating tokens

---

## Why a Service Layer?

If all the logic lived in the route functions, you could only call it via HTTP. You couldn't test it without making a full HTTP request. You couldn't reuse it from a different place (say, an admin script that creates users).

The service layer separates concerns: routes are thin HTTP adapters; services contain the real logic. A route function is typically 2-3 lines that call one service function.

---

## `backend/app/services/auth_service.py`

### Sign-in — `authenticate_user()`

```python
def authenticate_user(user_data: UserLoginRequest, db: Session) -> TokenResponse:
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user:
        raise HTTPException(401, "Invalid Credentials")

    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")

    if not user.is_verified:
        raise HTTPException(403, "Please verify your email before logging in.")

    if not user.is_active:
        raise HTTPException(403, "Account not verified")
    ...
```

**The same error message for "email not found" and "wrong password"**

Both cases return `"Invalid Credentials"`. This is deliberate. If the API said "email not found," an attacker probing your system would know which emails are registered. By always returning the same message, you give away nothing. This is called "user enumeration prevention."

**Verification before active check**

The `is_verified` check comes before the `is_active` check. Why does the order matter? If someone's account is both unverified and inactive, telling them "email not verified" gives them useful information (verify your email and you might be able to log in). Telling them "account not active" gives less useful info. The more helpful message comes first.

**Token creation and storage**

```python
access_token = create_access_token({"user_id": user.id, "email": user.email, "role": user.role.value})
encoded_refresh_token = create_refresh_token({"user_id": user.id})
hashed_refresh_token = hash_token(encoded_refresh_token)

refresh_token_record = RefreshToken(
    user_id=user.id,
    token_hash=hashed_refresh_token,
    expires_at=datetime.utcnow() + timedelta(days=7),
    is_revoked=False
)
db.add(refresh_token_record)
db.commit()
```

The refresh token is stored in the database as a hash. If this database commit fails, a `500` is raised. The caller never gets the token. This is correct — you don't want a token in the wild that can't be revoked.

### Refresh — `refresh_access_token()`

```python
def refresh_access_token(refresh_token: str, db: Session) -> AccessTokenResponse:
    payload = verify_token(refresh_token, expected_type="refresh")  # 1. verify JWT
    user_id = payload.get("user_id")
    token_hash = hash_token(refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.token_hash == token_hash
    ).first()                                                         # 2. verify in DB
    if token_record.is_revoked: raise HTTPException(401, "revoked")  # 3. check revoked
    if token_record.expires_at < datetime.now(timezone.utc): ...     # 4. check expired
    new_access_token = create_access_token({...})                    # 5. issue new token
```

There are two separate expiry checks:
1. The JWT's own `exp` claim — verified by `verify_token()`. Fast, requires no DB hit.
2. `token_record.expires_at` in the database — the second gate.

Why both? The JWT check is the primary defense. The DB check exists for defense-in-depth — and catches scenarios where someone forged a token with a future `exp` (impossible with a correct secret key, but layered security is best practice).

### Logout — `revoke_refresh_token()`

```python
def revoke_refresh_token(refresh_token: str, db: Session):
    ...
    token_record.is_revoked = True
    db.commit()
    return {"message": "Logged out successfully"}
```

**The token is marked revoked, not deleted.** This keeps an audit trail. You can see that this session existed and was explicitly ended.

**If the token isn't found, logout still returns success.** This is idempotent behavior — logging out twice should just work, not crash. The user is out either way.

---

## `backend/app/apis/routes/auth.py`

Every route in this file is intentionally minimal. Here's the full sign-in handler:

```python
@auth_router.post("/signin", response_model=TokenResponse, status_code=200)
def signin(user_data: UserLoginRequest, db: Session = Depends(get_db)):
    return authenticate_user(user_data, db)
```

That's it. The route parses the request body into `UserLoginRequest` (Pydantic validates the types and required fields), gets a database session via `Depends(get_db)`, calls the service, and returns the result. Error handling lives in the service.

**`response_model=TokenResponse`**

FastAPI uses this to filter what gets sent back to the client. Even if the service returns an object with more fields than `TokenResponse` defines, only the `TokenResponse` fields are serialized. This is an accidental security layer — if you accidentally return a user object with `hashed_password` in it, `response_model` would strip it before the client sees it.

**`forgot_password` always returns the same message**

```python
@auth_router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return request_password_reset(request.email, db)
```

The underlying service returns `{"message": "If that email exists, a reset link was sent."}` regardless of whether the email is in the database. Same user enumeration prevention as the sign-in endpoint.

---

## `backend/app/core/dependencies.py` — The Auth Dependencies

FastAPI has a dependency injection system. You declare what your route function needs, and FastAPI provides it. This is how routes get database sessions (`Depends(get_db)`) and authenticated users.

### `get_current_user`

```python
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = verify_token(token, expected_type="access")
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user
```

`HTTPBearer()` (the `security` dependency) automatically extracts the `Authorization: Bearer <token>` header. If it's missing, FastAPI returns `401` before this function even runs.

Any route that requires authentication just declares this dependency:
```python
def get_my_videos(current_user: User = Depends(get_current_user), db: ...):
    return video_service.get_user_videos(db, current_user.id)
```

The route function receives a fully validated `User` object — no token parsing, no database queries inside the route itself.

### `get_current_admin_user`

```python
async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin():
        raise HTTPException(403, "Admin privileges required")
    return current_user
```

This chains off `get_current_user`. It first requires a valid logged-in user, then additionally checks for admin role. Admin-only routes swap `Depends(get_current_user)` for `Depends(get_current_admin_user)`.

### `get_current_user_optional`

Some endpoints work differently depending on whether you're logged in or not. For example, a public video list might include extra info for authenticated users:

```python
def get_current_user_optional(...) -> Optional[User]:
    if credentials is None:
        return None  # ← no token = that's fine
    try:
        ...
        return user
    except Exception:
        return None  # ← bad token = also fine, just return None
```

Routes using this get `None` for anonymous visitors and a `User` object for authenticated ones.

---

## Where We Go Next

Authentication is complete. Now we look at the storage layer — MinIO for files and FFmpeg for video metadata. These are the foundations the video upload pipeline is built on.

**➡️ [06 — Storage and Media](./06_STORAGE_AND_MEDIA.md)**
