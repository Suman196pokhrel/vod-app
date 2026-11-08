// Plate 5 renderer: segments in the rack, the master playlist printing, MinIO's folders,
// the finalize row, and the player (picture sharpness, timeline, ABR knob, buffer plates).
function packageRenderer(stage, D) {
  const P = D.P;
  const dyn = {};
  for (const el of stage.querySelectorAll("[data-dyn]")) dyn[el.dataset.dyn] = el;
  const lamps = {};
  for (const el of stage.querySelectorAll("[data-lamp]")) lamps[el.dataset.lamp] = el;
  const q = (sel) => stage.querySelector(sel);
  const show = (name, on) => dyn[name]?.toggleAttribute("data-hide", !on);
  const text = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const pulser = cablePulser(stage, { speed: 260 });
  const mlines = [...stage.querySelectorAll("[data-mline]")];
  const t = {};
  for (const id of ["masterfile", "level", "est", "played", "buffered", "pixels", "preview", "pvbox", "pvtile", "pvtext", "abr", "bw"]) t[id] = q(`[data-${id}]`);
  const final = Object.fromEntries([...stage.querySelectorAll("[data-final]")].map((el) => [el.dataset.final, el]));
  const cubbies = [...stage.querySelectorAll("[data-cubby]")];
  const flashes = {};
  const flash = (name, len = 0.3) => { flashes[name] = { left: len }; };
  let sawY = 0, putClock = 0, pixLevel = null, scrubT = 0;
  const S = D.screen, W = S.x1 - S.x0 - 12;

  function traffic(ev, calm) {
    const w = ev.what;
    if (w === "print") flash("print");
    if (w === "master") { flash("master", 0.6); if (!calm) pulser.send("storage", 1); }
    if (w === "put" && !calm && (putClock -= 1) <= 0) { putClock = 6; pulser.send("upload", 1); }
    if (w === "fetch") { flash("storage"); if (!calm) { pulser.send("storage", 1); setTimeout(() => pulser.send("viewer", 1), 300); } }
    if (w === "abort") flash("storage", 0.8);
  }

  function pixels(level) {
    if (pixLevel === level?.i) return;
    pixLevel = level?.i;
    if (!level || level.h >= 1080) return t.pixels.replaceChildren();
    const step = Math.max(2.4, (2560 / level.w) * 2.4);
    let d = "";
    for (let x = S.x0 + step; x < S.x1; x += step) d += `M${x.toFixed(1)} ${-S.z1}V${-S.z0}`;
    for (let z = S.z0 + step; z < S.z1; z += step) d += `M${S.x0} ${-z.toFixed(1)}H${S.x1}`;
    t.pixels.innerHTML = `<path class="pixgrid" d="${d}"/>`;
  }

  function render(s, dt, calm) {
    const done = ["finalize", "play", "ended"].includes(s.phase);
    s.rungs.forEach((r, i) => {
      show(`src-${i}`, r.ok);
      show(`cap-${i}`, !r.ok);
      for (let j = 0; j < D.segs; j++) {
        show(`seg-${i}-${j}`, r.ok && j < Math.floor(r.segs) && !(done && s.phase !== "finalize"));
        dyn[`seg-${i}-${j}`]?.classList.toggle("sent", r.uploaded > j + 1);
      }
    });
    const lane = s.phase === "segment" ? D.laneY[s.cur] - D.laneY[0] : 0;
    sawY = calm ? lane : sawY + (lane - sawY) * (1 - Math.exp(-dt / 0.18));
    dyn.saw?.setAttribute("transform", translateAlong(P, [0, sawY, 0]));
    lamps.saw?.toggleAttribute("data-on", s.phase === "segment");
    const lines = masterLines(s.avail);
    mlines.forEach((el, i) => text(el, i < s.lines ? lines[i] : ""));
    text(t.masterfile, ["upload", "finalize", "play", "ended"].includes(s.phase) ? `master.m3u8 · ${s.avail.length} variants` : "master.m3u8 —");
    cubbies.forEach((el, i) => el.setAttribute("width", ((38 * s.rungs[i].uploaded) / (D.segs + 1)).toFixed(2)));
    text(final.status, done ? "processing_status: completed" : `processing_status: ${s.phase === "segment" ? "segmenting" : s.phase === "manifest" ? "creating_manifest" : "uploading_to_storage"}`);
    text(final.manifest, done ? "manifest_url: …/master.m3u8" : "manifest_url: null");
    text(final.qualities, done ? `qualities: ${s.avail.map((r) => r.q.replace("p", "")).join(",")}` : "qualities: []");
    text(final.workdir, done ? "work dir: deleted" : "work dir: /tmp/video_processing/3c6e");

    const p = s.play;
    const playing = s.phase === "play" || s.phase === "ended";
    pixels(playing ? p.level : null);
    text(t.level, playing && p.level ? `${p.level.q} · ${p.level.w}×${p.level.h} · ${(p.level.kbps / 1000).toFixed(1)} Mbps` : s.phase === "ended" ? "ended" : "waiting for manifest_url");
    const now = playing ? PROFILES[s.profile](s.t - s.at) : 0;
    text(t.est, playing ? `estimate ${p.est.toFixed(1)} Mbps · buffer ${Math.round(p.buffered)} s` : "");
    t.played.setAttribute("width", ((W * p.head) / 120).toFixed(2));
    t.buffered.setAttribute("width", ((W * Math.min(120, p.head + p.buffered)) / 120).toFixed(2));
    for (let b = 0; b < 10; b++) for (let i = 0; i < 7; i++) show(`buf-${b}-${i}`, playing && p.queue[b] === i);
    const pos = playing && p.level ? 6 - p.level.i : 0;
    const a = -2.2 + pos * (4.4 / 6);
    t.abr?.setAttribute("d", lineOnTop([D.abr.x, D.abr.y], [D.abr.x + Math.sin(a) * 7, D.abr.y - Math.cos(a) * 7], D.abr.z, P));
    const b = -2.2 + 4.4 * Math.min(1, now / 16);
    t.bw?.setAttribute("d", lineOnTop([D.bw.x, D.bw.y], [D.bw.x + Math.sin(b) * 11, D.bw.y - Math.cos(b) * 11], D.bw.z, P));

    const scrubbing = s.scrub && playing;
    t.preview.style.display = scrubbing ? "" : "none";
    if (scrubbing) {
      scrubT += dt;
      const sec = 60 + 55 * Math.sin(scrubT * 0.5);
      const c = cueAt(sec);
      const x = S.x0 + 6 + (W * sec) / 120;
      t.pvbox.setAttribute("x", (x - 26).toFixed(1));
      t.pvtile.setAttribute("x", (x - 23).toFixed(1));
      text(t.pvtext, `sprite_00${c.sheet}.jpg#xywh=${c.x},${c.y},160,90`);
      t.pvtext.setAttribute("x", (x - 24).toFixed(1));
      if (Math.floor(scrubT * 2) !== Math.floor((scrubT - dt) * 2)) flash("thumbs", 0.4);
    }

    for (const [name, f] of Object.entries(flashes)) {
      f.left -= dt;
      lamps[name]?.toggleAttribute("data-on", f.left > 0);
      if (f.left <= 0) delete flashes[name];
    }
    pulser.draw(calm ? 0 : dt);
  }

  return { render, traffic, reset() { pulser.clear(); pixLevel = -1; scrubT = 0; } };
}
