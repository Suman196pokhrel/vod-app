// The bench every detail plate stands on: feet, a bevelled slab, a groove, corner screws,
// a name plate and a ruler strip along the front edge.
import { k, A } from "./scene.mjs";

export function bench(sc, BENCH, { h = 14, foot = 7, plate, ruler } = {}) {
  const { P, S, L, D, at, put, cornerScrews } = sc;
  const z0 = -h - foot;
  const feet = k.corners(BENCH, 26).concat([[BENCH.x + BENCH.w / 2, BENCH.y + 26], [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d - 26]]);
  for (const [x, y] of feet) {
    const svg = S(k.cylinder(x, y, 9, z0, 2, P, 32), { tone: "lo" }) + S(k.cylinder(x, y, 7, z0 + 2, foot - 2, P, 32), { tone: "mid" });
    put("stand.foot", "bench", [x, y, z0], svg, [A.cylinder(x, y, 9, z0, foot, { name: "stand.foot", ground: true })]);
  }
  const top = [L(k.planOutline(k.insetPlan(BENCH, 6), 0, P, 8), { tone: "faint" }), cornerScrews(BENCH, 0, 12, 2.2)];
  if (plate) {
    top.push(S(k.slabOf(plate, 0, 0.8, P, 3), { tone: "lo", crease: "none" }), L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P, 3), { tone: "faint" }));
    top.push(sc.rules(plate.x + 5, plate.y + 6, 0.8, Array.from({ length: Math.floor((plate.d - 10) / 3.6) }, (_, i) => (plate.w - 12) * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7)))), 3.6), cornerScrews(plate, 0.8, 2.4, 0.7));
  }
  if (ruler) {
    const t = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 5, 5, ruler.y, 0.6, [2.2, 4], P);
    top.push(S(k.slabOf(ruler, 0, 0.6, P, 3), { tone: "lo", crease: "none" }), L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }), D([at([ruler.x + 2, ruler.y + 4, 0.6]), at([ruler.x + ruler.w - 2, ruler.y + 4, 0.6])], { size: 0.45 }));
  }
  const svg = `<path class="iso-halo" d="${k.haloOf(BENCH, z0, h, P)}"/>` + S(k.slabOf(BENCH, -h, h, P, 10, 1.6), { tone: "mid", inner: L(k.sideSeam(BENCH, -6, P, 10), { tone: "faint" }) }) + top.join("");
  put("stand.bench", "bench", [BENCH.x + BENCH.w / 2, BENCH.y + BENCH.d / 2, -h], svg, [A.slab(BENCH, -h, h, { name: "stand.bench" }, 10)], { bias: -1e4 });
}
