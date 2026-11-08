// Plate 1 controller: scenarios, switches, the idle tour, narration, stats and the loop.
const SCENARIOS = {
  one: { label: "One upload", uploads: [{ sizeMB: 900, height: 1080, duration: 420 }], why: "Low load: the upload streams in, the lock is free, so processing starts the moment post-finish fires. Every stage runs back to back on one worker." },
  burst: { label: "5 uploads at once", uploads: [{ sizeMB: 1300, height: 1080, duration: 600 }, { sizeMB: 600, height: 720, duration: 300 }, { sizeMB: 1800, height: 1440, duration: 840 }, { sizeMB: 450, height: 1080, duration: 240 }, { sizeMB: 900, height: 480, duration: 420 }], why: "High load: uploads run concurrently (they only share bandwidth), but processing is one video at a time. Whoever finishes uploading first is queued first; the Redis lock lets exactly one chain run and the rest wait as 'queued' rows in PostgreSQL." },
  cap: { label: "9 at once (hit the cap)", uploads: Array.from({ length: 9 }, (_, i) => ({ sizeMB: 700 + i * 30, height: 1080, duration: 300 })), why: "Admission control: pre-create counts tus:active:* keys in Redis and refuses a 9th concurrent upload with 503 + Retry-After: 30. Uppy retries after 0.1, 1, 3 and 5 s (its default retryDelays); if all 8 slots are still busy, the admin sees the error and tries later." },
  lowres: { label: "480p source", uploads: [{ sizeMB: 500, height: 480, duration: 360 }], why: "No upscaling: the chord still queues all 7 transcodes, but 1440p, 1080p and 720p return 'skipped' at once, so master.m3u8 lists only 4 variants." },
  corrupt: { label: "Corrupt file, then a good one", uploads: [{ sizeMB: 400, height: 1080, duration: 300, fault: "corrupt" }, { sizeMB: 800, height: 1080, duration: 360 }], why: "Failure isolation: ffprobe can't read the first file, prepare_video marks it failed and raises, the chain's link_error (on_pipeline_failed) releases the lock, and the next queued video starts. One bad upload never jams the queue." },
};
const TOUR = ["burst", "cap", "one", "lowres", "corrupt"];

function plantStory(s) {
  const up = s.uploads.filter((u) => u.state === "uploading");
  const retry = s.uploads.filter((u) => u.state === "retrying");
  const q = s.videos.filter((v) => v.status === "queued");
  const lockV = s.videos.find((v) => v.id === s.lock);
  const parts = [];
  if (s.worker === "down") return "The worker container is restarting. On boot, worker_init purges the broker, clears the lock, marks the interrupted video failed and starts the next queued one.";
  if (up.length) parts.push(`${up.length} upload${up.length > 1 ? "s are" : " is"} streaming through Caddy into tusd in 50 MiB chunks (${s.admission.length}/8 upload slots taken).`);
  if (retry.length) parts.push(`${retry.length} more ${retry.length > 1 ? "were" : "was"} refused with 503 and ${retry.length > 1 ? "are" : "is"} retrying.`);
  if (!s.cfg.lock) {
    const live = [...new Set(s.running.map((m) => m.vid))];
    if (s.broker.length || s.running.length) parts.push(`Pre-fix behaviour: ${s.videos.filter((v) => v.status !== "completed" && v.status !== "failed").length} videos' chains share one broker queue. A video's later stages wait behind other videos' transcodes, so nobody finishes early${live.length ? ` (worker busy with ${live.join(", ")})` : ""}.`);
  } else if (lockV) {
    const r = s.running.find((m) => m.vid === lockV.id && m.task === "transcode_quality");
    const doing = r ? `transcoding ${lockV.rungs[r.rung].q} (${lockV.rungs.filter((x) => x.state === "done" || x.state === "skipped").length}/7 rungs settled)` : lockV.status.replace(/_/g, " ");
    parts.push(`Video ${lockV.id} holds the processing lock and is ${doing}.`);
    if (q.length) parts.push(`${q.length} more wait their turn as 'queued' rows; each SET NX is refused until the lock is released.`);
  } else if (!up.length && !q.length && s.videos.length) {
    const done = s.videos.filter((v) => v.status === "completed" && !v.seed).length, failed = s.videos.filter((v) => v.status === "failed").length;
    const drafts = s.videos.filter((v) => v.status === "completed" && !v.public).length;
    parts.push(`Idle. ${done} video${done === 1 ? "" : "s"} processed${failed ? `, ${failed} failed` : ""}.${drafts ? ` ${drafts} ${drafts > 1 ? "are still drafts" : "is still a draft"} (is_public=false): the public feed can't serve ${drafts > 1 ? "them" : "it"} until an admin publishes.` : ""} The viewer plays the newest published title, switching renditions as its bandwidth moves.`);
  }
  return parts.join(" ") || "Pick a scenario. The plant is idle: no uploads, no lock, an empty broker.";
}

PLATES.plant = {
  mount(root) {
    const DATA = PLANT;
    const stage = root.querySelector(".stage");
    const R = plantRenderer(stage, DATA);
    const $ = (sel) => root.querySelector(sel);
    const cfg = { concurrency: 1, lock: true, speed: 1.5 };
    let s, seen = -1, scenario = null, touring = !stillQuery.matches, tourAt = 1.4, tourIdx = 0, idleFor = 0, storyAt = 0;

    const start = (id) => {
      s = createSim({ refs: REFS, concurrency: cfg.concurrency, lock: cfg.lock });
      seedCatalog(s);
      R.reset();
      seen = -1;
      scenario = id;
      $("[data-log]").replaceChildren();
      delete $("[data-log]").dataset.n;
      for (const [i, u] of (SCENARIOS[id]?.uploads || []).entries()) setTimeoutSim(() => addUpload(s, u), i * 0.25);
      $("[data-why]").textContent = SCENARIOS[id]?.why || "";
      $("[data-live]").textContent = SCENARIOS[id] ? `Scenario: ${SCENARIOS[id].label}` : "";
      for (const b of root.querySelectorAll("[data-run]")) b.setAttribute("aria-pressed", String(b.dataset.run === id));
    };
    const timers = [];
    const setTimeoutSim = (fn, at) => timers.push({ at, fn });
    const takeOver = () => { touring = false; };

    root.querySelectorAll("[data-run]").forEach((b) => b.addEventListener("click", () => { takeOver(); timers.length = 0; start(b.dataset.run); }));
    root.querySelectorAll("[data-set]").forEach((b) => b.addEventListener("click", () => {
      takeOver();
      const [key, val] = b.dataset.set.split(":");
      cfg[key] = key === "lock" ? val === "on" : Number(val);
      for (const o of root.querySelectorAll(`[data-set^="${key}:"]`)) o.setAttribute("aria-pressed", String(o === b));
      if (key !== "speed") { timers.length = 0; start(scenario || "burst"); }
    }));
    $("[data-kill]").addEventListener("click", () => { takeOver(); killWorker(s, 3); });
    const publishNewest = () => { const v = summary(s).drafts.sort((a, b) => b.done - a.done)[0]; if (v) publish(s, v.id); };
    $("[data-publish]").addEventListener("click", () => { takeOver(); publishNewest(); });
    focusing(root, DATA.stations, () => {});
    const zoom = zooming(root, DATA.stations);
    start(null);

    const stats = $("[data-stats]");
    const stop = frameLoop(stage, (dt, calm) => {
      if (window.__freeze) return;
      const sdt = dt * cfg.speed;
      s.t0 = (s.t0 || 0) + sdt;
      for (let i = timers.length - 1; i >= 0; i--) if (s.t0 >= timers[i].at) { const t = timers.splice(i, 1)[0]; t.fn(); }
      for (let i = 0; i < 4; i++) step(s, sdt / 4);
      for (const ev of s.traffic) if (ev.n > seen) { R.traffic(ev, calm); seen = ev.n; }
      R.render(s, dt, calm);
      renderLog($("[data-log]"), s.log);
      const sum = summary(s);
      const busy = !!(sum.uploading || sum.queued || sum.active.length || s.broker.length || s.running.length || timers.length || s.uploads.some((u) => u.state === "retrying" || u.state === "pre-create"));
      idleFor = busy ? 0 : idleFor + dt;
      if (touring && !busy && scenario && idleFor > 1.5 && summary(s).drafts.length) publishNewest();
      if (touring && !busy && idleFor > (scenario ? 7 : tourAt)) { start(TOUR[tourIdx++ % TOUR.length]); idleFor = 0; }
      storyAt -= dt;
      if (storyAt <= 0) {
        storyAt = 0.4;
        $("[data-story]").textContent = plantStory(s);
        const lockV = s.videos.find((v) => v.id === s.lock);
        root.querySelector("[data-readout]").textContent = `uploads ${s.admission.length}/8 · queued ${sum.queued} · ${lockV ? `${lockV.id} ${lockV.status.replace(/_/g, " ")} ${PROGRESS[lockV.status] ?? 0}%` : s.cfg.lock ? "lock free" : "no lock (pre-fix)"} · done ${sum.done}`;
        stats.innerHTML = [["uploading", sum.uploading], ["queued", sum.queued], ["done", sum.done], ["failed", sum.failed]].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
      }
    });
    return { unmount: () => { stop(); zoom.stop(); } };
  },
};
