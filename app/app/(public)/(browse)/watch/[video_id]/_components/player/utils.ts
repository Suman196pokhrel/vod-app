export const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/storage${path}`

export const formatTime = (s: number) => {
  if (!Number.isFinite(s)) return "0:00"
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, "0")
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec}` : `${m}:${sec}`
}

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max)