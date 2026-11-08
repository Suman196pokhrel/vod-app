// Outside the fence: the admin's upload desk (Uppy) and the viewer's screen (video.js).
import { k } from "../../scene.mjs";
import { ADMIN, VIEWER, CADDY, DIAL } from "./layout.mjs";
import { cable } from "./structure.mjs";

// A monitor standing on a base, its screen drawn in the plane of its front face (+y).
function monitor(sc, st, x, y, w, z, h, screen) {
  const { P, box } = sc;
  const cx = x + w / 2;
  box(`${st}.foot`, st, { x: cx - 14, y: y - 2, w: 28, d: 12, r: 2 }, z, 2.4, { tone: "mid", bevel: 0.4 });
  box(`${st}.neck`, st, { x: cx - 3, y: y + 1, w: 6, d: 4, r: 1 }, z + 2.4, 12, { tone: "mid", steps: 2 });
  const body = { x, y: y + 5, w, d: 6, r: 1.5 };
  const fz = z + 14;
  const m = k.sideMatrix([0, body.y + body.d], 0, P, "left");
  const i = 3, gx = x + i, gy = -(fz + h - i), gw = w - i * 2, gh = h - i * 2;
  const face = `<g transform="${m}"><clipPath id="clip-${st}"><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="1.2"/></clipPath><rect class="screen-glass" x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="1.2"/><g data-screen="${st}" clip-path="url(#clip-${st})">${screen}</g><rect class="iso-line" data-tone="lo" x="${gx - 0.6}" y="${gy - 0.6}" width="${gw + 1.2}" height="${gh + 1.2}" rx="1.6" fill="none"/></g>`;
  box(`${st}.monitor`, st, body, fz, h, { tone: "mid", steps: 3, bevel: 0.5, over: face + sc.lamp(x + w - 5, body.y + 3, fz + h, `${st}-power`, 1.1) });
}

export function admin(sc) {
  const { box, cyl, cornerScrews, badge, P, L } = sc;
  const plan = ADMIN;
  box("admin.base", "admin", plan, 0, 4, { tone: "lo", steps: 4, bevel: 0.6, over: cornerScrews(plan, 4, 4, 1) + badge(plan.x + 6, plan.y + plan.d - 14, 4, 1) });
  const bars = Array.from({ length: 8 }, (_, i) => `<g data-upbar="${i}" class="upbar"><rect class="bar-track" x="${plan.x + 12}" y="${-(45 - i * 2.9)}" width="${plan.w - 30}" height="1.7" rx=".8"/><rect class="bar-fill" x="${plan.x + 12}" y="${-(45 - i * 2.9)}" width="0" height="1.7" rx=".8"/></g>`).join("");
  monitor(sc, "admin", plan.x + 6, plan.y + 4, plan.w - 18, 4, 30, bars);
  // Magazine of files waiting to upload: 2 rows × 6 film cans on a tray.
  const tray = { x: plan.x + 8, y: plan.y + 58, w: 74, d: 30, r: 2 };
  box("admin.tray", "admin", tray, 4, 3, { tone: "mid", bevel: 0.4, over: L(k.planOutline(k.insetPlan(tray, 2), 7, P, 3), { tone: "faint" }) });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = tray.x + 7 + col * 12, cy = tray.y + 8 + row * 14;
      cyl("admin.can", "admin", cx, cy, 5, 7, 7, { tone: "hi", steps: 24, bevel: 0.4, cls: "can", dyn: `can-${row * 6 + col}`, inner: sc.L(k.sideArc(cx, cy, 5, 10.5, P, 18), { tone: "faint" }), over: sc.L(k.ring(cx, cy, 2.6, 14, P, 16), { tone: "lo" }) });
    }
  }
  // Uppy's chunker: a guillotine that cuts the file into 50 MiB wafers for the wire.
  const sx = plan.x + plan.w - 22, sy = 200;
  box("admin.slicer", "admin", { x: sx, y: sy, w: 18, d: 30, r: 1.5 }, 4, 8, { tone: "mid", bevel: 0.4, seam: 8, over: sc.screws([[sx + 3, sy + 14], [sx + 15, sy + 14]], 12, 0.6) });
  for (const py of [sy + 1, sy + 26]) box("admin.slicer.post", "admin", { x: sx + 7, y: py, w: 4, d: 3, r: 0.6 }, 12, 22, { tone: "mid", steps: 2 });
  box("admin.slicer.bar", "admin", { x: sx + 6, y: sy + 1, w: 6, d: 28, r: 0.8 }, 34, 2.4, { tone: "mid", steps: 2, bevel: 0.3 });
  box("admin.blade", "admin", { x: sx + 7.5, y: sy + 4, w: 3, d: 22, r: 0.5 }, 22, 6, { tone: "hi", steps: 2, dyn: "blade", cls: "blade" });
  const from = sc.boss("admin.port", "admin", [sx + 18, 215, 8], [1, 0, 0], 3, 2.8);
  const to = sc.boss("caddy.socket", "caddy", [CADDY.x, 215, 8], [-1, 0, 0], 3, 3.2);
  cable(sc, "link.admin", "admin", [from, to], 1.6, { pulse: "admin" });
}

export function viewer(sc) {
  const { box, cyl, cornerScrews, badge, P } = sc;
  const plan = VIEWER;
  box("viewer.base", "viewer", plan, 0, 4, { tone: "lo", bevel: 0.6, over: cornerScrews(plan, 4, 4, 1) + badge(plan.x + 76, plan.y + 9, 4, 2) });
  const w = 64, h = 42;
  const x0 = plan.x + 4;
  const scene = `<g class="player"><rect class="pic-sky" x="${x0 + 3}" y="${-(18 + h - 3)}" width="${w - 6}" height="${h - 6}"/><path class="pic-hill" d="M${x0 + 3} ${-21}L${x0 + 20} ${-34}L${x0 + 34} ${-26}L${x0 + 52} ${-40}L${x0 + w - 3} ${-24}L${x0 + w - 3} ${-21}Z"/><circle class="pic-sun" cx="${x0 + w - 24}" cy="${-52}" r="4"/><g data-ladder>${Array.from({ length: 7 }, (_, i) => `<rect class="pip" data-pip="${i}" x="${x0 + w - 10}" y="${-(56 - i * 4.4)}" width="4" height="3" rx=".6"/>`).join("")}</g><rect class="scrub" x="${x0 + 6}" y="${-23}" width="${w - 22}" height="1.4" rx=".7"/><rect class="scrub-fill" data-scrub x="${x0 + 6}" y="${-23}" width="0" height="1.4" rx=".7"/><g data-paused class="paused"><rect x="${x0 + w / 2 - 8}" y="${-46}" width="16" height="12" rx="2"/><path d="M${x0 + w / 2 - 2} ${-43.5}L${x0 + w / 2 + 3} ${-40}L${x0 + w / 2 - 2} ${-36.5}Z"/></g></g>`;
  monitor(sc, "viewer", x0, plan.y + 6, w, 4, h, scene);
  // A bandwidth dial: the player's view of the network, which drives rendition choice.
  const dx = DIAL.x, dy = DIAL.y;
  cyl("viewer.dial", "viewer", dx, dy, DIAL.r, 4, 4, { tone: "mid", steps: 40, bevel: 0.5, over: sc.L(k.radialTicks(dx, dy, DIAL.r - 1, 28, 4, 8, [1.1, 2.2], P, -2.2, 4.4).minor, { tone: "lo" }) + `<path class="iso-line needle" data-tone="lit" data-needle d="${k.lineOnTop([dx, dy], [dx, dy - 5.5], 8.2, P)}"/>` + sc.D([sc.at([dx, dy, 8.2])], { size: 0.7 }) });
  box("viewer.jack", "viewer", { x: plan.x + plan.w - 12, y: 84, w: 12, d: 16, r: 1.5 }, 4, 12, { tone: "mid", steps: 2, bevel: 0.4, over: sc.screws([[plan.x + plan.w - 6, 87.5]], 16, 0.6) });
  const from = sc.boss("viewer.port", "viewer", [plan.x + plan.w, 92, 10], [1, 0, 0], 3, 2.8);
  const to = sc.boss("caddy.socket", "caddy", [CADDY.x, 92, 10], [-1, 0, 0], 3, 3.2);
  cable(sc, "link.viewer", "viewer", [from, to], 1.6, { pulse: "viewer" });
}
