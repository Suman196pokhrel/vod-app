# Authentication System - VOD App

## Overview
This app uses **JWT (JSON Web Tokens)** with a **dual-token system**: short-lived access tokens and long-lived refresh tokens.

---

## Why JWT for Our MVP?

### The Honest Truth
**No auth system is 100% secure.** Even banks and big tech get breached. JWT has known vulnerabilities (token theft, replay attacks), but so does every other method.

### Why We're Using It Anyway

| Reason | Explanation |
|--------|-------------|
| **Simple** | No Redis, no session store, no extra infrastructure |
| **Cheap** | Zero cost - just verify signatures |
| **Stateless** | Scales horizontally without shared state |
| **Fast** | No database lookup on every request |
| **Standard** | Battle-tested, well-documented, widely understood |
| **Good Enough** | For a VOD app (not a bank), this security level is appropriate |

**Bottom line:** JWT gives us 80% of the security with 20% of the complexity.

---

## How It Works

### The Two-Token System
```
Access Token:  Short-lived (15 min) - Used for API requests
Refresh Token: Long-lived (7 days) - Used to get new access tokens
```

### Flow
```
1. Login
   ↓
   Email + Password → Backend validates
   ↓
   Returns: Access Token + Refresh Token

2. Make API Calls
   ↓
   Send Access Token with every request
   ↓
   Backend verifies signature (no DB lookup)

3. Access Token Expires (15 min)
   ↓
   Use Refresh Token to get new Access Token
   ↓
   Continue working

4. Logout
   ↓
   Revoke Refresh Token in database
   ↓
   Can't get new Access Tokens
```

---

## Security Layers

We use **defense in depth** - multiple layers to mitigate JWT's weaknesses:

### 1. **HTTPS Only**
- All traffic encrypted
- Prevents token interception

### 2. **HttpOnly Cookies**
- Tokens stored in HttpOnly cookies (not localStorage)
- JavaScript can't access them (prevents XSS attacks)

### 3. **Short Expiry**
- Access tokens expire in 15 minutes
- Limits damage if stolen

### 4. **Refresh Token Storage**
- Refresh tokens stored in database
- Can be revoked immediately on logout/suspicious activity

### 5. **Token Rotation** (Future)
- New refresh token issued on each use
- Detects token reuse (theft indicator)

---

## Known Limitations & Accepted Risks

### What Could Go Wrong

| Attack | Risk Level | Mitigation | Why Acceptable |
|--------|-----------|------------|----------------|
| **Token theft** | Medium | Short expiry + HTTPS | 15 min window only |
| **XSS injection** | Low | HttpOnly cookies | JS can't steal tokens |
| **Man-in-middle** | Low | HTTPS mandatory | Traffic encrypted |
| **Stolen refresh token** | Medium | DB revocation | Can invalidate immediately |

### What We're NOT Protecting Against (Yet)

- ❌ Advanced persistent threats (APTs)
- ❌ Zero-day browser exploits
- ❌ Physical device theft with active session
- ❌ Social engineering (phishing)

**Reality check:** These attacks are beyond MVP scope. We're building a video platform, not Fort Knox.

---

## Token Structure

### Access Token Payload
```json
{
  "sub": "user_id",           // Subject (user ID)
  "email": "user@example.com",
  "type": "access",
  "exp": 1699999999,          // Expiration timestamp
  "iat": 1699900000           // Issued at timestamp
}
```

### Refresh Token Payload
```json
{
  "sub": "user_id",
  "type": "refresh",
  "jti": "token_unique_id",   // For revocation tracking
  "exp": 1700999999
}
```

---

## When to Upgrade

**Move to session-based auth when:**
- ✅ 100K+ concurrent users
- ✅ Need instant global logout (all devices)
- ✅ Complex permission systems that change frequently
- ✅ Regulatory requirements (healthcare, finance)
- ✅ Can afford Redis infrastructure

**Until then:** JWT is the pragmatic choice.

---

## Comparison: JWT vs Sessions

| Factor | JWT (Our Choice) | Sessions (Big Tech) |
|--------|------------------|---------------------|
| **Setup** | Easy | Complex (Redis/DB) |
| **Infrastructure** | None | Redis cluster |
| **Speed** | Fast (no DB) | Fast (with cache) |
| **Revocation** | Delayed (15 min max) | Instant |
| **Cost** | Free | $50-500/month |
| **Appropriate for** | MVP → 1M users | 10M+ users |

---

## Implementation Checklist

- [x] JWT library (`python-jose` or `PyJWT`)
- [x] Password hashing (`passlib` + `bcrypt`)
- [x] Access tokens (15 min expiry)
- [x] Refresh tokens (7 day expiry)
- [x] HttpOnly cookies
- [x] HTTPS enforcement
- [x] Refresh token DB storage
- [ ] Token rotation (Phase 2)
- [ ] Device fingerprinting (Phase 2)
- [ ] 2FA for sensitive actions (Phase 3)

---

## Key Principle

> **"Perfect security doesn't exist. Good security is about making attacks more expensive than the reward."**

For a VOD app:
- User videos have value, but we're not handling money
- Reasonable security > paranoid security
- User experience matters
- Start simple, add layers as needed

**JWT + HTTPS + HttpOnly cookies + Short expiry = Good enough for 99% of use cases.**

---

## Further Reading

- [JWT.io](https://jwt.io) - Decode/verify tokens
- [OWASP JWT Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- Why big tech uses sessions: [Stack Overflow Architecture](https://stackoverflow.blog/2021/10/06/best-practices-for-authentication-and-authorization-for-rest-apis/)

---

**Last Updated:** 2025-11-05  
**Status:** Active  
**Review Date:** When we hit 10K users