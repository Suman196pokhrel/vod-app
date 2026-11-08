// Plate 4 controller: one video's prepare → storyboard → chord, per source and slot count.
const TRANSCODE_SCENARIOS = {
  hd: { label: "1080p source", source: "hd", why: "The common case. The chord queues all seven transcodes; 1440p returns 'skipped' at once (no upscaling), the other six are encoded one after another on prod's single worker slot." },
  qhd: { label: "1440p source", source: "qhd", why: "A source as tall as the top rung: nothing is skipped, all seven renditions are encoded, and the 1440p press runs longest (four times the pixels of 720p)." },
  sd: { label: "480p source", source: "sd", why: "Small source: 1440p, 1080p and 720p are skipped, so master.m3u8 will list only four variants. Skipping costs a message round trip, not an encode." },
  phone: { label: "Phone video 9:16", source: "phone", why: "A 1080×1920 portrait clip. It is taller than every rung, so nothing is skipped; each rung scales it to fit the 16:9 box and pads the sides: the dark bars on every block are the pillarbox, not a stretch." },
  wide: { label: "3 worker slots (local)", source: "hd", concurrency: 3, why: "Local dev runs --concurrency=3, so three presses run at once and the chord finishes sooner. The storyboard still runs first and alone: it's a plain chain step." },
  sbfail: { label: "Storyboard fails", source: "hd", storyboardFails: true, why: "The scrubbing preview is cosmetic, so generate_storyboard catches its own errors, logs a warning and returns the data unchanged. Transcoding goes ahead; the video just has no storyboard_url." },
};
const TRANSCODE_TOUR = ["hd", "phone", "sd", "wide", "qhd", "sbfail"];

function transcodeStory(s) {
  switch (s.phase) {
    case "download": return `prepare_video is streaming the raw upload from MinIO to the worker's disk: ${Math.round(s.got)} of ${s.src.mb} MB.`;
    case "probe": return "ffprobe reads the container and streams: width, height, duration and codecs. Everything after this is planned from those numbers.";
    case "storyboard": return `One ffmpeg pass grabs a frame every 5 s and tiles them 10×10: ${Math.floor(s.tiles)} of ${s.cues} tiles, one WebVTT cue per tile.`;
    case "chord": {
      const run = s.running.map((j) => s.rungs[j.i].q).join(", ");
      return `The chord: ${7 - s.left} of 7 transcodes reported. ${run ? `Encoding ${run} now` : "Waiting for the next message"}; ${s.queue.length} still queued in the broker.`;
    }
    case "done": return `All seven reported, so Celery runs on_transcode_complete: ${s.rungs.filter((r) => r.state === "done").length} usable renditions go on to segmenting (Plate 5).`;
    default: return "";
  }
}

PLATES.transcode = {
  mount(root) {
    const D = TRANSCODE;
    const stage = root.querySelector(".stage");
    const R = transcodeRenderer(stage, D);
    const $ = (sel) => root.querySelector(sel);
    let s, seen = -1, touring = !stillQuery.matches, tourIdx = 0, idle = 0, storyAt = 0, speed = 1;
    const start = (id) => {
      const sc = TRANSCODE_SCENARIOS[id];
      s = createTranscode({ refs: REFS, source: sc.source, concurrency: sc.concurrency ?? 1, storyboardFails: !!sc.storyboardFails });
      R.reset();
      seen = -1;
      $("[data-log]").replaceChildren();
      delete $("[data-log]").dataset.n;
      $("[data-why]").textContent = sc.why;
      $("[data-live]").textContent = `Scenario: ${sc.label}`;
      for (const b of root.querySelectorAll("[data-run]")) b.setAttribute("aria-pressed", String(b.dataset.run === id));
    };
    root.querySelectorAll("[data-run]").forEach((b) => b.addEventListener("click", () => { touring = false; start(b.dataset.run); }));
    root.querySelectorAll("[data-set]").forEach((b) => b.addEventListener("click", () => {
      touring = false;
      speed = Number(b.dataset.set.split(":")[1]);
      for (const o of root.querySelectorAll('[data-set^="speed:"]')) o.setAttribute("aria-pressed", String(o === b));
    }));
    focusing(root, D.stations);
    const zoom = zooming(root, D.stations);
    start("hd");
    const stop = frameLoop(stage, (dt, calm) => {
      if (window.__freeze) return;
      for (let i = 0; i < 4; i++) stepTranscode(s, (dt * speed) / 4);
      for (const ev of s.traffic) if (ev.n > seen) { R.traffic(ev, calm); seen = ev.n; }
      R.render(s, dt, calm);
      renderLog($("[data-log]"), s.log);
      idle = s.phase === "done" ? idle + dt : 0;
      if (touring && idle > 4.5) start(TRANSCODE_TOUR[++tourIdx % TRANSCODE_TOUR.length]);
      storyAt -= dt;
      if (storyAt <= 0) {
        storyAt = 0.3;
        $("[data-story]").textContent = transcodeStory(s);
        const done = s.rungs.filter((r) => r.state === "done").length, skipped = s.rungs.filter((r) => r.state === "skipped").length;
        root.querySelector("[data-readout]").textContent = `${s.src.w}×${s.src.h} · ${s.phase} · ${done} encoded · ${skipped} skipped · chord ${s.left} left`;
        $("[data-stats]").innerHTML = [["tiles", `${Math.floor(s.tiles)}/${s.cues}`], ["encoded", done], ["skipped", skipped], ["chord left", s.left]].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
      }
    });
    return { unmount: () => { stop(); zoom.stop(); } };
  },
};
