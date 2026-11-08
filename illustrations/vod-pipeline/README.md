# VOD pipeline anatomy

An interactive, isometric explainer of this repo's video pipeline, built with the Anatomy
skill. Five full-width plates in one self-contained page: `dist/index.html`.

| Plate | Shows |
|---|---|
| 1 · The plant | Every service on one bench, wired to backend_net; load scenarios, worker slots, the lock on or off |
| 2 · Intake | One resumable tus upload, byte-accurate: 50 MiB chunks, 50 MB S3 parts, the 7 pre-create checks, admission keys |
| 3 · The queue | The Redis lock as an escapement, the Celery broker as a chute of task chits, failure and restart recovery |
| 4 · Transcode | ffprobe, the storyboard sprite sheet, and the 7-rung chord as a ladder press with dies drawn to scale |
| 5 · Package & play | HLS segmenting, master.m3u8, MinIO layout, and hls.js picking renditions as bandwidth changes |

## Build

```bash
node build.mjs                          # dist/index.html + dist/plates/<id>.html
node build.mjs --audit --only=<plate>   # geometry audit (clearances, depth order, supports)
```

Needs the Anatomy skill's kit at `~/.claude/skills/anatomy` (override with `ANATOMY_SKILL`).
Every `file:line` in the event logs is resolved from the real source at build time
(`src/refs.mjs`), so the build fails loudly if an anchor moves.

## Layout

- `src/*-model.mjs`: pure simulations that mirror the backend's rules. Durations are illustrative.
- `src/plates/<plate>/`: the geometry of each plate, built once at build time.
- `src/live/`: the page runtime, with one renderer and one controller per plate.
