// The Celery worker as a three-spindle machine (one spindle per --concurrency slot) with a
// rendition tray and a storyboard sheet, and MinIO as a cabinet of three bucket drawers.
import { k, A } from "../../scene.mjs";
import { WORKER, WORKER_H, MINIO, MINIO_H } from "./layout.mjs";
import { LADDER } from "../../model.mjs";

export const SPINDLES_X = [884, 930, 976];
const CHUCK_Y = 112;

export function worker(sc) {
  const { box, cyl, P, L, D, at } = sc;
  box("worker.base", "worker", WORKER, 0, WORKER_H, { tone: "mid", steps: 5, bevel: 0.8, seam: 4, over: sc.badge(WORKER.x + 10, WORKER.y + 110, WORKER_H, 8) + sc.screws(k.corners(WORKER, 6), WORKER_H, 1.2) });
  const cab = { x: WORKER.x + 4, y: WORKER.y + 2, w: 46, d: 36, r: 2 };
  const lamps = ["preparing", "generating_storyboard", "transcoding", "aggregating", "segmenting", "creating_manifest", "uploading_to_storage", "finalizing"].map((s, i) => sc.lamp(cab.x + 7 + (i % 4) * 10.6, cab.y + 18 + Math.floor(i / 4) * 10, 60, `stage-${s}`, 2)).join("");
  const cvents = Array.from({ length: 5 }, (_, i) => [cab.x + 8 + i * 6.6, cab.x + 11 + i * 6.6]);
  box("worker.cabinet", "worker", cab, WORKER_H, 60 - WORKER_H, { tone: "mid", steps: 3, bevel: 0.6, seam: 30, over: lamps + sc.slotsY(cab.y + cab.d, cvents, 36, 52) + sc.slotsY(cab.y + cab.d, [[cab.x + 8, cab.x + 38]], 16, 26) });
  const beam = { x: 846, y: 92, w: 162, d: 14, r: 2 };
  for (const x of [850, 994]) {
    box("worker.postfoot", "worker", { x: x - 3, y: beam.y - 3, w: 16, d: 20, r: 2 }, WORKER_H, 3, { tone: "lo", steps: 2, over: sc.screws([[x, beam.y], [x + 10, beam.y + 14]], WORKER_H + 3, 0.6) });
    box("worker.post", "worker", { x, y: beam.y + 2, w: 10, d: 10, r: 1.5 }, WORKER_H + 3, 84 - WORKER_H - 3, { tone: "mid", steps: 2, bevel: 0.4 });
  }
  box("worker.beam", "worker", beam, 84, 12, { tone: "mid", steps: 3, bevel: 0.6, seam: 90, over: sc.screws([[beam.x + 4, beam.y + 4], [beam.x + beam.w - 4, beam.y + beam.d - 4]], 96, 0.7) });
  SPINDLES_X.forEach((cx, i) => {
    cyl("worker.chuck", "worker", cx, CHUCK_Y, 12, WORKER_H, 5, { tone: "mid", steps: 40, bevel: 0.6, over: L(k.ring(cx, CHUCK_Y, 8.5, WORKER_H + 5, P, 36), { tone: "lo" }) + D([0, 1, 2].map((j) => at([cx + Math.cos(j * 2.094) * 10.4, CHUCK_Y + Math.sin(j * 2.094) * 10.4, WORKER_H + 5])), { size: 0.5 }) });
    cyl("worker.work", "worker", cx, CHUCK_Y, 7, WORKER_H + 5, 13, { tone: "hi", steps: 30, bevel: 0.4, dyn: `work-${i}`, cls: "work", owner: `slot-${i}`, inner: L(k.sideArc(cx, CHUCK_Y, 7, WORKER_H + 11, P, 22), { tone: "faint" }), over: L(k.ring(cx, CHUCK_Y, 3.4, WORKER_H + 18, P, 18), { tone: "lo" }) });
    box("worker.lockout", "worker", { x: cx - 13, y: CHUCK_Y - 13, w: 26, d: 26, r: 3 }, WORKER_H + 5, 2.4, { tone: "hi", steps: 3, bevel: 0.4, dyn: `lockout-${i}`, cls: "lockout", owner: `slot-${i}`, over: sc.screws([[cx - 9, CHUCK_Y - 9], [cx + 9, CHUCK_Y + 9]], WORKER_H + 7.4, 0.7) + L(k.lineOnTop([cx - 7, CHUCK_Y + 7], [cx + 7, CHUCK_Y - 7], WORKER_H + 7.4, P), { tone: "lo" }) });
    const head = `<g data-spindle="${i}">` + sc.S(k.slabOf({ x: cx - 8, y: 106, w: 16, d: 12, r: 1.5 }, 66, 26, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam({ x: cx - 8, y: 106, w: 16, d: 12, r: 1.5 }, 74, P, 2), { tone: "faint" }) }) + sc.S(k.cylinder(cx, CHUCK_Y, 3.4, 48, 18, P, 18), { tone: "hi", lit: false }) + sc.S(k.cylinder(cx, CHUCK_Y, 4.6, 44, 4, P, 20, 0.3), { tone: "mid" }) + L(k.knurl(cx, CHUCK_Y, 4.6, 44, 48, 18, P), { tone: "lo" }) + sc.lamp(cx, 112, 92, `spindle-${i}`, 1.6) + `</g>`;
    sc.put("worker.head", "worker", [cx, 112, 70], head, [A.slab({ x: cx - 8, y: 106, w: 16, d: 12, r: 1.5 }, 66, 26, { name: "worker.head" }, 2), A.cylinder(cx, CHUCK_Y, 4.6, 44, 22, { name: "worker.spindle" })], { dyn: `head-${i}` });
  });
  // Rendition tray: one pocket per rung, as wide as its frame; a block lands as each transcode finishes.
  const tray = { x: 812, y: 198, w: 188, d: 44, r: 3 };
  box("worker.tray", "worker", tray, WORKER_H, 4, { tone: "lo", steps: 3, bevel: 0.4 });
  let x = tray.x + 4;
  LADDER.forEach((r, i) => {
    const w = 8 + 26 * Math.sqrt((r.w * r.h) / (2560 * 1440));
    const pocket = { x, y: tray.y + 6, w, d: 30, r: 1 };
    const hgt = 3 + 18 * Math.sqrt(r.kbps / 10000);
    box("worker.pocketrim", "worker", k.insetPlan(pocket, -1), WORKER_H + 4, 0.5, { tone: "lo", crease: "none", over: L(k.planOutline(pocket, WORKER_H + 4.5, P, 2), { tone: "faint" }) });
    box("worker.rendition", "worker", k.insetPlan(pocket, 1.4), WORKER_H + 4.5, hgt, { tone: "hi", steps: 2, bevel: 0.3, dyn: `rung-${i}`, cls: "rung", owner: `pocket-${i}` });
    box("worker.skipcover", "worker", k.insetPlan(pocket, -0.4), WORKER_H + 4.5, 1.2, { tone: "lo", steps: 2, dyn: `skip-${i}`, cls: "skipcover", owner: `pocket-${i}`, over: L(k.lineOnTop([pocket.x + 1, pocket.y + 1], [pocket.x + pocket.w - 1, pocket.y + pocket.d - 1], WORKER_H + 5.7, P), { tone: "lo" }) });
    x += w + 3;
  });
  // Storyboard sheet: 10 × 10 tiles, filled row by row while generate_storyboard runs.
  const sheet = { x: 948, y: 140, w: 52, d: 46, r: 1.5 };
  const rows = Array.from({ length: 10 }, (_, r) => `<g class="tile-row" data-tilerow="${r}">${D(Array.from({ length: 10 }, (_, c) => at([sheet.x + 5 + c * 4.6, sheet.y + 4 + r * 4.2, WORKER_H + 2])), { size: 0.75, tone: "hi" })}</g>`).join("");
  box("worker.sheet", "worker", sheet, WORKER_H, 2, { tone: "lo", steps: 2, over: L(k.planOutline(k.insetPlan(sheet, 1.2), WORKER_H + 2, P, 2), { tone: "faint" }) + rows });
}

export function minio(sc) {
  const { box, P, L } = sc;
  const grille = [];
  for (let i = 0; i < 7; i++) grille.push(k.planOutline({ x: MINIO.x + 40 + i * 13, y: MINIO.y + 22, w: 6, d: 40, r: 2.5 }, MINIO_H, P, 3));
  box("minio.cabinet", "minio", MINIO, 0, MINIO_H, { tone: "mid", steps: 4, bevel: 0.8, over: L(grille.join(""), { tone: "lo" }) + sc.screws(k.corners(MINIO, 6), MINIO_H, 1.1) + sc.badge(MINIO.x + 10, MINIO.y + 78, MINIO_H, 9) + ["videos", "thumbnails", "processed"].map((b, i) => sc.lamp(MINIO.x + 118 + i * 14, MINIO.y + MINIO.d - 12, MINIO_H, `bucket-${b}`, 2)).join("") + sc.bandsX(MINIO.x + MINIO.w, MINIO.y + 14, MINIO.y + MINIO.d - 14, Array.from({ length: 6 }, (_, i) => [8 + i * 13, 18 + i * 13])) + sc.D(Array.from({ length: 6 }, (_, i) => sc.at([MINIO.x + MINIO.w, MINIO.y + MINIO.d - 22, 13 + i * 13])), { size: 0.7, tone: "hi" }) });
  const fy = MINIO.y + MINIO.d;
  ["videos", "thumbnails", "processed"].forEach((bucket, i) => {
    const z0 = 60 - i * 28 + 1, h = 25;
    const front = { x: MINIO.x + 6, y: fy, w: MINIO.w - 12, d: 3, r: 1 };
    const m = k.sideMatrix([0, fy + 3], 0, P, "left");
    const gx = MINIO.x + 100, gw = 52;
    const gauge = `<g transform="${m}"><rect class="gauge-track" x="${gx}" y="${-(z0 + 9)}" width="${gw}" height="4" rx="1"/><rect class="gauge-fill" data-bucket="${bucket}" x="${gx}" y="${-(z0 + 9)}" width="0" height="4" rx="1"/><rect class="iso-line" data-tone="lo" fill="none" x="${gx - 0.6}" y="${-(z0 + 9.6)}" width="${gw + 1.2}" height="5.2" rx="1.3"/></g>`;
    const holder = [[MINIO.x + 22, fy + 3, z0 + 18], [MINIO.x + 70, fy + 3, z0 + 18], [MINIO.x + 70, fy + 3, z0 + 12], [MINIO.x + 22, fy + 3, z0 + 12]];
    const holderD = "M" + holder.concat([holder[0]]).map((p) => k.iso(p, P).join(" ")).join("L");
    box("minio.drawer", "minio", front, z0, h, { tone: "mid", steps: 2, bevel: 0.5, over: gauge + L(holderD, { tone: "lo" }) });
    box("minio.pull", "minio", { x: MINIO.x + 34, y: fy + 3, w: 24, d: 3, r: 1 }, z0 + 4, 3, { tone: "hi", steps: 2, bevel: 0.3 });
  });
}
