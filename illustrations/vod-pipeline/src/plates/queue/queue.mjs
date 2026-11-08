// Plate 3: the queue. Builds the escapement, the broker and the worker presses.
import { k, makeScene, settleAndEmit } from "../../scene.mjs";
import { bench } from "../../bench.mjs";
import { projectionFor } from "../intake/intake.mjs";
import * as L from "./layout.mjs";
import { magazine, gate, stage, broker, presses, outfeed } from "./front.mjs";
import { pgScreen, redisLock, workerPanel, lockCable } from "./back.mjs";

export function buildQueue({ audit = false } = {}) {
  const points = [...k.boxCorners(L.BENCH, -21, 0), [L.PG.x, L.PG.y, L.BACK_H + 4], [L.WORKER.x + L.WORKER.w, L.WORKER.y, L.BACK_H + 4]];
  const { P, H } = projectionFor(points, L.W, { azimuth: L.AZIMUTH, elevation: L.ELEVATION });
  const sc = makeScene(P);
  bench(sc, L.BENCH, { plate: { x: 18, y: 222, w: 120, d: 60, r: 2 }, ruler: { x: 334, y: L.BENCH.d - 16, w: 576, d: 8, r: 1 } });
  magazine(sc);
  gate(sc);
  stage(sc);
  broker(sc);
  presses(sc);
  outfeed(sc);
  pgScreen(sc);
  redisLock(sc);
  workerPanel(sc);
  lockCable(sc);
  const body = settleAndEmit(sc, { audit, allow: [["gate.bar*", "gate.flight*"], ["press.chit*", "press.lockout*"]] });
  const svg = k.figureSvg({ width: L.W, height: H, label: "The processing queue as an escapement: queued video cans in a magazine, a gate that lifts only when the Redis lock hook is empty, a broker chute of task chits and the worker's presses.", body });
  const canSvg = k.solidSvg(k.cylinder(0, L.LANE_Y, L.CAN_R, L.CAN_Z, L.CAN_H, P, 32, 0.5), { tone: "hi" });
  const data = { P, H, magX0: L.MAG_X0, magPitch: L.MAG_PITCH, stageX: L.STAGE_SLOTS, canSvg, stations: L.STATIONS };
  return { svg, data, count: sc.R.items.length };
}
