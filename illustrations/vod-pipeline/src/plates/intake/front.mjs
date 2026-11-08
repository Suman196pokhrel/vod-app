// Plate 2 front row: the admin's desk with the file as a loaf, the network belt and its
// shutter, Caddy's arch, tusd, the chute, and MinIO's multipart bin.
import { k, A } from "../../scene.mjs";
import * as L from "./layout.mjs";

const { BELT_Y, BELT_D, BELT_Z, LANE_C, SLICE } = L;

export function desk(sc, widths) {
  const { box, P } = sc;
  const D = L.DESK;
  box("desk.top", "admin", D, 0, 6, { tone: "lo", bevel: 0.6, seam: 3, over: sc.cornerScrews(D, 6, 4, 1) + sc.badge(D.x + 8, D.y + D.d - 14, 6, 1) });
  // Uppy's progress screen.
  const scr = { x: D.x + 10, y: D.y + 4, w: 96, d: 7, r: 1.5 };
  box("desk.screenfoot", "admin", { x: scr.x + 34, y: scr.y - 2, w: 28, d: 12, r: 2 }, 6, 2.4, { tone: "mid" });
  const fy = scr.y + scr.d, z0 = 12, z1 = 46;
  const ui = `<rect class="bar-track" x="${scr.x + 8}" y="${-24}" width="${scr.w - 16}" height="3" rx="1.2"/><rect class="bar-fill" data-upbar x="${scr.x + 8}" y="${-24}" width="0" height="3" rx="1.2"/><text class="face-text big" data-uppct x="${scr.x + 8}" y="${-30}">0%</text><text class="face-text" data-upphase x="${scr.x + 8}" y="${-38}">ready</text><text class="face-text dim" x="${scr.x + 8}" y="${-17}">uppy · tus · 50 MiB chunks</text>`;
  box("desk.screen", "admin", scr, z0, z1 - z0, { tone: "mid", steps: 3, bevel: 0.5, over: sc.onFace(fy, sc.faceWindow(scr.x + 3, scr.x + scr.w - 3, z0 + 3, z1 - 3, "uppy", ui)) });
  box("desk.neck", "admin", { x: scr.x + 45, y: scr.y + 1, w: 6, d: 4, r: 1 }, 8.4, z0 - 8.4, { tone: "mid", steps: 2 });
  // The tray the loaf rides on, with a ruler of Upload-Offset (one tick per chunk).
  const tray = { x: D.x + 8, y: BELT_Y, w: L.BLADE_X - D.x - 10, d: BELT_D, r: 1.5 };
  box("desk.tray", "admin", tray, 6, BELT_Z - 6, { tone: "mid", steps: 2, bevel: 0.4, over: sc.L(k.lineOnTop([tray.x, LANE_C], [tray.x + tray.w, LANE_C], BELT_Z, P), { tone: "faint" }) });
  const ruler = { x: tray.x, y: BELT_Y + BELT_D + 3, w: tray.w, d: 6, r: 1 };
  const t = k.topTicks(ruler.x + 2, L.BLADE_X - 2, SLICE.pitch, 4, ruler.y, 6.6, [2, 3.6], P);
  box("desk.ruler", "admin", ruler, 6, 0.6, { tone: "lo", steps: 2, crease: "none", bevel: 0, over: sc.L(t.minor, { tone: "lo" }) + sc.L(t.major, { tone: "mid" }) });
  // The loaf: one slice per chunk, the last as thin as its bytes. Slice 0 is cut first.
  let x = L.BLADE_X - 3;
  widths.forEach((w, j) => {
    x -= SLICE.pitch;
    const plan = { x: x + (SLICE.w - w), y: LANE_C - SLICE.d / 2, w, d: SLICE.d, r: 0.8 };
    box("desk.slice", "admin", plan, BELT_Z, SLICE.h, { tone: "hi", steps: 2, bevel: 0.3, dyn: `slice-${j}`, cls: "slice" });
  });
  box("desk.pusher", "admin", { x: x - 4, y: BELT_Y + 1, w: 3, d: BELT_D - 2, r: 0.6 }, BELT_Z, 16, { tone: "mid", steps: 2, bevel: 0.3, dyn: "pusher" });
  // Uppy's guillotine: one cut per 50 MiB chunk.
  const gx = L.BLADE_X;
  for (const y of [BELT_Y - 5, BELT_Y + BELT_D + 1]) box("desk.bladepost", "admin", { x: gx - 1, y, w: 4, d: 4, r: 0.6 }, 6, 36, { tone: "mid", steps: 2 });
  box("desk.bladebar", "admin", { x: gx - 2, y: BELT_Y - 5, w: 6, d: BELT_D + 10, r: 1 }, 42, 3, { tone: "mid", steps: 2, bevel: 0.3, over: sc.screws([[gx + 1, BELT_Y - 3], [gx + 1, BELT_Y + BELT_D + 3]], 45, 0.6) });
  box("desk.blade", "admin", { x: gx, y: BELT_Y - 1, w: 2, d: BELT_D + 2, r: 0.4 }, 28, 6, { tone: "hi", steps: 1, dyn: "blade" });
}

export function network(sc) {
  const { box, P } = sc;
  const rollers = [];
  for (let x = L.BELT.x + 6; x < L.BELT.x + L.BELT.w - 2; x += 8) rollers.push(k.lineOnTop([x, BELT_Y], [x, BELT_Y + BELT_D], BELT_Z, P));
  box("net.belt", "net", L.BELT, 0, BELT_Z, { tone: "mid", steps: 2, bevel: 0.4, seam: 4, over: sc.L(rollers.join(""), { tone: "faint" }) });
  // The flight layer: slices in transit, drawn inside a box that bounds where they can be.
  sc.put("net.flight", "net", [L.BELT.x + 80, LANE_C, BELT_Z + 7], `<g data-flight="belt"></g>`, [A.slab({ x: L.BLADE_X + 3, y: LANE_C - SLICE.d / 2, w: L.TUSD.x - L.BLADE_X - 3, d: SLICE.d, r: 0.5 }, BELT_Z, SLICE.h, { name: "net.flight" }, 1)]);
  const gx = L.GATE_X;
  for (const y of [BELT_Y - 6, BELT_Y + BELT_D + 2]) box("net.gatepost", "net", { x: gx - 1, y, w: 5, d: 4, r: 0.6 }, 0, 50, { tone: "mid", steps: 2, bevel: 0.3 });
  box("net.gatebar", "net", { x: gx - 2, y: BELT_Y - 6, w: 7, d: BELT_D + 12, r: 1 }, 50, 3, { tone: "mid", steps: 2, bevel: 0.3, over: sc.lamp(gx + 1.5, LANE_C, 53, "link", 2) });
  box("net.shutter", "net", { x: gx, y: BELT_Y - 2, w: 3, d: BELT_D + 4, r: 0.5 }, 32, 16, { tone: "hi", steps: 1, bevel: 0.2, dyn: "shutter" });
}

export function caddyArch(sc) {
  const { box } = sc;
  const A_ = L.ARCH;
  for (const [y0, y1] of [A_.back, A_.front]) {
    box("caddy.plinth", "caddy", { x: A_.x0 - 3, y: y0 - 3, w: A_.x1 - A_.x0 + 6, d: y1 - y0 + 6, r: 1.5 }, 0, 4, { tone: "lo", steps: 2, bevel: 0.4 });
    box("caddy.pillar", "caddy", { x: A_.x0, y: y0, w: A_.x1 - A_.x0, d: y1 - y0, r: 1.5 }, 4, A_.z - 4, { tone: "mid", steps: 2, bevel: 0.5, seam: 20 });
  }
  const lintel = { x: A_.x0 - 4, y: A_.back[0] - 2, w: A_.x1 - A_.x0 + 8, d: A_.front[1] - A_.back[0] + 4, r: 2 };
  const top = A_.z + A_.lintel;
  const lamps = ["files", "status", "internal", "api"].map((r, i) => sc.lamp(lintel.x + lintel.w / 2, lintel.y + 14 + i * 13, top, `route-${r}`, 2)).join("");
  const blank = { x: lintel.x + 7, y: lintel.y + 14 + 2 * 13 - 4.5, w: lintel.w - 14, d: 9, r: 1.5 };
  box("caddy.lintel", "caddy", lintel, A_.z, A_.lintel, { tone: "mid", steps: 3, bevel: 0.6, seam: A_.z + 4, over: lamps + sc.badge(lintel.x + 5, lintel.y + lintel.d - 12, top, 3) });
  box("caddy.blank", "caddy", blank, top, 1.6, { tone: "hi", steps: 2, bevel: 0.3, over: sc.screws([[blank.x + 2.5, blank.y + 4.5], [blank.x + blank.w - 2.5, blank.y + 4.5]], top + 1.6, 0.5) });
}

export function tusd(sc) {
  const { box, P } = sc;
  const T = L.TUSD, fy = T.y + T.d, top = L.TUSD_H;
  const vents = Array.from({ length: 6 }, (_, i) => k.planOutline({ x: T.x + 40 + i * 11, y: T.y + 14, w: 5, d: 40, r: 2.4 }, top, P, 3)).join("");
  const disp = `<text class="face-text dim" x="${T.x + 14}" y="${-49}">UPLOAD-OFFSET</text><text class="face-text huge" data-offset x="${T.x + 14}" y="${-37}">0 MiB</text><text class="face-text dim" data-ofsize x="${T.x + 14}" y="${-30}">of 420 MiB</text><text class="face-text dim" x="${T.x + 14}" y="${-21.5}">PART BUFFER · 50 MB</text><rect class="bar-track" x="${T.x + 14}" y="${-19}" width="76" height="3" rx="1"/><rect class="bar-fill" data-buffer x="${T.x + 14}" y="${-19}" width="0" height="3" rx="1"/>`;
  const exit = "M" + [[T.x + T.w, L.CHUTE.y, L.CHUTE_Z], [T.x + T.w, L.CHUTE.y + L.CHUTE.d, L.CHUTE_Z], [T.x + T.w, L.CHUTE.y + L.CHUTE.d, L.CHUTE_Z + 16], [T.x + T.w, L.CHUTE.y, L.CHUTE_Z + 16]].map((p) => k.iso(p, P).join(" ")).join("L") + "Z";
  box("tusd.body", "tusd", T, 0, top, { tone: "mid", steps: 4, bevel: 0.8, seam: 8, over: sc.onFace(fy, sc.faceWindow(T.x + 10, T.x + 100, 14, 54, "offset", disp)) + sc.L(vents + exit, { tone: "lo" }) + sc.lamp(T.x + 116, T.y + 30, top, "tusd", 2.2) + sc.lamp(T.x + 116, T.y + 44, top, "part", 2.2) + sc.badge(T.x + 8, T.y + T.d - 16, top, 4) + sc.screws(k.corners(T, 5), top, 1) });
  box("tusd.chute", "tusd", L.CHUTE, L.CHUTE_Z - 4, 4, { tone: "mid", steps: 2, bevel: 0.3, over: sc.L(Array.from({ length: 9 }, (_, i) => k.lineOnTop([L.CHUTE.x + 4 + i * 9, L.CHUTE.y], [L.CHUTE.x + 4 + i * 9, L.CHUTE.y + L.CHUTE.d], L.CHUTE_Z, P)).join(""), { tone: "faint" }) });
  sc.put("tusd.flight", "minio", [L.CHUTE.x + 40, LANE_C, L.CHUTE_Z + 7], `<g data-flight="chute"></g>`, [A.slab({ x: L.CHUTE.x, y: LANE_C - 8, w: L.PART_X0 - 4 - L.CHUTE.x, d: 16, r: 0.5 }, L.CHUTE_Z, 15, { name: "tusd.flight" }, 1)]);
}

export function minio(sc, parts) {
  const { box, P } = sc;
  const M = L.MINIO, top = L.MINIO_H, fy = M.y + M.d;
  const drawers = sc.slotsY(fy, [[M.x + 10, M.x + 74], [M.x + 82, M.x + 146], [M.x + 154, M.x + 220]], 6, 24) + sc.slotsY(fy, [[M.x + 34, M.x + 50], [M.x + 106, M.x + 122], [M.x + 178, M.x + 196]], 18, 21);
  const bin = { x: L.PART_X0 - 8, y: L.LANE_C - 13, w: parts * L.PART_PITCH + 12, d: 26, r: 2 };
  box("minio.body", "minio", M, 0, top, { tone: "mid", steps: 4, bevel: 0.8, seam: 10, over: drawers + sc.L(k.planOutline(bin, top, P, 3), { tone: "lo" }) + sc.lamp(M.x + 214, M.y + 16, top, "bucket", 2.2) + sc.badge(M.x + 196, M.y + M.d - 16, top, 5) + sc.screws(k.corners(M, 5), top, 1) });
  for (let j = 0; j < parts; j++) {
    const plan = { x: L.PART_X0 + (parts - 1 - j) * L.PART_PITCH, y: LANE_C - 8, w: 4, d: 16, r: 0.6 };
    box("minio.part", "minio", plan, top, 15, { tone: "hi", steps: 1, bevel: 0.2, dyn: `part-${j}`, cls: "part", owner: "minio.object" });
  }
  const obj = { x: L.PART_X0 - 1, y: LANE_C - 9, w: (parts - 1) * L.PART_PITCH + 6, d: 18, r: 1 };
  box("minio.object", "minio", obj, top, 16, { tone: "hi", steps: 2, bevel: 0.4, lit: true, dyn: "object", owner: "minio.object" });
  const card = { x: M.x + 178, y: LANE_C - 6, w: 2, d: 12, r: 0.4 };
  box("minio.info", "minio", card, top, 10, { tone: "hi", steps: 1, dyn: "info" });
}
