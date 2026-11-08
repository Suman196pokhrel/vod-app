// Caddy (the gate in the fence), tusd (eight receiving lanes) and FastAPI (the switchboard).
import { k } from "../../scene.mjs";
import { CADDY, CADDY_H, TUSD, TUSD_H, API, API_H } from "./layout.mjs";

export function caddy(sc) {
  const { box, P, L } = sc;
  const plinth = k.insetPlan(CADDY, -2);
  box("caddy.plinth", "caddy", plinth, 0, 4, { tone: "lo", bevel: 0.5 });
  const vents = [];
  for (let i = 0; i < 9; i++) {
    const x = CADDY.x + 12 + i * 6.4, y = CADDY.y + CADDY.d;
    vents.push("M" + [[x - 1.4, y, 12], [x + 1.4, y, 12], [x + 1.4, y, 28], [x - 1.4, y, 28]].map((p) => k.iso(p, P).map((v) => v.toFixed(2)).join(" ")).join("L") + "Z");
  }
  box("caddy.body", "caddy", CADDY, 4, CADDY_H - 4, { tone: "mid", steps: 4, bevel: 0.8, seam: 10, over: L(vents.join(""), { tone: "lo" }) });
  // Four route slots on the lid: /files, /storage, /internal (blanked: respond 404), catch-all.
  const routes = ["files", "storage", "internal", "api"];
  routes.forEach((route, i) => {
    const slot = { x: CADDY.x + 18, y: CADDY.y + 52 + i * 34, w: 34, d: 12, r: 2 };
    const groove = L(k.planOutline(slot, CADDY_H, P, 3), { tone: "lo" }) + L(k.lineOnTop([slot.x, slot.y + 6], [slot.x + slot.w, slot.y + 6], CADDY_H, P), { tone: "faint" });
    box("caddy.slotring", "caddy", k.insetPlan(slot, -2.4), CADDY_H, 0.6, { tone: "lo", crease: "none", bevel: 0, over: groove + sc.lamp(slot.x + slot.w + 9, slot.y + 6, CADDY_H, `route-${route}`, 2) });
    if (route === "internal") {
      const cover = k.insetPlan(slot, -1.2);
      box("caddy.blank", "caddy", cover, CADDY_H + 0.6, 1.6, { tone: "hi", steps: 3, bevel: 0.4, over: sc.screws([[cover.x + 3, cover.y + cover.d / 2], [cover.x + cover.w - 3, cover.y + cover.d / 2]], CADDY_H + 2.2, 0.6) });
    }
  });
  box("caddy.badge", "caddy", { x: CADDY.x + 10, y: CADDY.y + CADDY.d - 22, w: 20, d: 14, r: 1.5 }, CADDY_H, 0.4, { tone: "lo", crease: "none", over: sc.badge(CADDY.x + 13, CADDY.y + CADDY.d - 19, CADDY_H + 0.4, 3) });
}

export function tusd(sc) {
  const { box, P, L } = sc;
  box("tusd.base", "tusd", TUSD, 0, 10, { tone: "mid", bevel: 0.6, seam: 4, over: sc.slotsX(TUSD.x + TUSD.w, [[TUSD.y + 30, TUSD.y + 120]], 5.5, 8.5) });
  const head = { x: TUSD.x + 2, y: TUSD.y + 2, w: TUSD.w - 4, d: 22, r: 2 };
  box("tusd.head", "tusd", head, 10, TUSD_H - 10, { tone: "mid", steps: 3, bevel: 0.6, seam: 22, over: sc.screws([[head.x + 4, head.y + 4], [head.x + head.w - 4, head.y + head.d - 4]], TUSD_H, 0.8) + sc.badge(head.x + 6, head.y + 7, TUSD_H, 4) });
  // Eight receiving lanes, one per admitted upload; wafers are the 50 MiB parts as they land.
  const lane0 = TUSD.x + 8, laneW = 11.5;
  for (let i = 0; i <= 8; i++) {
    const x = lane0 + i * laneW - 1;
    box("tusd.fin", "tusd", { x, y: head.y + head.d + 2, w: 2, d: TUSD.d - head.d - 10, r: 0.6 }, 10, 7, { tone: "mid", steps: 2, bevel: 0.2 });
  }
  for (let i = 0; i < 8; i++) {
    const x = lane0 + i * laneW + 1.6;
    sc.lamp(x + 3.6, head.y + head.d - 4, TUSD_H, `lane-${i}`, 1.4);
    for (let j = 0; j < 8; j++) {
      const y = head.y + head.d + 6 + j * 11;
      box("tusd.wafer", "tusd", { x, y, w: 7.2, d: 3, r: 0.6 }, 10, 6, { tone: "hi", steps: 2, bevel: 0.2, dyn: `wafer-${i}-${j}`, cls: "wafer" });
    }
  }
  box("tusd.lip", "tusd", { x: TUSD.x + 4, y: TUSD.y + TUSD.d - 6, w: TUSD.w - 8, d: 4, r: 1 }, 10, 4, { tone: "lo", steps: 2, over: L(k.lineOnTop([TUSD.x + 4, TUSD.y + TUSD.d - 4], [TUSD.x + TUSD.w - 4, TUSD.y + TUSD.d - 4], 14, P), { tone: "faint" }) });
}

export function api(sc) {
  const { box, P, L } = sc;
  const dy = API.y + API.d;
  box("api.desk", "api", API, 0, API_H, { tone: "mid", bevel: 0.8, seam: 8, over: sc.slotsY(dy, [[API.x + 10, API.x + 52], [API.x + 58, API.x + 100]], 11, 24) + sc.slotsY(dy, [[API.x + 26, API.x + 36], [API.x + 74, API.x + 84]], 20, 22) + sc.slotsX(API.x + API.w, [[API.y + 14, API.y + 104]], 11, 24) });
  const panel = { x: API.x + 4, y: API.y + 2, w: API.w - 8, d: 12, r: 1.5 };
  const fy = panel.y + panel.d;
  const jacks = [];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) jacks.push(k.sideRing([panel.x + 10 + i * 10.4, fy, API_H + 7 + row * 7], 1.6, "y", P));
  box("api.panel", "api", panel, API_H, 20, { tone: "mid", steps: 2, bevel: 0.5, over: L(jacks.join(""), { tone: "lo" }) });
  // Three hook keys on the desk: pre-create, post-finish, post-terminate; and the status bridge.
  const keys = ["pre-create", "post-finish", "post-terminate", "status"];
  keys.forEach((name, i) => {
    const x = API.x + 14 + i * 22, y = API.y + 34;
    box("api.key", "api", { x, y, w: 14, d: 22, r: 2 }, API_H, 3, { tone: "hi", steps: 3, bevel: 0.4, dyn: `key-${name}`, over: sc.lamp(x + 7, y + 6, API_H + 3, `hook-${name}`, 1.6) + L(k.lineOnTop([x, y + 15], [x + 14, y + 15], API_H + 3, P), { tone: "faint" }) });
  });
  box("api.pad", "api", { x: API.x + 14, y: API.y + 66, w: 84, d: 36, r: 2 }, API_H, 1, { tone: "lo", crease: "none", over: sc.rules(API.x + 20, API.y + 74, API_H + 1, [50, 38, 46, 26, 42, 32, 20], 3.2) + sc.badge(API.x + 80, API.y + 86, API_H + 1, 5) });
}
