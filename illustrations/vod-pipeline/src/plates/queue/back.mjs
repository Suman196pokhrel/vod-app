// Plate 3 back row: PostgreSQL's queue screen, Redis's lock hook with its tag and 6-hour TTL
// dial, the worker's panel, and the signal cable from the lock to the gate.
import { k } from "../../scene.mjs";
import { cable } from "../../cable.mjs";
import * as L from "./layout.mjs";

const FY = L.FACE_Y, TOP = L.BACK_H;

function cabinet(sc, id, plan, face) {
  sc.box(`${id}.cabinet`, id, plan, 0, TOP, { tone: "mid", steps: 3, bevel: 0.8, seam: 12, over: face + sc.screws([[plan.x + 4, plan.y + 4], [plan.x + plan.w - 4, plan.y + 4], [plan.x + 4, plan.y + plan.d - 4], [plan.x + plan.w - 4, plan.y + plan.d - 4]], TOP, 0.9) + sc.slotsX(plan.x + plan.w, [[plan.y + 8, plan.y + plan.d - 8]], 20, 30) });
}

export function pgScreen(sc) {
  const G = L.PG;
  const rows = Array.from({ length: 7 }, (_, i) => `<text class="face-text row" data-qrow="${i}" x="${G.x + 16}" y="${-(68 - i * 7.6)}"></text>`).join("");
  const win = sc.faceWindow(G.x + 10, G.x + G.w - 10, 14, 86, "queue", `<text class="face-text dim" x="${G.x + 16}" y="-78">videos ORDER BY created_at · status 'queued' = waiting</text>${rows}`);
  cabinet(sc, "postgres", G, sc.onFace(FY, win));
}

export function redisLock(sc) {
  const R = L.REDIS;
  const hx = R.x + 34, hz = 76;
  const disp = `<text class="face-text dim" x="${R.x + 120}" y="-78">video_processing:active_lock</text><text class="face-text huge" data-lockval x="${R.x + 120}" y="-67">nil</text><text class="face-text dim" x="${R.x + 120}" y="-56">SET NX EX 21600</text><text class="face-text" data-setnx x="${R.x + 120}" y="-49">—</text><text class="face-text dim" x="${R.x + 120}" y="-38">EVAL release-if-owner</text><text class="face-text" data-eval x="${R.x + 120}" y="-31">—</text><text class="face-text dim" x="${R.x + 120}" y="-20">LLEN celery</text><text class="face-text big" data-llen x="${R.x + 170}" y="-20">0</text>`;
  cabinet(sc, "redis", R, sc.onFace(FY, sc.faceWindow(R.x + 114, R.x + R.w - 8, 14, 86, "lock", disp)) + sc.slotsY(FY, [[R.x + 10, R.x + 104]], 88, 90) + sc.badge(R.x + 8, R.y + 6, TOP, 3));
  sc.boss("redis.hook", "redis", [hx, FY, hz], [0, 1, 0], 6, 2, { tone: "mid" });
  const tag = { x: hx - 13, y: FY, w: 26, d: 2.4, r: 0.6 };
  const label = sc.onFace(tag.y + tag.d, `<text class="tag-text" data-tagid x="${hx}" y="${-(hz - 13)}" text-anchor="middle"></text>`);
  sc.box("redis.tag", "redis", tag, hz - 22, 19.8, { tone: "hi", steps: 1, bevel: 0.3, lit: true, dyn: "locktag", over: sc.L(k.sideRing([hx, tag.y + tag.d, hz - 4], 1.6, "y", sc.P), { tone: "lo" }) + label });
  // The lock's TTL: one sweep is EX 21600, the dead-man's switch for a worker that dies holding it.
  const dx = R.x + 74, dz = 36, r = 15;
  const ticks = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; const r0 = i % 4 ? r - 2.4 : r - 4.4; return `M${(dx + Math.sin(a) * r0).toFixed(2)} ${(-dz - Math.cos(a) * r0).toFixed(2)}L${(dx + Math.sin(a) * (r - 1)).toFixed(2)} ${(-dz - Math.cos(a) * (r - 1)).toFixed(2)}`; }).join("");
  const face = sc.onFace(FY + 2.4, `<circle class="dial-face" cx="${dx}" cy="${-dz}" r="${r}"/><path class="iso-line" data-tone="mid" d="${ticks}"/><path class="iso-line needle" data-tone="lit" data-lockttl d="M${dx} ${-dz}L${dx} ${-dz - r + 3}"/><circle class="hub" cx="${dx}" cy="${-dz}" r="1.4"/>`);
  sc.boss("redis.dial", "redis", [dx, FY, dz], [0, 1, 0], 2.4, r + 2, { tone: "mid", over: face });
}

export function workerPanel(sc) {
  const Wk = L.WORKER;
  const stages = ["preparing", "generating_storyboard", "transcoding", "aggregating", "segmenting", "creating_manifest", "uploading_to_storage", "finalizing"];
  const lamps = stages.map((s, i) => sc.faceLamp(Wk.x + 20 + i * 18, FY, 78, `stage-${s}`, 2.6)).join("") + sc.slotsY(FY, stages.map((_, i) => [Wk.x + 14 + i * 18, Wk.x + 26 + i * 18]), 68, 71);
  const disp = `<text class="face-text dim" x="${Wk.x + 16}" y="-50">CELERY WORKER</text><text class="face-text huge" data-conc x="${Wk.x + 16}" y="-40">--concurrency=1</text><text class="face-text dim" x="${Wk.x + 16}" y="-29">RUNNING</text><text class="face-text" data-running x="${Wk.x + 16}" y="-22">idle</text>`;
  cabinet(sc, "worker", Wk, lamps + sc.onFace(FY, sc.faceWindow(Wk.x + 10, Wk.x + 170, 16, 58, "worker", disp)) + sc.faceLamp(Wk.x + 280, FY, 78, "worker-up", 2.6));
}

export function lockCable(sc) {
  const from = sc.boss("redis.port", "redis", [L.REDIS.x + 12, FY, 40], [0, 1, 0], 3, 2.4);
  const to = sc.boss("gate.port", "gate", [L.GATE_X, L.LANE_Y - 22, 40], [0, -1, 0], 3, 2.4);
  cable(sc, "lockline", "gate", [from, [from[0], 118, 40], [L.GATE_X, 118, 40], to], 1.5, { pulse: "lock", bend: 9 });
}
