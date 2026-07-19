const DEFAULT_NEXT_PATH = "/"

/**
 * Validates a `next` redirect target is a same-origin relative path, not an
 * open-redirect vector (`//evil.com`, `/\evil.com` both normalize to a
 * protocol-relative URL in some browsers).
 */
export function getSafeNextPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_NEXT_PATH
  if (!value.startsWith("/")) return DEFAULT_NEXT_PATH
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_NEXT_PATH
  return value
}

export function buildSignInUrl(nextPath?: string | null): string {
  const safe = getSafeNextPath(nextPath)
  if (safe === DEFAULT_NEXT_PATH) return "/auth/sign-in"
  return `/auth/sign-in?next=${encodeURIComponent(safe)}`
}
