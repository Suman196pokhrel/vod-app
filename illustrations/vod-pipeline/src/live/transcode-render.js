// Plate 4 renderer: download and probe, storyboard tiles and cues, the seven presses, their
// ffmpeg commands, the rendition blocks (with letterbox or pillarbox bars) and the chord count.
function transcodeRenderer(stage, D) {
  const P = D.P;
  const dyn = {};
  for (const el of stage.querySelectorAll("[data-dyn]")) dyn[el.dataset.dyn] = el;
  const lamps = {};
  for (const el of stage.querySelectorAll("[data-lamp]")) lamps[el.dataset.lamp] = el;
  const q = (sel) => stage.querySelector(sel);
  const show = (name, on) => dyn[name]?.toggleAttribute("data-hide", !on);
  const text = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
  const pulser = cablePulser(stage, { speed: 190 });
  const tiles = [...stage.querySelectorAll("[data-tile]")];
  const cmds = [...stage.querySelectorAll("[data-cmd]")];
  const t = {};
  for (const id of ["probe", "cue", "sheets", "left"]) t[id] = q(`[data-${id}]`);
  const flashes = {};
  const flash = (name, warn = false, len = 0.35) => { flashes[name] = { left: len, warn }; };
  const heads = new Array(7).fill(0);
  let probeHead = 0;
  const ts = (sec) => `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${(sec % 60).toFixed(3).padStart(6, "0")}`;
  const poly = (pts) => "M" + pts.map((p) => iso(p, P).map((v) => v.toFixed(2)).join(" ")).join("L") + "Z";

  function padBars(i, r) {
    const d = D.die[i], x0 = D.stationX[i] - d.w / 2, x1 = x0 + d.w, y0 = D.outY - d.d / 2, y1 = y0 + d.d, z = D.bedH + 1 + D.blockH[i];
    const fx = r.fit.padX / r.w, fy = r.fit.padY / r.h;
    if (fx > 0.01) return poly([[x0, y0, z], [x0 + d.w * fx, y0, z], [x0 + d.w * fx, y1, z], [x0, y1, z]]) + poly([[x1 - d.w * fx, y0, z], [x1, y0, z], [x1, y1, z], [x1 - d.w * fx, y1, z]]);
    if (fy > 0.01) return poly([[x0, y0, z], [x1, y0, z], [x1, y0 + d.d * fy, z], [x0, y0 + d.d * fy, z]]) + poly([[x0, y1 - d.d * fy, z], [x1, y1 - d.d * fy, z], [x1, y1, z], [x0, y1, z]]);
    return "";
  }

  function traffic(ev, calm) {
    const w = ev.what;
    if (w === "download") { flash("download"); flash("videos"); if (!calm) pulser.send("download", 1); }
    if (w === "thumbs") { flash("thumbs"); flash("thumbs-in"); if (!calm) pulser.send("thumbs", 1); }
    if (w === "callback") flash("callback", false, 3);
  }

  function render(s, dt, calm) {
    const downloaded = s.got >= s.src.mb;
    show("srccan", downloaded);
    probeHead = calm ? +(s.phase === "probe") : probeHead + (+(s.phase === "probe") - probeHead) * (1 - Math.exp(-dt / 0.15));
    dyn.probehead?.setAttribute("transform", translateAlong(P, [0, 0, -14 * probeHead]));
    text(t.probe, !downloaded ? `downloading ${Math.round(s.got)} / ${s.src.mb} MB` : s.phase === "probe" ? "probing…" : `${s.src.w}×${s.src.h} · ${s.src.duration} s`);

    const n = Math.floor(s.tiles);
    const sheet = Math.min(Math.floor(Math.max(0, n - 1) / 100), s.sheets - 1);
    tiles.forEach((el, i) => el.toggleAttribute("data-on", sheet * 100 + i < n));
    text(t.sheets, String(n ? Math.ceil(n / 100) : 0));
    if (n) {
      const c = n - 1, pos = c % 100;
      text(t.cue, `${ts(c * 5)} --> ${ts(Math.min((c + 1) * 5, s.src.duration))}  sprite_${String(Math.floor(c / 100)).padStart(3, "0")}.jpg#xywh=${(pos % 10) * s.tile.w},${Math.floor(pos / 10) * s.tile.h},${s.tile.w},${s.tile.h}`);
    } else text(t.cue, s.sbFailed ? "failed · skipped, chain continues" : "—");
    lamps.fuse?.toggleAttribute("data-on", !s.sbFailed && s.phase !== "download");
    lamps.fuse?.toggleAttribute("data-warn", !!s.sbFailed);

    s.rungs.forEach((r, i) => {
      const run = s.running.find((j) => j.i === i);
      show(`skip-${i}`, r.state === "skipped" || r.state === "skipping");
      show(`out-${i}`, r.state === "done");
      const pad = stage.querySelector(`[data-padbar="${i}"]`);
      if (r.state === "done" && pad && !pad.dataset.set) { pad.setAttribute("d", padBars(i, r)); pad.dataset.set = "1"; }
      heads[i] = calm ? (run ? 1 : 0) : heads[i] + ((run ? 1 : 0) - heads[i]) * (1 - Math.exp(-dt / 0.15));
      dyn[`head-${i}`]?.setAttribute("transform", translateAlong(P, [0, 0, -24 * heads[i] * (run?.skip ? 0.3 : 1)]));
      lamps[`press-${i}`]?.toggleAttribute("data-on", !!run);
      q(`[data-rp="${i}"]`)?.setAttribute("width", (44 * (r.state === "done" || r.state === "skipped" ? 1 : r.p)).toFixed(2));
      lamps[`chord-${i}`]?.toggleAttribute("data-on", r.state === "done" || r.state === "skipped");
    });
    cmds.forEach((el, k) => {
      const job = s.running[k];
      if (!job) return text(el, "");
      const r = s.rungs[job.i];
      text(el, job.skip ? `${r.q}: target ${r.h}p > source ${s.src.h}p → return { skipped: True }` : `ffmpeg -i raw.mp4 -c:v libx264 -threads 2 -preset medium -crf 23 -vf scale=w=${r.w}:h=${r.h}:force_original_aspect_ratio=decrease,pad=w=${r.w}:h=${r.h}:x=(ow-iw)/2:y=(oh-ih)/2 -b:v ${r.kbps}k -c:a aac -b:a 128k ${r.q}.mp4`);
    });
    text(t.left, String(s.left));
    lamps.callback?.toggleAttribute("data-on", s.phase === "done");

    for (const [name, f] of Object.entries(flashes)) {
      f.left -= dt;
      lamps[name]?.toggleAttribute(f.warn ? "data-warn" : "data-on", f.left > 0);
      if (f.left <= 0) delete flashes[name];
    }
    pulser.draw(calm ? 0 : dt);
  }

  return { render, traffic, reset() { pulser.clear(); for (const el of stage.querySelectorAll("[data-padbar]")) { el.setAttribute("d", ""); delete el.dataset.set; } } };
}
