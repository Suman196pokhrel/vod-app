// Builds dist/index.html (all plates, tabbed) plus one standalone page per finished plate
// for verification. `node build.mjs --audit` also runs the anatomy geometry audit.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL } from "./src/scene.mjs";
import { resolveRefs } from "./src/refs.mjs";
import { pageHtml } from "./src/shell.mjs";
import { buildPlant } from "./src/plates/plant/plant.mjs";
import * as L from "./src/plates/plant/layout.mjs";
import { STAGES } from "./src/model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const audit = process.argv.includes("--audit");
const { kitScript } = await import(`${SKILL}/scripts/inline-kit.mjs`);
const src = (f) => readFileSync(join(HERE, "src", f), "utf8");
const unexport = (code) => code.replace(/^export /gm, "");

const plant = buildPlant({ audit });
const plantData = {
  ...plant.data,
  barW: L.ADMIN.w - 30,
  gaugeW: 52,
  scrubW: 64 - 22,
  dial: { x: L.DIAL.x, y: L.DIAL.y, z: 8.2, r: 5.5, a0: -2.2, a1: 2.2 },
  stages: STAGES.slice(1, 9),
};

const btn = (attr, label, pressed) => `<button class="btn" ${attr}${pressed === undefined ? "" : ` aria-pressed="${pressed}"`}>${label}</button>`;
const plantControls = [
  `<div class="btns">${[["one", "One upload"], ["burst", "5 uploads at once"], ["cap", "9 at once (hit the cap)"], ["lowres", "480p source"], ["corrupt", "Corrupt file"]].map(([id, l]) => btn(`data-run="${id}"`, l, false)).join("")}${btn("data-kill", "Restart the worker")}${btn("data-publish", "Publish newest draft")}</div>`,
  `<div class="seg"><span class="lbl">Worker slots</span>${btn('data-set="concurrency:1"', "1 · prod", true)}${btn('data-set="concurrency:3"', "3 · local dev", false)}</div>`,
  `<div class="seg"><span class="lbl">Processing lock</span>${btn('data-set="lock:on"', "on · today", true)}${btn('data-set="lock:off"', "off · before the fix", false)}</div>`,
  `<div class="seg"><span class="lbl">Clock</span>${btn('data-set="speed:0.75"', "slow", false)}${btn('data-set="speed:1.5"', "normal", true)}${btn('data-set="speed:3"', "fast", false)}</div>`,
].join("");

const plates = [
  {
    id: "plant", tab: "The plant", ready: true, fig: "Fig 1", title: "The whole plant", hint: "Hover to identify · click to zoom",
    aria: "The whole VOD platform as a workbench of machines. Hover or tab through the numbered parts list to identify each one.",
    caption: "Eleven numbered parts on one bench. Pulses of light on the cables and the backend_net bus are real requests: tus PATCHes, hook calls, Redis commands, Celery messages, MinIO object reads and writes, and the admin page's 2-second status poll. New uploads land as drafts; the viewer only streams published titles. Durations are illustrative; caps, statuses, order and branches are the code's own.",
    svg: plant.svg, controls: plantControls, stations: L.STATIONS,
  },
  { id: "intake", tab: "Intake · tus upload", ready: false },
  { id: "queue", tab: "The queue · Redis lock", ready: false },
  { id: "transcode", tab: "Transcode · 7 rungs", ready: false },
  { id: "package", tab: "Package & play · HLS", ready: false },
];

const script = [
  kitScript(),
  unexport(src("model.mjs")),
  `const REFS = ${JSON.stringify(resolveRefs())};`,
  `const PLANT = ${JSON.stringify(plantData)};`,
  src("live/core.js"),
  src("live/plant-render.js"),
  src("live/plant.js"),
  "window.__vod = { PLANT, translateAlong, iso }; initTheme(); initTabs();",
].join("\n");

mkdirSync(join(HERE, "dist"), { recursive: true });
writeFileSync(join(HERE, "dist", "index.html"), pageHtml({ plates, script, theme: "dark" }));
console.log(`plant: ${plant.count} items, page ${(readFileSync(join(HERE, "dist", "index.html")).length / 1024).toFixed(0)} KB`);
