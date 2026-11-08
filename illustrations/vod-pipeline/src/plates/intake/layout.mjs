// World plan of Plate 2, "Intake": a resumable tus upload on one bench. The file is a loaf
// cut into 50 MiB slices that ride a belt through Caddy into tusd and land in MinIO as parts.
export const W = 1680;
export const AZIMUTH = 64, ELEVATION = 32;
export const BENCH = { x: 0, y: 0, w: 862, d: 292, r: 12 };
export const BENCH_H = 14, FOOT_H = 7;

export const BELT_Y = 187, BELT_D = 24, BELT_Z = 10;
export const LANE_C = BELT_Y + BELT_D / 2;
export const DESK = { x: 14, y: 146, w: 166, d: 132, r: 4 };
export const BLADE_X = 170;
export const SLICE = { w: 7, d: 14, h: 14, pitch: 9.5 };
export const MAX_SLICES = 12;
export const GATE_X = 196;
export const BELT = { x: 180, y: BELT_Y, w: 150, d: BELT_D, r: 1.5 };
export const ARCH = { x0: 230, x1: 254, back: [164, 183], front: [215, 234], z: 56, lintel: 12 };
export const TUSD = { x: 330, y: 146, w: 130, d: 124, r: 4 };
export const TUSD_H = 58;
export const CHUTE = { x: 460, y: BELT_Y + 2, w: 80, d: BELT_D - 4, r: 1 };
export const CHUTE_Z = 30;
export const MINIO = { x: 540, y: 146, w: 230, d: 124, r: 4 };
export const MINIO_H = 30;
export const PART_X0 = 564, PART_PITCH = 12;

export const BACK_Y = 18, BACK_D = 46, BACK_H = 96;
export const REDIS = { x: 330, y: BACK_Y, w: 132, d: BACK_D, r: 3 };
export const API = { x: 492, y: BACK_Y, w: 180, d: BACK_D, r: 3 };
export const PG = { x: 702, y: BACK_Y, w: 128, d: BACK_D, r: 3 };
export const FACE_Y = BACK_Y + BACK_D;

export const STATIONS = [
  { id: "admin", n: 1, name: "Uppy in the admin's browser", role: "The loaf is the file. Uppy's guillotine cuts it into 50 MiB chunks (chunkSize: 50 * 1024 * 1024); each chunk is one PATCH with an Upload-Offset header. The ruler is that offset, the screen is the form's progress bar." },
  { id: "net", n: 2, name: "The network", role: "The belt is the HTTPS connection. The shutter drops when the connection does; whatever chunk was in flight is lost, and nothing already acknowledged is." },
  { id: "caddy", n: 3, name: "Caddy · /files and /internal", role: "handle /files/* proxies tus requests to tusd with the /files prefix kept and flush_interval -1. /internal/* answers 404 (the blank plate), except GET /internal/tus/hooks/uploads/*, the status bridge Uppy polls when it finishes." },
  { id: "tusd", n: 4, name: "tusd v2.9.2", role: "Speaks tus. Counts the bytes it has acknowledged (Upload-Offset, on its display) and cuts them into 50 MB S3 parts; a tail under 5 MiB waits as an incomplete .part object for the next PATCH, a bigger one goes up as a small part. It and calls FastAPI's hook endpoint directly over backend_net for pre-create, post-finish and post-terminate." },
  { id: "minio", n: 5, name: "MinIO · vod-videos/tus-uploads/", role: "Receives the upload as an S3 multipart upload: one plate per UploadPart (thin plates are the small tail parts), then CompleteMultipartUpload joins them into the single raw object that prepare_video later downloads. The card beside them is tusd's .info sidecar, saved without the access token." },
  { id: "redis", n: 6, name: "Redis · admission keys", role: "One key per upload in flight, tus:active:<id> with a 2-hour TTL (the dial). Pre-create counts them and refuses a ninth. post-finish and post-terminate delete them; an abandoned upload's key only goes away when the TTL runs out." },
  { id: "api", n: 7, name: "FastAPI · hook checkpoint", role: "POST /internal/tus/hooks: the seven pre-create checks in code order (shared secret, JWT, admin, title and category, size, file type, free slot), then the hook lamps for pre-create, post-finish and the status bridge." },
  { id: "postgres", n: 8, name: "PostgreSQL · two rows", role: "pre-create inserts a tus_uploads row ('created'); post-finish marks it 'completed' and inserts the Video row as queued, is_public=false, draft. That queued row is what Plate 3's queue picks up." },
];
