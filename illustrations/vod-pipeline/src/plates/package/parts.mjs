// Plate 5 machines: the segment rack and its saw, the manifest printer, Caddy's gatehouse,
// the player desk, and the back row (MinIO vod-processed, PostgreSQL) with three cables.
import { k, A } from "../../scene.mjs";
import { cable } from "../../cable.mjs";
import { RUNGS } from "../../transcode-model.mjs";
import { BLOCK_H } from "../transcode/layout.mjs";
import { SEGS } from "../../package-model.mjs";
import * as L from "./layout.mjs";

const FY = L.FACE_Y, TOP = L.BACK_H;

export function rack(sc) {
  const { box, P } = sc;
  const Rk = L.RACK;
  box("rack.base", "rack", Rk, 0, L.RACK_H, { tone: "mid", steps: 4, bevel: 0.7, seam: 3, over: sc.badge(Rk.x + Rk.w - 20, Rk.y + Rk.d - 11, L.RACK_H, 1) });
  L.LANE_Y.forEach((y, i) => {
    const z = L.RACK_H;
    box("rack.lane", "rack", { x: Rk.x + 10, y: y - 5, w: Rk.w - 18, d: 10, r: 1 }, z, 1, { tone: "lo", steps: 2, crease: "none", over: sc.L(k.planOutline({ x: Rk.x + 64, y: y - 0.7, w: Rk.w - 80, d: 1.4, r: 0.7 }, z + 1, P, 2), { tone: "faint" }) });
    const h = BLOCK_H[i];
    box("rack.src", "rack", { x: L.SRC_X - 6, y: y - 4.5, w: 14, d: 9, r: 0.6 }, z + 1, h * 0.8, { tone: "hi", steps: 1, bevel: 0.3, dyn: `src-${i}`, owner: `lane-${i}` });
    box("rack.cap", "rack", { x: L.SRC_X - 7, y: y - 5, w: 16, d: 10, r: 1 }, z + 1, 1.4, { tone: "lo", steps: 2, dyn: `cap-${i}`, owner: `lane-${i}`, over: sc.L(k.planOutline({ x: L.SRC_X - 5, y: y - 3, w: 12, d: 6, r: 0.8 }, z + 2.4, P, 2), { tone: "lo" }) });
    for (let j = 0; j < SEGS; j++) box("rack.seg", "rack", { x: L.SLOT_X0 + j * L.SLOT_PITCH, y: y - 4, w: 3, d: 8, r: 0.4 }, z + 1, Math.max(2, h * 0.55), { tone: "hi", steps: 1, dyn: `seg-${i}-${j}`, cls: "seg" });
  });
  for (const y of [Rk.y + 2, Rk.y + Rk.d - 8]) box("rack.sawpost", "rack", { x: L.SAW_X - 3, y, w: 6, d: 6, r: 1 }, L.RACK_H, 44, { tone: "mid", steps: 2, bevel: 0.3 });
  box("rack.sawbeam", "rack", { x: L.SAW_X - 4, y: Rk.y + 2, w: 8, d: Rk.d - 4, r: 1 }, L.RACK_H + 44, 4, { tone: "mid", steps: 2, bevel: 0.4, over: sc.screws([[L.SAW_X, Rk.y + 5], [L.SAW_X, Rk.y + Rk.d - 5]], L.RACK_H + 48, 0.6) });
  const y0 = L.LANE_Y[0];
  const saw = sc.S(k.slabOf({ x: L.SAW_X - 5, y: y0 - 5, w: 10, d: 10, r: 1 }, 42, 10, P, 2, 0.3), { tone: "mid" }) + sc.S(k.slabOf({ x: L.SAW_X - 1, y: y0 - 4.5, w: 2, d: 9, r: 0.3 }, 28, 14, P, 1), { tone: "hi" }) + sc.lamp(L.SAW_X, y0, 52, "saw", 1.4);
  sc.put("rack.saw", "rack", [L.SAW_X, y0, 40], `<g data-dyn="saw">${saw}</g>`, [A.slab({ x: L.SAW_X - 5, y: L.LANE_Y[0] - 5, w: 10, d: L.LANE_Y[6] - L.LANE_Y[0] + 10, r: 1 }, 28, 24, { name: "rack.saw" }, 2)]);
}

export function printer(sc) {
  const { box, P } = sc;
  const B = L.PRINTER, C = L.CARD;
  box("printer.body", "printer", B, 0, L.PRINTER_H, { tone: "mid", steps: 4, bevel: 0.7, seam: 6, over: sc.badge(B.x + B.w - 20, B.y + B.d - 11, L.PRINTER_H, 2) + sc.lamp(B.x + B.w - 12, B.y + 14, L.PRINTER_H, "print", 2) + sc.lamp(B.x + B.w - 12, B.y + 28, L.PRINTER_H, "master", 2) });
  const m = k.topMatrix([C.x + 4, C.y + 6], L.PRINTER_H + 1.2, P, "x");
  const lines = Array.from({ length: 16 }, (_, i) => `<text class="m3u8" data-mline="${i}" x="0" y="${i * 4.8}"></text>`).join("");
  box("printer.card", "printer", { x: C.x, y: C.y, w: C.w, d: C.d, r: 1 }, L.PRINTER_H, 1.2, { tone: "hi", steps: 2, crease: "none", over: `<g transform="${m}">${lines}</g>` });
}

export function gatehouse(sc) {
  const G_ = L.GATEHOUSE;
  sc.box("caddy.house", "caddy", G_, 0, L.GATE_H, { tone: "mid", steps: 3, bevel: 0.7, seam: 8, over: sc.lamp(G_.x + 27, G_.y + 24, L.GATE_H, "storage", 2.4) + sc.badge(G_.x + 8, G_.y + G_.d - 12, L.GATE_H, 5) + sc.slotsY(G_.y + G_.d, [[G_.x + 8, G_.x + 46]], 14, 32) });
}

export function player(sc) {
  const { box, cyl, P } = sc;
  const D = L.DESK, S_ = L.SCREEN;
  box("player.desk", "player", D, 0, L.DESK_H, { tone: "lo", steps: 4, bevel: 0.6, seam: 3, over: sc.badge(D.x + 8, D.y + D.d - 12, L.DESK_H, 6) });
  for (const x of [S_.x + 40, S_.x + S_.w - 52]) box("player.foot", "player", { x, y: S_.y - 2, w: 12, d: 14, r: 2 }, L.DESK_H, L.SCREEN_Z - L.DESK_H, { tone: "mid", steps: 2, bevel: 0.3 });
  const x0 = S_.x + 6, x1 = S_.x + S_.w - 6, z0 = L.SCREEN_Z + 6, z1 = L.SCREEN_Z + L.SCREEN_H - 6;
  const pic = `<rect class="pic-sky" x="${x0}" y="${-z1}" width="${x1 - x0}" height="${z1 - z0}"/><path class="pic-hill" d="M${x0} ${-z0 - 24}L${x0 + 50} ${-z0 - 58}L${x0 + 90} ${-z0 - 36}L${x0 + 150} ${-z0 - 70}L${x1} ${-z0 - 30}L${x1} ${-z0}L${x0} ${-z0}Z"/><circle class="pic-sun" cx="${x1 - 50}" cy="${-z1 + 22}" r="9"/><g data-pixels></g>`;
  const ui = `<rect class="hud" x="${x0 + 4}" y="${-z1 + 4}" width="104" height="16" rx="2"/><text class="face-text" data-level x="${x0 + 8}" y="${-z1 + 11}">—</text><text class="face-text dim" data-est x="${x0 + 8}" y="${-z1 + 17}">—</text><rect class="scrub" x="${x0 + 6}" y="${-z0 - 8}" width="${x1 - x0 - 12}" height="2.2" rx="1"/><rect class="buffered" data-buffered x="${x0 + 6}" y="${-z0 - 8}" width="0" height="2.2" rx="1"/><rect class="scrub-fill" data-played x="${x0 + 6}" y="${-z0 - 8}" width="0" height="2.2" rx="1"/><g data-preview class="preview"><rect class="hud" data-pvbox x="0" y="${-z0 - 40}" width="52" height="29" rx="2"/><rect class="pic-hill" data-pvtile x="0" y="${-z0 - 37}" width="46" height="20"/><text class="face-text dim" data-pvtext x="0" y="${-z0 - 13.5}"></text></g>`;
  box("player.screen", "player", S_, L.SCREEN_Z, L.SCREEN_H, { tone: "mid", steps: 3, bevel: 0.6, over: sc.onFace(S_.y + S_.d, sc.faceWindow(x0, x1, z0, z1, "player", pic + ui)) });
  // The ABR selector (one position per rendition) and the throughput gauge.
  const ax = 940, ay = 196, gx = 940, gy = 244;
  cyl("player.abr", "player", ax, ay, 15, L.DESK_H, 5, { tone: "mid", steps: 48, bevel: 0.6, over: sc.L(k.radialTicks(ax, ay, 14, 7, 1, L.DESK_H + 5, [3, 3], P, -2.2, 4.4 * 7 / 6).minor, { tone: "mid" }) });
  cyl("player.knob", "player", ax, ay, 8, L.DESK_H + 5, 4, { tone: "hi", steps: 36, bevel: 0.4, over: `<path class="iso-line" data-tone="lit" data-free="end" data-abr d=""/>` + sc.D([sc.at([ax, ay, L.DESK_H + 9])], { size: 0.8 }) + sc.L(k.knurl(ax, ay, 8, L.DESK_H + 5.5, L.DESK_H + 8.5, 30, P) + k.sideArc(ax, ay, 8, L.DESK_H + 5.5, P, 30) + k.sideArc(ax, ay, 8, L.DESK_H + 8.5, P, 30), { tone: "lo" }) });
  cyl("player.gauge", "player", gx, gy, 14, L.DESK_H, 4, { tone: "hi", steps: 48, bevel: 0.5, over: sc.L(k.radialTicks(gx, gy, 13, 32, 4, L.DESK_H + 4, [1.4, 3], P, -2.2, 4.4).minor, { tone: "lo" }) + `<path class="iso-line" data-tone="lit" data-free="end" data-bw d=""/>` + sc.D([sc.at([gx, gy, L.DESK_H + 4])], { size: 0.8 }) });
  // The forward buffer: one plate per fetched segment, as tall as its rendition.
  box("player.buftray", "player", { x: 664, y: 232, w: 234, d: 20, r: 2 }, L.DESK_H, 1, { tone: "lo", steps: 2, crease: "none" });
  for (let b = 0; b < 10; b++) RUNGS.forEach((r, i) => {
    box("player.buf", "player", { x: 672 + b * 22, y: 236, w: 4, d: 12, r: 0.4 }, L.DESK_H + 1, Math.max(2, BLOCK_H[i] * 0.55), { tone: "hi", steps: 1, dyn: `buf-${b}-${i}`, owner: `buf-${b}` });
  });
}

export function backRow(sc) {
  const cab = (id, plan, face) => sc.box(`${id}.cabinet`, id, plan, 0, TOP, { tone: "mid", steps: 3, bevel: 0.8, seam: 12, over: face + sc.screws([[plan.x + 4, plan.y + 4], [plan.x + plan.w - 4, plan.y + 4]], TOP, 0.9) + sc.slotsX(plan.x + plan.w, [[plan.y + 8, plan.y + plan.d - 8]], 20, 30) });
  const M = L.MINIO;
  const cubbies = RUNGS.map((r, i) => {
    const x = M.x + 12 + i * 47;
    return `<rect class="gauge-track" x="${x}" y="-60" width="38" height="4" rx="1"/><rect class="gauge-fill" data-cubby="${i}" x="${x}" y="-60" width="0" height="4" rx="1"/><text class="face-text dim" x="${x}" y="-50">${r.q}/</text>`;
  }).join("");
  const win = sc.faceWindow(M.x + 8, M.x + M.w - 8, 44, 86, "processed", `<text class="face-text dim" x="${M.x + 12}" y="-78">vod-processed/3c6e/segments/</text><text class="face-text" data-masterfile x="${M.x + 12}" y="-70">master.m3u8 —</text>${cubbies}`);
  cab("minio", M, sc.onFace(FY, win) + sc.slotsY(FY, [[M.x + 10, M.x + 160]], 14, 36) + sc.faceLamp(M.x + 172, FY, 25, "thumbs", 2.4) + sc.badge(M.x + 8, M.y + 6, TOP, 3));
  const G = L.PG;
  cab("postgres", G, sc.onFace(FY, sc.faceWindow(G.x + 8, G.x + G.w - 8, 18, 84, "final", `<text class="face-text dim" x="${G.x + 12}" y="-76">videos · 3c6e</text>${["status", "manifest", "qualities", "workdir"].map((f, i) => `<text class="face-text" data-final="${f}" x="${G.x + 12}" y="${-(66 - i * 12)}">—</text>`).join("")}`)) + sc.badge(G.x + 8, G.y + 6, TOP, 4));
}

export function cables(sc) {
  const a = sc.boss("rack.port", "rack", [200, L.RACK.y, 4], [0, -1, 0], 3, 2);
  const b = sc.boss("minio.port", "minio", [200, FY, 30], [0, 1, 0], 3, 2.2);
  cable(sc, "upload", "rack", [a, [200, 110, 4], [200, 110, 30], b], 1.5, { pulse: "upload", bend: 8 });
  const c = sc.boss("minio.port2", "minio", [330, FY, 40], [0, 1, 0], 3, 2.4);
  const d = sc.boss("caddy.portB", "caddy", [593, L.GATEHOUSE.y, 40], [0, -1, 0], 3, 2.4);
  cable(sc, "storage", "caddy", [c, [330, 122, 40], [593, 122, 40], d], 1.7, { pulse: "storage", bend: 10 });
  const e = sc.boss("caddy.portR", "caddy", [L.GATEHOUSE.x + L.GATEHOUSE.w, 210, 5], [1, 0, 0], 2.4, 2);
  const f = sc.boss("player.port", "player", [L.DESK.x, 210, 5], [-1, 0, 0], 2.4, 2);
  cable(sc, "viewer", "player", [e, f], 1.5, { pulse: "viewer" });
}
