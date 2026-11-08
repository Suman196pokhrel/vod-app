// PostgreSQL as a card-index cabinet (one card per Video row) and Redis as a key board:
// eight admission pegs, the single processing-lock hook and the Celery broker trough.
import { k, A } from "../../scene.mjs";
import { PG, PG_H, REDIS, REDIS_H } from "./layout.mjs";

export const CARDS = 12;
export const CHITS = 12;

export function postgres(sc) {
  const { box, P, L } = sc;
  const cab = { x: PG.x, y: PG.y, w: PG.w, d: 72, r: 3 };
  const fy = cab.y + cab.d;
  const fronts = [];
  for (const z1 of [22, 42]) {
    const holder = [[PG.x + 38, fy, z1 - 5], [PG.x + 62, fy, z1 - 5], [PG.x + 62, fy, z1 - 11], [PG.x + 38, fy, z1 - 11]];
    fronts.push(k.sideSeam(cab, z1 + 1, P, 3), "M" + holder.concat([holder[0]]).map((p) => k.iso(p, P).join(" ")).join("L"));
  }
  box("pg.cabinet", "postgres", cab, 0, PG_H, { tone: "mid", steps: 3, bevel: 0.8, inner: L(fronts.join(""), { tone: "faint" }), over: sc.screws([[cab.x + 5, cab.y + 5], [cab.x + cab.w - 5, cab.y + 5], [cab.x + 5, cab.y + cab.d - 5], [cab.x + cab.w - 5, cab.y + cab.d - 5]], PG_H, 1) + sc.badge(cab.x + 8, cab.y + 50, PG_H, 6) + sc.slotsX(cab.x + cab.w, Array.from({ length: 6 }, (_, i) => [cab.y + 10 + i * 9, cab.y + 13 + i * 9]), 8, 34) });
  for (const z of [10, 28]) box("pg.pull", "postgres", { x: PG.x + 44, y: fy, w: 12, d: 3, r: 0.8 }, z, 3, { tone: "hi", steps: 2, bevel: 0.2 });
  // The open top drawer, pulled out toward the viewer, holding one card per Video row.
  const dz = 44, dh = 12, dy0 = fy, dy1 = PG.y + PG.d;
  box("pg.drawer.floor", "postgres", { x: PG.x + 6, y: dy0, w: PG.w - 12, d: dy1 - dy0 - 3, r: 1 }, dz, 1.5, { tone: "lo", steps: 2, crease: "none" });
  box("pg.drawer.wallL", "postgres", { x: PG.x + 6, y: dy0, w: 2, d: dy1 - dy0 - 3, r: 0.5 }, dz + 1.5, dh - 1.5, { tone: "mid", steps: 2 });
  for (let i = 0; i < CARDS; i++) {
    const y = dy0 + 4 + i * 4.6;
    const tab = { x: PG.x + 14 + (i % 3) * 22, y, w: 14, d: 1.2, r: 0.3 };
    const card = { x: PG.x + 12, y, w: PG.w - 24, d: 1.2, r: 0.3 };
    const svg = sc.S(k.slabOf(card, dz + 1.5, 14, P, 1), { tone: "hi" }) + sc.S(k.slabOf(tab, dz + 15.5, 3, P, 1), { tone: "hi" });
    sc.put("pg.card", "postgres", [card.x + card.w / 2, y + 0.6, dz + 9], `<g class="card" data-card="${i}">${svg}</g>`, [A.slab(card, dz + 1.5, 17, { name: "pg.card" }, 1)]);
  }
  box("pg.drawer.wallR", "postgres", { x: PG.x + PG.w - 8, y: dy0, w: 2, d: dy1 - dy0 - 3, r: 0.5 }, dz + 1.5, dh - 1.5, { tone: "mid", steps: 2 });
  box("pg.drawer.front", "postgres", { x: PG.x + 4, y: dy1 - 3, w: PG.w - 8, d: 3, r: 0.8 }, dz - 1, dh + 3, { tone: "mid", steps: 2, bevel: 0.4, over: L("M" + [[PG.x + 38, dy1, dz + 9], [PG.x + 62, dy1, dz + 9], [PG.x + 62, dy1, dz + 4], [PG.x + 38, dy1, dz + 4]].map((p) => k.iso(p, P).join(" ")).join("L") + "Z", { tone: "faint" }) });
  box("pg.drawer.pull", "postgres", { x: PG.x + 44, y: dy1, w: 12, d: 3, r: 0.8 }, dz + 2, 3, { tone: "hi", steps: 2, bevel: 0.2 });
}

export function redis(sc) {
  const { box, cyl, P, L } = sc;
  const vents = Array.from({ length: 9 }, (_, i) => [REDIS.x + 54 + i * 6.6, REDIS.x + 57.4 + i * 6.6]);
  box("redis.body", "redis", REDIS, 0, REDIS_H, { tone: "mid", bevel: 0.8, seam: 8, over: sc.slotsY(REDIS.y + REDIS.d, vents, 11, 21) + sc.slotsY(REDIS.y + REDIS.d, [[REDIS.x + 10, REDIS.x + 40]], 12, 20) + sc.slotsX(REDIS.x + REDIS.w, [[REDIS.y + 20, REDIS.y + 120]], 11, 21) });
  const board = { x: REDIS.x + 4, y: REDIS.y + 2, w: REDIS.w - 8, d: 12, r: 1.5 };
  box("redis.board", "redis", board, REDIS_H, 22, { tone: "mid", steps: 2, bevel: 0.5, over: sc.badge(board.x + 6, board.y + 2, REDIS_H + 22, 7) });
  // Admission: tus:active:<upload_id>, one peg per concurrent upload, 8 in all (pre-create refuses a 9th).
  const pegY = REDIS.y + 30;
  box("redis.pegrail", "redis", { x: REDIS.x + 6, y: pegY - 6, w: REDIS.w - 12, d: 12, r: 2 }, REDIS_H, 1, { tone: "lo", crease: "none", over: L(Array.from({ length: 8 }, (_, i) => k.ring(REDIS.x + 14 + i * 12.6, pegY, 4.8, REDIS_H + 1, P, 24)).join(""), { tone: "faint" }) });
  for (let i = 0; i < 8; i++) {
    const cx = REDIS.x + 14 + i * 12.6;
    cyl("redis.token", "redis", cx, pegY, 4.2, REDIS_H + 1, 2.4, { tone: "hi", steps: 24, bevel: 0.3, dyn: `token-${i}`, cls: "token", over: L(k.ring(cx, pegY, 2.4, REDIS_H + 3.4, P, 16), { tone: "lo" }) });
  }
  // video_processing:active_lock: one hook, one tag. While the tag hangs here, nothing else starts.
  const hx = REDIS.x + 26, hy = REDIS.y + 72;
  cyl("redis.hookbase", "redis", hx, hy, 9, REDIS_H, 2.5, { tone: "lo", steps: 36, bevel: 0.4, over: sc.screws([[hx - 6, hy - 6], [hx + 6, hy + 6]], REDIS_H + 2.5, 0.6) });
  cyl("redis.hook", "redis", hx, hy, 2.4, REDIS_H + 2.5, 22, { tone: "mid", steps: 18 });
  box("redis.pin", "redis", { x: hx - 1, y: hy + 2.3, w: 2, d: 0.7, r: 0.2 }, REDIS_H + 17, 2, { tone: "mid", steps: 1 });
  box("redis.tag", "redis", { x: hx - 9, y: hy + 3, w: 18, d: 2.4, r: 0.8 }, REDIS_H + 6, 14, { tone: "hi", steps: 2, bevel: 0.3, lit: true, dyn: "lock-tag", cls: "locktag", over: L(k.sideRing([hx, hy + 5.4, REDIS_H + 17], 1.4, "y", P), { tone: "lo" }) });
  cyl("redis.hookcap", "redis", hx, hy, 3.4, REDIS_H + 24.5, 2, { tone: "mid", steps: 18 });
  // The Celery broker: a trough of task messages, consumed from the right by the worker.
  const trough = { x: REDIS.x + 50, y: REDIS.y + 60, w: REDIS.w - 54, d: 60, r: 2 };
  box("redis.trough", "redis", trough, REDIS_H, 2, { tone: "lo", steps: 3, over: L(k.planOutline(k.insetPlan(trough, 3), REDIS_H + 2, P, 3), { tone: "faint" }) });
  for (let i = 0; i < CHITS; i++) {
    const row = Math.floor(i / 6), col = i % 6;
    const chit = { x: trough.x + trough.w - 12 - col * 10.2, y: trough.y + 8 + row * 24, w: 8, d: 16, r: 0.8 };
    box("redis.chit", "redis", chit, REDIS_H + 2, 1.6, { tone: "hi", steps: 2, bevel: 0.2, dyn: `chit-${i}`, cls: "chit", over: L(k.lineOnTop([chit.x + 2, chit.y + 4], [chit.x + 6, chit.y + 4], REDIS_H + 3.6, P) + k.lineOnTop([chit.x + 2, chit.y + 7], [chit.x + 5, chit.y + 7], REDIS_H + 3.6, P), { tone: "lo", free: true }) });
  }
}
