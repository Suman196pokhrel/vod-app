// Pure model of one video's prepare → storyboard → transcode chord, mirroring
// tasks/video/{prepare,storyboard,transcode}.py. Durations are illustrative.
export const RUNGS = [
  { q: "1440p", w: 2560, h: 1440, kbps: 10000 },
  { q: "1080p", w: 1920, h: 1080, kbps: 5000 },
  { q: "720p", w: 1280, h: 720, kbps: 2500 },
  { q: "480p", w: 854, h: 480, kbps: 1000 },
  { q: "360p", w: 640, h: 360, kbps: 500 },
  { q: "240p", w: 426, h: 240, kbps: 300 },
  { q: "144p", w: 256, h: 144, kbps: 200 },
];
export const SOURCES = {
  hd: { w: 1920, h: 1080, duration: 600, mb: 1300 },
  qhd: { w: 2560, h: 1440, duration: 480, mb: 2200 },
  sd: { w: 854, h: 480, duration: 420, mb: 380 },
  phone: { w: 1080, h: 1920, duration: 300, mb: 640 },
};
const even = (v) => 2 * Math.round(v / 2);

// scale=w:h:force_original_aspect_ratio=decrease, then pad to w:h centred (letter/pillarbox).
export function fitOf(src, r) {
  const k = Math.min(r.w / src.w, r.h / src.h);
  const w = even(src.w * k), h = even(src.h * k);
  return { w, h, padX: (r.w - w) / 2, padY: (r.h - h) / 2 };
}

export function createTranscode({ refs = {}, source = "hd", concurrency = 1, storyboardFails = false } = {}) {
  const src = SOURCES[source];
  const cues = Math.floor(src.duration / 5) + 1;
  const tile = { w: 160, h: even((160 * src.h) / src.w) };
  return {
    t: 0, refs, src, concurrency, storyboardFails, phase: "download", at: 0, got: 0, cues, sheets: Math.ceil(cues / 100), tile, tiles: 0,
    rungs: RUNGS.map((r) => ({ ...r, state: "waiting", p: 0, fit: fitOf(src, r) })), queue: [], running: [], left: 7, log: [], traffic: [], n: 0, id: "3c6e",
  };
}

const ref = (s, id) => s.refs[id] || "";
function log(s, text, r = "", tone = "") { s.log.push({ t: s.t, text, ref: ref(s, r), tone, n: s.n++ }); }
const flash = (s, what) => s.traffic.push({ t: s.t, what, n: s.n++ });
const PIX = (r) => (r.w * r.h) / (2560 * 1440);

function enter(s, phase, wait) { s.phase = phase; s.at = s.t + wait; }

export function stepTranscode(s, dt) {
  s.t += dt;
  const len = s.src.duration / 600;
  if (s.phase === "download") {
    const before = Math.floor(s.got / 8);
    s.got = Math.min(s.src.mb, s.got + dt * s.src.mb / 1.6);
    if (Math.floor(s.got / 8) > before) flash(s, "download");
    if (s.got >= s.src.mb) {
      log(s, `prepare_video: status queued → preparing; raw file streamed from vod-videos in 8 MiB chunks (${s.src.mb} MB) to the work dir`, "download");
      enter(s, "probe", 0.9);
    }
    return s;
  }
  if (s.phase === "probe" && s.t >= s.at) {
    log(s, `ffprobe -show_format -show_streams: ${s.src.w}×${s.src.h}, ${s.src.duration} s; saved as processing_metadata`, "ffprobe", "lit");
    flash(s, "postgres");
    enter(s, "storyboard", 0);
    return s;
  }
  if (s.phase === "storyboard") {
    if (s.storyboardFails && s.tiles > s.cues * 0.4) {
      log(s, "generate_storyboard: ffmpeg failed; the error is logged and swallowed, the chain carries on without a scrubbing preview", "storyboardSwallow", "warn");
      s.sbFailed = true;
      return startChord(s);
    }
    s.tiles = Math.min(s.cues, s.tiles + dt * (s.cues / (0.8 + 1.6 * len)));
    if (s.tiles >= s.cues) {
      log(s, `generate_storyboard: fps=1/5, scale=160:-2, tile=10x10 → ${s.sheets} sprite sheet(s) of ${s.tile.w}×${s.tile.h} tiles, ${s.cues} VTT cues → vod-thumbnails`, "storyboard");
      log(s, `storyboard.vtt cue: 00:00:05.000 --> 00:00:10.000 · sprite_000.jpg#xywh=${s.tile.w},0,${s.tile.w},${s.tile.h}`, "vtt", "dim");
      flash(s, "thumbs");
      startChord(s);
    }
    return s;
  }
  if (s.phase === "chord") {
    for (const job of [...s.running]) {
      const r = s.rungs[job.i];
      r.p = Math.min(1, (s.t - job.start) / job.dur);
      if (r.p >= 1) {
        s.running.splice(s.running.indexOf(job), 1);
        r.state = job.skip ? "skipped" : "done";
        s.left -= 1;
        flash(s, "chord");
        log(s, job.skip ? `${r.q}: skipped, the ${s.src.h}p source is shorter than ${r.h}p (no upscaling)` : `${r.q}: ${r.q}.mp4 written · ${r.fit.w}×${r.fit.h}${r.fit.padX || r.fit.padY ? ` padded to ${r.w}×${r.h}` : ""} · -b:v ${r.kbps}k`, job.skip ? "noUpscale" : "transcode", job.skip ? "dim" : "");
      }
    }
    while (s.running.length < s.concurrency && s.queue.length) {
      const i = s.queue.shift();
      const r = s.rungs[i];
      const skip = r.h > s.src.h;
      r.state = skip ? "skipping" : "encoding";
      s.running.push({ i, skip, start: s.t, dur: skip ? 0.25 : 0.6 + 4.2 * PIX(r) * len });
      flash(s, `start-${i}`);
    }
    if (!s.left) {
      const ok = s.rungs.filter((r) => r.state === "done").length;
      log(s, `chord counter reaches 0 → on_transcode_complete: ${ok}/7 renditions usable, status aggregating`, "chordDone", "ok");
      flash(s, "callback");
      enter(s, "done", 0);
    }
  }
  return s;
}

function startChord(s) {
  s.phase = "chord";
  s.queue = [0, 1, 2, 3, 4, 5, 6];
  flash(s, "postgres");
  log(s, `chord(group(7 × transcode_quality), on_transcode_complete): 7 messages queued; --concurrency=${s.concurrency} runs ${s.concurrency === 1 ? "them one after another" : `${s.concurrency} at a time`}`, "chord");
  return s;
}
