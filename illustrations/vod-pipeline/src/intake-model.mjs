// Pure model of one resumable tus upload, byte-accurate: Uppy cuts 50 MiB chunks, tusd
// writes 50 MB (decimal) S3 parts, the pre-create hook runs its checks in code order.
export const CHUNK = 50 * 1024 * 1024;
export const PART = 50 * 1000 * 1000;
export const MIN_PART = 5 * 1024 * 1024;

// tusd s3store: each PATCH body (plus any stored tail) is cut into 50 MB parts; a tail of
// 5 MiB or more, or the upload's last bytes, goes up as its own part, a smaller tail is kept
// as an incomplete ".part" object and prepended to the next PATCH.
export function partPlan(size) {
  const out = [];
  let tail = 0;
  for (let sent = 0; sent < size; ) {
    const chunk = Math.min(CHUNK, size - sent);
    sent += chunk;
    let data = tail + chunk;
    while (data >= PART) { out.push(PART); data -= PART; }
    tail = data >= MIN_PART || sent >= size ? (data && out.push(data), 0) : data;
  }
  return out;
}
export const CHECKS = ["secret", "token", "admin", "meta", "size", "mime", "slot"];
const CHECK_TEXT = {
  secret: ["hook secret compared with hmac.compare_digest", "hookRoute"],
  token: ["access JWT from the upload metadata verified", "verifyToken"],
  admin: ["user re-read from PostgreSQL, is_admin()", "adminOnly"],
  meta: ["title and category present", "preCreate"],
  size: ["declared size between 1 byte and 50 GB", "sizeCheck"],
  mime: ["filetype in mp4 / quicktime / webm", "mimeCheck"],
  slot: ["KEYS tus:active:* below 8", "admission"],
};
const FAIL = {
  admin: [403, "Admin privileges required"],
  mime: [400, "File type 'video/x-msvideo' not allowed"],
  slot: [503, "Too many concurrent uploads, try again shortly (Retry-After: 30)"],
};
export const RETRY = [0.1, 1, 3, 5];
export const BELT_TIME = 1.25, CHUTE_TIME = 0.55, CHECK_TIME = 0.32;

export function createIntake({ refs = {}, sizeMiB = 420, fault = null, others = 0 } = {}) {
  const size = sizeMiB * 1024 * 1024;
  const chunks = Math.ceil(size / CHUNK);
  return {
    t: 0, refs, fault, size, chunks, sent: 0, received: 0, buffered: 0, written: 0, parts: [], cut: 0,
    phase: "post", at: 0.4, check: -1, checks: CHECKS.map(() => "idle"), tries: 0, others, freeAt: fault === "cap-frees" ? 7.0 : Infinity,
    flying: [], gate: 0, ttl: 0, ownKey: false, info: false, merged: false, rows: { tus: null, video: null }, polls: 0, kicked: false,
    log: [], traffic: [], n: 0, upload: "7f3a", video: null,
  };
}

const ref = (s, id) => s.refs[id] || "";
function log(s, text, r = "", tone = "") {
  s.log.push({ t: s.t, text, ref: ref(s, r), tone, n: s.n++ });
}
const flash = (s, what) => s.traffic.push({ t: s.t, what, n: s.n++ });
const mb = (b) => (b / 1e6).toFixed(1);
const mib = (b) => (b / 1048576).toFixed(0);

function nextCheck(s) {
  s.check += 1;
  const name = CHECKS[s.check];
  if (!name) return admit(s);
  const busy = s.others + (s.ownKey ? 1 : 0);
  const fails = (name === "admin" && s.fault === "not-admin") || (name === "mime" && s.fault === "bad-type") || (name === "slot" && busy >= 8);
  s.checks[s.check] = fails ? "fail" : "pass";
  flash(s, `check-${name}`);
  if (name === "slot") flash(s, "redis");
  if (name === "admin") flash(s, "postgres");
  if (!fails) return (s.at = s.t + CHECK_TIME);
  const [code, msg] = FAIL[name];
  log(s, `pre-create rejects: ${code} ${msg}`, CHECK_TEXT[name][1], "warn");
  flash(s, "reject");
  if (code !== 503) return (s.phase = "rejected");
  const wait = RETRY[s.tries];
  if (wait === undefined) {
    log(s, "Uppy's four default retries (0.1, 1, 3, 5 s) are used up; the admin sees the error", "uppyRetry", "warn");
    return (s.phase = "rejected");
  }
  log(s, `503 is a server error, so Uppy retries the POST in ${wait} s`, "uppyRetry", "dim");
  s.tries += 1;
  s.phase = "retry";
  s.at = s.t + wait;
}

function admit(s) {
  s.ownKey = true;
  s.ttl = 7200;
  s.rows.tus = "created";
  s.info = true;
  flash(s, "redis");
  flash(s, "postgres");
  flash(s, "minio");
  log(s, `pre-create passes: tus_uploads row 'created', SET tus:active:${s.upload} EX 7200, upload ID chosen by the hook`, "admit", "lit");
  log(s, "the access token is stripped from the metadata tusd stores, so it never lands in MinIO", "stripToken", "dim");
  log(s, `tusd: CreateMultipartUpload in vod-videos under tus-uploads/, 201 Created, Location: /files/${s.upload}+…`, "caddyFiles");
  s.phase = "patching";
  s.at = s.t + 0.5;
}

function cut(s) {
  const bytes = Math.min(CHUNK, s.size - s.cut * CHUNK);
  s.flying.push({ i: s.cut, bytes, born: s.t, where: "belt" });
  s.cut += 1;
  flash(s, "blade");
  flash(s, "files");
}

function land(s, f) {
  s.received += f.bytes;
  s.buffered += f.bytes;
  flash(s, "tusd");
  const last = s.received >= s.size;
  log(s, `PATCH /files/${s.upload} Upload-Offset ${s.received - f.bytes} → 204, offset now ${mib(s.received)} MiB`, "uppyChunk", "dim");
  const push = (bytes) => {
    s.flying.push({ i: s.parts.length, bytes, born: s.t, where: "chute", part: true });
    s.parts.push({ bytes, landed: false });
  };
  while (s.buffered >= PART) { push(PART); s.buffered -= PART; }
  if (s.buffered >= MIN_PART || (last && s.buffered > 0)) {
    if (!last) log(s, `the ${mb(s.buffered)} MB left over is at least 5 MiB, so tusd uploads it as its own small part`, "partSize", "dim");
    push(s.buffered);
    s.buffered = 0;
  } else if (s.buffered > 0 && !s.toldLeftover && (s.toldLeftover = true)) {
    log(s, `${mb(s.buffered)} MB left over (a 50 MiB chunk is 52.4 MB): under tusd's 5 MiB minimum part, so it waits as an incomplete .part object and rides along with the next PATCH`, "partSize", "dim");
  }
}

function finish(s) {
  s.merged = true;
  flash(s, "minio");
  log(s, `tusd: CompleteMultipartUpload joins ${s.parts.length} parts into one object`, "partSize");
  flash(s, "hook-post-finish");
  s.rows.tus = "completed";
  s.rows.video = "queued";
  s.video = "b54c";
  s.ownKey = false;
  flash(s, "postgres");
  flash(s, "redis");
  log(s, `post-finish: Video ${s.video} created (queued, is_public=false, draft), tus_uploads 'completed', DEL tus:active:${s.upload}`, "videoRow", "lit");
  log(s, "post-finish calls start_next_video_if_idle(): the processing queue takes it from here (Plate 3)", "kickQueue", "ok");
  s.kicked = true;
  s.phase = "bridge";
  s.at = s.t + 0.2;
}

export function stepIntake(s, dt) {
  s.t += dt;
  if (s.t >= s.freeAt && s.others > 0) {
    s.others -= 1;
    s.freeAt = Infinity;
    log(s, "another admin's upload finishes: its post-finish deletes its tus:active key, freeing a slot", "release", "ok");
    flash(s, "redis");
  }
  if (s.phase === "abandoned") {
    s.ttl = Math.max(0, s.ttl - dt * 1600);
    if (s.ttl === 0 && s.ownKey) {
      s.ownKey = false;
      log(s, "tus:active key expires after 2 h: the slot is free again (nothing else ever releases it: there is no cancel button)", "admissionTtl", "warn");
      flash(s, "redis");
    }
    return s;
  }
  for (const f of s.flying) {
    const age = s.t - f.born;
    if (f.where === "belt" && age >= BELT_TIME && !f.lost) { f.where = "gone"; land(s, f); }
    if (f.where === "chute" && age >= CHUTE_TIME) { f.where = "gone"; s.parts[f.i].landed = true; flash(s, "minio"); log(s, `UploadPart ${f.i + 1}: ${mb(f.bytes)} MB → MinIO`, "partSize", "dim"); }
  }
  s.flying = s.flying.filter((f) => f.where !== "gone" && !(f.lost && s.t - f.born > 0.6));
  if (s.t < s.at) return s;
  switch (s.phase) {
    case "post":
      flash(s, "files");
      flash(s, "hook-pre-create");
      log(s, `Uppy: POST /files, Upload-Length ${s.size}, metadata token, title, category, filetype → Caddy → tusd → pre-create hook`, "caddyFiles");
      s.phase = "checks";
      s.check = -1;
      s.checks = CHECKS.map(() => "idle");
      s.at = s.t + CHECK_TIME;
      return s;
    case "retry":
      s.phase = "post";
      return s;
    case "checks":
      nextCheck(s);
      return s;
    case "patching":
      if (((s.fault === "drop" && s.cut === 4 && !s.dropped) || (s.fault === "abandon" && s.cut === 3)) && s.flying.some((f) => f.where === "belt")) {
        s.at = s.t + 0.05;
        return s;
      }
      if (s.fault === "drop" && s.cut === 4 && !s.dropped) {
        cut(s);
        s.dropped = true;
        s.flying[s.flying.length - 1].lost = true;
        s.gate = 1;
        s.phase = "offline";
        s.at = s.t + 2.2;
        log(s, "the connection drops mid-PATCH: the chunk in flight never arrives", "", "warn");
        return s;
      }
      if (s.fault === "abandon" && s.cut === 3) {
        s.phase = "abandoned";
        s.gate = 1;
        log(s, "the admin closes the tab: no DELETE is ever sent, so post-terminate never fires", "", "warn");
        return s;
      }
      if (s.cut < s.chunks) { cut(s); s.at = s.t + 1.0; return s; }
      if (!s.flying.length && s.parts.every((p) => p.landed)) finish(s);
      return s;
    case "offline":
      s.gate = 0;
      s.cut = s.received / CHUNK;
      flash(s, "files");
      log(s, `back online: HEAD /files/${s.upload} → Upload-Offset ${s.received} (${mib(s.received)} MiB); Uppy resumes from there, not from zero`, "caddyFiles", "lit");
      s.phase = "patching";
      s.at = s.t + 0.6;
      return s;
    case "bridge":
      s.polls += 1;
      flash(s, "status");
      log(s, `Uppy 'complete': GET /internal/tus/hooks/uploads/${s.upload} with the admin JWT (the one /internal route Caddy lets through; it retries every 1.5 s, up to 20 times)`, "statusBridge");
      log(s, `status bridge → { status: 'completed', video_id: '${s.video}' }; the form PATCHes the details and uploads the thumbnail`, "statusBridge", "ok");
      flash(s, "postgres");
      s.phase = "done";
      return s;
  }
  return s;
}

export const sentBytes = (s) => s.received;
