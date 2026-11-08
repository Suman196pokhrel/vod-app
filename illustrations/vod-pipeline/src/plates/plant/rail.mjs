// The status rail along the bench front: a scale from 0 to 100 % with a stop lamp at each
// processing_status's real progress value (STATUS_META), and a carriage per unfinished video.
import { k, A } from "../../scene.mjs";
import { PROGRESS } from "../../model.mjs";

export const RAIL = { x0: 262, x1: 1182, lanes: [270, 284, 298], plateY: 311, rulerY: 323 };
export const xOf = (pct) => RAIL.x0 + ((RAIL.x1 - RAIL.x0) * pct) / 100;
export const STOPS = ["failed", "uploading", "queued", "preparing", "generating_storyboard", "transcoding", "aggregating", "segmenting", "creating_manifest", "uploading_to_storage", "finalizing", "completed"];

export function statusRail(sc) {
  const { box, P, L, D, at } = sc;
  const x0 = RAIL.x0 - 14, x1 = RAIL.x1 + 14;
  RAIL.lanes.forEach((y, i) => {
    const lane = { x: x0, y, w: x1 - x0, d: 10, r: 1.5 };
    box("rail.lane", "rail", lane, 0, 3, { tone: "lo", steps: 2, bevel: 0.3, over: L(k.lineOnTop([x0, y + 5], [x1, y + 5], 3, P), { tone: "faint" }) + sc.screws([[x0 + 4, y + 5], [x1 - 4, y + 5]], 3, 0.7) });
    const car = { x: RAIL.x0 - 10, y: y + 1, w: 20, d: 8, r: 1.5 };
    const cx = RAIL.x0, cy = y + 5;
    const svg = sc.S(k.slabOf(car, 3, 5, P, 2, 0.3), { tone: "mid" }) + sc.S(k.cylinder(cx, cy, 4.4, 8, 8, P, 24, 0.4), { tone: "hi", inner: L(k.sideArc(cx, cy, 4.4, 12, P, 16), { tone: "faint" }) }) + L(k.ring(cx, cy, 2.2, 16, P, 14), { tone: "lo" }) + D([at([cx, cy, 16])], { size: 0.5 });
    sc.put("rail.car", "rail", [cx, cy, 8], svg, [A.slab(car, 3, 5, { name: "rail.car" }, 2), A.cylinder(cx, cy, 4.4, 8, 8, { name: "rail.can" })], { dyn: `car-${i}`, cls: "car", bias: 1e4 });
    void i;
  });
  const plate = { x: x0, y: RAIL.plateY, w: x1 - x0, d: 9, r: 1.5 };
  const stops = STOPS.map((s) => sc.lamp(xOf(PROGRESS[s]), RAIL.plateY + 4.5, 1.6, `stop-${s}`, 1.7)).join("");
  const marks = STOPS.map((s) => k.lineOnTop([xOf(PROGRESS[s]), RAIL.plateY], [xOf(PROGRESS[s]), RAIL.plateY + 1.4], 1.6, P)).join("");
  box("rail.plate", "rail", plate, 0, 1.6, { tone: "mid", steps: 2, bevel: 0.3, over: L(marks, { tone: "mid" }) + stops });
  const strip = { x: x0, y: RAIL.rulerY, w: x1 - x0, d: 7, r: 1 };
  const t = k.topTicks(xOf(0), xOf(100), (RAIL.x1 - RAIL.x0) / 50, 5, strip.y, 0.6, [2, 3.8], P);
  box("rail.ruler", "rail", strip, 0, 0.6, { tone: "lo", steps: 2, crease: "none", bevel: 0, over: L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + D([at([strip.x + 3, strip.y + 4, 0.6]), at([strip.x + strip.w - 3, strip.y + 4, 0.6])], { size: 0.45 }) });
  box("rail.badgeplate", "rail", { x: 218, y: 290, w: 22, d: 16, r: 1.5 }, 0, 0.4, { tone: "lo", crease: "none", over: sc.badge(222, 294, 0.4, 11) });
  for (const x of [x0 - 6, x1]) box("rail.end", "rail", { x, y: RAIL.lanes[0] - 2, w: 6, d: RAIL.lanes[2] + 12 - RAIL.lanes[0] + 2, r: 1.2 }, 0, 8, { tone: "mid", steps: 2, bevel: 0.4, over: sc.screws([[x + 3, RAIL.lanes[0] + 2], [x + 3, RAIL.lanes[2] + 8]], 8, 0.6) });
}
