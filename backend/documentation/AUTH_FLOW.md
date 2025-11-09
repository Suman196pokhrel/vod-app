# VOD Platform Authentication Flow Documentation

## Table of Contents
1. [Overview](#overview)
2. [Signup Flow](#signup-flow)
3. [Login Flow](#login-flow)
4. [Logout Flow](#logout-flow)
5. [Token Refresh Flow](#token-refresh-flow)
6. [Protected Requests](#protected-requests)
7. [Security Mechanisms](#security-mechanisms)
8. [Token Comparison](#token-comparison)
9. [Database Schema](#database-schema)

---

## Overview

Our VOD platform uses **JWT (JSON Web Token) based authentication** with a dual-token system:
- **Access Token**: Short-lived (30 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

This approach provides both **security** (short-lived access) and **user experience** (don't need to login every 30 minutes).

---

## Signup Flow

### User Journey
1. User visits signup page
2. Fills form: email, username, password
3. Submits form
4. Receives confirmation
5. Redirects to login page

### Technical Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  FRONTEND   │                  │   BACKEND   │                  │  DATABASE   │
└─────────────┘                  └─────────────┘                  └─────────────┘
      │                                 │                                 │
      │  POST /api/auth/signup          │                                 │
      ├────────────────────────────────>│                                 │
      │  {                              │                                 │
      │    "email": "user@example.com", │  1. Validate input (Pydantic)   │
      │    "username": "johndoe",       │     ✅ Email format valid       │
      │    "password": "SecurePass123"  │     ✅ Password length OK       │
      │  }                              │                                 │
      │                                 │                                 │
      │                                 │  2. Check email exists?         │
      │                                 ├────────────────────────────────>│
      │                                 │  SELECT * FROM users            │
      │                                 │  WHERE email = 'user@...'       │
      │                                 │<────────────────────────────────┤
      │                                 │  Result: NULL (doesn't exist ✅)│
      │                                 │                                 │
      │                                 │  3. Check username exists?      │
      │                                 ├────────────────────────────────>│
      │                                 │  SELECT * FROM users            │
      │                                 │  WHERE username = 'johndoe'     │
      │                                 │<────────────────────────────────┤
      │                                 │  Result: NULL (doesn't exist ✅)│
      │                                 │                                 │
      │                                 │  4. Hash password               │
      │                                 │     Input: "SecurePass123"      │
      │                                 │     Output: "$2b$12$KIXl3d..."  │
      │                                 │     (bcrypt, ~300ms)            │
      │                                 │                                 │
      │                                 │  5. Create User object          │
      │                                 │     - id: uuid                  │
      │                                 │     - email: user@example.com   │
      │                                 │     - username: johndoe         │
      │                                 │     - hashed_password: $2b$12...│
      │                                 │     - role: "USER" (default)    │
      │                                 │     - is_active: true           │
      │                                 │     - is_verified: false        │
      │                                 │                                 │
      │                                 │  6. Save to database            │
      │                                 ├────────────────────────────────>│
      │                                 │  INSERT INTO users (...)        │
      │                                 │<────────────────────────────────┤
      │                                 │  Success! User created          │
      │                                 │                                 │
      │<────────────────────────────────┤                                 │
      │  HTTP 201 Created               │                                 │
      │  {                              │                                 │
      │    "id": "abc-123-def",         │                                 │
      │    "email": "user@example.com", │                                 │
      │    "username": "johndoe",       │                                 │
      │    "role": "user",              │                                 │
      │    "is_active": true,           │                                 │
      │    "is_verified": false,        │                                 │
      │    "created_at": "2024-11-09T.."│                                 │
      │  }                              │                                 │
      │                                 │                                 │
      │  Show success message           │                                 │
      │  Redirect to /login             │                                 │
      │                                 │                                 │
```


### Security Points
- ✅ Password is hashed with bcrypt (12 rounds, ~300ms)
- ✅ Password never stored in plain text
- ✅ Email and username uniqueness enforced at DB level
- ✅ Default role is "user" (not admin)
- ✅ Response excludes password field

---

## Login Flow

### User Journey
1. User enters email + password
2. Submits login form
3. Receives access token + refresh token
4. Redirects to home page
5. Tokens stored securely

### Technical Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  FRONTEND   │                  │   BACKEND   │                  │  DATABASE   │
└─────────────┘                  └─────────────┘                  └─────────────┘
      │                                 │                                 │
      │  POST /api/auth/login           │                                 │
      ├────────────────────────────────>│                                 │
      │  {                              │                                 │
      │    "email": "user@example.com", │  1. Find user by email          │
      │    "password": "SecurePass123"  ├────────────────────────────────>│
      │  }                              │  SELECT * FROM users            │
      │                                 │  WHERE email = 'user@...'       │
      │                                 │<────────────────────────────────┤
      │                                 │  User found ✅                  │
      │                                 │  {                              │
      │                                 │    id: "abc-123",               │
      │                                 │    hashed_password: "$2b$12..." │
      │                                 │  }                              │
      │                                 │                                 │
      │                                 │  2. Verify password             │
      │                                 │     verify_password(            │
      │                                 │       "SecurePass123",          │
      │                                 │       "$2b$12..."               │
      │                                 │     )                           │
      │                                 │     ✅ Password matches!        │
      │                                 │                                 │
      │                                 │  3. Check user.is_active        │
      │                                 │     ✅ is_active = true         │
      │                                 │                                 │
      │                                 │  4. Create Access Token         │
      │                                 │     Payload: {                  │
      │                                 │       user_id: "abc-123",       │
      │                                 │       email: "user@...",        │
      │                                 │       role: "user",             │
      │                                 │       exp: now + 30 min         │
      │                                 │     }                           │
      │                                 │     Token: "eyJhbGci..."        │
      │                                 │                                 │
      │                                 │  5. Create Refresh Token        │
      │                                 │     Payload: {                  │
      │                                 │       user_id: "abc-123",       │
      │                                 │       exp: now + 7 days         │
      │                                 │     }                           │
      │                                 │     Token: "eyJyZWZy..."        │
      │                                 │                                 │
      │                                 │  6. Hash refresh token          │
      │                                 │     sha256("eyJyZWZy...")       │
      │                                 │     = "a3f7b8c2d1..."           │
      │                                 │                                 │
      │                                 │  7. Store in database           │
      │                                 ├────────────────────────────────>│
      │                                 │  INSERT INTO refresh_tokens (   │
      │                                 │    user_id: "abc-123",          │
      │                                 │    token_hash: "a3f7b8c2...",   │
      │                                 │    expires_at: 7 days from now, │
      │                                 │    is_revoked: false            │
      │                                 │  )                              │
      │                                 │<────────────────────────────────┤
      │                                 │  Success!                       │
      │                                 │                                 │
      │<────────────────────────────────┤                                 │
      │  HTTP 200 OK                    │                                 │
      │  {                              │                                 │
      │    "access_token": "eyJhbGci...",                                 │
      │    "refresh_token": "eyJyZWZy...",                                │
      │    "token_type": "bearer",      │                                 │
      │    "user": {                    │                                 │
      │      "id": "abc-123",           │                                 │
      │      "email": "user@example.com"│                                 │
      │      "role": "user",            │                                 │
      │      ...                        │                                 │
      │    }                            │                                 │
      │  }                              │                                 │
      │                                 │                                 │
      │  STORE TOKENS:                  │                                 │
      │  - access_token → React State   │                                 │
      │  - refresh_token → httpOnly 🍪  │                                 │
      │  - user → React State           │                                 │
      │                                 │                                 │
      │  Redirect to /home              │                                 │
      │                                 │                                 │
```

### Database State After Login

**users table:**
```
┌────────────┬──────────────────┬──────────┬─────────────────┬──────┬───────────┐
│ id         │ email            │ username │ hashed_password │ role │ is_active │
├────────────┼──────────────────┼──────────┼─────────────────┼──────┼───────────┤
│ abc-123    │ user@example.com │ johndoe  │ $2b$12$KIXl... │ user │ true      │
└────────────┴──────────────────┴──────────┴─────────────────┴──────┴───────────┘
```

**refresh_tokens table:**
```
┌────┬─────────┬───────────────────┬───────────┬────────────────────┐
│ id │ user_id │ token_hash        │ is_revoked│ expires_at         │
├────┼─────────┼───────────────────┼───────────┼────────────────────┤
│ 1  │ abc-123 │ a3f7b8c2d1e9f4... │ false     │ 2024-11-16 10:30:00│
└────┴─────────┴───────────────────┴───────────┴────────────────────┘
```


### Security Points
- ✅ Password verified with bcrypt
- ✅ Same error message for "user not found" vs "wrong password" (prevents user enumeration)
- ✅ Refresh token hashed before storage (SHA-256)
- ✅ Access token expires quickly (30 min)
- ✅ Refresh token can be revoked
- ✅ Plain refresh token NEVER stored in database

---

## Logout Flow

### User Journey
1. User clicks "Logout" button
2. Refresh token sent to backend
3. Token revoked in database
4. Frontend clears all tokens
5. Redirects to login page

### Technical Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  FRONTEND   │                  │   BACKEND   │                  │  DATABASE   │
└─────────────┘                  └─────────────┘                  └─────────────┘
      │                                 │                                 │
      │  User clicks "Logout"           │                                 │
      │                                 │                                 │
      │  POST /api/auth/logout          │                                 │
      ├────────────────────────────────>│                                 │
      │  {                              │                                 │
      │    "refresh_token": "eyJyZWZy..."│  1. Decode refresh token       │
      │  }                              │     (don't need full verify)    │
      │                                 │     Payload: {user_id: "abc-123"}│
      │                                 │                                 │
      │                                 │  2. Hash the token              │
      │                                 │     sha256("eyJyZWZy...")       │
      │                                 │     = "a3f7b8c2d1..."           │
      │                                 │                                 │
      │                                 │  3. Find token in DB            │
      │                                 ├────────────────────────────────>│
      │                                 │  SELECT * FROM refresh_tokens   │
      │                                 │  WHERE user_id = 'abc-123'      │
      │                                 │    AND token_hash = 'a3f7b8...' │
      │                                 │<────────────────────────────────┤
      │                                 │  Found: id=1                    │
      │                                 │                                 │
      │                                 │  4. Revoke the token            │
      │                                 ├────────────────────────────────>│
      │                                 │  UPDATE refresh_tokens          │
      │                                 │  SET is_revoked = true          │
      │                                 │  WHERE id = 1                   │
      │                                 │<────────────────────────────────┤
      │                                 │  Success!                       │
      │                                 │                                 │
      │<────────────────────────────────┤                                 │
      │  HTTP 200 OK                    │                                 │
      │  {                              │                                 │
      │    "message": "Logged out successfully"                           │
      │  }                              │                                 │
      │                                 │                                 │
      │  CLEAR ALL TOKENS:              │                                 │
      │  - Delete access_token from state                                 │
      │  - Delete refresh_token cookie  │                                 │
      │  - Clear user info from state   │                                 │
      │                                 │                                 │
      │  Redirect to /login             │                                 │
      │                                 │                                 │
```

### Database State After Logout

**refresh_tokens table:**
```
┌────┬─────────┬───────────────────┬───────────┬────────────────────┐
│ id │ user_id │ token_hash        │ is_revoked│ expires_at         │
├────┼─────────┼───────────────────┼───────────┼────────────────────┤
│ 1  │ abc-123 │ a3f7b8c2d1e9f4... │ TRUE ❌   │ 2024-11-16 10:30:00│
└────┴─────────┴───────────────────┴───────────┴────────────────────┘
```

### What Happens to Old Tokens?

**Old Refresh Token:**
- ❌ Marked as revoked in database
- ❌ Can no longer be used to get new access tokens
- ✅ Remains in DB for audit trail

**Old Access Token:**
- ⏱️ Still technically valid until it expires (~30 min)
- ⏱️ Cannot be revoked (stateless)
- ⏱️ Will expire soon anyway


### Security Points
- ✅ Refresh token immediately revoked
- ✅ Cannot get new access tokens after logout
- ✅ Old access token expires in 30 min anyway
- ✅ Audit trail preserved in database

---

## Token Refresh Flow

### When Does This Happen?
- Every 30 minutes (when access token expires)
- Frontend automatically detects expired token (401 error)
- Sends refresh token to get new access token
- User stays logged in seamlessly

### Technical Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  FRONTEND   │                  │   BACKEND   │                  │  DATABASE   │
└─────────────┘                  └─────────────┘                  └─────────────┘
      │                                 │                                 │
      │  Making API request...          │                                 │
      │  GET /api/videos                │                                 │
      ├────────────────────────────────>│                                 │
      │  Authorization: Bearer eyJold... │  Access token expired! ❌       │
      │<────────────────────────────────┤                                 │
      │  HTTP 401 Unauthorized          │                                 │
      │                                 │                                 │
      │  Detected 401! Auto-refresh...  │                                 │
      │                                 │                                 │
      │  POST /api/auth/refresh         │                                 │
      ├────────────────────────────────>│                                 │
      │  {                              │                                 │
      │    "refresh_token": "eyJyZWZy..."│  1. Verify JWT signature       │
      │  }                              │     ✅ Valid                    │
      │                                 │                                 │
      │                                 │  2. Check expiration            │
      │                                 │     ✅ Not expired              │
      │                                 │                                 │
      │                                 │  3. Extract user_id from payload│
      │                                 │     user_id = "abc-123"         │
      │                                 │                                 │
      │                                 │  4. Hash the token              │
      │                                 │     sha256("eyJyZWZy...")       │
      │                                 │     = "a3f7b8c2d1..."           │
      │                                 │                                 │
      │                                 │  5. Lookup in database          │
      │                                 ├────────────────────────────────>│
      │                                 │  SELECT * FROM refresh_tokens   │
      │                                 │  WHERE user_id = 'abc-123'      │
      │                                 │    AND token_hash = 'a3f7b8...' │
      │                                 │<────────────────────────────────┤
      │                                 │  Found ✅                       │
      │                                 │  is_revoked = false ✅          │
      │                                 │  expires_at > now ✅            │
      │                                 │                                 │
      │                                 │  6. Get user from DB            │
      │                                 ├────────────────────────────────>│
      │                                 │  SELECT * FROM users            │
      │                                 │  WHERE id = 'abc-123'           │
      │                                 │<────────────────────────────────┤
      │                                 │  User found ✅                  │
      │                                 │                                 │
      │                                 │  7. Create NEW access token     │
      │                                 │     Payload: {                  │
      │                                 │       user_id: "abc-123",       │
      │                                 │       email: "user@...",        │
      │                                 │       role: "user",             │
      │                                 │       exp: now + 30 min         │
      │                                 │     }                           │
      │                                 │     Token: "eyJnZXc..."         │
      │                                 │                                 │
      │<────────────────────────────────┤                                 │
      │  HTTP 200 OK                    │                                 │
      │  {                              │                                 │
      │    "access_token": "eyJnZXc...",│                                 │
      │    "token_type": "bearer"       │                                 │
      │  }                              │                                 │
      │                                 │                                 │
      │  Update access_token in state   │                                 │
      │  Retry original request         │                                 │
      │                                 │                                 │
      │  GET /api/videos                │                                 │
      ├────────────────────────────────>│                                 │
      │  Authorization: Bearer eyJnZXc...│  New token! ✅                 │
      │<────────────────────────────────┤                                 │
      │  HTTP 200 OK                    │                                 │
      │  { videos: [...] }              │                                 │
      │                                 │                                 │
      │  User doesn't even notice! 🎉   │                                 │
      │                                 │                                 │
```

### Security Points
- ✅ Refresh token verified against database
- ✅ Checks if token is revoked
- ✅ Checks if token expired
- ✅ Only returns new access token (not new refresh token)
- ✅ Seamless user experience

---

## Protected Requests

### Every API request includes access token

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  FRONTEND   │                  │   BACKEND   │                  │  DATABASE   │
└─────────────┘                  └─────────────┘                  └─────────────┘
      │                                 │                                 │
      │  GET /api/videos/123            │                                 │
      ├────────────────────────────────>│                                 │
      │  Headers:                       │                                 │
      │    Authorization: Bearer eyJh...│  1. Extract token               │
      │                                 │     "Bearer eyJh..." → "eyJh.." │
      │                                 │                                 │
      │                                 │  2. Verify JWT                  │
      │                                 │     ✅ Valid signature          │
      │                                 │     ✅ Not expired              │
      │                                 │                                 │
      │                                 │  3. Decode payload              │
      │                                 │     {                           │
      │                                 │       user_id: "abc-123",       │
      │                                 │       email: "user@...",        │
      │                                 │       role: "user"              │
      │                                 │     }                           │
      │                                 │                                 │
      │                                 │  4. Get user (optional)         │
      │                                 ├────────────────────────────────>│
      │                                 │  SELECT * FROM users            │
      │                                 │  WHERE id = 'abc-123'           │
      │                                 │<────────────────────────────────┤
      │                                 │  User found ✅                  │
      │                                 │                                 │
      │                                 │  5. Get video                   │
      │                                 ├────────────────────────────────>│
      │                                 │  SELECT * FROM videos           │
      │                                 │  WHERE id = 123                 │
      │                                 │<────────────────────────────────┤
      │<────────────────────────────────┤  Video data                     │
      │  HTTP 200 OK                    │                                 │
      │  { video: {...} }               │                                 │
      │                                 │                                 │
```

**Flow:**
1. Extract token from `Authorization` header
2. Verify and decode token
3. Check `role` in payload
4. If `role != "admin"` → Return 403 Forbidden
5. If `role == "admin"` → Allow request

---

## Security Mechanisms

### 1. Password Security
```
User Password: "SecurePass123"
        ↓
  bcrypt (12 rounds, ~300ms)
        ↓
Hashed: "$2b$12$KIXl3d9F6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w"
        ↓
Stored in database
```

**Why bcrypt?**
- Slow by design (prevents brute force)
- Automatic salting (unique hash per password)
- Adaptive (can increase rounds as computers get faster)

### 2. JWT Security

**Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV
│                                      │                          │
└──────────── Header ─────────────────┴────────── Payload ────────┴─────── Signature ──────
```

**Security features:**
- ✅ Signature prevents tampering
- ✅ Expiration timestamp (`exp`)
- ✅ Type field (`access` vs `refresh`)
- ✅ Signed with secret key (only backend can create)

### 3. Refresh Token Storage

**In Database:**
```
Actual Token:  "eyJyZWZyZXNoIjoidG9rZW4ifQ..."
       ↓
   SHA-256
       ↓
Stored Hash:   "a3f7b8c2d1e9f4a5b6c7d8e9f0a1b2c3..."
```

**Why hash refresh tokens?**
- Database breach → attacker gets hashes, not tokens
- Hashes are useless without original token
- Can still verify tokens (hash incoming token, compare)

### 4. Defense in Depth

```
Layer 1: HTTPS (SSL/TLS)
   ↓
Layer 2: Password Hashing (bcrypt)
   ↓
Layer 3: JWT Signatures (HMAC-SHA256)
   ↓
Layer 4: Token Expiration (time limits)
   ↓
Layer 5: Refresh Token Database (revocation)
   ↓
Layer 6: Token Hashing in DB (breach protection)
```

---

## Token Comparison

| Feature | Access Token | Refresh Token |
|---------|--------------|---------------|
| **Lifespan** | 30 minutes | 7 days |
| **Purpose** | Authenticate API requests | Get new access tokens |
| **Contains** | user_id, email, role | user_id only |
| **Stored where (Frontend)** | Memory / React State | httpOnly Cookie |
| **Stored where (Backend)** | ❌ Not stored | ✅ Hashed in database |
| **Can be revoked?** | ❌ No (stateless) | ✅ Yes (DB lookup) |
| **If stolen** | Valid for max 30 min | Can be immediately revoked |
| **Used for** | Every API request | Only /auth/refresh endpoint |
| **Size** | ~200-300 bytes | ~150-200 bytes |
| **Verification** | JWT signature only | Signature + DB lookup |

---



### Sample Data

**After user signs up and logs in:**

```
users table:
┌──────────┬──────────────────┬──────────┬───────────────────┬──────┬───────────┐
│ id       │ email            │ username │ hashed_password   │ role │ is_active │
├──────────┼──────────────────┼──────────┼───────────────────┼──────┼───────────┤
│ abc-123  │ user@example.com │ johndoe  │ $2b$12$KIXl3d... │ USER │ true      │
└──────────┴──────────────────┴──────────┴───────────────────┴──────┴───────────┘

refresh_tokens table:
┌────┬─────────┬─────────────────────┬───────────┬─────────────────────┐
│ id │ user_id │ token_hash          │ is_revoked│ expires_at          │
├────┼─────────┼─────────────────────┼───────────┼─────────────────────┤
│ 1  │ abc-123 │ a3f7b8c2d1e9f4a5... │ false     │ 2024-11-16 10:30:00 │
└────┴─────────┴─────────────────────┴───────────┴─────────────────────┘
```

**After user logs out:**

```
refresh_tokens table:
┌────┬─────────┬─────────────────────┬───────────┬─────────────────────┐
│ id │ user_id │ token_hash          │ is_revoked│ expires_at          │
├────┼─────────┼─────────────────────┼───────────┼─────────────────────┤
│ 1  │ abc-123 │ a3f7b8c2d1e9f4a5... │ TRUE ❌   │ 2024-11-16 10:30:00 │
└────┴─────────┴─────────────────────┴───────────┴─────────────────────┘
```

**After user logs in again:**

```
refresh_tokens table:
┌────┬─────────┬─────────────────────┬───────────┬─────────────────────┐
│ id │ user_id │ token_hash          │ is_revoked│ expires_at          │
├────┼─────────┼─────────────────────┼───────────┼─────────────────────┤
│ 1  │ abc-123 │ a3f7b8c2d1e9f4a5... │ TRUE      │ 2024-11-16 10:30:00 │ ← Old
│ 2  │ abc-123 │ b8c9d0e1f2a3b4c5... │ FALSE ✅  │ 2024-11-16 18:45:00 │ ← New
└────┴─────────┴─────────────────────┴───────────┴─────────────────────┘
```

---

## Summary

### Key Takeaways

1. **Signup**: Password hashed, user created with default role
2. **Login**: Credentials verified, two tokens issued, refresh token stored
3. **Logout**: Refresh token revoked, frontend tokens cleared
4. **Refresh**: New access token issued using valid refresh token
5. **Requests**: Access token sent with every API call

### Security Principles

- 🔒 Passwords never stored in plain text
- 🔒 Tokens signed to prevent tampering
- 🔒 Refresh tokens hashed in database
- 🔒 Short-lived access tokens (30 min)
- 🔒 Revocable refresh tokens (7 days)
- 🔒 Multiple layers of security

### User Experience

- ✅ Sign up once
- ✅ Login with email + password
- ✅ Stay logged in for 7 days
- ✅ Automatic token refresh (seamless)
- ✅ Explicit logout when desired
- ✅ Secure by default

---

**Document Version:** 1.0  
**Last Updated:** November 9, 2024  
**Author:** VOD Platform Team