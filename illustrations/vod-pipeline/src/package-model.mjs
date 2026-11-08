// Pure model of segment → manifest → upload → finalize, then playback with hls.js.
// Mirrors tasks/video/{segment,manifest,upload,finalize}.py and the player's HLS_CONFIG;
// the ABR rule is a simplified EWMA picker, and every clock here is illustrative.
import { RUNGS } from "./transcode-model.mjs";

export const DEMO_SECONDS = 120, SEG = 6, BUFFER_GOAL = 60;
export const SEGS = Math.ceil(DEMO_SECONDS / SEG);

export function masterLines(rungs) {
  return ["#EXTM3U", "#EXT-X-VERSION:3", ...rungs.flatMap((r) => [`#EXT-X-STREAM-INF:BANDWIDTH=${r.kbps * 1000},RESOLUTION=${r.w}x${r.h}`, `${r.q}/playlist.m3u8`])];
}

export const PROFILES = {
  steady: (t) => 14,
  drop: (t) => (t < 18 ? 14 : t < 64 ? 1.2 : 9),
  slow: (t) => 2.4 + 0.6 * Math.sin(t / 3),
};

export function createPackage({ refs = {}, sourceH = 1080, profile = "steady", playerWidth = 1920, scrub = false } = {}) {
  const rungs = RUNGS.map((r, i) => ({ ...r, i, ok: r.h <= sourceH, segs: 0, uploaded: 0 }));
  return {
    t: 0, refs, rungs, avail: rungs.filter((r) => r.ok), phase: "segment", cur: rungs.findIndex((r) => r.ok), lines: 0, at: 0,
    profile, playerWidth, scrub, id: "3c6e", log: [], traffic: [], n: 0,
    play: { head: 0, buffered: 0, queue: [], est: 1, level: null, fetch: null, next: 0, stalls: 0, switches: 0, started: false },
  };
}

const ref = (s, id) => s.refs[id] || "";
function log(s, text, r = "", tone = "") { s.log.push({ t: s.t, text, ref: ref(s, r), tone, n: s.n++ }); }
const flash = (s, what) => s.traffic.push({ t: s.t, what, n: s.n++ });

// hls.js-like choice: the best variant the EWMA estimate can carry with headroom, capped to the
// smallest variant at least as wide as the player (capLevelToPlayerSize).
export function pickLevel(s) {
  const fits = s.avail.filter((r) => r.kbps * 1000 <= s.play.est * 1e6 * 0.7);
  const cap = [...s.avail].reverse().find((r) => r.w >= s.playerWidth) || s.avail[0];
  const best = fits[0] || s.avail[s.avail.length - 1];
  return best.kbps > cap.kbps ? cap : best;
}

export function stepPackage(s, dt) {
  s.t += dt;
  if (s.phase === "segment") {
    const r = s.rungs[s.cur];
    r.segs = Math.min(SEGS, r.segs + dt * SEGS / 0.9);
    if (Math.floor(r.segs) !== Math.floor(r.segs - dt * SEGS / 0.9)) flash(s, "saw");
    if (r.segs >= SEGS) {
      log(s, `segment_videos ${r.q}: ffmpeg -i ${r.q}.mp4 -c copy -f hls -hls_time 6 -hls_list_size 0 → playlist.m3u8 + ${SEGS} × segment_NNNN.ts (no re-encode)`, "segment", "dim");
      const next = s.rungs.findIndex((x, i) => i > s.cur && x.ok);
      if (next >= 0) s.cur = next;
      else { s.phase = "manifest"; s.at = s.t; log(s, `segment_videos done: ${s.avail.length} renditions, one after another in a single task`, "segment"); }
    }
    return s;
  }
  if (s.phase === "manifest") {
    const all = masterLines(s.avail);
    if (s.t >= s.at) { s.lines += 1; s.at = s.t + 0.32; flash(s, "print"); }
    if (s.lines >= all.length) {
      log(s, `create_manifest: master.m3u8 written with ${s.avail.length} #EXT-X-STREAM-INF entries, highest first; BANDWIDTH is the rung's target video bitrate`, "manifest", "lit");
      s.phase = "upload";
      s.cur = 0;
      flash(s, "master");
      log(s, `upload_to_minio: master.m3u8 first → vod-processed/${s.id}/segments/master.m3u8`, "upload");
    }
    return s;
  }
  if (s.phase === "upload") {
    const r = s.avail[s.cur];
    r.uploaded = Math.min(SEGS + 1, r.uploaded + dt * (SEGS + 1) / 0.7);
    flash(s, "put");
    if (r.uploaded >= SEGS + 1) {
      log(s, `${r.q}: playlist.m3u8 + ${SEGS} segments → vod-processed/${s.id}/segments/${r.q}/`, "upload", "dim");
      s.cur += 1;
      if (s.cur >= s.avail.length) { s.phase = "finalize"; s.at = s.t + 0.6; flash(s, "postgres"); }
    }
    return s;
  }
  if (s.phase === "finalize" && s.t >= s.at) {
    log(s, `finalize_processing: status completed, manifest_url /vod-processed/${s.id}/segments/master.m3u8, available_qualities [${s.avail.map((r) => r.q).join(", ")}], work dir deleted`, "finalize", "ok");
    flash(s, "postgres");
    s.phase = "play";
    s.at = s.t + 0.8;
    return s;
  }
  if (s.phase === "play" && s.t >= s.at) return playStep(s, dt);
  return s;
}

function playStep(s, dt) {
  const p = s.play;
  const tp = s.t - s.at;
  if (!p.started) {
    p.started = true;
    flash(s, "master");
    log(s, "player: GET /storage/vod-processed/…/master.m3u8 through Caddy (handle_path strips /storage); hls.js starts from abrEwmaDefaultEstimate = 1 Mbps", "playerSrc");
  }
  if (p.fetch) {
    const mbps = PROFILES[s.profile](tp);
    p.fetch.got += mbps * dt;
    const took = tp - p.fetch.start, rate = p.fetch.got / Math.max(0.05, took);
    if (took > 1 && p.fetch.level.i < s.avail[s.avail.length - 1].i && (p.fetch.size - p.fetch.got) / rate > p.buffered) {
      p.est = rate;
      log(s, `hls.js abandons the ${p.fetch.level.q} fragment: at ${rate.toFixed(1)} Mbps it would land after the buffer runs dry`, "", "warn");
      p.fetch = null;
      flash(s, "abort");
    }
  }
  if (p.fetch) {
    if (p.fetch.got >= p.fetch.size) {
      const took = tp - p.fetch.start;
      const measured = p.fetch.size / Math.max(0.05, took);
      p.est = p.est ? 0.6 * p.est + 0.4 * measured : measured;
      p.queue.push(p.fetch.level.i);
      p.buffered += SEG;
      p.next += 1;
      p.fetch = null;
    }
  }
  if (!p.fetch && p.next < SEGS && p.buffered < BUFFER_GOAL) {
    const level = pickLevel(s);
    if (p.level && level.i !== p.level.i) {
      p.switches += 1;
      log(s, `ABR: estimate ${p.est.toFixed(1)} Mbps → switch ${p.level.q} → ${level.q} (${level.q}/playlist.m3u8)`, "", level.kbps > p.level.kbps ? "ok" : "warn");
    } else if (!p.level) log(s, `ABR: starts low at ${level.q}, a rendition a 1 Mbps first estimate can carry`, "", "dim");
    p.level = level;
    p.fetch = { level, start: tp, got: 0, size: ((level.kbps + 128) * SEG) / 1000 };
    flash(s, "fetch");
  }
  if (p.buffered > 0) {
    const adv = Math.min(dt, p.buffered);
    p.head = Math.min(DEMO_SECONDS, p.head + adv);
    p.buffered -= adv;
    while (p.queue.length && p.head >= (p.next - p.queue.length + 1) * SEG) p.queue.shift();
  } else if (p.next < SEGS && p.head > 0) {
    if (!p.stalled) { p.stalls += 1; log(s, "buffer empty: playback stalls until the next segment lands", "", "warn"); }
    p.stalled = true;
    return s;
  }
  p.stalled = false;
  if (p.head >= DEMO_SECONDS) { s.phase = "ended"; log(s, `played to the end · ${p.switches} rendition switch(es), ${p.stalls} stall(s)`, "", "ok"); }
  return s;
}

// The storyboard cue for a time: sprite sheet, then the tile's x,y,w,h (160×90 tiles here).
export function cueAt(sec) {
  const c = Math.floor(sec / 5), pos = c % 100;
  return { sheet: Math.floor(c / 100), x: (pos % 10) * 160, y: Math.floor(pos / 10) * 90, start: c * 5 };
}
