// Plate 3 front row: the magazine of queued cans, the escapement gate, the processing stage,
// the broker chute of task chits, the worker's presses and the outfeed.
import { k, A } from "../../scene.mjs";
import * as L from "./layout.mjs";

const { LANE_Y, CAN_R, CAN_Z, CAN_H } = L;

function can(sc, name, st, cx, cy, dyn, z = CAN_Z) {
  const { P } = sc;
  sc.cyl(name, st, cx, cy, CAN_R, z, CAN_H, { tone: "hi", steps: 32, bevel: 0.5, dyn, cls: "can", inner: sc.L(k.sideArc(cx, cy, CAN_R, z + 6, P, 22) + k.sideArc(cx, cy, CAN_R, z + 12, P, 22), { tone: "faint" }), over: sc.L(k.ring(cx, cy, 4.6, z + CAN_H, P, 26), { tone: "lo" }) + sc.D([sc.at([cx, cy, z + CAN_H])], { size: 0.55 }) + `<path class="can-ring" d="${k.ring(cx, cy, 6.4, z + CAN_H, P, 30)}"/>` });
}

export function magazine(sc) {
  const { box, P } = sc;
  const M = L.MAG;
  box("mag.bed", "postgres", M, 0, CAN_Z, { tone: "mid", steps: 3, bevel: 0.5, seam: 3, over: sc.L(k.lineOnTop([M.x, LANE_Y], [M.x + M.w, LANE_Y], CAN_Z, P), { tone: "faint" }) + sc.badge(M.x + 6, M.y + M.d - 10, CAN_Z, 1) });
  for (const y of [M.y - 4, M.y + M.d]) box("mag.rail", "postgres", { x: M.x, y, w: M.w, d: 4, r: 1 }, 0, CAN_Z + 8, { tone: "mid", steps: 2, bevel: 0.3, over: sc.screws([[M.x + 6, y + 2], [M.x + M.w - 6, y + 2]], CAN_Z + 8, 0.6) });
  for (let i = 0; i < L.MAG_SLOTS; i++) can(sc, "mag.can", "postgres", L.MAG_X0 - i * L.MAG_PITCH, LANE_Y, `mag-${i}`);
  box("mag.pusher", "postgres", { x: M.x + 2, y: LANE_Y - 9, w: 4, d: 18, r: 0.8 }, CAN_Z, 14, { tone: "mid", steps: 2 });
}

export function gate(sc) {
  const { box } = sc;
  const gx = L.GATE_X;
  for (const y of [LANE_Y - 22, LANE_Y + 18]) box("gate.post", "gate", { x: gx - 3, y, w: 6, d: 4, r: 0.8 }, 0, 50, { tone: "mid", steps: 2, bevel: 0.4 });
  box("gate.beam", "gate", { x: gx - 4, y: LANE_Y - 22, w: 8, d: 44, r: 1.2 }, 50, 4, { tone: "mid", steps: 2, bevel: 0.4, over: sc.lamp(gx, LANE_Y - 8, 54, "setnx", 2.2) + sc.lamp(gx, LANE_Y + 8, 54, "refused", 2.2) + sc.badge(gx - 7.5, LANE_Y + 12, 54, 2) });
  box("gate.bar", "gate", { x: gx - 2, y: LANE_Y - 18, w: 4, d: 36, r: 0.6 }, CAN_Z + 1, 20, { tone: "hi", steps: 1, bevel: 0.2, dyn: "gatebar", owner: "gate.passage" });
  sc.put("gate.flight", "gate", [gx, LANE_Y, CAN_Z + 9], `<g data-flight="gate"></g>`, [A.slab({ x: L.MAG_X0 + CAN_R + 1, y: LANE_Y - CAN_R, w: L.STAGE_SLOTS[0] - CAN_R - 1 - L.MAG_X0 - CAN_R - 1, d: CAN_R * 2, r: 0.5 }, CAN_Z, CAN_H, { name: "gate.flight", owner: "gate.passage" }, 1)]);
}

export function stage(sc) {
  const { box, P } = sc;
  const S_ = L.STAGE;
  box("stage.deck", "stage", S_, 0, CAN_Z, { tone: "mid", steps: 4, bevel: 0.6, seam: 3, over: sc.L(L.STAGE_SLOTS.map((x) => k.ring(x, LANE_Y, CAN_R + 2, CAN_Z, P, 30)).join(""), { tone: "lo" }) + sc.badge(S_.x + S_.w - 20, S_.y + S_.d - 10, CAN_Z, 6) });
  L.STAGE_SLOTS.forEach((x, i) => can(sc, "stage.can", "stage", x, LANE_Y, `stage-${i}`));
}

function chit(sc, name, st, cx, dyn, z, owner) {
  const { P } = sc;
  const plan = { x: cx - L.CHIT.w / 2, y: L.CHIT_Y - L.CHIT.d / 2, w: L.CHIT.w, d: L.CHIT.d, r: 0.8 };
  const m = k.topMatrix([cx, L.CHIT_Y], z + L.CHIT.h, P, "y");
  const text = `<g transform="${m}"><text class="chit-text" data-chit-vid x="0" y="-1.6" text-anchor="middle"></text><text class="chit-text task" data-chit-task x="0" y="2.6" text-anchor="middle"></text></g>`;
  sc.box(name, st, plan, z, L.CHIT.h, { tone: "hi", steps: 2, bevel: 0.25, dyn, cls: "chit", over: text, owner });
}

export function broker(sc) {
  const { box, P } = sc;
  const B = L.BROKER;
  box("broker.chute", "broker", B, 0, 6, { tone: "mid", steps: 3, bevel: 0.5, seam: 2, over: sc.L(k.planOutline(k.insetPlan(B, 4), 6, P, 3), { tone: "faint" }) + sc.badge(B.x + 6, B.y + B.d - 10, 6, 4) });
  for (let i = 0; i < L.BROKER_SLOTS; i++) chit(sc, "broker.chit", "broker", L.BROKER_HEAD - i * L.BROKER_PITCH, `chit-${i}`, 6);
  box("broker.stop", "broker", { x: B.x + B.w - 10, y: B.y + 6, w: 4, d: B.d - 12, r: 0.8 }, 6, 6, { tone: "mid", steps: 2 });
}

export function presses(sc) {
  const { box, cyl, P } = sc;
  const pd = { x: L.PRESS_X[0] - 18, y: L.PRESS.y, w: L.PRESS_X[2] - L.PRESS_X[0] + 36, d: L.PRESS.d, r: 3 };
  box("press.base", "worker", pd, 0, 6, { tone: "mid", steps: 3, bevel: 0.6, seam: 2, over: sc.badge(pd.x + pd.w - 20, pd.y + pd.d - 10, 6, 5) });
  L.PRESS_X.forEach((x, i) => {
    box("press.seat", "worker", { x: x - 9, y: L.CHIT_Y - 12, w: 18, d: 24, r: 1.5 }, 6, 1, { tone: "lo", steps: 2, crease: "none" });
    chit(sc, "press.chit", "worker", x, `run-${i}`, 7, `press-${i}`);
    box("press.column", "worker", { x: x - 3, y: L.PRESS.y + 2, w: 6, d: 6, r: 1 }, 6, 44, { tone: "mid", steps: 2, bevel: 0.3 });
    box("press.arm", "worker", { x: x - 4, y: L.PRESS.y + 2, w: 8, d: 24, r: 1 }, 50, 5, { tone: "mid", steps: 2, bevel: 0.3, over: sc.lamp(x, L.PRESS.y + 6, 55, `press-${i}`, 1.8) });
    cyl("press.ram", "worker", x, L.CHIT_Y, 3, 34, 16, { tone: "hi", steps: 18, dyn: `ram-${i}`, over: sc.L(k.ring(x, L.CHIT_Y, 1.6, 50, P, 14), { tone: "lo" }) });
    box("press.lockout", "worker", { x: x - 11, y: L.CHIT_Y - 13, w: 22, d: 26, r: 2 }, 7, 2.2, { tone: "hi", steps: 2, bevel: 0.3, dyn: `lockout-${i}`, owner: `press-${i}`, over: sc.L(k.lineOnTop([x - 11, L.CHIT_Y + 9], [x + 11, L.CHIT_Y - 9], 9.2, P), { tone: "lo" }) + sc.screws([[x - 7, L.CHIT_Y - 9], [x + 7, L.CHIT_Y + 9]], 9.2, 0.6) });
  });
}

export function outfeed(sc) {
  const { box, P } = sc;
  const O = L.OUT, F = L.FAIL;
  box("out.tray", "out", O, 0, CAN_Z, { tone: "mid", steps: 3, bevel: 0.5, seam: 3, over: sc.L(k.lineOnTop([O.x, LANE_Y], [O.x + O.w, LANE_Y], CAN_Z, P), { tone: "faint" }) + sc.badge(O.x + O.w - 20, O.y + 4, CAN_Z, 7) });
  for (let i = 0; i < L.OUT_SLOTS; i++) can(sc, "out.can", "out", L.OUT_X0 + i * L.OUT_PITCH, LANE_Y, `done-${i}`);
  box("out.bin", "out", F, 0, 5, { tone: "lo", steps: 3, bevel: 0.4, over: sc.L(k.planOutline(k.insetPlan(F, 3), 5, P, 3), { tone: "faint" }) + sc.lamp(F.x + F.w - 10, F.y + 8, 5, "failbin", 2) });
  for (let i = 0; i < L.OUT_SLOTS; i++) can(sc, "out.failed", "out", L.OUT_X0 + i * L.OUT_PITCH, F.y + F.d / 2 + 2, `failed-${i}`, 5);
}
