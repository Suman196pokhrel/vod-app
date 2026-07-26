// Defaults ON when the var is absent entirely (fresh clone, CI, a deploy
// that doesn't set it) — matches the backend's `uploads_tus_enabled: bool =
// True` default. NEXT_PUBLIC_* is inlined at build time, so this is what
// actually governs the default; env files alone (.env.example, infra/*.env)
// can't flip it for anyone who doesn't already have a real .env in place.
export const isResumableUploadsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_UPLOADS_TUS_ENABLED !== "false"
