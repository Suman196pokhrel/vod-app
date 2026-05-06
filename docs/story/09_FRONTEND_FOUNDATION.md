# 09 — Frontend Foundation

**Files covered:** `app/lib/apis/client.ts` · `app/lib/utils/tokenManager.ts` · `app/lib/store/authStore.ts`

---

## Starting Point

The backend is fully working (chapters 01–08). The frontend is a Next.js 16 application with the App Router. This chapter covers the three files that every other frontend file depends on: the API client, token storage, and the global auth state.

---

## Frontend Structure Overview

```
app/
  app/                     ← Next.js App Router pages
    (public)/              ← no auth required (landing, sign-in, sign-up)
    (protected)/           ← auth-guarded (home feed, admin, player)
  lib/
    apis/                  ← API functions (one file per domain)
    store/                 ← Zustand global state
    utils/                 ← tokenManager + helpers
    types/                 ← TypeScript interfaces
  hooks/                   ← React custom hooks
  components/ui/           ← shadcn/ui component library
  providers/               ← React context providers
```

The `(public)` and `(protected)` folders are Next.js "route groups." Parentheses in folder names don't appear in URLs — `/home` resolves to `app/(protected)/home/page.tsx`, not `app/protected/home/page.tsx`. Route groups let you apply different layouts to different sets of pages without affecting URL structure.

---

## `app/lib/apis/client.ts` — The Axios Instance

Every API call in the frontend goes through this single Axios instance.

```typescript
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: { "Content-Type": "application/json" }
})
```

`NEXT_PUBLIC_API_URL` is a Next.js environment variable. The `NEXT_PUBLIC_` prefix makes it available in the browser (without it, Next.js keeps env vars server-side only). In development, it defaults to `http://localhost:8000` (direct to API) or you can point it to `http://localhost` (through Caddy).

### Request Interceptor — Auto-Attach the Token

```typescript
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})
```

This runs before every outgoing request. You never manually add `Authorization` headers in individual API calls — it happens automatically. Any function that uses `api.get(...)` or `api.post(...)` automatically has the current access token attached.

### Response Interceptor — Auto-Refresh on 401

```typescript
api.interceptors.response.use(
    (response) => response,  // success: pass through unchanged
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&           // ← not already retried
            shouldAttemptTokenRefresh(error)     // ← right kind of 401
        ) {
            originalRequest._retry = true;       // ← mark as retried

            try {
                const { useAuthStore } = await import("@/lib/store");
                const newToken = await useAuthStore.getState().refreshToken();
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);     // ← retry the original request
            } catch {
                window.location.href = "/auth/sign-in";
            }
        }

        return Promise.reject(error);
    }
)
```

When a 401 comes back:
1. Check `!originalRequest._retry` — this flag prevents infinite loops. If the refresh itself returns 401, we don't retry again.
2. Call the auth store's `refreshToken()` — gets a new access token from the backend.
3. Update the failed request's Authorization header with the new token.
4. Re-send the original request — the user never knows the token expired.

If the refresh fails (refresh token also expired → user must log in again), redirect to `/auth/sign-in`.

**The dynamic import:**
```typescript
const { useAuthStore } = await import("@/lib/store");
```

This is a runtime import, not a compile-time one. If it were at the top of the file, `client.ts` would import `authStore`, and `authStore` imports `client.ts` for API calls — circular dependency, module loading fails. The dynamic import breaks the cycle: it only loads when the function runs, not when the module loads.

---

## `app/lib/utils/tokenManager.ts` — Token Storage

```typescript
const TOKEN_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export const tokenManager = {
    getTokens: async () => ({
        accessToken: await localStorage.getItem(TOKEN_KEY),
        refreshToken: await localStorage.getItem(REFRESH_KEY)
    }),
    setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem(TOKEN_KEY, accessToken)
        localStorage.setItem(REFRESH_KEY, refreshToken)
    },
    clearTokens: () => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
    }
}
```

This centralizes all localStorage token operations in one place. If you ever want to switch from localStorage to sessionStorage, cookies, or an in-memory store, you change this one file.

**The `async` quirk:**
`localStorage.getItem()` is synchronous — it doesn't return a Promise. `getTokens` is marked `async` and uses `await`, but this is technically unnecessary. It works because `await` on a non-Promise value resolves immediately. The `async` wrapper was probably added in anticipation of switching to a truly async storage mechanism (like httpOnly cookies set by the server). It's harmless.

**Why localStorage and not httpOnly cookies?**
There's a comment in `authStore.ts`: "For production, consider httpOnly cookies for better security."

- **localStorage**: JavaScript can read it. A successful XSS attack (injecting malicious JavaScript) can steal tokens directly.
- **httpOnly cookies**: Set by the server, invisible to JavaScript. XSS attacks can't steal what they can't read.

For this project's scope (development + demo), localStorage is simpler and acceptable. A production system should use httpOnly cookies.

**`shouldAttemptTokenRefresh` — Not Every 401 Should Refresh:**

```typescript
export function shouldAttemptTokenRefresh(error: any): boolean {
    const detail = error.response?.data?.detail.toLowerCase();
    if (detail === "token expired") return true;
    const noRefreshMessages = ["invalid token", "user not found", "invalid credentials", ...];
    if (noRefreshMessages.includes(detail)) return false;
    return true;
}
```

"Token expired" → refresh makes sense, the user is still valid.
"Invalid credentials" → refresh won't help, the user typed a wrong password.
"User not found" → refresh won't help, the account doesn't exist.

The function reads the `detail` field from the backend's error response. This couples the frontend to specific backend error strings — if the backend changes its messages, this logic silently breaks. An improvement would be structured error codes instead of freeform strings.

---

## `app/lib/store/authStore.ts` — Global Auth State

Zustand is a minimal global state library. No boilerplate, no providers, no reducers — just a function that returns state + actions.

```typescript
export const useAuthStore = create<AuthStore>()(
    devtools(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,

            initialize: async () => { ... },
            signin: async (email, password) => { ... },
            signup: async (email, username, password) => { ... },
            logout: async () => { ... },
            refreshToken: async () => { ... },
        }),
        { name: "AuthStore" }  // shown in browser's Redux DevTools
    )
)
```

### `initialize()` — The Startup Check

```typescript
initialize: async () => {
    const { accessToken, refreshToken } = await tokenManager.getTokens();

    if (!accessToken || !refreshToken) {
        set({ isLoading: false, isAuthenticated: false });
        return;  // no tokens = definitely not logged in
    }

    try {
        const user = await authAPI.getProfile();  // test the access token
        set({ user, isAuthenticated: true, isLoading: false });
    } catch (profileError) {
        if (profileError.response?.status === 401) {
            try {
                await get().refreshToken();  // token expired, try refreshing
            } catch {
                tokenManager.clearTokens();  // refresh also failed, log out
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        }
    }
}
```

This runs on every page load within the protected section. It:
1. Checks if tokens exist in localStorage
2. Tries to fetch the user profile (proving the access token is valid)
3. If the profile fetch fails with 401, tries to refresh
4. If refresh also fails, clears everything and treats the user as logged out

**`isLoading: true` initially**

The initial state has `isLoading: true`. The protected layout renders a spinner while this is true. This prevents a "flash" where the page briefly appears as "not authenticated" while the async check is running, causing a redirect flicker before bouncing back.

### `get()` — Reading State Inside Actions

```typescript
await get().refreshToken();
```

Zustand provides `get` to read current state inside action functions. You can also call other actions via `get().actionName()`. This lets `initialize` reuse the same `refreshToken` logic without duplicating code.

### State vs. Storage

The Zustand store holds `user` (the profile object) and `isAuthenticated` in **memory**. These are lost on page refresh — that's why `initialize()` runs on every page load to rebuild in-memory state from localStorage.

The actual JWT strings live in **localStorage** (via `tokenManager`), not in Zustand. The store knows *that* you're authenticated; localStorage holds the actual credentials.

### Two Empty Stores

```
lib/store/videoStore.ts  → 1 line (just an export placeholder)
lib/store/userStore.ts   → 1 line (just an export placeholder)
```

These were created with the intention of managing video and user state globally, but were never implemented. All video state is handled inline in components with `useEffect` hooks, and all API calls use raw Axios. TanStack Query is installed and providers are wired, but no `useQuery` or `useMutation` calls exist anywhere in the codebase.

---

## Where We Go Next

The foundation is in place: API client, token storage, and auth state. Now we look at how the frontend pages use these — route protection, the upload flow, status polling, and the video player.

**➡️ [10 — Frontend Pages](./10_FRONTEND_PAGES.md)**
