// Scene builder: every drawn item records its true shape into the anatomy audit's
// recorder, so painter's keys are settled from geometry and the audit can prove it.
export const SKILL = process.env.ANATOMY_SKILL || "/home/suman/.claude/skills/anatomy";
export const k = await import(`${SKILL}/kit/iso-kit.mjs`);
export const G = await import(`${SKILL}/kit/lathe.mjs`);
export const A = await import(`${SKILL}/kit/audit.mjs`);
export const T = await import(`${SKILL}/kit/tube.mjs`);

export function makeScene(P) {
  const R = A.recorder(P);
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);

  const put = (name, st, centre, svg, shapes, { bias = 0, dyn, cls, route, chunk } = {}) =>
    R.put({ name: route ? `${route}:${chunk}` : R.nameFor(name), piece: st, at: centre, bias, svg, dyn, cls, route, chunk, shapes: route ? shapes : shapes.map((s) => R.solid(s)) });

  const centreOf = (plan, z, h) => [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];

  // A rounded box with optional lines drawn on it (`inner` under its outline, `over` on top).
  const box = (name, st, plan, z, h, { tone = "mid", steps = 4, bevel = 0.5, inner = "", over = "", lit, crease, bias, dyn, cls, seam, owner } = {}) => {
    const seamLine = seam !== undefined ? L(k.sideSeam(plan, seam, P, steps), { tone: "faint" }) : "";
    const svg = S(k.slabOf(plan, z, h, P, steps, bevel), { tone, lit, crease, inner: seamLine + inner }) + over;
    return put(name, st, centreOf(plan, z, h), svg, [A.slab(plan, z, h, { name, ...(owner ? { owner } : {}) }, steps)], { bias, dyn, cls });
  };

  const cyl = (name, st, cx, cy, r, z, h, { tone = "mid", steps = 28, bevel = 0, inner = "", over = "", lit, crease, bias, dyn, cls, ground, owner } = {}) => {
    const svg = S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone, lit, crease, inner }) + over;
    return put(name, st, [cx, cy, z + h / 2], svg, [A.cylinder(cx, cy, r, z, h, { name, ...(ground ? { ground: true } : {}), ...(owner ? { owner } : {}) })], { bias, dyn, cls });
  };

  // A round boss standing out of a vertical face along `axis` (a socket or a cable port).
  const boss = (name, st, o, axis, len, r, { tone = "lo", over = "" } = {}) => {
    const F = G.frameAlong(o, axis);
    const end = G.add3(o, G.mul3(axis, len));
    const face = G.dot3(axis, G.viewOf(P)) > 0.12 ? L(G.circleOf(G.frameAlong(end, axis), 0, r * 0.55, P, 24), { tone: "faint" }) : "";
    put(name, st, G.add3(o, G.mul3(axis, len / 2)), S(G.disc(0, len, r, F, P), { tone }) + face + over, [A.disc(F, 0, len, r, { name })]);
    return end;
  };

  // Closed rectangles on a vertical face (vents, bays, drawer fronts): no line ends to float.
  const rectPath = (corners) => "M" + corners.map((p) => k.iso(p, P).map((v) => v.toFixed(2)).join(" ")).join("L") + "Z";
  const slotsY = (y, spans, z0, z1) => L(spans.map(([x0, x1]) => rectPath([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])).join(""), { tone: "lo" });
  const slotsX = (x, spans, z0, z1) => L(spans.map(([y0, y1]) => rectPath([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]])).join(""), { tone: "lo" });
  const bandsX = (x, y0, y1, bands) => L(bands.map(([z0, z1]) => rectPath([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]])).join(""), { tone: "lo" });

  const screws = (pts, z, ring = 1.2) =>
    L(pts.map(([x, y]) => k.ring(x, y, ring, z, P, 14)).join(""), { tone: "lo" }) + D(pts.map(([x, y]) => at([x, y, z])), { size: 0.45 });

  const cornerScrews = (plan, z, inset = 3, ring = 1.1) => screws(k.corners(plan, inset), z, ring);

  // Engraved part number on a small label plate lying on a top face: the only words in the drawing.
  const badge = (x, y, z, n) => {
    const plate = { x, y, w: 14, d: 8, r: 1 };
    const text = k.faceTextSvg(k.topMatrix([x + 7, y + 4.9], z + 0.6, P), String(n).padStart(2, "0"), { size: 4.2, tone: "hi", anchor: "middle" });
    return S(k.slabOf(plate, z, 0.6, P, 3), { tone: "lo", crease: "none" }) + L(k.planOutline(k.insetPlan(plate, 1), z + 0.6, P, 3), { tone: "faint" }) + text;
  };

  // Rule lines standing for printed text on a label plate.
  const rules = (x, y, z, lengths, gap = 2.2) =>
    lengths.map((len, i) => L(k.lineOnTop([x, y + i * gap], [x + len, y + i * gap], z, P), { tone: "faint", free: true })).join("");

  const lamp = (cx, cy, z, id, r = 2.2) =>
    `<g data-lamp="${id}">${S(k.cylinder(cx, cy, r + 0.9, z, 1, P, 20), { tone: "lo", crease: "none" })}${S(k.cylinder(cx, cy, r, z + 1, 1.4, P, 20, 0.3), { tone: "mid" })}<path class="lamp-glow" d="${k.ring(cx, cy, r - 0.6, z + 2.4, P, 18)}"/></g>`;

  // A lamp set into a vertical +y face, and a group drawn in that face's own plane.
  const faceLamp = (x, y, z, id, r = 2) =>
    `<g data-lamp="${id}">${L(k.sideRing([x, y, z], r + 0.9, "y", P), { tone: "lo" })}<path class="lamp-glow" d="${k.sideRing([x, y, z], r, "y", P)}"/></g>`;
  const onFace = (y, inner) => `<g transform="${k.sideMatrix([0, y], 0, P, "left")}">${inner}</g>`;
  const faceWindow = (x0, x1, z0, z1, id, inner = "") => {
    const r = `x="${x0}" y="${-z1}" width="${x1 - x0}" height="${z1 - z0}" rx="1"`;
    return `<clipPath id="clip-${id}"><rect ${r}/></clipPath><rect class="screen-glass" ${r}/><g clip-path="url(#clip-${id})" data-window="${id}">${inner}</g><rect class="iso-line" data-tone="lo" fill="none" x="${x0 - 0.6}" y="${-z1 - 0.6}" width="${x1 - x0 + 1.2}" height="${z1 - z0 + 1.2}" rx="1.4"/>`;
  };

  const halo = (plan, z, h) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`;

  const shapes = { cyl: (cx, cy, r, z, h, name) => A.cylinder(cx, cy, r, z, h, { name }), slab: (plan, z, h, name) => A.slab(plan, z, h, { name }, 2) };

  return { R, P, at, S, L, D, put, shapes, box, cyl, boss, slotsY, slotsX, bandsX, screws, cornerScrews, badge, rules, lamp, faceLamp, onFace, faceWindow, halo, centreOf };
}

export function settleAndEmit(scene, { audit = false, adjust, allow = [] } = {}) {
  const { R, P } = scene;
  A.settle(R, P);
  adjust?.(R.items);
  R.items.sort((a, b) => a.key - b.key);
  // Mutually exclusive states share one place (a lockout or a work can; a rendition or its skip cover).
  if (audit) A.auditOrExit(R, P, { argv: ["--audit"], allow: [["worker.work*", "worker.lockout*"], ["worker.rendition*", "worker.skipcover*"], ...allow] });
  return R.items
    .map((it) => `<g class="it${it.cls ? " " + it.cls : ""}" data-st="${it.piece}"${it.dyn ? ` data-dyn="${it.dyn}"` : ""}>${it.svg}</g>`)
    .join("");
}
