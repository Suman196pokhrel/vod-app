// Plate 5: Package & play. Segments, the master playlist, storage and adaptive playback.
import { k, makeScene, settleAndEmit } from "../../scene.mjs";
import { bench } from "../../bench.mjs";
import { projectionFor } from "../intake/intake.mjs";
import * as L from "./layout.mjs";
import { rack, printer, gatehouse, player, backRow, cables } from "./parts.mjs";

export function buildPackage({ audit = false } = {}) {
  const points = [...k.boxCorners(L.BENCH, -21, 0), [L.MINIO.x, L.MINIO.y, L.BACK_H + 4], [L.SCREEN.x + L.SCREEN.w, L.SCREEN.y, L.SCREEN_Z + L.SCREEN_H + 4]];
  const { P, H } = projectionFor(points, L.W, { azimuth: L.AZIMUTH, elevation: L.ELEVATION });
  const sc = makeScene(P);
  bench(sc, L.BENCH, { plate: { x: 392, y: 272, w: 150, d: 18, r: 2 }, ruler: { x: 20, y: L.BENCH.d - 20, w: 350, d: 8, r: 1 } });
  rack(sc);
  printer(sc);
  gatehouse(sc);
  player(sc);
  backRow(sc);
  cables(sc);
  const body = settleAndEmit(sc, { audit, allow: [["rack.src*", "rack.cap*"], ["player.buf*", "player.buf*"]] });
  const svg = k.figureSvg({ width: L.W, height: H, label: "Packaging and playback: a rack cuts each rendition into 6-second segments, a printer writes master.m3u8, MinIO stores the folders, and a player behind Caddy's /storage gate picks renditions as its bandwidth changes.", body });
  const S_ = L.SCREEN;
  const data = { P, H, laneY: L.LANE_Y, sawX: L.SAW_X, screen: { x0: S_.x + 6, x1: S_.x + S_.w - 6, z0: L.SCREEN_Z + 6, z1: L.SCREEN_Z + L.SCREEN_H - 6 }, abr: { x: 940, y: 196, z: 17 }, bw: { x: 940, y: 244, z: 12.2 }, stations: L.STATIONS };
  return { svg, data, count: sc.R.items.length };
}
