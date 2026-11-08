// Cables drawn as depth-sorted tube chunks, each with a centreline the live code lights
// to show traffic travelling along it.
import { k, A, T, G } from "./scene.mjs";

export function cable(sc, name, st, corners, r, { pulse, maxLength = 26, tone = "mid", bend = 7 } = {}) {
  const { P, R, put } = sc;
  const route = corners.length > 2 ? G.fillet(corners, bend, 9, { P, tube: r }) : corners;
  R.route(name, route, r, { piece: st, limp: true });
  const pieces = T.tubePieces(route, r, P, { maxLength });
  const total = route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - route[i][0], p[1] - route[i][1], p[2] - route[i][2]), 0);
  for (const piece of pieces) {
    const line = pulse ? `<path class="pulse" data-pulse="${pulse}" data-from="${piece.from.toFixed(2)}" data-to="${piece.to.toFixed(2)}" data-total="${total.toFixed(2)}" d="${centreline(piece.points, P)}"/>` : "";
    put(name, st, piece.mid, T.tubeSvg(piece, { tone }) + line, [A.tube(piece.points, piece.radii)], { cls: "cable", route: name, chunk: pieces.indexOf(piece) });
  }
}

const centreline = (pts, P) => "M" + pts.map((p) => k.iso(p, P).map((v) => v.toFixed(2)).join(" ")).join("L");
