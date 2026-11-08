// Plate 2 back row: Redis as a key cabinet with a TTL dial, FastAPI as the pre-create
// checkpoint panel, PostgreSQL showing its two rows, and the cables between them.
import { k } from "../../scene.mjs";
import { cable } from "../../cable.mjs";
import * as L from "./layout.mjs";
import { CHECKS } from "../../intake-model.mjs";

const FY = L.FACE_Y;

function cabinet(sc, id, plan, n, faceLines = "") {
  const top = L.BACK_H;
  sc.box(`${id}.cabinet`, id, plan, 0, top, { tone: "mid", steps: 3, bevel: 0.8, seam: 12, over: faceLines + sc.badge(plan.x + 8, plan.y + 6, top, n) + sc.screws([[plan.x + 4, plan.y + plan.d - 4], [plan.x + plan.w - 4, plan.y + plan.d - 4]], top, 0.9) + sc.slotsX(plan.x + plan.w, [[plan.y + 8, plan.y + plan.d - 8]], 20, 30) });
}

export function redisKeys(sc) {
  const R = L.REDIS;
  const hooksX = Array.from({ length: 8 }, (_, i) => R.x + 14 + i * 14.6);
  const rail = sc.slotsY(FY, [[R.x + 6, R.x + R.w - 6]], 89, 92);
  const slots = sc.onFace(FY, sc.faceWindow(R.x + 10, R.x + 72, 24, 46, "slots", `<text class="face-text dim" x="${R.x + 14}" y="-38">KEYS tus:active:*</text><text class="face-text huge" data-slots x="${R.x + 14}" y="-28">0 / 8</text>`));
  cabinet(sc, "redis", R, 6, rail + slots);
  hooksX.forEach((x, i) => {
    sc.boss("redis.hook", "redis", [x, FY, 84], [0, 1, 0], 3, 1.3, { tone: "mid" });
    sc.box("redis.key", "redis", { x: x - 4, y: FY, w: 8, d: 2, r: 0.5 }, 62, 20.7, { tone: "hi", steps: 1, bevel: 0.2, dyn: `key-${i}`, cls: "rkey", over: sc.L(k.sideRing([x, FY + 2, 76.5], 1.5, "y", sc.P), { tone: "lo" }) });
  });
  // The TTL dial of this upload's key: a full sweep is the 2-hour EX the hook sets.
  const dx = R.x + 98, dz = 34, r = 13;
  const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; const r0 = i % 3 ? r - 2.6 : r - 4.2; return `M${(dx + Math.sin(a) * r0).toFixed(2)} ${(-dz - Math.cos(a) * r0).toFixed(2)}L${(dx + Math.sin(a) * (r - 1)).toFixed(2)} ${(-dz - Math.cos(a) * (r - 1)).toFixed(2)}`; }).join("");
  const face = sc.onFace(FY + 2.4, `<circle class="dial-face" cx="${dx}" cy="${-dz}" r="${r}"/><path class="iso-line" data-tone="mid" d="${ticks}"/><path class="ttl-arc" data-ttlarc d=""/><path class="iso-line needle" data-tone="lit" data-ttl d="M${dx} ${-dz}L${dx} ${-dz - r + 3}"/><circle class="hub" cx="${dx}" cy="${-dz}" r="1.3"/>`);
  sc.boss("redis.dial", "redis", [dx, FY, dz], [0, 1, 0], 2.4, r + 2, { tone: "mid", over: face });
}

export function apiPanel(sc) {
  const A_ = L.API;
  const lamps = CHECKS.map((c, i) => sc.faceLamp(A_.x + 19 + i * 21, FY, 80, `check-${c}`, 2.8)).join("");
  const hooks = ["pre-create", "post-finish", "status"].map((h, i) => sc.faceLamp(A_.x + 30 + i * 30, FY, 54, `hook-${h}`, 2.4)).join("") + sc.faceLamp(A_.x + 166, FY, 80, "reject", 2.8);
  const code = sc.onFace(FY, sc.faceWindow(A_.x + 108, A_.x + 170, 22, 40, "code", `<text class="face-text dim" x="${A_.x + 112}" y="-33">RESPONSE</text><text class="face-text huge" data-code x="${A_.x + 112}" y="-25">—</text>`));
  cabinet(sc, "api", A_, 7, sc.slotsY(FY, CHECKS.map((_, i) => [A_.x + 12 + i * 21, A_.x + 26 + i * 21]), 70, 73) + sc.slotsY(FY, [[A_.x + 16, A_.x + 100]], 46, 49) + lamps + hooks + code);
}

export function pgRows(sc) {
  const G = L.PG;
  const row = (z, id, label) => sc.faceWindow(G.x + 10, G.x + G.w - 10, z, z + 18, id, `<text class="face-text dim" x="${G.x + 14}" y="${-(z + 11)}">${label}</text><text class="face-text" data-row="${id}" x="${G.x + 14}" y="${-(z + 4)}">—</text>`);
  cabinet(sc, "postgres", G, 8, sc.onFace(FY, row(62, "tus", "tus_uploads") + row(36, "video", "videos")));
}

export function cables(sc) {
  const T = L.TUSD;
  const from = sc.boss("tusd.port", "tusd", [T.x + T.w, T.y + 16, 42], [1, 0, 0], 3, 2.6);
  const to = sc.boss("api.port", "api", [L.API.x + 8, FY, 42], [0, 1, 0], 3, 2.6);
  cable(sc, "hook", "api", [from, [L.API.x + 8, from[1], 42], to], 1.7, { pulse: "hook", bend: 10 });
  const y = L.BACK_Y + L.BACK_D / 2;
  const a = sc.boss("redis.port", "redis", [L.REDIS.x + L.REDIS.w, y, 50], [1, 0, 0], 3, 2.4);
  const b = sc.boss("api.portL", "api", [L.API.x, y, 50], [-1, 0, 0], 3, 2.4);
  cable(sc, "redislink", "redis", [a, b], 1.5, { pulse: "redis" });
  const c = sc.boss("api.portR", "api", [L.API.x + L.API.w, y, 50], [1, 0, 0], 3, 2.4);
  const d = sc.boss("postgres.port", "postgres", [L.PG.x, y, 50], [-1, 0, 0], 3, 2.4);
  cable(sc, "pglink", "postgres", [c, d], 1.5, { pulse: "postgres" });
}
