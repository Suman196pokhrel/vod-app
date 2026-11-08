// Plate 2 controller: one focal upload per scenario, an idle tour, narration and stats.
const INTAKE_SCENARIOS = {
  happy: { label: "Upload a 420 MiB file", why: "The happy path. One POST creates the upload (after seven checks), nine PATCHes carry the 420 MiB, tusd cuts them into eleven S3 parts (eight of 50 MB, two 7.3 MB tails, a 25.8 MB last part), and post-finish turns the finished object into a queued Video row." },
  drop: { label: "Connection drops at 200 MiB", fault: "drop", why: "Why tus: the chunk in flight is lost, but every acknowledged byte is safe in tusd. When the browser is back, a HEAD asks for Upload-Offset and Uppy carries on from 200 MiB, not from zero." },
  capfrees: { label: "9th upload · a slot frees", fault: "cap-frees", others: 8, why: "Eight uploads already hold keys, so pre-create answers 503. 503 is a server error, so Uppy retries on its back-off (0.1, 1, 3, 5 s); another upload finishes in between, its key is deleted and the third attempt gets in." },
  cap: { label: "9th upload · cap holds", fault: "cap", others: 8, why: "Same 503, but no slot frees: after Uppy's four retries the admin sees 'Too many concurrent uploads'. The cap bounds tusd and S3 multipart churn; it is not what throttles transcoding (Plate 3 does that)." },
  notadmin: { label: "Not an admin", fault: "not-admin", why: "The hook re-reads the user from PostgreSQL instead of trusting the JWT's role claim, so a revoked admin is refused at once: 403, and Uppy does not retry a 4xx." },
  badtype: { label: "Wrong file type (.avi)", fault: "bad-type", why: "Only video/mp4, video/quicktime and video/webm get through: 400 before a single byte is stored." },
  abandon: { label: "Admin closes the tab", fault: "abandon", why: "No cancel button yet, and a closed tab sends no DELETE, so post-terminate never runs. The admission key just sits until its 2-hour TTL ends; that TTL was cut from 24 h for exactly this reason." },
};
const INTAKE_TOUR = ["happy", "drop", "capfrees", "notadmin", "abandon", "badtype", "cap"];

function intakeStory(s) {
  const mib = (b) => Math.round(b / 1048576);
  switch (s.phase) {
    case "post": return "Uppy announces the file with POST /files: its length and metadata (title, category, file type and the admin's access token). Caddy passes /files straight to tusd.";
    case "checks": return `tusd holds the request and asks FastAPI's pre-create hook first. Check ${s.check + 1} of 7: ${["the shared secret on the hook URL", "the JWT in the metadata", "is this user an admin (read from PostgreSQL)", "title and category", "the declared size", "the file type", "a free upload slot in Redis"][Math.max(0, s.check)]}.`;
    case "retry": return "Refused with 503: all eight upload slots are taken. Uppy waits and asks again.";
    case "patching": return `Uploading: ${mib(s.received)} of ${mib(s.size)} MiB acknowledged. Each slice is one PATCH; tusd ships every full 50 MB to MinIO as an S3 part.`;
    case "offline": return `Connection lost. ${mib(s.received)} MiB are already safe in tusd and MinIO; only the slice in flight is gone.`;
    case "bridge": return "Upload complete. MinIO has joined the parts, post-finish has created the Video row, and Uppy asks the status bridge which video it became.";
    case "done": return `Done: video ${s.video} is queued for processing as a draft. From here the Redis lock decides when it runs (Plate 3).`;
    case "rejected": return "Rejected before any data moved. Nothing was stored: no tus row, no key, no object.";
    case "abandoned": return s.ownKey ? "The tab is closed. Its admission key keeps one of the eight slots busy; watch the TTL dial run down (sped up)." : "The key expired, so the slot is free again. The partial parts stay in vod-videos as an unfinished multipart upload.";
    default: return "";
  }
}

PLATES.intake = {
  mount(root) {
    const D = INTAKE;
    const stage = root.querySelector(".stage");
    const R = intakeRenderer(stage, D);
    const $ = (sel) => root.querySelector(sel);
    let s, seen = -1, scenario = null, touring = !stillQuery.matches, tourIdx = 0, idle = 0, storyAt = 0, speed = 1;
    const start = (id) => {
      const sc = INTAKE_SCENARIOS[id];
      s = createIntake({ refs: REFS, fault: sc.fault ?? null, others: sc.others ?? 0 });
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
    focusing(root, D.stations);
    const zoom = zooming(root, D.stations);
    start("happy");
    const stop = frameLoop(stage, (dt, calm) => {
      if (window.__freeze) return;
      const sdt = dt * speed;
      for (let i = 0; i < 4; i++) stepIntake(s, sdt / 4);
      for (const ev of s.traffic) if (ev.n > seen) { R.traffic(ev, calm); seen = ev.n; }
      R.render(s, dt, calm);
      renderLog($("[data-log]"), s.log);
      const settled = ["done", "rejected"].includes(s.phase) || (s.phase === "abandoned" && !s.ownKey);
      idle = settled ? idle + dt : 0;
      if (touring && idle > 4) start(INTAKE_TOUR[++tourIdx % INTAKE_TOUR.length]);
      storyAt -= dt;
      if (storyAt <= 0) {
        storyAt = 0.3;
        $("[data-story]").textContent = intakeStory(s);
        const parts = s.parts.filter((p) => p.landed).length;
        root.querySelector("[data-readout]").textContent = `offset ${Math.round(s.received / 1048576)}/${D.sizeMiB} MiB · ${parts}/${D.parts} parts · slots ${s.others + (s.ownKey ? 1 : 0)}/8 · ${s.phase}`;
        $("[data-stats]").innerHTML = [["MiB sent", Math.round(s.received / 1048576)], ["chunks", `${Math.min(s.cut, D.chunks)}/${D.chunks}`], ["parts", `${parts}/${D.parts}`], ["slots", `${s.others + (s.ownKey ? 1 : 0)}/8`]].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
      }
    });
    return { unmount: () => { stop(); zoom.stop(); } };
  },
};
