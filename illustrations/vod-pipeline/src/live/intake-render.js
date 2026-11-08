// Plate 2 renderer: the loaf, the slices in flight, tusd's display, the parts in MinIO,
// the checkpoint lamps, the Redis keys and TTL dial, and the PostgreSQL rows.
function intakeRenderer(stage, D) {
  const P = D.P;
  const dyn = {};
  for (const el of stage.querySelectorAll("[data-dyn]")) dyn[el.dataset.dyn] = el;
  const lamps = {};
  for (const el of stage.querySelectorAll("[data-lamp]")) lamps[el.dataset.lamp] = el;
  const q = (sel) => stage.querySelector(sel);
  const show = (name, on) => dyn[name]?.toggleAttribute("data-hide", !on);
  const pulser = cablePulser(stage, { speed: 170 });
  const belt = q('[data-flight="belt"]'), chute = q('[data-flight="chute"]');
  const flashes = {};
  const flash = (name, warn = false, len = 0.4) => { flashes[name] = { left: len, warn }; };
  const t = {};
  for (const id of ["upbar", "uppct", "upphase", "offset", "ofsize", "buffer", "slots", "code", "ttl"]) t[id] = q(`[data-${id}]`);
  const rows = { tus: q('[data-row="tus"]'), video: q('[data-row="video"]') };
  let blade = 0, lastCode = "—";
  const pool = { belt: new Map(), chute: new Map() };

  function fly(layer, key, svg, x, z, alpha) {
    let g = pool[layer].get(key);
    if (!g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.innerHTML = svg;
      (layer === "belt" ? belt : chute).append(g);
      pool[layer].set(key, g);
    }
    g.setAttribute("transform", translateAlong(P, [x, 0, z]));
    g.style.opacity = alpha;
    g.seen = true;
  }

  function traffic(ev, calm) {
    const w = ev.what;
    if (w === "blade") blade = 1;
    if (w === "files") flash("route-files");
    if (w === "status") { flash("route-status"); flash("hook-status"); }
    if (w === "tusd") flash("tusd");
    if (w === "minio") { flash("bucket"); flash("part"); }
    if (w === "reject") flash("reject", true, 1.6);
    if (w.startsWith("hook-")) { flash(w); if (!calm) pulser.send("hook", 1); }
    if (w === "redis" && !calm) pulser.send("redis", -1);
    if (w === "postgres" && !calm) pulser.send("postgres", 1);
  }

  function render(s, dt, calm) {
    const cut = Math.round(s.cut);
    for (let j = 0; j < D.chunks; j++) show(`slice-${j}`, j >= cut);
    const feed = translateAlong(P, [D.pitch * cut, 0, 0]);
    for (let j = 0; j < D.chunks; j++) dyn[`slice-${j}`]?.setAttribute("transform", feed);
    dyn.pusher?.setAttribute("transform", feed);
    blade = Math.max(0, blade - dt * 3.5);
    dyn.blade?.setAttribute("transform", translateAlong(P, [0, 0, -16 * Math.sin(Math.PI * blade)]));
    dyn.shutter?.setAttribute("transform", translateAlong(P, [0, 0, -22 * s.gate]));

    for (const m of Object.values(pool)) for (const g of m.values()) g.seen = false;
    for (const f of s.flying) {
      const age = s.t - f.born;
      if (f.where === "belt") {
        const w = D.widths[f.i];
        const run = D.belt.x1 - D.belt.x0 - w;
        const u = Math.min(1, age / 1.25);
        const x = f.lost ? D.belt.x0 + Math.min(u, 0.12) * run : D.belt.x0 + u * run;
        fly("belt", `b${f.i}${f.lost ? "x" : ""}`, D.sliceSvg[f.i], x, D.belt.z, f.lost ? Math.max(0, 1 - age / 0.6) : 1);
      } else if (f.where === "chute") {
        const u = Math.min(1, age / 0.55);
        fly("chute", `c${f.i}`, D.partSvg, D.chute.x0 + u * (D.partX[f.i] - D.chute.x0), D.chute.z, 1);
      }
    }
    for (const m of Object.values(pool)) for (const [key, g] of m) if (!g.seen) { g.remove(); m.delete(key); }

    for (let j = 0; j < D.parts; j++) show(`part-${j}`, !!s.parts[j]?.landed && !s.merged);
    show("object", s.merged);
    show("info", s.info);

    const pct = s.received / s.size;
    t.upbar?.setAttribute("width", (D.barW * pct).toFixed(2));
    if (t.uppct) t.uppct.textContent = `${Math.floor(pct * 100)}%`;
    if (t.upphase) t.upphase.textContent = phaseText(s);
    if (t.offset) t.offset.textContent = `${Math.round(s.received / 1048576)} MiB`;
    if (t.ofsize) t.ofsize.textContent = `of ${D.sizeMiB} MiB · ${s.parts.filter((p) => p.landed).length} parts written`;
    t.buffer?.setAttribute("width", ((76 * s.buffered) / 50e6).toFixed(2));

    const used = s.others + (s.ownKey ? 1 : 0);
    for (let i = 0; i < 8; i++) {
      show(`key-${i}`, i < used);
      dyn[`key-${i}`]?.classList.toggle("own", s.ownKey && i === s.others);
    }
    if (t.slots) t.slots.textContent = `${used} / 8`;
    const a = (2 * Math.PI * s.ttl) / 7200;
    t.ttl?.setAttribute("d", `M${D.dial.x} ${-D.dial.z}L${(D.dial.x + Math.sin(a) * (D.dial.r - 3)).toFixed(2)} ${(-D.dial.z - Math.cos(a) * (D.dial.r - 3)).toFixed(2)}`);

    s.checks.forEach((c, i) => {
      const el = lamps[`check-${D.checks[i]}`];
      el?.toggleAttribute("data-on", c === "pass");
      el?.toggleAttribute("data-warn", c === "fail");
    });
    lastCode = codeOf(s, lastCode);
    if (t.code) t.code.textContent = lastCode;
    rows.tus.textContent = s.rows.tus ? `${s.upload} · ${s.rows.tus}` : "—";
    rows.video.textContent = s.rows.video ? `${s.video} · queued · draft` : "—";
    const online = s.phase !== "offline" && s.phase !== "abandoned";
    lamps.link?.toggleAttribute("data-on", online);
    lamps.link?.toggleAttribute("data-warn", !online);

    for (const [name, f] of Object.entries(flashes)) {
      f.left -= dt;
      lamps[name]?.toggleAttribute(f.warn ? "data-warn" : "data-on", f.left > 0);
      if (f.left <= 0) delete flashes[name];
    }
    pulser.draw(calm ? 0 : dt);
  }

  return { render, traffic, reset() { pulser.clear(); lastCode = "—"; for (const m of Object.values(pool)) { for (const g of m.values()) g.remove(); m.clear(); } } };
}

function phaseText(s) {
  switch (s.phase) {
    case "post": case "checks": return "creating upload…";
    case "retry": return "503 · retrying";
    case "patching": return "uploading";
    case "offline": return "offline · will resume";
    case "bridge": return "finalizing";
    case "done": return `done · video ${s.video}`;
    case "rejected": return "failed · see error";
    case "abandoned": return "tab closed";
    default: return "";
  }
}

function codeOf(s, last) {
  const fail = s.checks.indexOf("fail");
  if (fail >= 0) return { admin: "403", mime: "400", slot: "503" }[["secret", "token", "admin", "meta", "size", "mime", "slot"][fail]] || last;
  if (s.phase === "checks" || s.phase === "post") return "…";
  if (s.phase === "patching" && s.received === 0) return "201";
  if (s.received > 0 && s.phase !== "done") return "204";
  if (s.phase === "done" || s.phase === "bridge") return "200";
  return last;
}
