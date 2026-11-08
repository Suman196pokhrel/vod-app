// World plan of Plate 1, "the plant". Units ≈ px; x runs along the bench, y toward the
// viewer, z up. Every service stands in one row in front of the backend_net bus.
import { k } from "../../scene.mjs";

export const W = 1680;
export const AZIMUTH = 70, ELEVATION = 32;
export const BENCH = { x: 0, y: 0, w: 1250, d: 336, r: 12 };
export const BENCH_H = 14, FOOT_H = 7;
export const ROW_Y = 40;

export const BUS = { x: 168, y: 12, w: 1060, d: 18, r: 2.5 };
export const BUS_Z = 104, BUS_H = 18;
export const POSTS_X = [176, 368, 640, 1018, 1218];
export const TAP_Y = BUS.y + BUS.d, TAP_D = 24, TAP_Z = 96, TAP_H = 22;

export const FENCE_X = 148;
export const CADDY = { x: 136, y: 40, w: 80, d: 214, r: 3 };
export const CADDY_H = 40;
export const VIEWER = { x: 16, y: 40, w: 98, d: 104, r: 4 };
export const DIAL = { x: 92, y: 72, r: 8 };
export const ADMIN = { x: 16, y: 168, w: 106, d: 142, r: 4 };

export const TUSD = { x: 244, y: ROW_Y, w: 108, d: 132, r: 4 };
export const TUSD_H = 34;
export const API = { x: 380, y: ROW_Y, w: 112, d: 120, r: 4 };
export const API_H = 30;
export const PG = { x: 520, y: ROW_Y, w: 100, d: 132, r: 4 };
export const PG_H = 58;
export const REDIS = { x: 648, y: ROW_Y, w: 118, d: 140, r: 4 };
export const REDIS_H = 26;
export const WORKER = { x: 796, y: ROW_Y, w: 214, d: 214, r: 5 };
export const WORKER_H = 16;
export const MINIO = { x: 1040, y: ROW_Y, w: 168, d: 150, r: 4 };
export const MINIO_H = 88;

// Where each service's drop cable leaves its top and meets the bus (x, y on the floor).
export const DROPS = {
  caddy: { x: 202, y: 46, z: CADDY_H },
  tusd: { x: 330, y: 46, z: TUSD_H },
  api: { x: 470, y: 46, z: 50 },
  postgres: { x: 600, y: 46, z: PG_H },
  redis: { x: 744, y: 46, z: 48 },
  worker: { x: 820, y: 46, z: 60 },
  minio: { x: 1188, y: 46, z: MINIO_H },
};

export const STATIONS = [
  { id: "admin", n: 1, name: "Admin's browser · Uppy", role: "Picks a file and sends it in resumable 50 MiB chunks over tus (PATCH with Upload-Offset), so a dropped connection resumes instead of restarting. While a video processes, the admin page polls its status every 2 s." },
  { id: "viewer", n: 2, name: "Viewer's browser · video.js", role: "Plays published titles only (the public feed filters is_public and status = published). Fetches master.m3u8 through Caddy's /storage route, picks a rendition from measured bandwidth and pulls 6-second .ts segments." },
  { id: "caddy", n: 3, name: "Caddy · reverse proxy", role: "The only door from the internet. /files → tusd, /storage → MinIO, /internal/* → 404 (except the upload-status bridge), everything else → FastAPI." },
  { id: "tusd", n: 4, name: "tusd · resumable uploads", role: "Speaks the tus protocol, writes each upload to MinIO as an S3 multipart upload, and calls FastAPI's hooks at pre-create, post-finish and post-terminate." },
  { id: "api", n: 5, name: "FastAPI", role: "Auth, the video API and the tusd hooks: checks the admin JWT, admission (8 concurrent uploads), creates the Video row and starts the processing queue." },
  { id: "postgres", n: 6, name: "PostgreSQL 16", role: "System of record: users, tus_uploads and videos with processing_status. The queue is simply the oldest row whose status is still 'queued'." },
  { id: "redis", n: 7, name: "Redis 7", role: "Upload admission keys (tus:active:*, at most 8), the one processing lock (video_processing:active_lock), the Celery broker list the worker consumes, and Celery's result backend, which counts down the transcode chord." },
  { id: "worker", n: 8, name: "Celery worker · FFmpeg", role: "Runs one video's chain: prepare → storyboard → a chord of 7 transcodes (+ its callback) → segment → manifest → upload → finalize → on_pipeline_success, 15 tasks in all. Prod runs --concurrency=1 (one task at a time), local dev 3." },
  { id: "minio", n: 9, name: "MinIO · object storage", role: "Three buckets: vod-videos (raw uploads), vod-thumbnails (posters, sprite sheets, storyboard.vtt) and vod-processed (HLS playlists and segments)." },
  { id: "bus", n: 10, name: "backend_net", role: "The private Docker network every service sits on. Nothing on it is published to the internet except through Caddy." },
  { id: "rail", n: 11, name: "Status rail · processing_status", role: "The admin page's progress bar, made physical. Each stop is a processing_status at its real STATUS_META value (queued 15 %, transcoding 50 %, completed 100 %, failed 0 %; the 5 % 'uploading' stop is only used by the legacy multipart path). One carriage per unfinished video, oldest three." },
];

export const fitPoints = () => [
  ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
  [BUS.x, BUS.y, BUS_Z + BUS_H + 4],
  [BUS.x + BUS.w, BUS.y, BUS_Z + BUS_H + 4],
  [VIEWER.x, VIEWER.y, 80],
];
