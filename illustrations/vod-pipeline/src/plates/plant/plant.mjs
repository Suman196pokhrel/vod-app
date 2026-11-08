// Plate 1: the whole plant on one bench. Builds the static art once and returns the SVG
// plus the data the live code needs to move tokens and route traffic pulses.
import { k, makeScene, settleAndEmit } from "../../scene.mjs";
import * as L from "./layout.mjs";
import { bench, fence, busDuct } from "./structure.mjs";
import { admin, viewer } from "./clients.mjs";
import { caddy, tusd, api } from "./edge.mjs";
import { postgres, redis } from "./state.mjs";
import { worker, minio } from "./machine.mjs";
import { statusRail, RAIL, STOPS } from "./rail.mjs";

export function buildPlant({ audit = false } = {}) {
  const view = { azimuth: L.AZIMUTH, elevation: L.ELEVATION };
  const unit = L.fitPoints().map((p) => k.iso(p, { origin: [0, 0], scale: 1, ...view }));
  const span = (i) => Math.max(...unit.map((p) => p[i])) - Math.min(...unit.map((p) => p[i]));
  const H = Math.round((L.W - 60) * (span(1) / span(0)) + 60);
  const P = k.fitProjection(L.fitPoints(), L.W, H, { pad: 30, ...view });
  const sc = makeScene(P);
  bench(sc);
  fence(sc);
  busDuct(sc);
  viewer(sc);
  admin(sc);
  caddy(sc);
  tusd(sc);
  api(sc);
  postgres(sc);
  redis(sc);
  worker(sc);
  minio(sc);
  statusRail(sc);
  const items = settleAndEmit(sc, { audit });
  const svg = k.figureSvg({
    width: L.W,
    height: H,
    label: "An isometric workbench model of the VOD platform: client desks outside a fence, Caddy as the gate, then tusd, FastAPI, PostgreSQL, Redis, the Celery worker and MinIO standing in front of the backend_net bus duct.",
    body: items,
  });
  const data = {
    P,
    H,
    bus: { y: L.BUS.y + L.BUS.d, z: L.BUS_Z + L.BUS_H / 2, x0: L.BUS.x + 8, x1: L.BUS.x + L.BUS.w - 8 },
    taps: Object.fromEntries(Object.entries(L.DROPS).map(([id, d]) => [id, d.x])),
    stations: L.STATIONS,
    rail: { x0: RAIL.x0, x1: RAIL.x1, stops: STOPS },
  };
  return { svg, data, count: sc.R.items.length };
}
