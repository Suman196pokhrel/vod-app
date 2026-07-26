# Design Spec: Resumable Upload as Primary Flow + Revisitable Processing Status

- Date: 2026-07-26
- Status: Approved (approved in conversation, not a separate written-spec review round —
  user explicitly asked for fast turnaround on top of an already-detailed brief)
- Builds on: the merged tus upload feature (`docs/superpowers/specs/2026-07-26-resumable-uploads-tusd-design.md`)
  and the app's design system (`docs/DESIGN_SYSTEM.md`, `docs/PROGRESS_DESIGN_MIGRATION.md`)

## Context

The resumable (tus) upload was built, shipped, flag-gated, and tested live in production
(user confirmed: uploaded a 700MB file, previewed it successfully). The user now wants two
things:

1. Promote it from a hidden "beta" link to the actual default upload experience, with real
   polish: pause/resume, live progress, toasts, and micro-animations — built on shadcn +
   the existing GSAP-based motion system, not from scratch.
2. Fix a specific UX gap: the video-processing dialog can currently only be seen once, at
   upload time — closing it loses access. The user's own proposed fix (check status inline
   in the admin videos table, not a floating button) is correct, and — discovered during this
   session — the table already has a *broken, half-wired* attempt at exactly this
   (`columns.tsx:158`, a button that calls `openDialog()` with no video ID, so it can't
   actually poll anything). This work finishes that existing pattern rather than inventing a
   new one.

**Governing constraint:** the whole app was already migrated to a single dark/cyan design
system (`docs/DESIGN_SYSTEM.md`), including this exact surface — `upload/page.tsx`, every
form section, both dropzones, and the processing dialog are already themed and confirmed
clean (zero raw colors, per `PROGRESS_DESIGN_MIGRATION.md` Steps 3 and 7). This is not a
"design something new" task — it's "wire real functionality into an already-designed shell,
using the same tokens, without introducing new colors, durations, or one-off patterns."
Concretely: `--primary` cyan only for progress/active/focus/CTA (≤3 visible at once), the
`.eyebrow` utility for quiet status text, only the three motion-duration tokens (150/200/300ms)
with `--ease-out-quart` as the only easing curve, shadcn primitives only, spinners only inside
buttons (never full-page), skeletons for content loading.

## 1. Backend: close the thumbnail and metadata gaps

The tus `post-finish` hook only ever set `title`/`category`/`raw_video_path`/`user_id` — by
design, since tus's `Upload-Metadata` mechanism is string-key-value only and awkward for rich
fields. Rather than force more fields through that narrow channel, reuse what already exists:

- **New endpoint: `POST /videos/{video_id}/thumbnail`** — thin, admin-gated
  (`get_current_admin_user`, matching every other admin video endpoint), accepts a single
  `UploadFile`, calls the *existing* `minio_service.upload_thumbnail(file, user_id)`
  (`backend/app/services/minio_service.py:154`, already used by the multipart create path —
  zero new storage logic), sets `Video.thumbnail_url` on the row, commits. Thumbnails don't
  need tus — they're small (`max_thumbnail_size` already caps this), a single request is
  correct and simpler than adding resumability nobody needs here.
- **No new endpoint for the rest of the metadata** — `PATCH /videos/by-id/{video_id}` already
  exists, already accepts every field the full form collects (`VideoUpdate` schema: description,
  is_public, category, age_rating, release_date, director, cast, tags, status — confirmed by
  reading the schema directly), already admin-gated, already used by the admin table's Edit
  Details flow with `exclude_unset` partial-update semantics. The new upload page calls this
  exact endpoint once the upload completes and `video_id` is known.
- **Sequencing**: tus upload completes → frontend polls `GET /internal/tus/hooks/uploads/{upload_id}`
  (existing) until `video_id` resolves → frontend fires the thumbnail POST and the metadata
  PATCH in parallel (`Promise.all`, both only need `video_id`) → on either failing, the video
  itself is still safe (already uploaded, already processing) — surface a toast that says
  which detail didn't save and that it can be fixed via Edit Details, don't treat it as a
  failed upload.

## 2. Frontend: route consolidation, not a second page

`/admin/videos/upload/resumable` gets folded into `/admin/videos/upload` — one URL, one page,
no redundant route. The page reads the flag and renders one of two forms:

- **`NEXT_PUBLIC_UPLOADS_TUS_ENABLED=true` (new default)** → the polished resumable form
  (below).
- **Flag off** → the existing multipart form, completely unchanged, as the safety-net fallback
  the whole feature was built to preserve.

Flag defaults flip from `false` to `true` on both sides — `backend/app/core/config.py`'s
`uploads_tus_enabled: bool = False` → `True`, and `app/.env.example`'s
`NEXT_PUBLIC_UPLOADS_TUS_ENABLED=false` → `true` — matching the ADR's own Phase 5 language
("make tus the default for new uploads") now that it's tested and approved. The flag mechanism
itself stays; only its default changes. `infra/.env.example` and `infra/local.env` (dev)
get the matching flip so local dev now matches prod's already-live reality.

**The new resumable form reuses, not rebuilds:**
`BasicInformationSection`, `AdditionalDetailsSection`, `PublishingSection`, `TagInput` render
exactly as they do today (already themed, already correct) — the only thing that changes is
what happens on submit: instead of `uploadVideo()` (multipart), the video file goes through
Uppy/tus with `title`+`category` in tus metadata, and the rest of the form's values get sent
via the PATCH call once `video_id` is known (§1). `ThumbnailUploadZone` also renders as-is; its
file gets POSTed via the new endpoint at the same point.

**New UI, built on existing patterns, not invented:**
- Pause/Resume: a single toggle button (shadcn `Button`), icon swapped via the *existing*
  `IconSwap` component (`lib/motion/IconSwap.tsx` — the same mechanism already driving the
  player's Play/Pause button, so this is a consistency win, not a new pattern) between
  `Pause`/`Play` lucide icons. Wired to the real `uppy.pauseResume(fileID)` API (verified
  against the installed `@uppy/core@5.2.0` source directly — returns the new `isPaused`
  boolean, emits `upload-pause`), not a cosmetic toggle.
- Progress: shadcn `Progress` bar, `--primary` fill (matches the processing dialog's existing
  bar exactly), with `.eyebrow`-styled status text below it ("UPLOADING · 240 MB / 700 MB ·
  4.2 MB/s") — matches §5.4's own written requirement ("processing status as quiet eyebrow
  text + progress") applied one step earlier, to the upload itself.
- Drag-active / field-state micro-animations: one new small hook in `lib/motion/`, following
  the existing `useScrollReveal`-style pattern (ref-returning, GSAP, `prefers-reduced-motion`
  short-circuit) — a restrained fade/scale on the dropzone's drag-enter state, matching the
  "spend your boldness in one place" principle rather than animating every field independently.
- Toasts: sonner, already installed. Copy follows §3.8 (sentence case, active voice, says what
  happened + what to do): "Upload paused." / "Resumed — picking up where you left off." /
  "Connection dropped. Resuming automatically…" / "Couldn't save {field} — you can set it later
  from Edit Details." Button labels stay verbs ("Pause", "Resume", "Upload video"), and any
  resulting toast reuses the same verb, per the interface-vocabulary-consistency rule.
- **Success state gets a "Watch now" link** — checked the current `video-processing-dialog.tsx`
  directly: this was written into §5.4 of the design system as a requirement but never actually
  implemented in the Step 3 migration pass. Adding it now since this work already touches that
  exact dialog.

## 3. Task 2: lift the processing dialog to table level

`useVideoProcessing()` + `<VideoProcessingDialog>` move out of the per-row cell renderer
(`columns.tsx:151`, where each row currently creates its own disconnected instance) up to
`data-table.tsx` — one shared dialog instance for the whole table, not one per row. The status
badge's click handler is threaded down through TanStack Table's `meta` option (the idiomatic
mechanism for a column-def cell to call a shared parent action — column defs are otherwise
static and can't close over component state directly) and now correctly calls
`openDialog(video.id)` — passing the actual row's id, which is the one-line fix the existing
broken attempt was missing.

Result: any admin, from anywhere in the table, at any time, clicks a processing/failed video's
status badge → the dialog opens and live-polls that specific video. Closing it costs nothing —
it's always one click away again. No floating button, no second UI system, matches the design
system's existing three-state badge language (§7 Step 7's own already-completed work) with zero
new visual vocabulary.

## 4. Dead code removal (explicit ask, addressed inline as each piece is touched)

- The standalone `/admin/videos/upload/resumable/page.tsx` route — folded into the main page
  per §2, old route file deleted.
- The "Try resumable upload (beta)" link and its flag-check on the old upload page — removed;
  there's no longer a second page to link to.
- `columns.tsx`'s broken per-row `useVideoProcessing()` instantiation and no-arg `openDialog()`
  call — replaced by §3's fix, not left alongside it.
- `VideoUploadZone.tsx`'s commented-out fake-progress simulation block (dead since before this
  session — never executed, real progress now exists elsewhere) — removed while the file is
  open for related work, not left to rot further.
- Anything else found genuinely unused while implementing (verified via grep for zero
  importers, matching the standard this repo's design migration already established) gets
  removed inline, noted in the relevant commit — not hunted for separately as its own pass.

## Out of scope

Multi-file upload (the page still handles one video at a time, matching today's behavior).
Editing already-in-flight uploads' metadata mid-upload (title/category are locked in once
the tus upload starts, exactly as today). Any change to the multipart fallback path's own UI
or behavior — it stays byte-for-byte as-is, per the flag-off guarantee.
