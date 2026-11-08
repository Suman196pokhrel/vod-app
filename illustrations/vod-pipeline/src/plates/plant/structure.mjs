// The bench, the internet fence and the backend_net bus duct with its drop cables.
import { k, A, T } from "../../scene.mjs";
import { BENCH, BENCH_H, FOOT_H, BUS, BUS_Z, BUS_H, POSTS_X, TAP_Y, TAP_D, TAP_Z, TAP_H, FENCE_X, CADDY, DROPS } from "./layout.mjs";

export function bench(sc) {
  const { P, S, L, D, at, put, cornerScrews } = sc;
  const z0 = -BENCH_H - FOOT_H;
  const feet = k.corners(BENCH, 26).concat([[BENCH.x + BENCH.w / 2, BENCH.y + 26], [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d - 26]]);
  for (const [x, y] of feet) {
    const svg = S(k.cylinder(x, y, 9, z0, 2, P, 32), { tone: "lo" }) + S(k.cylinder(x, y, 7, z0 + 2, FOOT_H - 2, P, 32), { tone: "mid" });
    put("stand.foot", "bench", [x, y, z0], svg, [A.cylinder(x, y, 9, z0, FOOT_H, { name: "stand.foot", ground: true })]);
  }
  const plate = { x: 1212, y: 262, w: 28, d: 60, r: 1.5 };
  const top = [
    L(k.planOutline(k.insetPlan(BENCH, 6), 0, P, 8), { tone: "faint" }),
    cornerScrews(BENCH, 0, 12, 2.2),
    S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }),
    L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 3), { tone: "faint" }),
    sc.rules(plate.x + 6, plate.y + 8, 0.8, [16, 12, 14, 8, 15, 10, 13, 6, 14, 11, 9, 15, 12], 3.6),
    cornerScrews(plate, 0.8, 2.4, 0.7),
  ].join("");
  const svg = `<path class="iso-halo" d="${k.haloOf(BENCH, z0, BENCH_H, P)}"/>` + S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 10, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -6, P, 10), { tone: "faint" }) }) + top;
  put("stand.bench", "bench", [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d / 2, -BENCH_H], svg, [A.slab(BENCH, -BENCH_H, BENCH_H, { name: "stand.bench" }, 10)], { bias: -1e4 });
}

// A low wall between the internet (left) and the private network; Caddy is its only gate.
export function fence(sc) {
  const segs = [{ x: FENCE_X, y: 6, w: 6, d: CADDY.y - 8, r: 1 }, { x: FENCE_X, y: CADDY.y + CADDY.d + 2, w: 6, d: BENCH.d - 8 - CADDY.y - CADDY.d, r: 1 }];
  for (const plan of segs) {
    const posts = [];
    for (let y = plan.y + 6; y < plan.y + plan.d - 4; y += 22) posts.push([plan.x + 3, y]);
    sc.box("fence", "bus", plan, 0, 16, { tone: "lo", steps: 2, bevel: 0.3, seam: 8, over: sc.screws(posts, 16, 0.9) });
  }
}

export function busDuct(sc) {
  const { P, L, put, box, cyl } = sc;
  for (const x of POSTS_X) {
    cyl("bus.foot", "bus", x, BUS.y + BUS.d / 2, 6, 0, 2.4, { tone: "lo", over: sc.screws([[x - 4, BUS.y + 4], [x + 4, BUS.y + BUS.d - 4]], 2.4, 0.6) });
    box("bus.post", "bus", { x: x - 3, y: BUS.y + BUS.d / 2 - 3, w: 6, d: 6, r: 1 }, 2.4, BUS_Z - 2.4, { tone: "mid", steps: 2, bevel: 0.3 });
  }
  const zc = BUS_Z + BUS_H / 2;
  const fy = BUS.y + BUS.d;
  const slotPts = (x0, x1, z0, z1) => [[x0, fy, z0], [x1, fy, z0], [x1, fy, z1], [x0, fy, z1]].map((p) => k.iso(p, P));
  const slot = slotPts(BUS.x + 8, BUS.x + BUS.w - 8, zc - 3.2, zc + 3.2);
  const window = `<path class="bus-window" d="M${slot.map((p) => p.join(" ")).join("L")}Z"/>`;
  const joints = [];
  for (let x = BUS.x + 150; x < BUS.x + BUS.w - 20; x += 150) joints.push(k.segment([x, fy, BUS_Z], [x, fy, BUS_Z + BUS_H], P) + k.segment([x, fy, BUS_Z + BUS_H], [x, BUS.y, BUS_Z + BUS_H], P));
  const over = window + `<g data-bus-pulses></g>` + L(joints.join(""), { tone: "faint" });
  box("bus.duct", "bus", BUS, BUS_Z, BUS_H, { tone: "mid", steps: 3, bevel: 0.6, over, dyn: "bus", bias: -2 });
  for (const end of [BUS.x - 4, BUS.x + BUS.w]) box("bus.cap", "bus", { x: end, y: BUS.y - 1, w: 4, d: BUS.d + 2, r: 1 }, BUS_Z - 1, BUS_H + 2, { tone: "lo", steps: 2, bevel: 0.3 });
  for (const [st, d] of Object.entries(DROPS)) {
    const plan = { x: d.x - 9, y: TAP_Y, w: 18, d: TAP_D, r: 1.5 };
    const over = sc.screws([[d.x - 5.5, TAP_Y + TAP_D - 3.5], [d.x + 5.5, TAP_Y + TAP_D - 3.5]], TAP_Z + TAP_H, 0.7) + sc.lamp(d.x, TAP_Y + 6.5, TAP_Z + TAP_H, `tap-${st}`, 1.6);
    box("bus.tap", st, plan, TAP_Z, TAP_H, { tone: "mid", steps: 2, bevel: 0.4, seam: TAP_Z + 4, over });
    const gland = 4;
    cyl("bus.gland", st, d.x, d.y, 3.4, TAP_Z - gland, gland, { tone: "lo", steps: 20 });
    cyl("drop.boss", st, d.x, d.y, 4.6, d.z, 3, { tone: "mid", steps: 22, bevel: 0.3 });
    cable(sc, `drop.${st}`, st, [[d.x, d.y, d.z + 3], [d.x, d.y, TAP_Z - gland]], 1.7, { pulse: st });
  }
}

// A cable or pipe drawn as depth-sorted chunks, each with a centreline the live code lights
// to show traffic travelling along it.
export function cable(sc, name, st, route, r, { pulse, maxLength = 26, tone = "mid" } = {}) {
  const { P, R, put } = sc;
  R.route(name, route, r, { piece: st, limp: true });
  const pieces = T.tubePieces(route, r, P, { maxLength });
  const total = route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1], p[2] - route[i][2]), 0);
  for (const piece of pieces) {
    const line = pulse ? `<path class="pulse" data-pulse="${pulse}" data-from="${piece.from.toFixed(2)}" data-to="${piece.to.toFixed(2)}" data-total="${total.toFixed(2)}" d="${centreline(piece.points, P)}"/>` : "";
    put(name, st, piece.mid, T.tubeSvg(piece, { tone }) + line, [A.tube(piece.points, piece.radii)], { cls: "cable", route: name, chunk: pieces.indexOf(piece) });
  }
}

const centreline = (pts, P) => "M" + pts.map((p) => k.iso(p, P).map((v) => v.toFixed(2)).join(" ")).join("L");
