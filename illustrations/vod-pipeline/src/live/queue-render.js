// Plate 3 renderer: maps the shared processing model onto the escapement, the broker chits,
// the presses, the outfeed and the back-row displays.
const TASK_SHORT = { prepare_video: "prep", generate_storyboard: "story", on_transcode_complete: "chord cb", segment_videos: "segment", create_manifest: "m3u8", upload_to_minio: "upload", finalize_processing: "final", on_pipeline_success: "success" };
const taskName = (s, m) => (m.task === "transcode_quality" ? LADDER[m.rung].q : TASK_SHORT[m.task] || m.task);

function queueRenderer(stage, D) {
  const P = D.P;
  const dyn = {};
  for (const el of stage.querySelectorAll("[data-dyn]")) dyn[el.dataset.dyn] = el;
  const lamps = {};
  for (const el of stage.querySelectorAll("[data-lamp]")) lamps[el.dataset.lamp] = el;
  const q = (sel) => stage.querySelector(sel);
  const show = (name, on) => dyn[name]?.toggleAttribute("data-hide", !on);
  const text = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const pulser = cablePulser(stage, { speed: 200 });
  const flight = q('[data-flight="gate"]');
  const t = {};
  for (const id of ["lockval", "setnx", "eval", "llen", "conc", "running", "tagid", "lockttl"]) t[id] = q(`[data-${id}]`);
  const rows = [...stage.querySelectorAll("[data-qrow]")];
  const flashes = {};
  const flash = (name, warn = false, len = 0.5) => { flashes[name] = { left: len, warn }; };
  let shift = 0, gateUp = 0, lastHead = null, lastLock = null, fly = null, seenLog = -1;
  const rams = [0, 0, 0];
  let setnx = "—", evalr = "—";

  function traffic(ev, calm) {
    if (ev.kind === "SET NX active_lock" && !calm) pulser.send("lock", -1);
    if (ev.kind === "EVAL release-if-owner" && !calm) pulser.send("lock", -1);
  }

  function readLog(s) {
    for (const e of s.log) {
      if (e.n <= seenLog) continue;
      seenLog = e.n;
      if (e.text.startsWith("SET video_processing")) { setnx = "OK"; flash("setnx"); }
      if (e.text.includes("SET NX refused")) { setnx = `refused · held by ${s.lock}`; flash("refused", true); }
      if (e.text.includes("release-if-owner")) { evalr = /deleted/.test(e.text) ? "1 · deleted" : "0 · not the owner"; if (!/deleted/.test(e.text)) flash("refused", true, 1.2); }
      if (e.text.includes("worker_init")) evalr = "lock cleared by worker_init";
    }
  }

  function render(s, dt, calm) {
    readLog(s);
    const queued = s.videos.filter((v) => v.status === "queued" && v.stage === "queued").sort((a, b) => a.created - b.created);
    const onStage = s.cfg.lock ? s.videos.filter((v) => v.id === s.lock) : s.videos.filter((v) => !v.seed && (IN_PROGRESS.includes(v.status) || v.stage === "dispatched"));
    if (lastHead && queued[0]?.id !== lastHead && !queued.some((v) => v.id === lastHead)) shift = 1;
    lastHead = queued[0]?.id ?? null;
    shift = calm ? 0 : Math.max(0, shift - dt * 2.5);
    const ease = translateAlong(P, [-D.magPitch * shift, 0, 0]);
    for (let i = 0; i < 11; i++) {
      show(`mag-${i}`, i < queued.length);
      dyn[`mag-${i}`]?.setAttribute("transform", ease);
    }
    if (s.lock && s.lock !== lastLock) { gateUp = 1; fly = { at: 0 }; }
    lastLock = s.lock;
    gateUp = Math.max(0, gateUp - dt * 0.9);
    dyn.gatebar?.setAttribute("transform", translateAlong(P, [0, 0, 24 * Math.min(1, gateUp * 2)]));
    if (fly) {
      fly.at += dt / 0.7;
      if (!fly.g) { fly.g = document.createElementNS("http://www.w3.org/2000/svg", "g"); fly.g.innerHTML = D.canSvg; flight.append(fly.g); }
      const x = D.magX0 + (D.stageX[0] - D.magX0) * Math.min(1, fly.at);
      fly.g.setAttribute("transform", translateAlong(P, [x, 0, 0]));
      if (fly.at >= 1 || calm) { fly.g.remove(); fly = null; }
    }
    for (let i = 0; i < 4; i++) show(`stage-${i}`, i < onStage.length && !(i === 0 && fly));
    const done = s.videos.filter((v) => v.status === "completed" && !v.seed).slice(-6);
    const failed = s.videos.filter((v) => v.status === "failed").slice(-6);
    for (let i = 0; i < 6; i++) { show(`done-${i}`, i < done.length); show(`failed-${i}`, i < failed.length); }
    lamps.failbin?.toggleAttribute("data-warn", failed.length > 0);

    for (let i = 0; i < 14; i++) {
      const m = s.broker[i];
      show(`chit-${i}`, !!m);
      if (m) { text(dyn[`chit-${i}`].querySelector("[data-chit-vid]"), m.vid); text(dyn[`chit-${i}`].querySelector("[data-chit-task]"), taskName(s, m)); }
    }
    for (const m of s.running) if (m.slot === undefined) { const used = s.running.map((x) => x.slot); m.slot = [0, 1, 2].find((i) => !used.includes(i)); }
    for (let i = 0; i < 3; i++) {
      const m = s.running.find((x) => x.slot === i);
      show(`run-${i}`, !!m);
      show(`lockout-${i}`, i >= s.cfg.concurrency);
      if (m) { text(dyn[`run-${i}`].querySelector("[data-chit-vid]"), m.vid); text(dyn[`run-${i}`].querySelector("[data-chit-task]"), taskName(s, m)); }
      rams[i] = calm ? (m ? 1 : 0) : rams[i] + ((m ? 1 : 0) - rams[i]) * (1 - Math.exp(-dt / 0.15));
      dyn[`ram-${i}`]?.setAttribute("transform", translateAlong(P, [0, 0, -22 * rams[i]]));
      lamps[`press-${i}`]?.toggleAttribute("data-on", !!m);
    }

    const active = s.videos.find((v) => v.id === s.lock) || s.videos.find((v) => v.id === s.running[0]?.vid);
    for (const st of STAGES.slice(1, 9)) lamps[`stage-${st}`]?.toggleAttribute("data-on", active?.status === st);
    lamps["worker-up"]?.toggleAttribute("data-on", s.worker === "up");
    lamps["worker-up"]?.toggleAttribute("data-warn", s.worker !== "up");
    show("locktag", !!s.lock);
    text(t.tagid, s.lock || "");
    text(t.lockval, s.cfg.lock ? s.lock || "nil" : "not used (pre-fix)");
    text(t.setnx, s.cfg.lock ? setnx : "not called");
    text(t.eval, evalr);
    text(t.llen, String(s.broker.length));
    text(t.conc, `--concurrency=${s.cfg.concurrency}`);
    text(t.running, s.worker !== "up" ? "restarting…" : s.running.map((m) => `${m.vid} ${taskName(s, m)}`).join(" · ") || "idle");
    t.lockttl?.setAttribute("visibility", s.lock ? "visible" : "hidden");
    const list = s.videos.filter((v) => !v.seed && v.status !== "completed" && v.status !== "failed").sort((a, b) => a.created - b.created);
    rows.forEach((el, i) => {
      const v = list[i];
      text(el, v ? `${v.id}  ${v.status.replace(/_/g, " ").padEnd(21)}${v.id === s.lock ? " ← holds the lock" : v.stage === "dispatched" ? " ← dispatched" : ""}` : "");
      el.classList.toggle("lit-row", !!v && v.id === s.lock);
    });

    for (const [name, f] of Object.entries(flashes)) {
      f.left -= dt;
      lamps[name]?.toggleAttribute(f.warn ? "data-warn" : "data-on", f.left > 0);
      if (f.left <= 0) delete flashes[name];
    }
    if (s.lock) lamps.setnx?.setAttribute("data-on", "");
    pulser.draw(calm ? 0 : dt);
  }

  return { render, traffic, reset() { pulser.clear(); setnx = "—"; evalr = "—"; lastHead = null; lastLock = null; seenLog = -1; fly?.g?.remove(); fly = null; } };
}
