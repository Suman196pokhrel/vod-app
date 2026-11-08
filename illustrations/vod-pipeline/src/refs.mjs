// Resolves every "file:line" the figures cite by searching the real source at build
// time, so the event log can never drift from the code it describes.
import { readFileSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = new URL("../../../", import.meta.url).pathname;

const ANCHORS = {
  preCreate: ["backend/app/services/tus_service.py", "def handle_pre_create"],
  verifyToken: ["backend/app/services/tus_service.py", 'verify_token(token, expected_type="access")'],
  adminOnly: ["backend/app/services/tus_service.py", "if not user or not user.is_admin()"],
  sizeCheck: ["backend/app/services/tus_service.py", "if declared_size <= 0 or declared_size > max_bytes"],
  mimeCheck: ["backend/app/services/tus_service.py", "if mime_type not in settings.tus_allowed_mime_types"],
  admission: ["backend/app/services/tus_service.py", "if count_active_uploads() >= settings.tus_max_concurrent_uploads"],
  admit: ["backend/app/services/tus_service.py", "    admit_upload(upload_id)\n    return"],
  stripToken: ["backend/app/services/tus_service.py", '"MetaData": {k: v for k, v in metadata.items() if k != "token"}'],
  postFinish: ["backend/app/services/tus_service.py", "def handle_post_finish"],
  videoRow: ["backend/app/services/tus_service.py", "video = Video("],
  idempotent: ["backend/app/services/tus_service.py", 'if tus_upload.status == "completed":'],
  release: ["backend/app/services/tus_service.py", "        release_upload(upload_id)\n"],
  kickQueue: ["backend/app/services/tus_service.py", "            start_next_video_if_idle()\n        except"],
  hookRoute: ["backend/app/apis/routes/tus_hooks.py", "hmac.compare_digest"],
  statusBridge: ["backend/app/apis/routes/tus_hooks.py", "def get_tus_upload_status"],
  oldestQueued: ["backend/app/tasks/processing_queue.py", ".order_by(Video.created_at.asc())"],
  setNx: ["backend/app/tasks/processing_queue.py", "if not get_redis_client().set(PROCESSING_LOCK_KEY"],
  dispatch: ["backend/app/tasks/processing_queue.py", "pipeline.apply_async(link_error="],
  lockTtl: ["backend/app/tasks/processing_queue.py", "PROCESSING_LOCK_TTL_SECONDS = 6 * 60 * 60"],
  luaRelease: ["backend/app/tasks/processing_queue.py", "if redis.call('GET', KEYS[1]) == ARGV[1] then"],
  onSuccess: ["backend/app/tasks/processing_queue.py", "def on_pipeline_success"],
  onFailed: ["backend/app/tasks/processing_queue.py", "def on_pipeline_failed"],
  recovery: ["backend/app/tasks/processing_queue.py", "def recover_after_worker_restart"],
  purge: ["backend/app/tasks/processing_queue.py", "purged = celery_app.control.purge()"],
  chain: ["backend/app/tasks/workflows.py", "workflow = chain("],
  chord: ["backend/app/tasks/workflows.py", "chord("],
  prepare: ["backend/app/tasks/video/prepare.py", 'video.processing_status = "preparing"'],
  download: ["backend/app/tasks/video/prepare.py", "download_video_to_file(raw_video_path, local_video_path)"],
  ffprobe: ["backend/app/tasks/video/prepare.py", "metadata = extract_metadata(local_video_path)"],
  probeFail: ["backend/app/tasks/video/prepare.py", "No retry for metadata extraction"],
  storyboard: ["backend/app/tasks/video/storyboard.py", "f'fps=1/{INTERVAL_SECONDS},scale={TILE_WIDTH}:-2,tile={GRID_COLS}x{GRID_ROWS}'"],
  vtt: ["backend/app/tasks/video/storyboard.py", 'vtt_lines = ["WEBVTT", ""]'],
  storyboardSwallow: ["backend/app/tasks/video/storyboard.py", "continuing without scrubbing preview"],
  transcode: ["backend/app/tasks/video/transcode.py", "'-c:v', 'libx264'"],
  noUpscale: ["backend/app/tasks/video/transcode.py", "if target_height > source_height:"],
  chordDone: ["backend/app/tasks/video/transcode.py", "def on_transcode_complete"],
  allFailed: ["backend/app/tasks/video/transcode.py", 'raise Exception("No successful transcodes'],
  segment: ["backend/app/tasks/video/segment.py", "'-hls_time', '6'"],
  manifest: ["backend/app/tasks/video/manifest.py", "#EXT-X-STREAM-INF:BANDWIDTH={bitrate},RESOLUTION={width}x{height}"],
  masterOrder: ["backend/app/tasks/video/manifest.py", 'quality_order = ["2160p"'],
  upload: ["backend/app/tasks/video/upload.py", 'master_minio_path = f"{base_path}/master.m3u8"'],
  finalize: ["backend/app/tasks/video/finalize.py", 'video.processing_status = "completed"'],
  cleanup: ["backend/app/tasks/video/finalize.py", "shutil.rmtree(work_dir)"],
  qualities: ["backend/app/core/config.py", '"1440p": {"width": 2560'],
  admissionCap: ["backend/app/core/config.py", "tus_max_concurrent_uploads: int = 8"],
  partSize: ["backend/app/core/config.py", "tus_part_size_mb: int = 50"],
  admissionTtl: ["backend/app/core/config.py", "tus_admission_ttl_hours: int = 2"],
  prodConcurrency: ["infra/docker-compose.yml", '"--concurrency=1"'],
  localConcurrency: ["infra/docker-compose.local.yml", '"--concurrency=3"'],
  caddyFiles: ["infra/caddy/Caddyfile.local", "handle /files/* {"],
  caddyInternal: ["infra/caddy/Caddyfile.local", "respond 404"],
  caddyStorage: ["infra/caddy/Caddyfile.local", "handle_path /storage/* {"],
  uppyChunk: ["app/app/(protected)/admin/videos/_components/uploadForm/TusUploadForm.tsx", "chunkSize: 50 * 1024 * 1024"],
  statusPoll: ["app/hooks/video/use-video-processing.ts", "pollingInterval = 2000"],
  publish: ["backend/app/services/video/mutations.py", 'update_fields["is_public"] = update_fields["status"] == "published"'],
  publicGate: ["backend/app/services/video/queries.py", 'Video.is_public == True, Video.status == "published"'],
  uppyRetry: ["app/node_modules/@uppy/tus/lib/index.js", "retryDelays: [100, 1000, 3000, 5000]"],
  statusMeta: ["backend/app/utils/video_helpers.py", "STATUS_META: Dict"],
  playerSrc: ["app/app/(public)/(browse)/watch/[video_id]/_components/player/VideoPlayer.tsx", "src={storageUrl(video.manifest_url)}"],
};

const cache = new Map();
const lineOf = (file, anchor) => {
  if (!cache.has(file)) {
    try { cache.set(file, readFileSync(join(ROOT, file), "utf8")); } catch (e) { if (file.includes("node_modules")) return null; throw e; }
  }
  const text = cache.get(file);
  const at = text.indexOf(anchor);
  if (at < 0) throw new Error(`ref anchor not found in ${file}: ${anchor}`);
  return text.slice(0, at).split("\n").length;
};

export function resolveRefs() {
  const out = {};
  for (const [id, [file, anchor]] of Object.entries(ANCHORS)) {
    const line = lineOf(file, anchor);
    out[id] = line ? `${basename(file)}:${line}` : "@uppy/tus defaults";
  }
  return out;
}
