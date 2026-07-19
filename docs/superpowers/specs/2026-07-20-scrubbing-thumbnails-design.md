# Scrubbing Thumbnail Previews — Design

## Problem

The watch page's timeline scrub bar has no preview thumbnail when hovering/dragging — unlike YouTube/Netflix-style players. The video.js skin already has a slot for this (`<Slider.Thumbnail>` inside the `TimeSlider`, in `videojs-skin/Skin.tsx`), but nothing feeds it data, and the backend generates zero automated thumbnails today — not even a single poster frame. `thumbnail_url` on `Video` is only ever a user-uploaded image.

## Goal

Generate a sprite-sheet + WebVTT storyboard during video processing, store it in MinIO, expose its URL to the frontend, and wire the existing skin slot to it — so scrubbing the timeline shows a live preview frame.

Scope: new videos processed after this ships. Existing already-processed videos are not backfilled.

## How video.js consumes this (verified against the installed package, not assumed)

`@videojs/react`'s `Thumbnail` component (and `Slider.Thumbnail`, which drives the timeline preview) resolves images from a `<track kind="metadata" label="thumbnails">` child of the media element. It reads the track's cues and parses each cue's text as `url#xywh=x,y,w,h` (a standard media-fragment convention, the same one Mux's `storyboard.vtt` uses) — confirmed by reading `@videojs/core`'s `thumbnail-media-fragment.js`. The URL is resolved relative to the track's own `src`, so cue text can be a bare filename (`sprite_000.jpg#xywh=...`) as long as the sprite lives next to the `.vtt` file.

`HlsJsVideo` (the element the player now uses for quality/ABR) forwards `children` straight to the underlying `<video>` tag, so a `<track>` child works exactly as it would on the plain `<Video>` element — confirmed by reading its source.

## Backend: new pipeline stage

### FFmpeg command (prototyped against a real video, not guessed)

Ran against video `1224a879-a8dc-4810-bddc-69361a8c1454` (1080×1920 portrait, 60.5s — a deliberately awkward aspect ratio) in the worker container:

```
ffmpeg -i <input> -vf "fps=1/{INTERVAL},scale={TILE_W}:-2,tile={COLS}x{ROWS}" \
  -vsync 0 -start_number 0 -q:v 4 <out_dir>/sprite_%03d.jpg
```

- `INTERVAL = 5` seconds, `TILE_W = 160` px, grid `COLS=10 ROWS=10` (100 tiles/sheet).
- Verified empirically: frames sample at `t = 0, 5, 10, ...`; once a sheet's 100 tiles fill, `tile` + the `image2` muxer roll over into the next numbered sheet automatically (tested by forcing overflow with a smaller 3×3 grid — got two files, `..._000.jpg` full, `..._001.jpg` partial, both the *same* pixel dimensions).
- **Tile pixel size is measured, not computed.** `scale=W:-2` rounds height to preserve aspect ratio, and getting that rounding wrong by even 1px would misalign every VTT coordinate silently (sheets generate fine, cues just point at the wrong crop). So after generation, the code runs `ffprobe` on the first sheet and derives `tile_w, tile_h = sheet_width / COLS, sheet_height / ROWS` — guaranteeing VTT math always matches actual pixels regardless of ffmpeg's internal rounding.

### New task: `generate_storyboard(data: dict) -> dict`

- Location: `backend/app/tasks/video_tasks.py`, inserted in `workflows.py`'s chain immediately after `prepare_video.s(video_id)` and before the quality-transcode `chord`. It only needs the raw downloaded file and `duration_seconds` from `prepare_video`'s output — no dependency on transcoded/segmented output, so it can run before that fan-out.
- Steps:
  1. Run the FFmpeg command above into `{work_dir}/storyboard/`.
  2. `ffprobe` the first sprite sheet to get real tile dimensions.
  3. Build `storyboard.vtt`: for cue `i` of `N = floor(duration/5) + 1` total, `start = i*5`, `end = min((i+1)*5, duration)`, sheet index `= i // 100`, tile position `= i % 100` → `(col, row) = (pos % 10, pos // 10)` → `x, y = col*tile_w, row*tile_h`. Cue text: `sprite_{sheet:03d}.jpg#xywh={x},{y},{tile_w},{tile_h}`.
  4. Upload all sprite sheets + `storyboard.vtt` to `settings.minio_bucket_thumbnails`, object path `{video_id}/storyboard/...` (reusing the existing generic `minio_client.upload_file()` — no new MinIO service method needed).
  5. Return `data` **unchanged** (passthrough) — this task's job is a side effect (upload + eventually setting `storyboard_url`), not producing input for the next chain step.
- **Resilience — must not break the transcode pipeline.** Wrap the whole task body in try/except; on any failure, log it and return the input `data` unmodified so the chain proceeds to the quality-transcode chord regardless. Modeled on `transcode_quality`'s "skip, don't break the workflow" pattern — explicitly *not* modeled on `segment_videos`/`create_manifest`, which raise and fail the whole pipeline. A missing scrubbing preview is a cosmetic gap; a broken transcode is not.
- Sets `video.storyboard_url` directly on the DB row inside the task (same pattern as other stages calling `update_video_processing_status`), rather than threading a new key through every downstream task's dict signature.

### Data model

- `Video.storyboard_url: str | None` — new nullable column, same shape as `manifest_url` (an object path, not a full URL; resolved through the existing `storageUrl()` proxy helper on the frontend). Requires an Alembic migration — `Base.metadata.create_all()` only creates missing tables, it will not add this column to the existing dev DB.
- Add `storyboard_url: str | None = None` to the video schema alongside `manifest_url`.

## Frontend: wiring

- `types.ts`: `VideoData` gets `storyboard_url?: string | null`.
- `VideoPlayer.tsx`: pass `video.storyboard_url ? storageUrl(video.storyboard_url) : undefined` through to `VideoJsSkin` as a new prop.
- `Skin.tsx` (`VideoJsSkinProps`): add `storyboardUrl?: string`. Inside `<HlsJsVideo>`, conditionally render `<track kind="metadata" label="thumbnails" src={storyboardUrl} default />` when present.
- No changes needed to the `Slider.Thumbnail` markup already in the `TimeSlider` (`videojs-skin/Skin.tsx`) — it activates automatically once the track has cues, via the same mechanism already used for the (currently dark) captions track machinery.

## Out of scope

- Backfilling storyboards for already-processed videos (would need a standalone task/admin action, not part of this change).
- Configurable interval/grid size per video — fixed constants (5s / 10×10 / 160px) for now.
