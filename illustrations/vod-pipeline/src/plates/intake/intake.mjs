// Plate 2: Intake. Builds the static art once and returns the SVG plus what the live code
// needs to cut slices, fly them along the belt and chute, and land them as parts.
import { k, makeScene, settleAndEmit } from "../../scene.mjs";
import { bench } from "../../bench.mjs";
import * as L from "./layout.mjs";
import { desk, network, caddyArch, tusd, minio } from "./front.mjs";
import { redisKeys, apiPanel, pgRows, cables } from "./back.mjs";
import { CHUNK, PART, partPlan } from "../../intake-model.mjs";

export const FILE_MIB = 420;

export function projectionFor(points, W, view, pad = 30) {
  const unit = points.map((p) => k.iso(p, { origin: [0, 0], scale: 1, ...view }));
  const span = (i) => Math.max(...unit.map((p) => p[i])) - Math.min(...unit.map((p) => p[i]));
  const H = Math.round((W - 2 * pad) * (span(1) / span(0)) + 2 * pad);
  return { P: k.fitProjection(points, W, H, { pad, ...view }), H };
}

export function buildIntake({ audit = false } = {}) {
  const size = FILE_MIB * 1048576;
  const chunks = Math.ceil(size / CHUNK);
  const widths = Array.from({ length: chunks }, (_, j) => (L.SLICE.w * Math.min(CHUNK, size - j * CHUNK)) / CHUNK);
  const plan = partPlan(size);
  const parts = plan.length;
  const points = [...k.boxCorners(L.BENCH, -L.BENCH_H - L.FOOT_H, 0), [L.REDIS.x, L.REDIS.y, L.BACK_H + 4], [L.PG.x + L.PG.w, L.PG.y, L.BACK_H + 4]];
  const { P, H } = projectionFor(points, L.W, { azimuth: L.AZIMUTH, elevation: L.ELEVATION });
  const sc = makeScene(P);
  bench(sc, L.BENCH, { plate: { x: 786, y: 200, w: 56, d: 70, r: 2 }, ruler: { x: 330, y: L.BENCH.d - 15, w: 440, d: 8, r: 1 } });
  desk(sc, widths);
  network(sc);
  caddyArch(sc);
  tusd(sc);
  minio(sc, plan.map((b) => b / PART));
  redisKeys(sc);
  apiPanel(sc);
  pgRows(sc);
  cables(sc);
  // Slices on the chute pass over empty slots only, so they draw just before the parts.
  const adjust = (items) => {
    const flight = items.find((it) => it.name === "tusd.flight");
    flight.key = Math.min(...items.filter((it) => /^minio\.(part|object|info)/.test(it.name)).map((it) => it.key)) - 0.001;
  };
  const body = settleAndEmit(sc, { audit, adjust });
  const svg = k.figureSvg({ width: L.W, height: H, label: "A resumable tus upload as a machine: the file is a loaf cut into 50 MiB slices that ride a belt through Caddy's arch into tusd, then drop into MinIO as 50 MB parts, while a hook checkpoint, a Redis key cabinet and PostgreSQL rows record it.", body });
  const slab = (x, w) => k.solidSvg(k.slabOf({ x, y: L.LANE_C - L.SLICE.d / 2, w, d: L.SLICE.d, r: 0.8 }, 0, L.SLICE.h, P, 2, 0.3), { tone: "hi" });
  const data = {
    P, H, chunks, parts, widths, pitch: L.SLICE.pitch, sizeMiB: FILE_MIB,
    belt: { x0: L.BLADE_X + 3, x1: L.TUSD.x, z: L.BELT_Z },
    chute: { x0: L.TUSD.x + L.TUSD.w, z: L.CHUTE_Z },
    partX: Array.from({ length: parts }, (_, j) => L.PART_X0 + (parts - 1 - j) * L.PART_PITCH),
    sliceSvg: widths.map((w) => slab(0, w)),
    partSvg: k.solidSvg(k.slabOf({ x: 0, y: L.LANE_C - 8, w: 4, d: 16, r: 0.6 }, 0, 15, P, 1, 0.2), { tone: "hi" }),
    dial: { x: L.REDIS.x + 98, z: 34, r: 13 },
    stations: L.STATIONS,
  };
  return { svg, data, count: sc.R.items.length };
}
