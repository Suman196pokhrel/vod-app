// Plate 1 renderer: maps the model's state onto the machine (tokens, lamps, lanes,
// spindles) and turns the model's traffic into pulses that travel the real links.
function plantRenderer(stage, DATA) {
  const P = DATA.P;
  const dyn = {};
  for (const el of stage.querySelectorAll("[data-dyn]")) dyn[el.dataset.dyn] = el;
  const lamps = {};
  for (const el of stage.querySelectorAll("[data-lamp]")) lamps[el.dataset.lamp] = el;
  const cables = {};
  for (const el of stage.querySelectorAll(".pulse")) {
    const id = el.dataset.pulse;
    (cables[id] ||= []).push({ el, from: +el.dataset.from, to: +el.dataset.to, total: +el.dataset.total, len: el.getTotalLength() });
  }
  const busG = stage.querySelector("[data-bus-pulses]");
  const busPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  busPath.setAttribute("class", "bus-pulse");
  busG.append(busPath);
  const q = (sel) => [...stage.querySelectorAll(sel)];
  const bars = q("[data-upbar]"), pips = q("[data-pip]"), tiles = q("[data-tilerow]");
  const gauges = Object.fromEntries(q("[data-bucket]").map((el) => [el.dataset.bucket, el]));
  const scrub = stage.querySelector("[data-scrub]"), paused = stage.querySelector("[data-paused]"), needle = stage.querySelector("[data-needle]");
  const dial = DATA.dial;

  const show = (name, on) => dyn[name]?.toggleAttribute("data-hide", !on);
  const flashes = {};
  const flash = (name, warn = false) => { flashes[name] = { left: 0.35, warn }; };

  // ---- traffic pulses -------------------------------------------------------------
  const SPEED = 520, HALF = 7;
  const pulses = [];
  const linkLen = (id) => cables[id]?.[0]?.total ?? 20;
  const out = (end) => (end === "admin" || end === "viewer" ? [{ c: end, dir: 1 }, { c: "caddy", dir: 1 }] : [{ c: end, dir: 1 }]);
  const tapOf = (end) => DATA.taps[end === "admin" || end === "viewer" ? "caddy" : end];
  function routeOf(from, to) {
    const legs = [...out(from), { bus: [tapOf(from), tapOf(to)] }, ...out(to).reverse().map((l) => ({ ...l, dir: -l.dir }))];
    for (const l of legs) l.len = l.bus ? Math.abs(l.bus[1] - l.bus[0]) : linkLen(l.c);
    return legs;
  }
  function traffic(ev, calm) {
    const legs = routeOf(ev.from, ev.to);
    if (!calm) pulses.push({ legs, at: 0, total: legs.reduce((a, l) => a + l.len, 0), ev });
    const via = ev.from === "admin" || ev.to === "admin" || ev.from === "viewer" || ev.to === "viewer";
    if (via) flash(`route-${ev.to === "tusd" || ev.from === "tusd" ? "files" : ev.to === "minio" || ev.from === "minio" ? "storage" : "api"}`);
    if (ev.kind.includes("pre-create")) flash("hook-pre-create");
    if (ev.kind.includes("post-finish")) flash("hook-post-finish");
    if (ev.kind.startsWith("GET status")) flash("hook-status");
    if (ev.kind.startsWith("PATCH")) kick.blade = 1;
    const bucket = /raw|UploadPart/.test(ev.kind) ? "videos" : /sprites/.test(ev.kind) ? "thumbnails" : /master|seg/.test(ev.kind) ? "processed" : null;
    if (bucket) flash(`bucket-${bucket}`);
  }
  const kick = { blade: 0 };

  function drawPulses(dt) {
    const onCable = {};
    const onBus = [];
    for (const p of pulses) {
      p.at += dt * SPEED;
      let s = p.at;
      for (const l of p.legs) {
        if (s <= l.len + HALF && s >= -HALF) {
          if (l.bus) onBus.push(l.bus[0] + Math.sign(l.bus[1] - l.bus[0] || 1) * s);
          else (onCable[l.c] ||= []).push(l.dir > 0 ? s : l.len - s);
        }
        if (s >= 0 && s <= l.len && !l.bus && l.c !== "admin" && l.c !== "viewer") flash(`tap-${l.c}`);
        s -= l.len;
      }
    }
    for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i].at > pulses[i].total + HALF) pulses.splice(i, 1);
    for (const [id, pieces] of Object.entries(cables)) {
      const at = onCable[id] || [];
      for (const pc of pieces) pc.el.style.strokeDasharray = dashFor(pc, at);
    }
    busPath.setAttribute("d", onBus.map((x) => {
      const a = Math.max(DATA.bus.x0, x - HALF), b = Math.min(DATA.bus.x1, x + HALF);
      if (b <= a) return "";
      const p0 = iso([a, DATA.bus.y, DATA.bus.z], P), p1 = iso([b, DATA.bus.y, DATA.bus.z], P);
      return `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    }).join(""));
  }
  function dashFor(pc, at) {
    const k = pc.len / Math.max(1e-6, pc.to - pc.from);
    const spans = at.map((s) => [Math.max(pc.from, s - HALF), Math.min(pc.to, s + HALF)]).filter(([a, b]) => b > a).map(([a, b]) => [(a - pc.from) * k, (b - pc.from) * k]).sort((x, y) => x[0] - y[0]);
    if (!spans.length) return "0 100000";
    const arr = [0];
    let cursor = 0;
    for (const [a, b] of spans) { arr.push(Math.max(0, a - cursor), b - Math.max(a, cursor)); cursor = b; }
    arr.push(pc.len + 100);
    return arr.map((v) => v.toFixed(2)).join(" ");
  }

  // ---- machine state ----------------------------------------------------------------
  const lanes = new Array(8).fill(null);
  const slots = [];
  const heads = [0, 0, 0];
  let blade = 0;
  let playClock = 0, nextSeg = 0, playing = null;

  function render(s, dt, calm) {
    for (const up of s.uploads) {
      if (up.state === "uploading" && !lanes.includes(up.id)) lanes[lanes.indexOf(null)] = up.id;
    }
    lanes.forEach((id, i) => {
      const up = id && s.uploads.find((u) => u.id === id);
      if (up && up.state !== "uploading") lanes[i] = null;
      const n = up && up.state === "uploading" ? Math.ceil((8 * up.sent) / up.sizeMB) : 0;
      for (let j = 0; j < 8; j++) show(`wafer-${i}-${j}`, j < n);
      lamps[`lane-${i}`]?.toggleAttribute("data-on", !!lanes[i]);
      const bar = bars[i];
      bar.querySelector(".bar-fill").setAttribute("width", up ? ((DATA.barW * up.sent) / up.sizeMB).toFixed(2) : 0);
    });
    const waiting = s.uploads.filter((u) => u.state !== "done" && u.state !== "error");
    for (let i = 0; i < 12; i++) {
      const up = waiting[i];
      show(`can-${i}`, !!up);
      if (up) dyn[`can-${i}`].dataset.state = up.state === "uploading" ? "up" : up.state === "retrying" ? "wait" : "new";
    }
    const errs = s.uploads.filter((u) => u.state === "error" || u.state === "retrying").length;
    lamps["admin-power"]?.toggleAttribute("data-warn", errs > 0);
    lamps["admin-power"]?.toggleAttribute("data-on", errs === 0);
    blade = Math.max(kick.blade, blade - dt * 4);
    kick.blade = 0;
    dyn.blade?.setAttribute("transform", translateAlong(P, [0, 0, -4 * Math.sin(Math.PI * blade)]));

    const vids = [...s.videos].sort((a, b) => a.created - b.created).slice(-12);
    for (let i = 0; i < 12; i++) {
      const card = stage.querySelector(`[data-card="${i}"]`);
      const v = vids[i];
      card.parentElement.toggleAttribute("data-hide", !v);
      if (v) card.dataset.state = v.status === "queued" ? "queued" : v.status === "completed" ? "done" : v.status === "failed" ? "failed" : "active";
    }
    for (let i = 0; i < 8; i++) show(`token-${i}`, i < s.admission.length);
    show("lock-tag", !!s.lock);
    for (let i = 0; i < 12; i++) show(`chit-${i}`, i < s.broker.length);

    for (const m of s.running) if (m.slot === undefined) { const used = s.running.map((x) => x.slot); m.slot = [0, 1, 2].find((i) => !used.includes(i)); }
    for (let i = 0; i < 3; i++) {
      const busy = s.running.find((m) => m.slot === i);
      show(`work-${i}`, !!busy);
      show(`lockout-${i}`, i >= s.cfg.concurrency);
      heads[i] = calm ? (busy ? 1 : 0) : heads[i] + ((busy ? 1 : 0) - heads[i]) * (1 - Math.exp(-dt / 0.18));
      dyn[`head-${i}`]?.setAttribute("transform", translateAlong(P, [0, 0, -9 * heads[i]]));
      lamps[`spindle-${i}`]?.toggleAttribute("data-on", !!busy);
    }
    const active = s.videos.find((v) => v.id === s.lock) || s.videos.find((v) => v.id === s.running[0]?.vid) || null;
    const shown = active || [...s.videos].reverse().find((v) => v.status === "completed" && !v.seed) || null;
    for (const st of DATA.stages) lamps[`stage-${st}`]?.toggleAttribute("data-on", active?.status === st);
    for (let i = 0; i < 7; i++) {
      const r = shown?.rungs[i];
      show(`rung-${i}`, !!r && (r.state === "done" || r.state === "encoding"));
      if (r) dyn[`rung-${i}`].dataset.state = r.state;
      show(`skip-${i}`, !!r && (r.state === "skipped" || r.state === "skipping"));
    }
    const sb = s.running.find((m) => m.task === "generate_storyboard");
    const after = shown && !["queued", "dispatched", "preparing", "generating_storyboard", "failed"].includes(shown.status);
    const rows = sb ? Math.floor((10 * (s.t - sb.start)) / sb.dur) : after ? 10 : 0;
    tiles.forEach((el, i) => el.toggleAttribute("data-on", i < rows));
    const fill = (b, n) => gauges[b]?.setAttribute("width", ((DATA.gaugeW * Math.min(n, 12)) / 12).toFixed(2));
    fill("videos", s.videos.length);
    fill("thumbnails", s.videos.filter((v) => !["queued", "dispatched", "preparing", "generating_storyboard"].includes(v.status) && v.status !== "failed").length);
    fill("processed", s.videos.filter((v) => v.status === "completed").length);

    railRender(s, dt, calm);
    viewerPlay(s, dt);
    for (const [name, f] of Object.entries(flashes)) {
      f.left -= dt;
      const el = lamps[name];
      if (el && !name.startsWith("lane") && !name.startsWith("spindle") && !name.startsWith("stage")) el.toggleAttribute(f.warn ? "data-warn" : "data-on", f.left > 0);
      if (f.left <= 0) delete flashes[name];
    }
    drawPulses(calm ? 0 : dt);
  }

  // Status rail: a carriage per unfinished video (oldest three), parked at its status's real progress value.
  const carLane = new Map(), carX = [0, 0, 0];
  const pct = (v) => (v.status === "failed" ? 0 : PROGRESS[v.status] ?? 15);
  function railRender(s, dt, calm) {
    for (const v of s.videos) if ((v.status === "completed" || v.status === "failed") && v.leftAt === undefined) v.leftAt = s.t;
    for (const [id, lane] of carLane) { const v = s.videos.find((x) => x.id === id); if (!v || (v.leftAt !== undefined && s.t - v.leftAt > 2.5)) carLane.delete(id); }
    for (const v of [...s.videos].sort((a, b) => a.created - b.created)) {
      if (carLane.has(v.id) || v.leftAt !== undefined || v.seed) continue;
      const used = [...carLane.values()];
      const free = [0, 1, 2].find((i) => !used.includes(i));
      if (free === undefined) break;
      carLane.set(v.id, free);
      carX[free] = 0;
    }
    const lit = new Set();
    for (let i = 0; i < 3; i++) {
      const id = [...carLane.entries()].find(([, l]) => l === i)?.[0];
      const v = id && s.videos.find((x) => x.id === id);
      show(`car-${i}`, !!v);
      if (!v) continue;
      const target = ((DATA.rail.x1 - DATA.rail.x0) * pct(v)) / 100;
      carX[i] = calm ? target : carX[i] + (target - carX[i]) * (1 - Math.exp(-dt / 0.35));
      dyn[`car-${i}`].setAttribute("transform", translateAlong(P, [carX[i], 0, 0]));
      dyn[`car-${i}`].dataset.state = v.status === "queued" ? "queued" : v.status;
      lit.add(v.status);
    }
    for (const st of DATA.rail.stops) {
      lamps[`stop-${st}`]?.toggleAttribute(st === "failed" ? "data-warn" : "data-on", lit.has(st));
    }
  }

  // The viewer plays the newest finished video, switching rendition as bandwidth moves.
  function viewerPlay(s, dt) {
    const v = s.videos.filter((x) => x.status === "completed" && x.public).sort((a, b) => a.done - b.done).pop();
    paused.style.display = v ? "none" : "";
    if (!v) { pips.forEach((p) => p.removeAttribute("data-on")); return; }
    if (playing !== v.id) { playing = v.id; playClock = 0; nextSeg = 0; s.traffic.push({ t: s.t, from: "viewer", to: "minio", kind: "GET master.m3u8" }); }
    playClock += dt;
    const mbps = 4.5 + 4 * Math.sin(playClock * 0.55) + 2.2 * Math.sin(playClock * 1.7);
    const avail = v.rungs.map((r, i) => ({ ...r, i })).filter((r) => r.state === "done");
    const pick = avail.find((r) => (r.kbps + 128) * 1.25 <= mbps * 1000) || avail[avail.length - 1];
    pips.forEach((p) => p.toggleAttribute("data-on", +p.dataset.pip === pick.i));
    const a = dial.a0 + (dial.a1 - dial.a0) * Math.min(1, Math.max(0, mbps / 12));
    needle.setAttribute("d", lineOnTop([dial.x, dial.y], [dial.x + Math.sin(a) * dial.r, dial.y - Math.cos(a) * dial.r], dial.z, P));
    scrub.setAttribute("width", ((DATA.scrubW * ((playClock * 10) % v.duration)) / v.duration).toFixed(2));
    if (playClock >= nextSeg) { nextSeg = playClock + 0.6; s.traffic.push({ t: s.t, from: "viewer", to: "minio", kind: `GET ${pick.q}/segment.ts` }); }
  }

  return { render, traffic, reset() { lanes.fill(null); pulses.length = 0; playing = null; carLane.clear(); } };
}
