// Plate 4 machines: the probe, the storyboard printer, the ladder press, and the back row
// (MinIO, the ffmpeg command panel, the Redis chord counter) with two cables.
import { k } from "../../scene.mjs";
import { cable } from "../../cable.mjs";
import { RUNGS } from "../../transcode-model.mjs";
import * as L from "./layout.mjs";

const FY = L.FACE_Y, TOP = L.BACK_H;

export function probe(sc) {
  const { box, cyl, P } = sc;
  const B = L.PROBE, fy = B.y + B.d, c = L.CAN;
  const disp = `<text class="face-text dim" x="${B.x + 12}" y="-15">FFPROBE</text><text class="face-text" data-probe x="${B.x + 12}" y="-8">—</text>`;
  box("probe.base", "probe", B, 0, L.PROBE_H, { tone: "mid", steps: 4, bevel: 0.7, seam: 4, over: sc.onFace(fy, sc.faceWindow(B.x + 8, B.x + B.w - 8, 4, 19, "probe", disp)) + sc.badge(B.x + 8, B.y + 6, L.PROBE_H, 2) + sc.lamp(B.x + B.w - 12, B.y + 12, L.PROBE_H, "download", 2) });
  cyl("probe.pad", "probe", c.x, c.y, 15, L.PROBE_H, 3, { tone: "lo", steps: 44, bevel: 0.4, over: sc.L(k.ring(c.x, c.y, 12.5, L.PROBE_H + 3, P, 40), { tone: "faint" }) });
  cyl("probe.can", "probe", c.x, c.y, c.r, L.PROBE_H + 3, 20, { tone: "hi", steps: 36, bevel: 0.5, dyn: "srccan", inner: sc.L(k.sideArc(c.x, c.y, c.r, L.PROBE_H + 10, P, 24) + k.sideArc(c.x, c.y, c.r, L.PROBE_H + 17, P, 24), { tone: "faint" }), over: sc.L(k.ring(c.x, c.y, 6, L.PROBE_H + 23, P, 28), { tone: "lo" }) });
  box("probe.column", "probe", { x: c.x - 6, y: B.y + 4, w: 12, d: 10, r: 1.5 }, L.PROBE_H, 62, { tone: "mid", steps: 2, bevel: 0.4, seam: 50 });
  box("probe.arm", "probe", { x: c.x - 6, y: B.y + 4, w: 12, d: c.y - B.y + 2, r: 1.5 }, L.PROBE_H + 62, 6, { tone: "mid", steps: 2, bevel: 0.4, over: sc.screws([[c.x, B.y + 9]], L.PROBE_H + 68, 0.7) });
  const head = sc.S(k.cylinder(c.x, c.y, 5, 66, 18, P, 24, 0.3), { tone: "mid" }) + sc.S(k.cylinder(c.x, c.y, 3, 60, 6, P, 18), { tone: "hi" }) + sc.L(k.knurl(c.x, c.y, 5, 70, 80, 20, P) + k.sideArc(c.x, c.y, 5, 70, P, 20) + k.sideArc(c.x, c.y, 5, 80, P, 20), { tone: "lo" });
  sc.put("probe.head", "probe", [c.x, c.y, 72], `<g data-dyn="probehead">${head}</g>`, [sc.shapes.cyl(c.x, c.y, 5, 60, 24, "probe.head")]);
}

export function printer(sc) {
  const { box, P } = sc;
  const B = L.PRINTER, S_ = L.SHEET, fy = B.y + B.d;
  const disp = `<text class="face-text dim" x="${B.x + 12}" y="-11">storyboard.vtt</text><text class="face-text" data-cue x="${B.x + 12}" y="-5.5">—</text>`;
  box("printer.base", "printer", B, 0, L.PRINTER_H, { tone: "mid", steps: 4, bevel: 0.7, seam: 3, over: sc.onFace(fy, sc.faceWindow(B.x + 8, B.x + B.w - 8, 3, 14, "vtt", disp)) + sc.badge(B.x + B.w - 22, B.y + B.d - 12, L.PRINTER_H, 3) + sc.lamp(B.x + B.w - 14, B.y + 14, L.PRINTER_H, "fuse", 2.2) + sc.lamp(B.x + B.w - 14, B.y + 28, L.PRINTER_H, "thumbs", 2.2) });
  const tiles = [];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const x = S_.x + 3 + c * 7, y = S_.y + 3 + r * 6;
    tiles.push(`<path class="tile" data-tile="${r * 10 + c}" d="${k.planOutline({ x, y, w: 6, d: 5, r: 0.6 }, L.PRINTER_H + 1.2, P, 2)}Z"/>`);
  }
  box("printer.sheet", "printer", { x: S_.x, y: S_.y, w: S_.w, d: S_.d, r: 1 }, L.PRINTER_H, 1.2, { tone: "hi", steps: 2, crease: "none", over: tiles.join("") });
  box("printer.counter", "printer", { x: S_.x + S_.w + 6, y: S_.y + 34, w: 26, d: 28, r: 2 }, L.PRINTER_H, 6, { tone: "mid", steps: 2, bevel: 0.4, over: `<g transform="${k.topMatrix([S_.x + S_.w + 19, S_.y + 48], L.PRINTER_H + 6, P, "y")}"><text class="chit-text big-chit" data-sheets x="0" y="1.5" text-anchor="middle">0</text></g>` });
}

export function ladder(sc) {
  const { box, cyl, P } = sc;
  const B = L.BED, fy = B.y + B.d;
  const bars = L.STATION_X.map((x, i) => `<rect class="bar-track" x="${x - 22}" y="-9" width="44" height="2.6" rx="1"/><rect class="bar-fill" data-rp="${i}" x="${x - 22}" y="-9" width="0" height="2.6" rx="1"/><text class="face-text dim" x="${x - 22}" y="-3.6">${RUNGS[i].q} · ${RUNGS[i].kbps}k</text>`).join("");
  box("ladder.bed", "ladder", B, 0, L.BED_H, { tone: "mid", steps: 4, bevel: 0.8, seam: 4, over: sc.onFace(fy, sc.faceWindow(B.x + 8, B.x + B.w - 8, 1.6, 12.6, "rungs", bars)) + sc.badge(B.x + 8, B.y + 8, L.BED_H, 4) });
  L.STATION_X.forEach((x, i) => {
    const d = L.DIE[i], z = L.BED_H;
    const open = { x: x - d.w / 2, y: L.DIE_Y - d.d / 2, w: d.w, d: d.d, r: 0.6 };
    const die = k.insetPlan(open, -5);
    box("ladder.die", "ladder", die, z, 3, { tone: "lo", steps: 2, bevel: 0.4, over: sc.L(k.planOutline(open, z + 3, P, 2), { tone: "mid" }) + sc.screws([[die.x + 2.5, die.y + 2.5], [die.x + die.w - 2.5, die.y + die.d - 2.5]], z + 3, 0.5) });
    box("ladder.skip", "ladder", k.insetPlan(die, -1), z + 3, 1.6, { tone: "hi", steps: 2, bevel: 0.3, dyn: `skip-${i}`, owner: `die-${i}`, over: sc.L(k.planOutline(k.insetPlan(die, 1.6), z + 4.6, P, 2), { tone: "lo" }) });
    box("ladder.column", "ladder", { x: x - 4, y: B.y + 4, w: 8, d: 8, r: 1 }, z, 70, { tone: "mid", steps: 2, bevel: 0.3 });
    box("ladder.arm", "ladder", { x: x - 5, y: B.y + 3, w: 10, d: L.DIE_Y - B.y + 3, r: 1.5 }, z + 70, 6, { tone: "mid", steps: 2, bevel: 0.4, over: sc.lamp(x, B.y + 8, z + 76, `press-${i}`, 1.8) });
    const head = sc.S(k.cylinder(x, L.DIE_Y, 6, z + 50, 20, P, 26, 0.3), { tone: "mid" }) + sc.S(k.cylinder(x, L.DIE_Y, 3.6, z + 44, 6, P, 20), { tone: "hi" }) + sc.L(k.knurl(x, L.DIE_Y, 6, z + 58, z + 68, 22, P) + k.sideArc(x, L.DIE_Y, 6, z + 58, P, 22) + k.sideArc(x, L.DIE_Y, 6, z + 68, P, 22), { tone: "lo" });
    sc.put("ladder.head", "ladder", [x, L.DIE_Y, z + 58], `<g data-dyn="head-${i}">${head}</g>`, [sc.shapes.cyl(x, L.DIE_Y, 6, z + 44, 26, "ladder.head")]);
    const blk = { x: x - d.w / 2, y: L.OUT_Y - d.d / 2, w: d.w, d: d.d, r: 0.5 };
    const h = L.BLOCK_H[i];
    const pads = `<path class="padbar" data-padbar="${i}" d=""/>`;
    box("ladder.tray", "ladder", k.insetPlan(blk, -3), z, 1, { tone: "lo", steps: 2, crease: "none", owner: `out-${i}` });
    box("ladder.out", "ladder", blk, z + 1, h, { tone: "hi", steps: 1, bevel: 0.3, dyn: `out-${i}`, owner: `out-${i}`, cls: "rung", over: pads });
  });
}

export function backRow(sc) {
  const cab = (id, plan, face) => sc.box(`${id}.cabinet`, id, plan, 0, TOP, { tone: "mid", steps: 3, bevel: 0.8, seam: 12, over: face + sc.screws([[plan.x + 4, plan.y + 4], [plan.x + plan.w - 4, plan.y + 4]], TOP, 0.9) + sc.slotsX(plan.x + plan.w, [[plan.y + 8, plan.y + plan.d - 8]], 20, 30) });
  const M = L.MINIO;
  cab("minio", M, sc.slotsY(FY, [[M.x + 10, M.x + M.w - 10]], 52, 78) + sc.slotsY(FY, [[M.x + 10, M.x + M.w - 10]], 20, 46) + sc.faceLamp(M.x + M.w - 20, FY, 72, "videos", 2.4) + sc.faceLamp(M.x + M.w - 20, FY, 40, "thumbs-in", 2.4) + sc.badge(M.x + 8, M.y + 6, TOP, 1));
  const F = L.FFMPEG;
  const lines = [0, 1, 2].map((i) => `<text class="face-text cmd" data-cmd="${i}" x="${F.x + 14}" y="${-(62 - i * 14)}"></text>`).join("");
  cab("ffmpeg", F, sc.onFace(FY, sc.faceWindow(F.x + 8, F.x + F.w - 8, 16, 84, "cmd", `<text class="face-text dim" x="${F.x + 14}" y="-76">RUNNING NOW · transcode.py</text>${lines}`)) + sc.badge(F.x + 8, F.y + 6, TOP, 5));
  const R = L.REDIS;
  const lamps = RUNGS.map((r, i) => sc.faceLamp(R.x + 22 + i * 24, FY, 76, `chord-${i}`, 2.6)).join("") + sc.slotsY(FY, RUNGS.map((_, i) => [R.x + 15 + i * 24, R.x + 29 + i * 24]), 67, 70);
  cab("redis", R, lamps + sc.onFace(FY, sc.faceWindow(R.x + 12, R.x + 130, 18, 58, "chord", `<text class="face-text dim" x="${R.x + 18}" y="-50">CHORD · tasks left</text><text class="face-text huge" data-left x="${R.x + 18}" y="-36">7</text><text class="face-text dim" x="${R.x + 18}" y="-27">then on_transcode_complete</text>`)) + sc.faceLamp(R.x + 160, FY, 38, "callback", 3.2) + sc.badge(R.x + 8, R.y + 6, TOP, 6));
}

export function cables(sc) {
  const a = sc.boss("minio.port", "minio", [60, FY, 40], [0, 1, 0], 3, 2.4);
  const b = sc.boss("probe.port", "probe", [60, L.PROBE.y, 12], [0, -1, 0], 3, 2.4);
  cable(sc, "download", "minio", [a, [60, 112, 40], [60, 112, 12], b], 1.7, { pulse: "download", bend: 9 });
  const c = sc.boss("printer.port", "printer", [236, L.PRINTER.y, 10], [0, -1, 0], 3, 2.2);
  const d = sc.boss("minio.port2", "minio", [118, FY, 30], [0, 1, 0], 3, 2.2);
  cable(sc, "thumbs", "printer", [c, [236, 96, 10], [118, 96, 10], [118, 96, 30], d], 1.5, { pulse: "thumbs", bend: 8 });
}
