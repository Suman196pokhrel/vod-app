// Plate 3 controller: arrivals, the lock and broker switches, failure and restart events.
const QUEUE_SCENARIOS = {
  three: { label: "3 videos arrive", arrivals: [[0, {}], [0.5, { height: 720, duration: 240 }], [1, { height: 1440, duration: 420 }]], why: "The first post-finish wins SET NX and its chain goes to the broker; the next two calls find the key and return without doing anything. Each video waits as a 'queued' row until the one ahead hands the lock back." },
  wide: { label: "6 videos · 3 worker slots", conc: 3, arrivals: Array.from({ length: 6 }, (_, i) => [i * 0.3, { duration: 200 + i * 40 }]), why: "Local dev runs --concurrency=3. More slots only help inside one video: the seven transcodes of its chord run three at a time. The lock still lets just one video's chain into the broker." },
  prefix: { label: "Lock off · before the fix", lock: false, arrivals: Array.from({ length: 4 }, (_, i) => [i * 0.3, { duration: 240 + i * 60 }]), why: "History, not today: every post-finish dispatched its own chain into the same broker list. With one press, a video that finished transcoding still had its segment, manifest, upload and finalize steps queued behind everyone else's transcodes, so every video looked stuck until all of them were nearly done." },
  fail: { label: "A video fails", arrivals: [[0, { fault: "corrupt" }], [0.4, {}], [0.8, { duration: 200 }]], why: "ffprobe can't read the first file. prepare_video marks it failed and raises; the chain's link_error, on_pipeline_failed, runs inside the failing worker with the real exception, releases the lock (owner check first) and starts the next queued video." },
  restart: { label: "Worker restarts mid-video", arrivals: [[0, { duration: 600 }], [0.4, {}], [0.8, {}]], kill: 6, why: "A redeploy or an OOM kill. On boot, worker_init purges the broker (stray transcodes can't finish a chord on their own), deletes the lock, marks the interrupted video failed with a clear message and starts the oldest queued video." },
  stale: { label: "Late duplicate callback", arrivals: [[0, { duration: 160 }], [0.4, { duration: 420 }]], stale: true, why: "Why release is a Lua script: a late or duplicate callback from a finished video runs release-if-owner. GET returns the new holder's id, which isn't its own, so DEL never runs and the running video keeps its slot." },
};
const QUEUE_TOUR = ["three", "fail", "prefix", "wide", "restart", "stale"];

function queueStory(s) {
  const q = s.videos.filter((v) => v.status === "queued" && v.stage === "queued").length;
  const lockV = s.videos.find((v) => v.id === s.lock);
  if (s.worker !== "up") return "The worker is restarting. Until it's back, nothing consumes the broker; when it boots, worker_init cleans up before taking a single message.";
  if (!s.cfg.lock) return `No lock: ${s.videos.filter((v) => !v.seed && v.status !== "completed" && v.status !== "failed").length} videos in flight share one broker list of ${s.broker.length} chits. Look at the chit labels: steps of different videos are interleaved.`;
  if (lockV) return `${lockV.id} holds the lock and is ${lockV.status.replace(/_/g, " ")}. ${q ? `${q} waiting in created_at order; nothing else can start until the tag comes off the hook.` : "Nothing else is waiting."} The broker holds ${s.broker.length} of its chits.`;
  const done = s.videos.filter((v) => v.status === "completed" && !v.seed).length, failed = s.videos.filter((v) => v.status === "failed").length;
  return s.videos.length ? `The queue is empty and the lock is free. ${done} done${failed ? `, ${failed} failed` : ""}.` : "Waiting for uploads.";
}

PLATES.queue = {
  mount(root) {
    const D = QUEUE;
    const stage = root.querySelector(".stage");
    const R = queueRenderer(stage, D);
    const $ = (sel) => root.querySelector(sel);
    let s, seen = -1, scenario, touring = !stillQuery.matches, tourIdx = 0, idle = 0, storyAt = 0, speed = 1.5, timers = [], clock = 0, staleDone = false;
    const start = (id) => {
      const sc = QUEUE_SCENARIOS[id];
      s = createSim({ refs: REFS, concurrency: sc.conc ?? 1, lock: sc.lock ?? true });
      clock = 0;
      staleDone = false;
      timers = sc.arrivals.map(([at, o]) => ({ at, fn: () => arrive(s, o) }));
      if (sc.kill) timers.push({ at: sc.kill, fn: () => killWorker(s, 2.5) });
      R.reset();
      seen = -1;
      scenario = id;
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
    $("[data-kill]")?.addEventListener("click", () => { touring = false; killWorker(s, 2.5); });
    $("[data-arrive]")?.addEventListener("click", () => { touring = false; arrive(s, { duration: 240 }); });
    focusing(root, D.stations);
    const zoom = zooming(root, D.stations);
    start("three");
    const stop = frameLoop(stage, (dt, calm) => {
      if (window.__freeze) return;
      const sdt = dt * speed;
      clock += sdt;
      for (let i = timers.length - 1; i >= 0; i--) if (clock >= timers[i].at) timers.splice(i, 1)[0].fn();
      if (QUEUE_SCENARIOS[scenario].stale && !staleDone && s.lock && s.videos.some((v) => v.status === "completed" && !v.seed && v.id !== s.lock)) staleDone = staleRelease(s);
      for (let i = 0; i < 4; i++) step(s, sdt / 4);
      for (const ev of s.traffic) if (ev.n > seen) { R.traffic(ev, calm); seen = ev.n; }
      R.render(s, dt, calm);
      renderLog($("[data-log]"), s.log);
      const busy = timers.length || s.broker.length || s.running.length || s.lock || s.worker !== "up" || s.videos.some((v) => v.status === "queued");
      idle = busy ? 0 : idle + dt;
      if (touring && idle > 4) start(QUEUE_TOUR[++tourIdx % QUEUE_TOUR.length]);
      storyAt -= dt;
      if (storyAt <= 0) {
        storyAt = 0.3;
        $("[data-story]").textContent = queueStory(s);
        const sum = summary(s);
        root.querySelector("[data-readout]").textContent = `lock ${s.cfg.lock ? s.lock || "free" : "off"} · queued ${sum.queued} · broker ${s.broker.length} · slots ${s.running.length}/${s.cfg.concurrency} · done ${sum.done}`;
        $("[data-stats]").innerHTML = [["queued", sum.queued], ["broker", s.broker.length], ["done", sum.done], ["failed", sum.failed]].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
      }
    });
    return { unmount: () => { stop(); zoom.stop(); } };
  },
};
