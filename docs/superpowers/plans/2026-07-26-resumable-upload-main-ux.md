# Resumable Upload as Primary Flow + Revisitable Processing Status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the resumable (tus) upload the default admin upload experience — with pause/resume, live progress, and full metadata — while keeping the existing multipart upload as a flag-off fallback; and make the video-processing dialog reachable from any row in the admin videos table at any time, instead of only once at upload time.

**Architecture:** Backend gets one new thin endpoint (`POST /videos/{video_id}/thumbnail`) plus a one-line fix to `update_video_details` so a status change correctly cascades into visibility; everything else reuses existing endpoints, schemas, and services unchanged. Frontend gets a new `TusUploadForm` that reuses the existing form-section components verbatim, wires Uppy's real pause/resume API, and sequences the tus upload → thumbnail POST → metadata PATCH once a `video_id` resolves. The processing dialog moves from a broken per-row instantiation to a single table-level instance driven through TanStack Table's `meta` option.

**Tech Stack:** FastAPI, sync SQLAlchemy, Pydantic v2 (backend); Next.js, React Hook Form + zod, `@uppy/core` + `@uppy/tus`, TanStack Table, GSAP, sonner, shadcn/ui (frontend).

## Global Constraints

- **Design system tokens only** (`docs/DESIGN_SYSTEM.md`): shadcn primitives only, never hand-roll buttons/menus/inputs. `--primary` (cyan-400) reserved for progress/active/focus/CTA/live-badges, ≤3 visible at once. `.eyebrow` utility class for quiet ALL-CAPS status text. Exactly three motion durations — `--duration-fast: 150ms`, `--duration-base: 200ms`, `--duration-slow: 300ms` — and exactly one easing curve, `--ease-out-quart`. Spinners only inside buttons, never full-page. This surface is already fully migrated to this system — no new colors, durations, or one-off visual patterns.
- **Reuse, don't rebuild:** `BasicInformationSection`, `AdditionalDetailsSection`, `PublishingSection`, `TagInput`, `ThumbnailUploadZone` render exactly as they do today, unmodified. The `formSchema.ts` zod schema and `VideoFormData` type are shared by both the legacy and tus forms — do not fork them.
- **Thumbnail is submitted with the form**, not deferred to a post-upload Edit Details step — required at submit time, same as the legacy multipart form's existing behavior.
- **Flag defaults flip from `false` to `true`** in all five places: `backend/app/core/config.py`, `app/.env.example`, `infra/.env.example`, `infra/local.env`, `infra/prod.env`. The flag mechanism itself is unchanged — only its default.
- **The multipart fallback path stays byte-for-byte behavioral** when the flag is off — same component tree, same submit logic, only relocated into its own file and stripped of the dead "beta" link (there is no longer a second route to link to).
- **No multi-file upload.** One video at a time, matching today. Title/category are locked in once the tus upload starts — no mid-upload metadata editing.
- **Remove dead/unused code encountered in files this plan touches** (explicit project directive — no dead code left behind), but do not go hunting for unrelated dead code outside those files.
- **No test suite exists for either frontend or backend** (per `CLAUDE.md`). Verification per task is: `pnpm build` (or `pnpm tsc --noEmit`) for frontend changes, a Python import sanity check for backend changes, plus a manual-verification note for the implementer to exercise against the running dev stack (`make dev`) if available.
- **`is_public`/`status` derivation:** a tus-created video always starts `is_public=False, status="draft"` (see `tus_service.py:176-191`, deliberate — avoids a video being publicly reachable before admin review). `update_video_details` (`PATCH /videos/by-id/{video_id}`) is the only path that later changes `status` on a tus-created video, and today it does **not** derive `is_public` from `status` the way `create_video_with_files` does at creation time — this is a pre-existing bug shared with the already-shipped `EditVideoDialog` (publishing a video via Edit Details today silently leaves it unreachable). Task 2 fixes it once, server-side, so both the new upload flow and the existing Edit Details dialog get correct behavior.

---

### Task 1: Lift the processing dialog to table level

The admin videos table currently instantiates a fresh, disconnected `useVideoProcessing()` per row and calls `openDialog()` with no argument (`columns.tsx:151-161`) — it can never actually poll anything. This task threads a single shared dialog instance from `VideoTable.tsx` down through TanStack Table's `meta` option so any row's status badge opens the *same* dialog against that row's real video ID, and it stays reachable after being closed (click the badge again from anywhere in the table).

This task is independent of every other task in this plan and should ship first — it's small, low-risk, and immediately useful on its own.

**Files:**
- Modify: `app/app/(protected)/admin/videos/_components/videos_table/data-table.tsx`
- Modify: `app/app/(protected)/admin/videos/_components/videos_table/columns.tsx`
- Modify: `app/app/(protected)/admin/videos/_components/VideoTable.tsx`

**Interfaces:**
- Produces: `DataTableProps<TData, TValue>.meta?: TableMeta<TData>` — later tasks don't depend on this, but any future column needing a table-level callback should use the same `table.options.meta` pattern established here.

- [ ] **Step 1: Add `meta` passthrough to `DataTable`**

  In `app/app/(protected)/admin/videos/_components/videos_table/data-table.tsx`, add `TableMeta` to the `@tanstack/react-table` import, add a `meta` prop, and pass it into `useReactTable`:

  ```typescript
  import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    TableMeta,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
  } from '@tanstack/react-table';
  ```

  ```typescript
  interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    meta?: TableMeta<TData>;
  }

  export function DataTable<TData, TValue>({
    columns,
    data,
    meta,
  }: DataTableProps<TData, TValue>) {
  ```

  Inside the component, add `meta` to the `useReactTable` call:

  ```typescript
    const table = useReactTable({
      data,
      columns,
      meta,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      onGlobalFilterChange: setGlobalFilter,
      state: {
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
        globalFilter,
      },
      initialState: {
        pagination: {
          pageSize: 10,
        },
      },
    });
  ```

  Nothing else in this file changes.

- [ ] **Step 2: Fix `columns.tsx`'s status cell and declare the `meta` shape**

  In `app/app/(protected)/admin/videos/_components/videos_table/columns.tsx`, remove the now-unused import:

  ```typescript
  import { useVideoProcessing } from '@/hooks/video/use-video-processing';
  ```

  Add a module augmentation directly above `export const columns: ColumnDef<Video>[] = [` so `table.options.meta` is typed everywhere this column def is used:

  ```typescript
  declare module '@tanstack/react-table' {
    interface TableMeta<TData> {
      openProcessingDialog?: (videoId: string) => void;
    }
  }
  ```

  Replace the status column's `cell` function (currently instantiating `useVideoProcessing()` per row and calling `openDialog()` with no argument) with:

  ```typescript
    cell: ({ row, table }) => {
      const video = row.original;
      const openProcessingDialog = table.options.meta?.openProcessingDialog;

      // Show processing status if not completed
      if (video.processing_status !== 'completed') {
        return (
          <div className="min-w-[140px]">
            <Button variant={"ghost"} onClick={() => openProcessingDialog?.(video.id)}>
              <ProcessingStatusBadge status={video.processing_status} />
            </Button>

            {video.processing_error && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mt-1.5">
                      <Badge variant="destructive" className="text-xs cursor-help w-fit">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        View Error
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{video.processing_error}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      }

      // If completed, show publish status
      return (
        <div className="min-w-[140px]">
          <PublishStatusBadge status={video.status} isPublic={video.is_public} />
        </div>
      );
    },
  ```

  Everything else in this file (the other column defs) is unchanged.

- [ ] **Step 3: Own the dialog state in `VideoTable.tsx`, pass it through `meta`, remove dead code**

  Replace the full contents of `app/app/(protected)/admin/videos/_components/VideoTable.tsx` with:

  ```tsx
  "use client";
  import { DataTable } from "./videos_table/data-table";
  import { columns } from "./videos_table/columns";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Video, Film, TrendingUp, AlertCircle } from "lucide-react";
  import { useState } from "react";
  import { AdminVideoFilters, getAdminVideos } from "@/lib/apis/video";
  import { useQuery, keepPreviousData } from "@tanstack/react-query";
  import { Spinner } from "@/components/ui/spinner";
  import { useVideoProcessing } from "@/hooks/video/use-video-processing";
  import { VideoProcessingDialog } from "./multi_step_progress/video-processing-dialog";

  export default function AdminVideosPage() {
    const [filters, setFilters] = useState<AdminVideoFilters>({
      skip: 0,
      limit: 20,
      sort_by: "created_at",
      sort_order: "desc",
    });

    const { isPending, isError, error, data } = useQuery({
      queryKey: ["getAllVideosAdmin", filters],
      queryFn: async () => {
        const response = await getAdminVideos(filters);
        return response;
      },
      placeholderData: keepPreviousData,
    });

    // One shared dialog instance for the whole table — any row's status badge
    // opens it against that row's video ID, so it's reachable again after
    // being closed instead of only appearing once at upload time.
    const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
      pollingInterval: 3000,
    });

    return (
      <div className="flex flex-col gap-6 p-6">
        <VideoProcessingDialog
          isOpen={isOpen}
          onClose={closeDialog}
          currentStatus={currentStatus}
          videoId={videoId || undefined}
        />

        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl tracking-tight">Video Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all videos in your VOD platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99</div>
              <p className="text-xs text-muted-foreground">
                99 published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Film className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99</div>
              <p className="text-xs text-muted-foreground">
                Currently being processed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                99M
              </div>
              <p className="text-xs text-muted-foreground">
                99K likes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99</div>
              <p className="text-xs text-muted-foreground">
                {99 > 0 ? "Needs attention" : "All good!"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Videos</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          {isPending && (
            <div>
              <Spinner />
            </div>
          )}

          {isError && <div>{error.message}</div>}

          {data && (
            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Videos</CardTitle>
                  <CardDescription>
                    Complete list of all videos in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns}
                    data={data.items}
                    meta={{ openProcessingDialog: openDialog }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }
  ```

  Note what was removed versus the current file: the unused `CloudCog` and `useEffect` imports (neither was referenced anywhere in the file), and the large commented-out block of `TabsContent` for the Published/Processing/Failed tabs that referenced an undefined `mockVideos` identifier — genuinely dead, unreachable code, not a documented gap.

  This leaves the "Published"/"Processing"/"Failed" `TabsTrigger`s clickable with no matching `TabsContent` — clicking them renders nothing. That's the same behavior the current file already has (the commented-out content was never rendering either); it isn't a regression introduced here, and wiring real per-tab filtering is out of scope for this plan.

- [ ] **Step 4: Verify**

  Run `pnpm build` from `app/` and confirm it compiles with no type errors (the `TableMeta` augmentation must resolve — if TypeScript complains about `openProcessingDialog` not existing on `TableMeta`, the `declare module` block in `columns.tsx` isn't being picked up; confirm the file is included in `tsconfig.json`'s compilation).

  If a running dev stack is available (`make dev` + `pnpm dev`), manually verify: go to `/admin/videos`, find a row that isn't `completed`, click its status badge — the dialog opens and polls that video's real status. Close it, click the badge again — it reopens against the same video.

- [ ] **Step 5: Commit**

  ```bash
  git add app/app/\(protected\)/admin/videos/_components/videos_table/data-table.tsx \
          app/app/\(protected\)/admin/videos/_components/videos_table/columns.tsx \
          app/app/\(protected\)/admin/videos/_components/VideoTable.tsx
  git commit -m "fix: make the processing dialog reachable from any row, any time"
  ```

---

### Task 2: Backend — thumbnail endpoint, is_public/status fix, flag default flip

**Files:**
- Modify: `backend/app/services/video_service.py`
- Modify: `backend/app/apis/routes/video.py`
- Modify: `backend/app/core/config.py`

**Interfaces:**
- Produces: `VideoService.upload_video_thumbnail(db, video_id, file, user_id, is_admin=False) -> Video`
- Produces: `POST /videos/{video_id}/thumbnail` (multipart, field name `thumbnail`, admin-gated, returns `VideoResponse`)
- Consumed by: Task 3's frontend `uploadVideoThumbnail` helper, called from Task 6's `TusUploadForm`.

- [ ] **Step 1: Add `upload_video_thumbnail` to `VideoService`**

  In `backend/app/services/video_service.py`, add this method directly after `update_video_details` (which ends around line 463 — right before `get_video_download_url`):

  ```python
      async def upload_video_thumbnail(self, db: Session, video_id: str, file: UploadFile, user_id: str, is_admin: bool = False) -> Video:
          """Attach/replace a thumbnail on an already-created video — used by
          the resumable (tus) upload flow, where the file arrives after the
          video row already exists (tus's post-finish hook only ever sets
          title/category). Reuses the same validation and MinIO upload path
          as the multipart create flow."""
          video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

          if not video:
              logger.error(f"upload_video_thumbnail: video not found - {video_id}")
              raise HTTPException(status_code=404, detail="Video not found")

          if video.user_id != user_id and not is_admin:
              logger.error(f"upload_video_thumbnail: user {user_id} not authorized for video {video_id}")
              raise HTTPException(status_code=403, detail="Not authorized to update this video")

          self._validate_thumbnail_file(file)
          thumbnail_path = await minio_service.upload_thumbnail(file, user_id)

          video.thumbnail_url = thumbnail_path
          db.commit()
          db.refresh(video)

          logger.info(f"upload_video_thumbnail: video {video_id} thumbnail updated")
          return video
  ```

- [ ] **Step 2: Fix `update_video_details` to derive `is_public` from `status`**

  In the same file, replace the body of `update_video_details` (the existing method, currently just `model_dump(exclude_unset=True)` then a blind `setattr` loop) with:

  ```python
      def update_video_details(self, db: Session, video_id: str, payload: VideoUpdate, user_id: str, is_admin: bool = False) -> Video:
          """Apply a partial metadata edit from the admin 'Edit Details' form.
          Only fields actually present in the payload are touched — a field
          left out entirely is left alone, whereas explicitly setting one to
          null/empty does clear it."""
          video = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None)).first()

          if not video:
              logger.error(f"update_video_details: video not found - {video_id}")
              raise HTTPException(status_code=404, detail="Video not found")

          if video.user_id != user_id and not is_admin:
              logger.error(f"update_video_details: user {user_id} not authorized for video {video_id}")
              raise HTTPException(status_code=403, detail="Not authorized to update this video")

          update_fields = payload.model_dump(exclude_unset=True)

          # A status change should cascade into visibility exactly as it does
          # at creation time (create_video_with_files: is_public = status ==
          # "published"), unless the caller explicitly set is_public in the
          # same payload. Without this, setting status to "published" here
          # leaves is_public untouched — a video can show "published" in the
          # admin table while still being 404 on every public route.
          if "status" in update_fields and "is_public" not in update_fields:
              update_fields["is_public"] = update_fields["status"] == "published"

          logger.info(f"update_video_details: updating video {video_id} - fields: {list(update_fields.keys())}")

          for field, value in update_fields.items():
              setattr(video, field, value)

          db.commit()
          db.refresh(video)

          logger.info(f"update_video_details: video {video_id} updated successfully")
          return video
  ```

- [ ] **Step 3: Add the route**

  In `backend/app/apis/routes/video.py`, add this route directly after `update_video_details` (after the block ending at line 152, before the `download-url` route):

  ```python
  @video_router.post(
      "/{video_id}/thumbnail",
      response_model=VideoResponse,
      summary="Attach a thumbnail to an already-created video (resumable upload flow)"
  )
  async def upload_video_thumbnail(
      video_id: str,
      thumbnail: UploadFile = File(..., description="Thumbnail image (JPEG, PNG, WEBP)"),
      current_user: User = Depends(get_current_admin_user),
      db: Session = Depends(get_db)
  ):
      """Used by the tus/resumable upload flow, where the video row already
      exists (created by the tus post-finish hook) before the thumbnail file
      is sent. The multipart create flow attaches its thumbnail inline at
      POST /videos/create instead and never calls this route."""
      return await video_service.upload_video_thumbnail(
          db=db,
          video_id=video_id,
          file=thumbnail,
          user_id=current_user.id,
          is_admin=current_user.is_admin(),
      )
  ```

  `UploadFile` and `File` are already imported at the top of this file (line 3) — no new imports needed.

- [ ] **Step 4: Flip the backend flag default**

  In `backend/app/core/config.py`, line 57:

  ```python
      uploads_tus_enabled: bool = True
  ```

- [ ] **Step 5: Verify**

  From `backend/`, run a Python import sanity check to confirm nothing is syntactically broken and the new route registers:

  ```bash
  python3 -c "from app.apis.routes.video import video_router; print([r.path for r in video_router.routes if 'thumbnail' in r.path])"
  ```

  Expected output includes `/videos/{video_id}/thumbnail`.

  If a running dev stack is available, manually verify with a real admin JWT and an existing video ID:

  ```bash
  curl -X POST http://localhost:8000/videos/<video_id>/thumbnail \
    -H "Authorization: Bearer <admin_access_token>" \
    -F "thumbnail=@/path/to/some.jpg"
  ```

  Confirm the response's `thumbnail_url` changed, and separately confirm via `make db` that PATCHing `status=published` on a video now flips `is_public` to `true` in the same row.

  `_validate_thumbnail_file` reads the file for format detection before `minio_service.upload_thumbnail` uploads it; the latter already does `await file.seek(0)` before `put_object`, so the stream should be intact — but confirm this on the real curl upload above by checking the resulting object's size in the MinIO console (`http://localhost:9001`) rather than assuming: a zero-byte thumbnail object is the failure signature if the seek ever stops happening.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/app/services/video_service.py backend/app/apis/routes/video.py backend/app/core/config.py
  git commit -m "feat: add thumbnail endpoint for resumable uploads, fix is_public/status drift, default tus uploads on"
  ```

---

### Task 3: Frontend — thumbnail upload API helper

**Files:**
- Modify: `app/lib/apis/video.ts`

**Interfaces:**
- Produces: `uploadVideoThumbnail(videoId: string, file: File): Promise<Video>` — consumed by Task 6's `TusUploadForm`.

- [ ] **Step 1: Add the helper**

  In `app/lib/apis/video.ts`, add this function directly after `updateVideoDetails` (ends around line 289, before `getVideoDownloadUrl`):

  ```typescript
  /**
   * Attach a thumbnail to an already-created video — used by the resumable
   * (tus) upload flow, where the video row exists before the thumbnail file
   * does. The multipart flow sends its thumbnail inline via uploadVideo()
   * instead and never calls this.
   */
  export const uploadVideoThumbnail = async (
    videoId: string,
    file: File
  ): Promise<Video> => {
    try {
      const formData = new FormData();
      formData.append("thumbnail", file);
      const response = await api.post<Video>(`/videos/${videoId}/thumbnail`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("[uploadVideoThumbnail] failed", { videoId, error });
      if (error instanceof AxiosError) {
        throw new Error(
          error.response?.data?.detail || "Failed to upload thumbnail"
        );
      }
      throw new Error("An unexpected error occurred while uploading the thumbnail");
    }
  };
  ```

  No new imports needed — `AxiosError`, `Video`, and `api` are already imported at the top of this file.

- [ ] **Step 2: Verify**

  Run `pnpm build` from `app/` and confirm it compiles with no type errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/lib/apis/video.ts
  git commit -m "feat: add uploadVideoThumbnail API helper"
  ```

---

### Task 4: Frontend — "Watch now" link on the processing dialog's success state

The design system's own §5.4 requirement for a "Watch now" link on the completed state was never implemented in the original migration pass. This task closes that gap while the dialog is already being touched by this plan's other work.

**Files:**
- Modify: `app/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog.tsx`

- [ ] **Step 1: Add the link**

  Add this import near the top of the file (after the `cn` import, line 17):

  ```typescript
  import Link from "next/link";
  ```

  Replace the "Footer Actions" block (the last `<div>` before `</DialogContent>`) with:

  ```tsx
          {/* Footer Actions */}
          <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
            {isFailed && onRetry && (
              <Button onClick={onRetry} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            )}

            {isComplete && videoId && (
              <Button asChild variant="outline">
                <Link href={`/watch/${videoId}`}>Watch now</Link>
              </Button>
            )}

            {!isInProgress && (
              <Button onClick={handleClose}>
                {isComplete ? "Done" : "Close"}
              </Button>
            )}

            {isInProgress && (
              <Button disabled variant="outline">
                Processing...
              </Button>
            )}
          </div>
  ```

- [ ] **Step 2: Verify**

  Run `pnpm build` from `app/`. If a running dev stack is available, manually trigger a completed upload and confirm the dialog's success state shows a "Watch now" button that navigates to `/watch/<id>`.

- [ ] **Step 3: Commit**

  ```bash
  git add "app/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog.tsx"
  git commit -m "feat: add Watch now link to the processing dialog's success state"
  ```

---

### Task 5: Frontend — drag-active motion hook + `TusUploadZone` component

**Files:**
- Create: `app/lib/motion/useDragActive.ts`
- Create: `app/app/(protected)/admin/videos/_components/TusUploadZone.tsx`

**Interfaces:**
- Produces: `useDragActive<T extends HTMLElement>(isDragActive: boolean): RefObject<T | null>`
- Produces: `TusUploadPhase = "idle" | "uploading" | "paused" | "finalizing" | "error"` and `<TusUploadZone videoFile setVideoFile onRemove phase progress speedBytesPerSec onTogglePause />` — consumed by Task 6's `TusUploadForm`. `onRemove` (not `setVideoFile` directly) is the recovery affordance for a failed upload — see Task 6's `handleRemoveFile`.
- Consumes: `IconSwap` from `app/lib/motion/IconSwap.tsx` (existing), `formatFileSize` from `app/app/(protected)/admin/videos/_components/videos_table/helper.ts` (existing, exported).

- [ ] **Step 1: Write the GSAP drag-active hook**

  Create `app/lib/motion/useDragActive.ts`:

  ```typescript
  "use client"

  import { useEffect, useRef } from "react"
  import gsap from "gsap"

  /**
   * Restrained fade/scale pulse on a dropzone's drag-enter, following the
   * same ref-returning GSAP hook pattern as useScrollReveal. `isDragActive`
   * comes from react-dropzone's own state — this only reacts when it turns on.
   */
  export function useDragActive<T extends HTMLElement>(isDragActive: boolean) {
    const ref = useRef<T | null>(null)

    useEffect(() => {
      const el = ref.current
      if (!el || !isDragActive) return
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

      const tween = gsap.fromTo(
        el,
        { scale: 0.98, opacity: 0.85 },
        { scale: 1, opacity: 1, duration: 0.2, ease: "power1.out" }
      )
      return () => {
        tween.kill()
      }
    }, [isDragActive])

    return ref
  }
  ```

- [ ] **Step 2: Write `TusUploadZone`**

  Create `app/app/(protected)/admin/videos/_components/TusUploadZone.tsx`. This mirrors `VideoUploadZone.tsx`'s existing structure (same dropzone classes, same selected-file card), extended with progress/pause-resume UI. Note the drag-active ref goes on a wrapping `<div>`, not spread together with `getRootProps()`, since react-dropzone's own returned props already include a `ref` for keyboard-triggered clicks — merging two refs onto one node would silently drop one of them:

  ```tsx
  "use client"

  import { useCallback } from 'react'
  import { useDropzone } from 'react-dropzone'
  import { Upload, Video as VideoIcon, FileVideo, X, Pause, Play } from 'lucide-react'
  import { Button } from '@/components/ui/button'
  import { Progress } from '@/components/ui/progress'
  import { IconSwap } from '@/lib/motion/IconSwap'
  import { useDragActive } from '@/lib/motion/useDragActive'
  import { formatFileSize } from './videos_table/helper'

  export type TusUploadPhase = "idle" | "uploading" | "paused" | "finalizing" | "error"

  interface TusUploadZoneProps {
    videoFile: File | null
    setVideoFile: (file: File | null) => void
    onRemove: () => void
    phase: TusUploadPhase
    progress: { percent: number; uploaded: number; total: number }
    speedBytesPerSec: number
    onTogglePause: () => void
  }

  const TusUploadZone = ({
    videoFile,
    setVideoFile,
    onRemove,
    phase,
    progress,
    speedBytesPerSec,
    onTogglePause,
  }: TusUploadZoneProps) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) setVideoFile(acceptedFiles[0])
    }, [setVideoFile])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { 'video/*': ['.mp4', '.mov', '.webm'] },
      maxFiles: 1,
      maxSize: 50 * 1024 * 1024 * 1024, // 50GB, matches tus_max_file_size_gb
    })

    const dragRef = useDragActive<HTMLDivElement>(isDragActive)
    const isBusy = phase === "uploading" || phase === "paused"
    // "error" is included so a failed upload can be cleared and retried —
    // without this the form gets stuck once an upload fails, since nothing
    // else resets phase back to "idle". onRemove (not setVideoFile directly)
    // performs that reset, including cleaning up Uppy's internal file entry
    // — see TusUploadForm's handleRemoveFile.
    const canRemove = phase === "idle" || phase === "error"

    if (videoFile) {
      const statusLabel =
        phase === "finalizing" ? "FINALIZING DETAILS" :
        phase === "paused" ? "PAUSED" :
        phase === "error" ? "UPLOAD FAILED" :
        "UPLOADING"

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileVideo className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{videoFile.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(videoFile.size)}</p>
            </div>
            {isBusy && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onTogglePause}
                aria-label={phase === "paused" ? "Resume upload" : "Pause upload"}
              >
                <IconSwap icon={phase === "paused" ? Play : Pause} size={16} />
              </Button>
            )}
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {phase !== "idle" && (
            <div className="space-y-2">
              <Progress value={phase === "finalizing" ? 100 : progress.percent} />
              <div className="flex items-center justify-between">
                <span className="eyebrow">
                  {statusLabel}
                  {isBusy && (
                    <>
                      {" "}· {formatFileSize(progress.uploaded)} / {formatFileSize(progress.total)}
                      {speedBytesPerSec > 0 && phase === "uploading" ? ` · ${formatFileSize(speedBytesPerSec)}/s` : ""}
                    </>
                  )}
                </span>
                {phase !== "finalizing" && (
                  <span className="font-semibold text-primary tabular-nums text-sm">
                    {progress.percent}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div ref={dragRef}>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors
            ${isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">
                {isDragActive ? 'Drop video here' : 'Drag & drop video file'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse (MP4, MOV, WEBM — up to 50GB)
              </p>
            </div>
            <Button type="button" variant="secondary">
              <VideoIcon className="h-4 w-4 mr-2" />
              Choose Video File
            </Button>
          </div>
        </div>
      </div>
    )
  }

  export default TusUploadZone
  ```

- [ ] **Step 3: Verify**

  Run `pnpm build` from `app/`. This component isn't imported anywhere yet (Task 6 wires it in), so a successful build just confirms it type-checks in isolation.

- [ ] **Step 4: Commit**

  ```bash
  git add app/lib/motion/useDragActive.ts "app/app/(protected)/admin/videos/_components/TusUploadZone.tsx"
  git commit -m "feat: add drag-active motion hook and themed tus upload dropzone"
  ```

---

### Task 6: Frontend — `TusUploadForm` (the resumable form) and `LegacyUploadForm` (extracted fallback)

This is the core of the feature: the full metadata form (reusing the existing sections unchanged) wired to a real tus/Uppy upload with pause/resume, live progress, and a "finalizing" state that covers the gap between the upload hitting 100% and the thumbnail+metadata calls actually completing — closing an abandonment window where a tab closed right after "100%" would otherwise leave a video with only a title and category.

**Files:**
- Create: `app/app/(protected)/admin/videos/_components/uploadForm/LegacyUploadForm.tsx`
- Create: `app/app/(protected)/admin/videos/_components/uploadForm/TusUploadForm.tsx`

**Interfaces:**
- Consumes: `TusUploadZone`, `TusUploadPhase` (Task 5); `uploadVideoThumbnail` (Task 3); `updateVideoDetails`, `VideoDetailsUpdatePayload` (existing); `useVideoProcessing`, `VideoProcessingDialog` (existing); `getTusUploadStatus` (existing); `formSchema`, `VideoFormData` (existing, `app/app/(protected)/admin/videos/_components/uploadForm/formSchema.ts`).
- Produces: `LegacyUploadForm` and `TusUploadForm` (both zero-prop components) — consumed by Task 7's `upload/page.tsx`.

- [ ] **Step 1: Extract the existing multipart flow into `LegacyUploadForm`**

  Create `app/app/(protected)/admin/videos/_components/uploadForm/LegacyUploadForm.tsx`. This is the current `upload/page.tsx` body, unchanged in behavior, minus the page-level header/back-button chrome (which moves to the shared parent in Task 7) and minus the "Try resumable upload (beta)" link (there's no longer a second route to link to) and minus the already-fully-commented-out, always-no-op `handleRetry` (dead code — removing it means the dialog's Retry button simply doesn't render on failure, which is strictly better than rendering a button that silently does nothing when clicked):

  ```tsx
  'use client'
  // app/admin/videos/_components/uploadForm/LegacyUploadForm.tsx
  import { useState } from 'react'
  import { zodResolver } from "@hookform/resolvers/zod"
  import { useForm } from 'react-hook-form'
  import { toast } from 'sonner'
  import { formSchema, VideoFormData } from './formSchema'
  import UploadForm from './UploadForm'
  import { VideoProcessingDialog } from "@/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog"
  import { ApiError, uploadVideo } from '@/lib/apis/video'
  import { useVideoProcessing } from '@/hooks/video/use-video-processing'

  // The original multipart upload flow, preserved behaviorally as-is — this
  // is the safety-net fallback rendered when NEXT_PUBLIC_UPLOADS_TUS_ENABLED
  // is off. See TusUploadForm for the resumable flow, now the default.
  export function LegacyUploadForm() {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    const form = useForm<VideoFormData>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        title: '',
        description: '',
        category: '',
        ageRating: '',
        director: '',
        cast: '',
        releaseDate: '',
        status: 'draft',
        tags: []
      }
    })

    const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
      pollingInterval: 3000,
      onComplete: () => {
        form.reset()
        setVideoFile(null)
        setThumbnailFile(null)
        setUploadError(null)
      },
      onError: (error) => {
        toast.error("Processing failed", { description: error.message })
      },
    })

    const onSubmit = async (data: VideoFormData) => {
      if (!videoFile) {
        setUploadError("Please select a video file before uploading")
        toast.error("Please select a video file")
        return
      }

      if (!thumbnailFile) {
        setUploadError("Please select a thumbnail file before uploading")
        toast.error("Please select a thumbnail file")
        return
      }

      setUploadError(null)
      setIsSubmitting(true)

      try {
        openDialog()
        const result = await uploadVideo({ data, videoFile, thumbnailFile })
        openDialog(result.id)
      } catch (error) {
        const apiError = error as ApiError
        const errorMessage = apiError.message || "Failed to upload video. Please try again."
        setUploadError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    }

    const handleSaveDraft = async () => {
      setUploadError(null)
      setIsSubmitting(true)
      try {
        form.setValue('status', 'draft')
        const values = form.getValues()
        // TODO: Implement actual draft saving API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('Saved as draft:', values)
        toast.success("Draft saved successfully!")
      } catch {
        const errorMessage = "Failed to save draft. Please try again."
        setUploadError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    }

    return (
      <>
        <VideoProcessingDialog
          isOpen={isOpen}
          onClose={closeDialog}
          videoId={videoId || undefined}
          currentStatus={currentStatus}
          fileName={videoFile?.name}
        />

        <UploadForm
          form={form}
          onSubmit={onSubmit}
          uploadError={uploadError}
          setUploadError={setUploadError}
          videoFile={videoFile}
          setVideoFile={setVideoFile}
          thumbnailFile={thumbnailFile}
          setThumbnailFile={setThumbnailFile}
          isSubmitting={isSubmitting}
          handleSaveDraft={handleSaveDraft}
        />
      </>
    )
  }
  ```

- [ ] **Step 2: Write `TusUploadForm`**

  Create `app/app/(protected)/admin/videos/_components/uploadForm/TusUploadForm.tsx`:

  ```tsx
  'use client'
  // app/admin/videos/_components/uploadForm/TusUploadForm.tsx
  import { useEffect, useRef, useState } from 'react'
  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { Uppy } from '@uppy/core'
  import Tus from '@uppy/tus'
  import { toast } from 'sonner'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { formSchema, VideoFormData } from './formSchema'
  import BasicInformationSection from './BasicInformationSection'
  import AdditionalDetailsSection from './AdditionalDetailsSection'
  import PublishingSection from './PublishingSection'
  import FormActions from './FormActions'
  import UploadError from './UploadError'
  import TusUploadZone, { TusUploadPhase } from '../TusUploadZone'
  import ThumbnailUploadZone from '../ThumbnailUploadZone'
  import { VideoProcessingDialog } from '@/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog'
  import { useVideoProcessing } from '@/hooks/video/use-video-processing'
  import { tokenManager } from '@/lib/utils/tokenManager'
  import { getTusUploadStatus } from '@/lib/apis/tusUpload'
  import { uploadVideoThumbnail, updateVideoDetails } from '@/lib/apis/video'
  import { VideoDetailsUpdatePayload } from '@/lib/types/video'

  const TUS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost"}/files/`

  // tusd is the source of truth for the upload ID — Uppy's `file.id` is a
  // client-side hash and never overwritten by the Tus plugin. The real,
  // backend-assigned ID only shows up in the Location header tusd returns on
  // upload creation, surfaced as `file.uploadURL` once the upload succeeds.
  const extractUploadId = (uploadURL: string | undefined): string | null => {
    if (!uploadURL) return null
    const segments = uploadURL.split("/").filter(Boolean)
    const last = segments.at(-1)
    return last ? decodeURIComponent(last) : null
  }

  const buildDetailsPayload = (data: VideoFormData): VideoDetailsUpdatePayload => ({
    title: data.title,
    description: data.description,
    category: data.category,
    age_rating: data.ageRating || undefined,
    release_date: data.releaseDate || undefined,
    director: data.director || undefined,
    cast: data.cast || undefined,
    tags: data.tags,
    status: data.status,
  })

  // The resumable (tus) upload flow — the default when
  // NEXT_PUBLIC_UPLOADS_TUS_ENABLED is on. Reuses the same form sections and
  // zod schema as LegacyUploadForm; what differs is the submit mechanics:
  // the video file goes through Uppy/tus with only title+category in tus
  // metadata, and the rest of the form is sent via PATCH once tus resolves a
  // video_id (see the "complete" handler below).
  export function TusUploadForm() {
    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [phase, setPhase] = useState<TusUploadPhase>("idle")
    const [progress, setProgress] = useState({ percent: 0, uploaded: 0, total: 0 })
    const [speedBytesPerSec, setSpeedBytesPerSec] = useState(0)

    const uppyRef = useRef<Uppy | null>(null)
    const fileIdRef = useRef<string | null>(null)
    const lastProgressRef = useRef({ bytes: 0, time: Date.now() })
    // The Uppy "complete" handler below runs inside an effect that only
    // subscribes once ([openDialog] deps — see the comment at the end of
    // that effect). Reading `thumbnailFile` there directly would close over
    // whatever it was AT MOUNT TIME (null), not its value at submit time, so
    // the thumbnail POST would silently never fire. A ref sidesteps that the
    // same way fileIdRef already does for the upload ID.
    const thumbnailFileRef = useRef<File | null>(null)

    const form = useForm<VideoFormData>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        title: '', description: '', category: '', ageRating: '',
        director: '', cast: '', releaseDate: '', status: 'draft', tags: []
      }
    })

    const isSubmitting = phase === "uploading" || phase === "paused" || phase === "finalizing"

    const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
      pollingInterval: 3000,
      onError: (error) => toast.error("Processing failed", { description: error.message }),
    })

    // Losing the tab mid-upload or mid-finalize is worse here than on the
    // multipart form: closing during "finalizing" leaves a video with only
    // title+category set (the video and thumbnail/metadata calls are
    // separate requests). Warn during both windows.
    useEffect(() => {
      if (!isSubmitting) return
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = ""
      }
      window.addEventListener("beforeunload", handler)
      return () => window.removeEventListener("beforeunload", handler)
    }, [isSubmitting])

    useEffect(() => {
      const uppy = new Uppy({ restrictions: { maxNumberOfFiles: 1 } })
      uppy.use(Tus, { endpoint: TUS_ENDPOINT, chunkSize: 50 * 1024 * 1024 })

      uppy.on("upload-progress", (_file, p) => {
        if (!p.bytesTotal) return
        setProgress({
          percent: Math.round((p.bytesUploaded / p.bytesTotal) * 100),
          uploaded: p.bytesUploaded,
          total: p.bytesTotal,
        })
        const now = Date.now()
        const elapsed = (now - lastProgressRef.current.time) / 1000
        if (elapsed > 0.5) {
          const bytesDelta = p.bytesUploaded - lastProgressRef.current.bytes
          setSpeedBytesPerSec(Math.max(0, bytesDelta / elapsed))
          lastProgressRef.current = { bytes: p.bytesUploaded, time: now }
        }
      })

      uppy.on("upload-pause", (_file, isPaused) => {
        setPhase(isPaused ? "paused" : "uploading")
        toast(isPaused ? "Upload paused." : "Resumed — picking up where you left off.")
      })

      uppy.on("complete", async (result) => {
        const file = result.successful?.[0]
        if (!file) return

        const uploadId = extractUploadId(file.uploadURL)
        if (!uploadId) {
          setPhase("error")
          toast.error("Upload finished but no upload ID was returned — check the admin videos table")
          return
        }

        setPhase("finalizing")

        const pollForVideoId = async (attempt = 0): Promise<string | null> => {
          try {
            const status = await getTusUploadStatus(uploadId)
            if (status.video_id) return status.video_id
          } catch {
            // not found yet — post-finish may still be in flight
          }
          if (attempt >= 20) return null
          await new Promise((resolve) => setTimeout(resolve, 1500))
          return pollForVideoId(attempt + 1)
        }

        const resolvedVideoId = await pollForVideoId()
        if (!resolvedVideoId) {
          setPhase("error")
          toast.error("Upload finished but processing didn't start — check the admin videos table")
          return
        }

        const formValues = form.getValues()
        const stagedThumbnail = thumbnailFileRef.current
        const [thumbnailResult, metadataResult] = await Promise.allSettled([
          stagedThumbnail ? uploadVideoThumbnail(resolvedVideoId, stagedThumbnail) : Promise.resolve(null),
          updateVideoDetails(resolvedVideoId, buildDetailsPayload(formValues)),
        ])

        if (thumbnailResult.status === "rejected") {
          toast.error("Couldn't save thumbnail — you can set it later from Edit Details.")
        }
        if (metadataResult.status === "rejected") {
          toast.error("Couldn't save video details — you can set them later from Edit Details.")
        }

        setPhase("idle")
        form.reset()
        setVideoFile(null)
        setThumbnailFile(null)
        openDialog(resolvedVideoId)
      })

      uppy.on("error", (error) => {
        setPhase("error")
        toast.error("Upload failed", { description: error.message })
      })

      uppy.on("upload-error", (_file, error) => {
        setPhase("error")
        toast.error("Upload failed", { description: error.message })
      })

      uppyRef.current = uppy
      return () => uppy.destroy()
      // openDialog is a stable useCallback ([] deps in useVideoProcessing).
      // form is a stable ref-backed object (read via .getValues() at
      // complete-time, safe regardless of when the effect subscribed).
      // thumbnailFile is NOT read directly here for that same reason it
      // would be unsafe — see thumbnailFileRef above.
    }, [openDialog])

    const onSubmit = (data: VideoFormData) => {
      if (!videoFile) {
        setUploadError("Please select a video file before uploading")
        toast.error("Please select a video file")
        return
      }
      if (!thumbnailFile) {
        setUploadError("Please select a thumbnail file before uploading")
        toast.error("Please select a thumbnail file")
        return
      }
      if (!uppyRef.current) return

      setUploadError(null)
      thumbnailFileRef.current = thumbnailFile

      const token = tokenManager.getAccessToken() || ""
      const fileId = uppyRef.current.addFile({
        name: videoFile.name,
        type: videoFile.type,
        data: videoFile,
        meta: { token, title: data.title, category: data.category, filetype: videoFile.type },
      })
      fileIdRef.current = fileId
      lastProgressRef.current = { bytes: 0, time: Date.now() }
      setPhase("uploading")
      uppyRef.current.upload()
    }

    const handleTogglePause = () => {
      if (!uppyRef.current || !fileIdRef.current) return
      uppyRef.current.pauseResume(fileIdRef.current)
      // Returns undefined (no-op) when the upload isn't resumable or is
      // already finished — the "upload-pause" listener above is what
      // actually updates `phase`, so there's nothing further to do here.
    }

    // The recovery path after a failed upload (phase === "error"). Without
    // this, the form gets stuck: phase never resets on its own, and simply
    // clearing videoFile would leave a stale entry in Uppy's internal file
    // store (restrictions.maxNumberOfFiles: 1 would then reject the next
    // addFile call). Also reachable while idle, to remove a staged-but-not
    // -yet-submitted file — fileIdRef is null then, so removeFile is skipped.
    const handleRemoveFile = () => {
      if (fileIdRef.current && uppyRef.current) {
        try {
          uppyRef.current.removeFile(fileIdRef.current)
        } catch {
          // already gone
        }
      }
      fileIdRef.current = null
      thumbnailFileRef.current = null
      setVideoFile(null)
      setPhase("idle")
    }

    const handleSaveDraft = async () => {
      setUploadError(null)
      try {
        form.setValue('status', 'draft')
        const values = form.getValues()
        // TODO: Implement actual draft saving API call — same simulated
        // stub as LegacyUploadForm; no real backend route exists yet.
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('Saved as draft:', values)
        toast.success("Draft saved successfully!")
      } catch {
        const errorMessage = "Failed to save draft. Please try again."
        setUploadError(errorMessage)
        toast.error(errorMessage)
      }
    }

    return (
      <>
        <VideoProcessingDialog
          isOpen={isOpen}
          onClose={closeDialog}
          videoId={videoId || undefined}
          currentStatus={currentStatus}
          fileName={videoFile?.name}
        />

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <UploadError error={uploadError} onDismiss={() => setUploadError(null)} />

          <Card>
            <CardHeader>
              <CardTitle>Video File</CardTitle>
            </CardHeader>
            <CardContent>
              <TusUploadZone
                videoFile={videoFile}
                setVideoFile={setVideoFile}
                onRemove={handleRemoveFile}
                phase={phase}
                progress={progress}
                speedBytesPerSec={speedBytesPerSec}
                onTogglePause={handleTogglePause}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
            </CardHeader>
            <CardContent>
              <ThumbnailUploadZone
                thumbnailFile={thumbnailFile}
                setThumbnailFile={setThumbnailFile}
              />
            </CardContent>
          </Card>

          <BasicInformationSection form={form} />
          <AdditionalDetailsSection form={form} />
          <PublishingSection form={form} />

          <FormActions
            isSubmitting={isSubmitting}
            videoFile={videoFile}
            onSaveDraft={handleSaveDraft}
          />
        </form>
      </>
    )
  }
  ```

- [ ] **Step 3: Verify**

  Run `pnpm build` from `app/` and confirm both files compile with no type errors.

  If a running dev stack is available, this is the highest-value manual check in the whole plan: with `NEXT_PUBLIC_UPLOADS_TUS_ENABLED=true` (Task 7 makes this the default, but it can be set in `app/.env.local` early to test this task in isolation), go to `/admin/videos/upload`, fill in the full form including a thumbnail, submit, and confirm: the dropzone shows live progress with the eyebrow status text, the pause button actually pauses (network tab shows no more PATCH requests to tusd), resume picks back up, and once the bar completes the UI shows "FINALIZING DETAILS" briefly before the processing dialog opens. Confirm in `make db` that the resulting video row has its thumbnail_url, description, and other fields set — not just title/category.

- [ ] **Step 4: Commit**

  ```bash
  git add "app/app/(protected)/admin/videos/_components/uploadForm/LegacyUploadForm.tsx" \
          "app/app/(protected)/admin/videos/_components/uploadForm/TusUploadForm.tsx"
  git commit -m "feat: build the full resumable upload form with pause/resume and live progress"
  ```

---

### Task 7: Wire the flag-fork, consolidate the route, flip env defaults, sweep dead code

**Files:**
- Modify: `app/app/(protected)/admin/videos/upload/page.tsx`
- Delete: `app/app/(protected)/admin/videos/upload/resumable/page.tsx`
- Modify: `app/app/(protected)/admin/videos/_components/VideoUploadZone.tsx`
- Modify: `app/.env.example`
- Modify: `infra/.env.example`
- Modify: `infra/local.env`
- Modify: `infra/prod.env`

- [ ] **Step 1: Rewrite `upload/page.tsx` as the flag-fork**

  Replace the full contents of `app/app/(protected)/admin/videos/upload/page.tsx` with:

  ```tsx
  'use client'
  // app/admin/videos/upload/page.tsx
  import Link from 'next/link'
  import { ArrowLeft } from 'lucide-react'
  import { Button } from '@/components/ui/button'
  import { isResumableUploadsEnabled } from '@/lib/utils/featureFlags'
  import { LegacyUploadForm } from '../_components/uploadForm/LegacyUploadForm'
  import { TusUploadForm } from '../_components/uploadForm/TusUploadForm'

  const UploadVideoPage = () => {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Link href="/admin/videos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl">Upload Video</h1>
            <p className="text-muted-foreground">
              Add a new video to your library
            </p>
          </div>
        </div>

        {isResumableUploadsEnabled() ? <TusUploadForm /> : <LegacyUploadForm />}
      </div>
    )
  }

  export default UploadVideoPage
  ```

- [ ] **Step 2: Delete the standalone resumable route**

  ```bash
  git rm "app/app/(protected)/admin/videos/upload/resumable/page.tsx"
  ```

  If this leaves `app/app/(protected)/admin/videos/upload/resumable/` empty, the directory disappears on its own — no further action needed.

- [ ] **Step 3: Clean up `VideoUploadZone.tsx`'s dead fake-progress code**

  This component is used unmodified by `LegacyUploadForm` via `UploadForm.tsx` — only its long-dead, always-commented-out progress simulation is being removed, not its behavior. Replace the full contents of `app/app/(protected)/admin/videos/_components/VideoUploadZone.tsx` with:

  ```tsx
  // app/admin/videos/_components/VideoUploadZone.tsx
  "use client"

  import React, { useCallback } from 'react'
  import { useDropzone } from 'react-dropzone'
  import { Upload, Video, X, FileVideo } from 'lucide-react'
  import { Button } from '@/components/ui/button'

  interface VideoUploadZoneProps {
    videoFile: File | null
    setVideoFile: (file: File | null) => void
  }

  const VideoUploadZone = ({ videoFile, setVideoFile }: VideoUploadZoneProps) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setVideoFile(acceptedFiles[0])
      }
    }, [setVideoFile])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: {
        'video/*': ['.mp4']
      },
      maxFiles: 1,
      maxSize: 5 * 1024 * 1024 * 1024 // 5GB
    })

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    if (videoFile) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileVideo className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{videoFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(videoFile.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setVideoFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold mb-1">
              {isDragActive ? 'Drop video here' : 'Drag & drop video file'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (MP4)
            </p>
          </div>
          <Button type="button" variant="secondary">
            <Video className="h-4 w-4 mr-2" />
            Choose Video File
          </Button>
        </div>
      </div>
    )
  }

  export default VideoUploadZone
  ```

  (Removed: the commented-out progress-simulation block in `onDrop`, the dead `uploadProgress`/`setUploadProgress` state that only that block wrote to, the commented-out `<Progress>` JSX block, and the now-unused `Progress` import.)

- [ ] **Step 4: Flip the frontend/infra flag defaults**

  `app/.env.example`, line 2:
  ```
  NEXT_PUBLIC_UPLOADS_TUS_ENABLED=true
  ```

  `infra/.env.example`, line 104:
  ```
  uploads_tus_enabled=true
  ```

  `infra/local.env`, line 109:
  ```
  uploads_tus_enabled=true
  ```

  `infra/prod.env`, line 106:
  ```
  uploads_tus_enabled=true
  ```

  (This brings the repo's `prod.env` back in sync with what's already manually set on the live server — see the project history noting the admin flipped it there directly outside git.)

- [ ] **Step 5: Verify**

  Run `pnpm build` from `app/` and confirm it compiles. Grep to confirm no remaining references to the deleted route or the removed "beta" link:

  ```bash
  grep -rn "upload/resumable\|resumable upload (beta)" app/app app/lib 2>/dev/null
  ```

  Expected: no output.

  If a running dev stack is available, restart the frontend dev server (env defaults are read at build/start time) and confirm `/admin/videos/upload` now renders the new tus form by default with no flag override set, and that setting `NEXT_PUBLIC_UPLOADS_TUS_ENABLED=false` in `app/.env.local` and restarting falls back to the unchanged legacy form.

- [ ] **Step 6: Commit**

  ```bash
  git add "app/app/(protected)/admin/videos/upload/page.tsx" \
          "app/app/(protected)/admin/videos/_components/VideoUploadZone.tsx" \
          app/.env.example infra/.env.example infra/local.env infra/prod.env
  git rm "app/app/(protected)/admin/videos/upload/resumable/page.tsx"
  git commit -m "feat: make resumable upload the default at /admin/videos/upload, consolidate the route"
  ```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-26-resumable-upload-main-ux-design.md` maps to a task — §1 (backend) → Task 2, §2 route consolidation/flag flip → Tasks 6/7, §2 new UI (pause/resume, progress, drag animation, toasts, Watch now) → Tasks 4/5/6, §3 dialog lift → Task 1, §4 dead code → Tasks 1/6/7.
- **Beyond the spec:** the `is_public`/`status` derivation fix (Task 2, Step 2) was not in the original design spec — it surfaced during pre-implementation research as a real bug that would otherwise make "Published" videos submitted through the new form silently unreachable. Fixing it server-side (rather than duplicating the derivation in the frontend payload builder) also fixes the same pre-existing gap in the already-shipped `EditVideoDialog`.
- **Two bugs caught and fixed in the plan text itself before dispatch** (found via a second design-review pass on the fully-written Task 6 code, before any implementer saw it): (1) the Uppy `complete` handler originally read `thumbnailFile` from a stale closure — since the effect subscribes once on mount, that value was permanently `null`, so the thumbnail POST would never fire, silently, with no error. Fixed via `thumbnailFileRef`, set at submit time and read at complete-time, mirroring how `fileIdRef` already worked. (2) `phase` never reset after `"error"`, permanently disabling the dropzone and remove button on any upload failure — recoverable only by a full page reload. Fixed by allowing removal while `phase === "error"` and adding `handleRemoveFile`, which also cleans up Uppy's internal file entry so a retry with a new file doesn't collide with `restrictions.maxNumberOfFiles: 1`.
- **Task order:** Task 1 (dialog lift) is deliberately first — it's independent of every other task, small, and immediately valuable, so the branch has a shippable improvement even if the larger form work needs another round.
- **Type consistency check:** `TusUploadPhase` (Task 5) is used identically in `TusUploadZone` and `TusUploadForm` (Task 6). `VideoDetailsUpdatePayload` (existing type) is used as-is in Task 6's `buildDetailsPayload` — no new fields needed since Task 2 moved the `is_public` derivation server-side, so the frontend never has to send it.
