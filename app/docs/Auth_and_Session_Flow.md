# 🔐 Frontend Authentication & Session Management

## Overview

Our frontend implements a **robust, production-ready authentication system** with automatic token refresh, proactive expiry checks, and seamless user experience. Users stay logged in across page refreshes and token expirations are handled transparently.

---

## 🏗️ Architecture

### Core Components
```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Action  →  Request Interceptor  →  Backend API        │
│                       ↓                       ↓             │
│                  Check Token             Process Request    │
│                  Expiry                        ↓            │
│                       ↓                   Response          │
│              Refresh if needed                ↓             │
│                       ↓              Response Interceptor   │
│                  Add to Request              ↓              │
│                       ↓              Handle 401 Errors      │
│                  Send Request                ↓              │
│                                      Auto-refresh & Retry   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **State Management** | Zustand | Lightweight, simple auth state |
| **HTTP Client** | Axios | API requests with interceptors |
| **Token Storage** | localStorage | Persistent session storage |
| **JWT Decoding** | jwt-decode | Token expiry checking |

---

## 🔑 Token Management

### Storage Strategy
```typescript
localStorage:
  ├── access_token  (short-lived, 15 min)
  └── refresh_token (long-lived, 7 days)

Zustand Store:
  ├── user          (current user data)
  ├── isAuthenticated
  └── isLoading
```

### Token Lifecycle
```
Login → Store tokens → Use access_token for requests
        ↓
    Access token expires (15 min)
        ↓
    Auto-refresh with refresh_token
        ↓
    Get new access_token → Continue seamlessly
        ↓
    Refresh token expires (7 days)
        ↓
    Redirect to login
```

---

## 🚀 Key Features

### ✅ 1. Proactive Token Refresh (Request Interceptor)

Checks token expiry **before** making requests to avoid failures.
```typescript
// Runs BEFORE every API call
Request → Check if token expires soon → Refresh preemptively → Send request
```

**Benefits:**
- Zero failed requests due to expired tokens
- Faster response times (no retry needed)
- Better user experience

### ✅ 2. Reactive Token Refresh (Response Interceptor)

Catches 401 errors and retries **only for expired tokens**.
```typescript
// Runs AFTER failed requests
401 Error → Check error detail → If "Token expired" → Refresh → Retry
```

**Benefits:**
- Handles edge cases (token expires mid-flight)
- Smart retry (only for expiry, not permission errors)
- Transparent to user

### ✅ 3. Persistent Sessions

Authentication survives page refreshes.
```typescript
// Runs on app load
Page Load → Check localStorage → Verify tokens → Restore session
```

**Benefits:**
- Users stay logged in across tabs/refreshes
- Seamless experience
- Validates tokens with backend

### ✅ 4. Secure Token Validation

Only refreshes for legitimate token expiry, not other 401 errors.
```typescript
401 Errors we DON'T retry:
❌ Invalid credentials
❌ Account suspended
❌ Email not verified
❌ Insufficient permissions

401 Errors we DO retry:
✅ Token expired
```

---

## 📁 Project Structure
```
lib/
├── store/
│   ├── index.ts              # Export all stores
│   └── authStore.ts          # Auth state & actions
├── apis/
│   ├── client.ts             # Axios instance + interceptors
│   └── auth.api.ts           # Auth API calls
├── utils/
│   └── tokenManager.ts       # Token utility functions
└── types/
    └── auth.ts               # TypeScript interfaces
```

---

## 🔄 How It Works

### Initialization Flow
```typescript
1. App loads
   ↓
2. Run initialize() from authStore
   ↓
3. Check localStorage for tokens
   ├─ No tokens? → Set unauthenticated state
   └─ Has tokens? → Verify with backend
              ↓
      GET /user/profile
              ↓
      ├─ Success (200) → Restore user session ✅
      └─ Expired (401) → Try refresh
                    ↓
            POST /auth/refresh
                    ↓
            ├─ Success → Get profile again ✅
            └─ Failed → Clear tokens, redirect to login
```

### Request Flow
```typescript
User clicks button → API call triggered
        ↓
Request Interceptor:
  1. Skip check if auth endpoint
  2. Check if token expires soon (< 60 sec)
     ├─ Yes → Refresh proactively
     └─ No → Add existing token
  3. Send request
        ↓
Backend processes request
        ↓
Response Interceptor:
  1. Success (200)? → Return response ✅
  2. Error (401)?
     ├─ "Token expired" → Refresh & retry ✅
     └─ Other 401 → Reject (don't retry) ❌
```

---

## 🛡️ Security Features

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Token Expiry** | Access: 15 min, Refresh: 7 days | Limits attack window |
| **Automatic Refresh** | Transparent token renewal | User convenience + security |
| **Validation on Init** | Backend verification on page load | Prevents stale sessions |
| **Selective Retry** | Only retry "Token expired" | Prevents retry attacks |
| **Secure Storage** | localStorage (MVP) | Easy to upgrade to httpOnly cookies |

---

## 🎯 User Experience Benefits

### Silent Token Refresh
```
User's perspective:
"I'm using the app" → Just works ✨

Behind the scenes:
Token expired → Refreshed → Request retried → Success
(User never knows!)
```

### No Annoying Logouts
```
Traditional apps:
Every 15 minutes → "Session expired, please login again" 😤

Our app:
Works seamlessly for 7 days → Only login when refresh expires 🎉
```

### Fast Page Loads
```
Page refresh → Validate tokens → Restore session instantly
(No loading spinners, no redirects, just works)
```

---

## 🧪 Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Login with valid credentials | ✅ Store tokens, show authenticated content |
| Refresh page while logged in | ✅ Restore session from localStorage |
| Make request with expired access token | ✅ Auto-refresh, retry request |
| Make request with expired refresh token | ✅ Redirect to login |
| Invalid credentials | ❌ Show error, don't retry |
| Account suspended | ❌ Show error, don't retry |

---

## 🔧 Configuration

### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Token Expiry Settings (Backend)
```python
ACCESS_TOKEN_EXPIRE_MINUTES = 15   # Short-lived
REFRESH_TOKEN_EXPIRE_DAYS = 7      # Long-lived
```

---

## 📊 Performance

- **Zero unnecessary API calls** - Proactive refresh prevents failed requests
- **Minimal re-renders** - Zustand only updates changed state
- **Fast initialization** - Parallel token check + profile fetch
- **Smart caching** - Token expiry checked locally first

---

## 🚧 Future Enhancements

- [ ] Move to **httpOnly cookies** (more secure than localStorage)
- [ ] Add **refresh token rotation** (invalidate old refresh tokens)
- [ ] Implement **device tracking** (see active sessions)
- [ ] Add **"Remember me"** option (longer refresh expiry)
- [ ] Support **multiple tabs** (sync auth state across tabs)

