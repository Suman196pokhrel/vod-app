// Object paths returned by the API (thumbnail_url, raw_video_path,
// manifest_url) are MinIO bucket-prefixed keys, not full URLs — this turns
// one into a browser-fetchable URL via Caddy's /storage proxy. Strips any
// leading slash since some paths are stored with one and some without.
export const storageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_API_URL}/storage/${path.replace(/^\/+/, "")}`
