// Pure model of the VOD upload + processing plant, mirroring backend/app.
// Rules, statuses, caps, chain order and branches are the real ones; durations are
// illustrative (scaled by pixel count and video length) so a run fits on screen.

export const LADDER = [
  { q: "1440p", w: 2560, h: 1440, kbps: 10000 },
  { q: "1080p", w: 1920, h: 1080, kbps: 5000 },
  { q: "720p", w: 1280, h: 720, kbps: 2500 },
  { q: "480p", w: 854, h: 480, kbps: 1000 },
  { q: "360p", w: 640, h: 360, kbps: 500 },
  { q: "240p", w: 426, h: 240, kbps: 300 },
  { q: "144p", w: 256, h: 144, kbps: 200 },
];
export const STAGES = ["queued", "preparing", "generating_storyboard", "transcoding", "aggregating", "segmenting", "creating_manifest", "uploading_to_storage", "finalizing", "completed"];
export const PROGRESS = { uploading: 5, queued: 15, preparing: 25, generating_storyboard: 35, transcoding: 50, aggregating: 60, segmenting: 70, creating_manifest: 80, uploading_to_storage: 90, finalizing: 95, completed: 100, failed: 0 };
export const IN_PROGRESS = STAGES.slice(1, 9);
export const CAP = 8;
export const PART_MIB = 50;
export const UPLINK_MBPS = 240;
export const UPPY_RETRY = [0.1, 1, 3, 5];
const STATUS_OF = { prepare_video: "preparing", generate_storyboard: "generating_storyboard", transcode_quality: "transcoding", on_transcode_complete: "aggregating", segment_videos: "segmenting", create_manifest: "creating_manifest", upload_to_minio: "uploading_to_storage", finalize_processing: "finalizing" };

const PIX = (r) => (r.w * r.h) / (2560 * 1440);
export const hex = (n) => ((n * 2654435761) >>> 0).toString(16).padStart(8, "0").slice(0, 4);

export function createSim({ refs = {}, concurrency = 1, lock = true } = {}) {
  return { t: 0, refs, cfg: { concurrency, lock }, seq: 1, uploads: [], videos: [], broker: [], running: [], chords: {}, admission: [], lock: null, worker: "up", downUntil: 0, log: [], traffic: [], tick: 0, nextPoll: 0 };
}

const R = (s, id) => s.refs[id] || "";
export function log(s, text, ref = "", tone = "", vid = null) {
  s.log.push({ t: s.t, text, ref: R(s, ref), tone, vid, n: s.tick++ });
  if (s.log.length > 120) s.log.shift();
}
export function send(s, from, to, kind, vid = null) {
  s.traffic.push({ t: s.t, from, to, kind, vid, n: s.tick++ });
  if (s.traffic.length > 200) s.traffic.shift();
}

export function addUpload(s, { sizeMB = 1200, height = 1080, duration = 600, fault = null } = {}) {
  const id = hex(s.seq++);
  const up = { id, sizeMB, height, duration, fault, sent: 0, state: "pre-create", at: s.t + 0.35, tries: 0, video: null };
  s.uploads.push(up);
  send(s, "admin", "tusd", "POST /files", id);
  send(s, "tusd", "api", "pre-create hook", id);
  return up;
}

function preCreate(s, up) {
  send(s, "api", "redis", "KEYS tus:active:*", up.id);
  if (s.admission.length >= CAP) {
    const wait = UPPY_RETRY[up.tries];
    log(s, `pre-create ${up.id}: ${s.admission.length}/${CAP} upload slots busy → 503 Too many concurrent uploads, Retry-After: 30${wait === undefined ? "" : `; Uppy retries in ${wait} s`}`, "admission", "warn", up.id);
    if (wait === undefined) {
      up.state = "error";
      log(s, `upload ${up.id}: Uppy's 4 default retries (0.1, 1, 3, 5 s) used up; the admin sees the error and tries again later`, "uppyRetry", "warn", up.id);
      return;
    }
    up.tries += 1;
    up.state = "retrying";
    up.at = s.t + wait;
    return;
  }
  s.admission.push(up.id);
  send(s, "api", "postgres", "INSERT tus_uploads", up.id);
  send(s, "api", "redis", "SET tus:active EX 7200", up.id);
  log(s, `pre-create ${up.id}: JWT ok, admin ok, size ok, mime ok, slot ${s.admission.length}/${CAP} → 201, token stripped from metadata`, "admission", "", up.id);
  up.state = "uploading";
}

function postFinish(s, up) {
  const vid = hex(s.seq++);
  const video = { id: vid, upload: up.id, height: up.height, duration: up.duration, fault: up.fault, status: "queued", created: s.t, error: null, public: false, rungs: LADDER.map((r) => ({ ...r, state: "waiting", p: 0 })), stage: "queued", segs: Math.ceil(up.duration / 6), sheets: Math.ceil(Math.floor(up.duration / 5 + 1) / 100), done: 0 };
  up.video = vid;
  up.state = "done";
  s.videos.push(video);
  s.admission = s.admission.filter((id) => id !== up.id);
  send(s, "tusd", "api", "post-finish hook", vid);
  send(s, "api", "postgres", "INSERT videos (queued)", vid);
  send(s, "api", "redis", "DEL tus:active", vid);
  log(s, `post-finish ${up.id}: Video ${vid} row created, status queued, is_public=false, draft; upload slot released`, "videoRow", "", vid);
  if (s.cfg.lock) startNextIfIdle(s);
  else dispatch(s, video, "pre-fix: chain dispatched straight away, no lock");
}

export function startNextIfIdle(s) {
  const next = s.videos.filter((v) => v.status === "queued").sort((a, b) => a.created - b.created)[0];
  send(s, "api", "postgres", "SELECT oldest queued");
  if (!next) return null;
  send(s, "api", "redis", "SET NX active_lock");
  if (s.lock) {
    log(s, `start_next_video_if_idle: SET NX refused, ${s.lock} holds the lock; ${next.id} waits as queued`, "setNx", "dim", next.id);
    return null;
  }
  s.lock = next.id;
  dispatch(s, next, `SET video_processing:active_lock ${next.id} NX EX 21600 → OK`);
  return next;
}

export function dispatch(s, video, why) {
  video.stage = "dispatched";
  s.broker.push({ vid: video.id, task: "prepare_video", step: 0 });
  send(s, "api", "redis", "LPUSH celery (chain)", video.id);
  log(s, `${why}; chain sent: prepare → storyboard → chord(7 transcodes → on_transcode_complete) → segment → manifest → upload → finalize${s.cfg.lock ? " → on_pipeline_success" : ""}`, s.cfg.lock ? "setNx" : "dispatch", "lit", video.id);
}

const vidOf = (s, id) => s.videos.find((v) => v.id === id);

function durationOf(s, msg) {
  const v = vidOf(s, msg.vid);
  const len = v.duration / 600;
  switch (msg.task) {
    case "prepare_video": return 1.0 + 0.35 * len;
    case "generate_storyboard": return 0.7 + 0.6 * len;
    case "transcode_quality": return msg.skip ? 0.25 : 0.5 + 3.2 * PIX(LADDER[msg.rung]) * len;
    case "on_transcode_complete": return 0.35;
    case "segment_videos": return 0.25 + 0.12 * v.rungs.filter((r) => r.state === "done").length;
    case "create_manifest": return 0.4;
    case "upload_to_minio": return 0.5 + 0.18 * v.rungs.filter((r) => r.state === "done").length * len;
    case "finalize_processing": return 0.45;
    default: return 0.2;
  }
}

function begin(s, msg) {
  const v = vidOf(s, msg.vid);
  msg.start = s.t;
  msg.dur = durationOf(s, msg);
  s.running.push(msg);
  send(s, "redis", "worker", msg.task, v.id);
  const status = STATUS_OF[msg.task];
  if (status && v.status !== "failed") {
    v.status = status;
    v.stage = status;
    send(s, "worker", "postgres", `status ${status}`, v.id);
  }
  if (msg.task === "prepare_video") send(s, "minio", "worker", "GET raw video", v.id);
  if (msg.task === "transcode_quality") {
    const r = v.rungs[msg.rung];
    r.state = msg.skip ? "skipping" : "encoding";
  }
}

function finish(s, msg) {
  const v = vidOf(s, msg.vid);
  const id = v.id;
  const next = (task, extra = {}) => s.broker.push({ vid: id, task, ...extra });
  switch (msg.task) {
    case "prepare_video":
      if (v.fault === "corrupt") return fail(s, v, "prepare_video", "ffprobe could not read the file (corrupt upload); metadata extraction is not retried", "probeFail");
      log(s, `${id} prepare_video: raw file downloaded from vod-videos, ffprobe ${v.height}p, ${Math.round(v.duration)}s`, "ffprobe", "", id);
      return next("generate_storyboard");
    case "generate_storyboard":
      send(s, "worker", "minio", "PUT sprites + storyboard.vtt", id);
      log(s, `${id} generate_storyboard: ${v.sheets} sprite sheet(s) of 10×10 tiles every 5 s, ${Math.floor(v.duration / 5) + 1} VTT cues → vod-thumbnails`, "storyboard", "", id);
      s.chords[id] = { left: LADDER.length };
      LADDER.forEach((r, rung) => next("transcode_quality", { rung, skip: r.h > v.height }));
      log(s, `${id} chord: 7 transcode_quality tasks queued at once; the worker runs ${s.cfg.concurrency} at a time`, "chord", "", id);
      return;
    case "transcode_quality": {
      const r = v.rungs[msg.rung];
      r.state = msg.skip ? "skipped" : "done";
      r.p = 1;
      log(s, msg.skip ? `${id} ${r.q}: skipped, source is ${v.height}p (no upscaling)` : `${id} ${r.q}: libx264 crf 23 → ${r.kbps} kbps, aac 128k`, msg.skip ? "noUpscale" : "transcode", "dim", id);
      if (--s.chords[id].left === 0) next("on_transcode_complete");
      return;
    }
    case "on_transcode_complete": {
      const ok = v.rungs.filter((r) => r.state === "done").length;
      if (!ok) return fail(s, v, "on_transcode_complete", "No successful transcodes - cannot continue workflow", "allFailed");
      log(s, `${id} on_transcode_complete: ${ok}/7 renditions usable`, "chordDone", "", id);
      return next("segment_videos");
    }
    case "segment_videos":
      log(s, `${id} segment_videos: -c copy -f hls -hls_time 6 → ${v.segs} × .ts per rendition`, "segment", "", id);
      return next("create_manifest");
    case "create_manifest":
      log(s, `${id} create_manifest: master.m3u8 lists ${v.rungs.filter((r) => r.state === "done").length} #EXT-X-STREAM-INF variants, highest first`, "manifest", "", id);
      return next("upload_to_minio");
    case "upload_to_minio":
      send(s, "worker", "minio", "PUT master + playlists + .ts", id);
      log(s, `${id} upload_to_minio: master.m3u8 first, then each rendition → vod-processed/${id}/segments/`, "upload", "", id);
      return next("finalize_processing");
    case "finalize_processing":
      v.status = "completed";
      v.stage = "completed";
      v.done = s.t;
      send(s, "worker", "postgres", "status completed + manifest_url", id);
      log(s, `${id} finalize_processing: completed, manifest_url saved, temp dir removed`, "finalize", "ok", id);
      return next("on_pipeline_success");
    case "on_pipeline_success":
      return handOver(s, id, "on_pipeline_success", "onSuccess");
  }
}

function fail(s, v, task, why, ref) {
  v.status = "failed";
  v.stage = "failed";
  v.error = why;
  send(s, "worker", "postgres", "status failed", v.id);
  log(s, `${v.id} ${task}: ${why} → failed`, ref, "warn", v.id);
  handOver(s, v.id, "on_pipeline_failed (link_error)", "onFailed");
}

function handOver(s, id, by, ref) {
  if (!s.cfg.lock) return;
  send(s, "worker", "redis", "EVAL release-if-owner", id);
  const owned = s.lock === id;
  if (owned) s.lock = null;
  log(s, `${by}: Lua release-if-owner on active_lock → ${owned ? "deleted" : "not the owner, kept"}`, "luaRelease", "", id);
  startNextIfIdle(s);
}

// The admin's "Edit Details" save: status draft → published, which cascades is_public = true.
export function publish(s, id) {
  const v = s.videos.find((x) => x.id === id);
  if (!v || v.public || v.status !== "completed") return;
  v.public = true;
  send(s, "admin", "api", "PATCH /videos (published)", id);
  send(s, "api", "postgres", "UPDATE status, is_public", id);
  log(s, `admin publishes ${id}: status draft → published cascades is_public=true; it is now on the public browse feed`, "publish", "ok", id);
}

// A title already on the public feed before this run, so the viewer has something to watch.
export function seedCatalog(s) {
  const v = { id: "c0de", seed: true, height: 1080, duration: 600, status: "completed", stage: "completed", created: -1, public: true, error: null, rungs: LADDER.map((r) => ({ ...r, state: r.h > 1080 ? "skipped" : "done", p: 1 })), segs: 100, sheets: 2, done: -1, leftAt: -10 };
  s.videos.push(v);
}

export function killWorker(s, downFor = 3) {
  s.worker = "down";
  s.downUntil = s.t + downFor;
  const lost = s.running.splice(0);
  log(s, `worker container restarted mid-task (${lost.map((m) => m.task).join(", ") || "idle"} lost)`, "", "warn");
}

function recover(s) {
  s.worker = "up";
  const purged = s.broker.length;
  s.broker = [];
  s.lock = null;
  const hit = s.videos.filter((v) => IN_PROGRESS.includes(v.status));
  for (const v of hit) {
    v.error = `Processing was interrupted during '${v.status}' by a worker restart`;
    v.status = "failed";
    v.stage = "failed";
  }
  log(s, `worker_init recovery: purged ${purged} message(s), cleared the lock, ${hit.length} interrupted video(s) → failed`, "recovery", "warn");
  if (s.cfg.lock) startNextIfIdle(s);
}

export function step(s, dt) {
  s.t += dt;
  for (const up of s.uploads) {
    if ((up.state === "pre-create" || up.state === "retrying") && s.t >= up.at) preCreate(s, up);
  }
  const live = s.uploads.filter((u) => u.state === "uploading");
  for (const up of live) {
    const before = Math.floor(up.sent / PART_MIB);
    up.sent = Math.min(up.sizeMB, up.sent + (UPLINK_MBPS / live.length) * dt);
    if (Math.floor(up.sent / PART_MIB) > before || up.sent >= up.sizeMB) {
      send(s, "admin", "tusd", "PATCH 50 MiB", up.id);
      send(s, "tusd", "minio", "UploadPart", up.id);
    }
    if (up.sent >= up.sizeMB) postFinish(s, up);
  }
  if (s.t >= s.nextPoll) {
    s.nextPoll = s.t + 2;
    if (s.videos.some((v) => v.status !== "completed" && v.status !== "failed")) {
      send(s, "admin", "api", "GET status (2 s poll)");
      send(s, "api", "postgres", "SELECT processing_status");
    }
  }
  if (s.worker === "down") {
    if (s.t >= s.downUntil) recover(s);
    return s;
  }
  for (const msg of [...s.running]) {
    const v = vidOf(s, msg.vid);
    if (msg.task === "transcode_quality") v.rungs[msg.rung].p = Math.min(1, (s.t - msg.start) / msg.dur);
    if (s.t - msg.start >= msg.dur) {
      s.running.splice(s.running.indexOf(msg), 1);
      finish(s, msg);
    }
  }
  while (s.running.length < s.cfg.concurrency && s.broker.length) begin(s, s.broker.shift());
  return s;
}

export const summary = (s) => ({
  queued: s.videos.filter((v) => v.status === "queued").length,
  active: s.videos.filter((v) => IN_PROGRESS.includes(v.status)),
  done: s.videos.filter((v) => v.status === "completed" && !v.seed).length,
  drafts: s.videos.filter((v) => v.status === "completed" && !v.public),
  failed: s.videos.filter((v) => v.status === "failed").length,
  uploading: s.uploads.filter((u) => u.state === "uploading").length,
});
