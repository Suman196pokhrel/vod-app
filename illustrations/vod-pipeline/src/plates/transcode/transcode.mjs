// Plate 4: Transcode. The probe, the storyboard printer and the seven-rung ladder press.
import { k, makeScene, settleAndEmit } from "../../scene.mjs";
import { bench } from "../../bench.mjs";
import { projectionFor } from "../intake/intake.mjs";
import * as L from "./layout.mjs";
import { probe, printer, ladder, backRow, cables } from "./parts.mjs";

export function buildTranscode({ audit = false } = {}) {
  const points = [...k.boxCorners(L.BENCH, -21, 0), [L.MINIO.x, L.MINIO.y, L.BACK_H + 4], [L.REDIS.x + L.REDIS.w, L.REDIS.y, L.BACK_H + 4]];
  const { P, H } = projectionFor(points, L.W, { azimuth: L.AZIMUTH, elevation: L.ELEVATION });
  const sc = makeScene(P);
  bench(sc, L.BENCH, { plate: { x: 20, y: 270, w: 120, d: 20, r: 2 }, ruler: { x: 320, y: L.BENCH.d - 22, w: 652, d: 8, r: 1 } });
  probe(sc);
  printer(sc);
  ladder(sc);
  backRow(sc);
  cables(sc);
  const body = settleAndEmit(sc, { audit, allow: [["ladder.skip*", "ladder.head*"]] });
  const svg = k.figureSvg({ width: L.W, height: H, label: "Transcoding as a ladder press: a probe measures the source, a printer lays out the storyboard sprite sheet, and seven presses with dies sized to each rung's frame stamp out the renditions, while a Redis panel counts down the chord.", body });
  const data = { P, H, stationX: L.STATION_X, die: L.DIE, blockH: L.BLOCK_H, outY: L.OUT_Y, bedH: L.BED_H, stations: L.STATIONS };
  return { svg, data, count: sc.R.items.length };
}
