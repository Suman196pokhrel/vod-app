// The plate registry: what each tab builds, the scripts it needs and its rail controls.
import { buildPlant } from "./plates/plant/plant.mjs";
import * as PL from "./plates/plant/layout.mjs";
import { buildIntake } from "./plates/intake/intake.mjs";
import * as IL from "./plates/intake/layout.mjs";
import { buildQueue } from "./plates/queue/queue.mjs";
import * as QL from "./plates/queue/layout.mjs";
import { buildTranscode } from "./plates/transcode/transcode.mjs";
import * as TL from "./plates/transcode/layout.mjs";
import { buildPackage } from "./plates/package/package.mjs";
import * as KL from "./plates/package/layout.mjs";
import { SEGS } from "./package-model.mjs";
import { STAGES } from "./model.mjs";
import { CHECKS } from "./intake-model.mjs";

const btn = (attr, label, pressed) => `<button class="btn" ${attr}${pressed === undefined ? "" : ` aria-pressed="${pressed}"`}>${label}</button>`;
const runs = (list) => `<div class="btns">${list.map(([id, l]) => btn(`data-run="${id}"`, l, false)).join("")}</div>`;
const speeds = (values, at) => `<div class="seg"><span class="lbl">Clock</span>${values.map(([v, l]) => btn(`data-set="speed:${v}"`, l, v === at)).join("")}</div>`;

export const PLATES = [
  {
    id: "plant", tab: "The plant", fig: "Fig 1", title: "The whole plant", hint: "Hover to identify · click to zoom", dataName: "PLANT",
    aria: "The whole VOD platform as a workbench of machines. Hover or tab through the numbered parts list to identify each one.",
    caption: "Eleven numbered parts on one bench. Pulses of light on the cables and the backend_net bus are real requests: tus PATCHes, hook calls, Redis commands, Celery messages, MinIO object reads and writes, and the admin page's 2-second status poll. New uploads land as drafts; the viewer only streams published titles. Durations are illustrative; caps, statuses, order and branches are the code's own.",
    build: buildPlant, stations: PL.STATIONS, models: ["model.mjs"], live: ["live/plant-render.js", "live/plant.js"],
    extra: () => ({ barW: PL.ADMIN.w - 30, gaugeW: 52, scrubW: 64 - 22, dial: { x: PL.DIAL.x, y: PL.DIAL.y, z: 8.2, r: 5.5, a0: -2.2, a1: 2.2 }, stages: STAGES.slice(1, 9) }),
    controls: [
      `<div class="btns">${[["one", "One upload"], ["burst", "5 uploads at once"], ["cap", "9 at once (hit the cap)"], ["lowres", "480p source"], ["corrupt", "Corrupt file"]].map(([id, l]) => btn(`data-run="${id}"`, l, false)).join("")}${btn("data-kill", "Restart the worker")}${btn("data-publish", "Publish newest draft")}</div>`,
      `<div class="seg"><span class="lbl">Worker slots</span>${btn('data-set="concurrency:1"', "1 · prod", true)}${btn('data-set="concurrency:3"', "3 · local dev", false)}</div>`,
      `<div class="seg"><span class="lbl">Processing lock</span>${btn('data-set="lock:on"', "on · today", true)}${btn('data-set="lock:off"', "off · before the fix", false)}</div>`,
      speeds([["0.75", "slow"], ["1.5", "normal"], ["3", "fast"]], "1.5"),
    ].join(""),
  },
  {
    id: "intake", tab: "Intake · tus upload", fig: "Fig 2", title: "A resumable upload", hint: "Hover to identify · click to zoom", dataName: "INTAKE",
    aria: "A resumable tus upload as a machine: a file loaf cut into 50 MiB slices, a belt through Caddy into tusd, MinIO parts, a hook checkpoint, Redis keys and PostgreSQL rows.",
    caption: "Byte-accurate: Uppy sends 50 MiB (52,428,800 B) chunks and tusd cuts 50 MB (50,000,000 B) S3 parts. Each chunk leaves a 2.4 MB tail; tails under tusd's 5 MiB minimum wait as an incomplete .part object, so every third chunk also produces a small part: 420 MiB lands as 11 parts. tusd calls the hooks over backend_net, never through Caddy; Caddy only lets the admin-JWT status bridge into /internal. Durations are illustrative.",
    build: buildIntake, stations: IL.STATIONS, models: ["intake-model.mjs"], live: ["live/intake-render.js", "live/intake.js"],
    extra: () => ({ checks: CHECKS, barW: 80 }),
    controls: runs([["happy", "Upload a 420 MiB file"], ["drop", "Connection drops at 200 MiB"], ["capfrees", "9th upload · a slot frees"], ["cap", "9th upload · cap holds"], ["notadmin", "Not an admin"], ["badtype", "Wrong file type"], ["abandon", "Admin closes the tab"]]) + speeds([["0.5", "slow"], ["1", "normal"], ["2", "fast"]], "1"),
  },
  {
    id: "queue", tab: "The queue · Redis lock", fig: "Fig 3", title: "One video at a time", hint: "Hover to identify · click to zoom", dataName: "QUEUE",
    aria: "The processing queue as an escapement: a magazine of queued videos, a gate tied to the Redis lock, the Celery broker as a chute of task chits, and the worker's presses.",
    caption: "Uploads never wait on processing: post-finish only writes a queued row and calls start_next_video_if_idle(). The lock is what serialises videos; --concurrency only decides how many of one video's tasks run side by side. Chits show <video id> over <task>. Durations are illustrative.",
    build: buildQueue, stations: QL.STATIONS, models: ["model.mjs", "model-queue.mjs"], live: ["live/queue-render.js", "live/queue.js"],
    controls: runs([["three", "3 videos arrive"], ["wide", "6 videos · 3 worker slots"], ["prefix", "Lock off · before the fix"], ["fail", "A video fails"], ["restart", "Worker restarts mid-video"], ["stale", "Late duplicate callback"]]) + `<div class="btns">${btn("data-arrive", "Add a video")}${btn("data-kill", "Restart the worker")}</div>` + speeds([["0.75", "slow"], ["1.5", "normal"], ["3", "fast"]], "1.5"),
  },
  {
    id: "transcode", tab: "Transcode · 7 rungs", fig: "Fig 4", title: "Seven renditions", hint: "Hover to identify · click to zoom", dataName: "TRANSCODE",
    aria: "Transcoding as a ladder press: a probe, a storyboard contact-sheet printer, and seven presses whose dies are sized to each rung's frame, with a Redis chord counter.",
    caption: "Die openings are drawn to scale: 1440p is 2560×1440, 144p is 256×144. Block heights follow each rung's -b:v (10000k down to 200k). A rung taller than the source is never encoded. Durations are illustrative and scale with pixels × length.",
    build: buildTranscode, stations: TL.STATIONS, models: ["transcode-model.mjs"], live: ["live/transcode-render.js", "live/transcode.js"],
    controls: runs([["hd", "1080p source"], ["qhd", "1440p source"], ["sd", "480p source"], ["phone", "Phone video 9:16"], ["wide", "3 worker slots (local)"], ["sbfail", "Storyboard fails"]]) + speeds([["0.5", "slow"], ["1", "normal"], ["2", "fast"]], "1"),
  },
  {
    id: "package", tab: "Package & play · HLS", fig: "Fig 5", title: "Segments, playlists, playback", hint: "Hover to identify · click to zoom", dataName: "PACKAGE",
    aria: "Packaging and playback: a segment rack with one lane per rendition, a printer writing master.m3u8, MinIO's vod-processed folders, Caddy's /storage gate, and an hls.js player with an ABR knob, a throughput gauge and a buffer tray.",
    caption: "The master playlist on the printer is the exact text create_manifest writes. The player side follows the app's HLS_CONFIG for hls.js 1.6 (1 Mbps first estimate, capLevelToPlayerSize, 60 s buffer); its ABR rule is a simplified stand-in for hls.js's own. A 2-minute demo video, so 20 segments per rendition; clocks are sped up.",
    build: buildPackage, stations: KL.STATIONS, models: ["transcode-model.mjs", "package-model.mjs"], live: ["live/package-render.js", "live/package.js"],
    extra: () => ({ segs: SEGS }),
    controls: runs([["good", "1080p · good connection"], ["drop", "Bandwidth drops mid-play"], ["sd", "480p source · slow link"], ["small", "Small player (640 px)"], ["scrub", "Scrub the timeline"]]) + speeds([["0.75", "slow"], ["1.5", "normal"], ["3", "fast"]], "1.5"),
  },
];
