# 08 - Frontend Auth Pages

The foundation is in place: the Axios client auto-attaches tokens, the Zustand store manages global auth state, and `ProtectedLayout` guards authenticated routes. Now let's walk through each authentication screen - these are the most complete pages in the entire frontend, with every flow working end-to-end.

---

## Route Structure

Most auth pages live under `app/(public)/auth/`, but not all of them - `verify-email` is a top-level sibling, not nested under `auth/`:

```
app/(public)/
├── auth/
│   ├── sign-in/          → /auth/sign-in
│   ├── sign-up/          → /auth/sign-up
│   ├── forgot-pw/        → /auth/forgot-pw
│   └── reset-password/   → /auth/reset-password
└── verify-email/         → /verify-email?token=<uuid>
```

There is no `resend-verification` page - that flow is a button/action on an existing page, not a standalone route. Resending a verification email still works (`POST /auth/resend-verification` on the backend), it just isn't reached via its own URL.

These are all in the `(public)` route group, so they have no auth check - unauthenticated users can always reach them.

---

## Sign-Up Page

**`app/(public)/auth/sign-up/page.tsx`**

The sign-up form collects: email, username, password, and a password confirmation field (client-side validation only - the API only needs password, not confirm_password).

On submit:
1. Calls `authStore.signup({ email, username, password })`
2. On success: displays a `SuccessCard` component (a full-screen success state) with a toast notification AND redirects to the sign-in page after a short delay
3. On error: shows the error message inline (e.g., "Email already registered")

Note: the user cannot log in immediately after sign-up. The success card explains that a verification email has been sent and they must click the link before signing in. If `RESEND_API_KEY` is set to `dummy_key` (the local dev default), no email is actually sent - you'll need to manually verify in the database.

**Quick dev workaround for email verification without real email:**
```bash
make db
# In psql:
UPDATE users SET is_verified = true WHERE email = 'your@email.com';
```

---

## Email Verification Page

**`app/(public)/verify-email/page.tsx`** - note this is not nested under `auth/`, matching the link the backend actually emails (`{FRONTEND_URL}/verify-email?token=...`, no `/auth` prefix).

This page reads the `token` query parameter from the URL (the link in the verification email points here with `?token=<uuid>`). On mount, it immediately calls `GET /auth/verify-email?token=<token>` (a query param, not a POST body - the endpoint accepts `GET`).

- If successful: shows a success message and a "Sign In" button
- If the token is invalid or expired: shows an error with a "Resend Verification Email" link

The page handles three states: loading (verifying in progress), success, and error. The loading state prevents flashing incorrect content.

---

## Sign-In Page

**`app/(public)/auth/sign-in/page.tsx`**

Collects email and password. On submit:
1. Calls `authStore.signin(email, password)`
2. The store calls `POST /auth/signin`, stores both tokens via `tokenManager`, updates the store with the user object, and sets `isAuthenticated = true`
3. On success: redirects to the `?next=` path if one was passed in the URL (see below), otherwise to `/`
4. On error: displays the error inline

Notable: there is no "Continue with Google" button anymore. It existed as a placeholder in an earlier revision of this page and was removed entirely during the auth-screens dark/cyan redesign - there's no `onClick` to wire up, it would need to be rebuilt from scratch.

**The `?next=` redirect.** Since browse and watch are public, sign-in is now something a user is bounced to *mid-task* (clicking Like while logged out, or hitting `/admin` without a session) rather than a starting point. `signin-form.tsx` reads `useSearchParams().get("next")`, passes it through `getSafeNextPath()` (rejects anything that isn't a same-origin absolute path - no `//evil.com` open-redirect), and pushes there after a successful login instead of hardcoding `/`. Every place that redirects to sign-in (`(protected)/layout.tsx`, `admin/layout.tsx`, the logged-out "Sign in" nav link, `useRequireAuth`) builds its URL through the shared `buildSignInUrl(pathname)` helper so this round-trips consistently.

The error handling distinguishes between cases:
- 401: "Invalid email or password"
- 403: "Please verify your email" (with a link to resend verification)
- Network error: "Unable to connect to server"

---

## Forgot Password Page

**`app/(public)/auth/forgot-pw/page.tsx`** (route: `/auth/forgot-pw`)

Simple single-field form (email address). On submit:
1. Calls `POST /auth/forgot-password` with the email (the route is `/auth/forgot-password` on the backend - only the frontend page's own folder is named `forgot-pw`)
2. **Always shows a success message**, regardless of whether the email exists in the system - this matches the backend behavior (prevents email enumeration)

After showing success, automatically redirects to the reset-password page after a short delay (the user is expected to open their email and find the 6-character reset code).

---

## Reset Password Page

**`app/(public)/auth/reset-password/page.tsx`**

Receives the reset code from the URL (the user copies or clicks through from their email). Collects:
- Email address
- Reset code (6 characters)
- New password
- Confirm new password (client-side validation only)

On submit: calls `POST /auth/reset-password`. On success: shows a success toast and redirects to sign-in.

The validation schema (`lib/apis/auth.schema.ts`) handles the form validation for this page. Note: `auth.schema.ts` currently only contains the reset-password schema - it was not expanded to cover the other auth forms, which do their own inline validation.

---

## Shared Auth Components

Several reusable components make the auth pages consistent:

**`AuthLayout`** - the shared container for all auth pages. Provides the centered card layout, the logo at the top, and the dark theme background.

**`SuccessCard`** - a full-screen success state component used after sign-up and other completed actions. Shows an animated checkmark, a title, a description, and optional action buttons.

**`AuthFormField`** - a labeled input with error state rendering. Wraps shadcn's `Input` and `Label` components.

**`PasswordInput`** - an input with a show/hide toggle button. Used on sign-in, sign-up, and reset-password.

---

## Form Validation

All forms use **React Hook Form** for state management and validation, paired with **Zod** schemas for type-safe validation rules. This combination:
- Validates on submit (and optionally on blur)
- Provides typed error messages
- Prevents rerenders on every keystroke (performance)

Example from sign-up:
```typescript
const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})
```

---

## State: The `lib/store/index.ts` File

The store index (`lib/store/index.ts`) only re-exports `authStore`. Despite two other store files existing (`userStore.ts`, `videoStore.ts`), they are empty files. The auth store is the only working Zustand store in the current codebase. Any future global state (loaded user preferences, video playback state) should be added to `authStore.ts` or to new stores following the same pattern.

---

## The Auth Flow End-to-End

Here's the complete happy path for a new user:

1. Land on `/auth/sign-up`
2. Fill out the form, submit → API creates user, sends verification email
3. Success card shown → redirect to `/auth/sign-in`
4. Click verification link in email → `/verify-email?token=uuid` → account verified
5. Sign in at `/auth/sign-in` → tokens stored, redirect to `/` (or back to whatever page triggered the sign-in, via `?next=`)
6. 30 minutes later: access token expires → Axios interceptor auto-refreshes → user stays logged in
7. 7 days later: refresh token expires → interceptor fails → redirect to `/auth/sign-in`

---

## Future Upgrades

- **Google OAuth** - the button was removed, not just unwired; reintroducing it means designing the UI treatment from scratch plus the full backend OAuth flow
- **Remember me** - optionally extend session duration; currently the 7-day refresh token expiry is fixed
- **Email change flow** - allow users to update their email address (requires re-verification)
- **Account deletion** - self-service account deletion (GDPR compliance)

---

## What's Next

Auth is done. Users can create accounts, verify them, and sign in - but signing in is no longer the gate it used to be for the app's two most important pages. The next document covers the home feed and the video watch page, both public now, and explains what's real (most of it) and what's still mocked or half-wired (a shrinking but honestly-documented list).
