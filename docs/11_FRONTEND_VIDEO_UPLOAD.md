# 11 - Frontend: Video Upload Form

The admin uploads a video through this form. As of `NEXT_PUBLIC_UPLOADS_TUS_ENABLED` defaulting to `true`, the form the admin actually sees by default is the resumable (tusd + Uppy) one, not the classic multipart one this document originally covered. Both forms share the same field sections and validation; what differs is submission mechanics. See [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md) for the resumable flow's backend/infrastructure side - this document covers the frontend form itself, both variants.

---

## The Upload Route

**`app/(protected)/admin/videos/upload/page.tsx`** - renders the upload form. Only accessible to admins (protected by the admin layout redirect).

```tsx
{isResumableUploadsEnabled() ? <TusUploadForm /> : <LegacyUploadForm />}
```

Both forms live in `app/(protected)/admin/videos/_components/uploadForm/` - a sibling of the `upload/` route directory, not nested inside it. There is no file literally named `VideoUploadForm.tsx`; that name describes an earlier, single-form version of this page. `LegacyUploadForm.tsx` and `TusUploadForm.tsx` each own their own submission logic, but both render the same shared `UploadForm.tsx` (or, more precisely, the same field sections composed the same way) for everything else: video/thumbnail drop zones, `BasicInformationSection`, `AdditionalDetailsSection`, `PublishingSection`, `FormActions`.

The form is **not** a multi-step wizard - every section renders in one continuous scrolling page, all at once, using React Hook Form for state and Zod for validation.

### File Selection

**Video drop zone** - the resumable form's zone (`TusUploadZone.tsx`) additionally shows live upload progress, transfer speed, and a pause/resume control once a file is selected and submission starts, none of which the legacy zone has since it can't report progress mid-upload (see "Why Not Stream to Disk First?" in [05_VIDEO_UPLOAD.md](./05_VIDEO_UPLOAD.md)).

**Thumbnail drop zone** - accepts JPEG and PNG images. The thumbnail is effectively **required**: if you try to submit without one, the `onSubmit` handler rejects the form before making the API call. The Zod schema marks it as optional, but the submit handler adds a manual check. This is a slight inconsistency in the implementation - the UX should show a clear error, but currently it silently blocks submission.

### Metadata Fields

- **Title** - required, 5–200 characters
- **Description** - required, 10–2000 characters
- **Category** - required, select from a predefined list (Drama, Action, Comedy, Documentary, etc.)
- **Age Rating** - G, PG, PG-13, R, TV-14, TV-MA - defaults to PG-13
- **Director** - optional free text
- **Cast** - optional free text (comma-separated names; the backend stores and normalizes this)
- **Release Date** - date picker
- **Tags** - tag input, supports adding and removing individual tags
- **Is Public** - there is **no** `is_public` toggle in this form. The `Video` model's `is_public` field defaults to `True` at creation and can only be flipped afterward, from the admin videos table's row-actions menu (`PATCH /videos/by-id/{video_id}/visibility` - see [10_FRONTEND_ADMIN_PANEL.md](./10_FRONTEND_ADMIN_PANEL.md)). There's no way to set a video private at the moment of upload itself.

### Form Actions

**`_components/FormActions.tsx`** - renders the Submit and Save Draft buttons.

**Submit** - calls `onSubmit`, triggers the API call
**Save Draft** - still a **1-second simulated delay**, no real API call, on both forms:

```typescript
const handleSaveDraft = async () => {
  setUploadError(null)
  try {
    form.setValue('status', 'draft')
    const values = form.getValues()
    // TODO: Implement actual draft saving API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success("Draft saved successfully!")
  }
  // ...
}
```

This is placeholder UI - the toast appears, but nothing is saved to the backend. `lib/apis/video.ts` exports a `saveDraft()` function that posts to `POST /videos/draft`, but two things stop it from being a two-line fix. First, `handleSaveDraft` above never calls it, on either form. Second, and more fundamentally, `/videos/draft` isn't a route that exists anywhere in the backend's `video.py` - so even wiring the button to call `saveDraft()` as it stands today would just trade a fake success toast for a real 404. Building this out means adding the missing endpoint (or pointing `saveDraft()` at a route that does exist), then wiring the button to call it.

---

## The Submission Flow

There are two different submission mechanics depending on which form is active.

### Legacy path (`LegacyUploadForm.tsx`)

```typescript
const onSubmit = async (data: VideoFormData) => {
  if (!videoFile || !thumbnailFile) {
    toast.error("Please select a video and thumbnail")
    return
  }
  const result = await uploadVideo({ data, videoFile, thumbnailFile })
  // ...
}
```

`uploadVideo()` (`lib/apis/video.ts`) takes a typed object, not a raw `FormData` - it builds the `multipart/form-data` request internally, JSON-serializing the metadata (in camelCase: `ageRating`, `releaseDate`, `director`, `cast`, `tags`, `status`) into the `data` form field itself, matching the backend's `data: str = Form(...)` parameter. The Axios client doesn't set `Content-Type` manually here - it detects the `FormData` body and lets the browser set `multipart/form-data` with the correct boundary automatically.

### Resumable path (`TusUploadForm.tsx`, the default)

The video file never goes through this JSON-string mechanism at all. On submit, only `title`/`category`/an access token ride along as tus upload metadata; the video file is handed straight to Uppy, which uploads it directly to tusd. Everything else happens after the upload completes:

1. Uppy fires `complete` once the file finishes uploading to tusd.
2. The frontend polls `GET /internal/tus/hooks/uploads/{upload_id}` (via `getTusUploadStatus()`) until the backend's post-finish hook has resolved a `video_id` - up to 20 attempts, 1.5 seconds apart.
3. Once a `video_id` is known, the thumbnail (`uploadVideoThumbnail()`, `POST /videos/{video_id}/thumbnail`) and the rest of the form's metadata (`updateVideoDetails()`, `PATCH /videos/by-id/{video_id}`) are sent as two separate follow-up requests, run concurrently via `Promise.allSettled` so one failing doesn't block the other.

This is why the resumable path supports pause/resume mid-upload (Uppy's own capability) but has a slightly different failure mode: if the tab closes between steps 2 and 3, the video row exists with only a title and category, recoverable later from Edit Details rather than lost outright.

---

## Processing Status Dialog

After submission, `setShowProgressDialog(true)` opens a modal dialog that shows the video processing progress. This dialog is powered by the `useVideoProcessing` hook.

**`hooks/video/use-video-processing.ts`**

```typescript
export function useVideoProcessing({
  videoId,
  onComplete,
  onError,
  pollingInterval = 3000
}: VideoProcessingOptions) {
  const videoIdRef = useRef(videoId)
  
  const { data, isError } = useQuery({
    queryKey: ['videoProcessing', videoId],
    queryFn: () => getVideoStatus(videoIdRef.current!),
    refetchInterval: (data) => {
      const status = data?.state?.data?.status
      if (status === 'completed' || status === 'failed') return false
      return pollingInterval
    },
    enabled: !!videoId,
  })
  
  // call onComplete/onError callbacks based on status
}
```

The `useRef` for `videoId` is important: if the hook were called before `videoId` is set in the parent component's state, there would be a brief moment where `videoId` is `undefined`. Using a ref lets the poll function always reference the latest value without needing to re-create the interval. The query runs every 3 seconds (the `pollingInterval` default on the upload page, not the 2000ms you might see referenced elsewhere).

The dialog shows:
- Current processing stage (e.g., "Transcoding 720p")
- A progress bar (derived from the `progress` field in the status response, 0–100)
- Each completed stage with a checkmark
- Error state if processing fails

When `status === "completed"`, `onComplete` is called, the dialog shows a success state, and a "View Video" button appears.

---

## Error Handling During Upload

- **Wrong file type** - caught by the drop zone configuration
- **API error** - shown as a toast notification; the progress dialog doesn't open
- **Processing failure** - the polling hook detects `status === "failed"`, calls `onError`, and shows an error state in the dialog
- **Resumable upload failures** - Uppy's own `error`/`upload-error`/`restriction-failed` events are all listened for and surfaced as toasts; a stale file left in Uppy's internal store from a previous attempt is cleared on both success and explicit removal, since Uppy otherwise silently rejects a second file with `maxNumberOfFiles: 1` still in effect

---

## Future Upgrades

- **Real upload progress on the legacy path** - the resumable form already has this (live percent, speed, pause/resume); the legacy multipart form still has no way to report progress mid-upload, since the whole file is a single request
- **Save Draft (real implementation)** - build the missing `POST /videos/draft` backend route (or repoint the existing `saveDraft()` frontend function at a route that exists), then call it from `handleSaveDraft` on both forms
- **Multi-file queue** - allow queuing multiple video uploads that process sequentially or in parallel
- **Is Public toggle at creation time** - expose the `is_public` field in the form itself, instead of only after the fact from the admin table
- **A cancel button for in-progress resumable uploads** - see [15_RESUMABLE_UPLOADS.md](./15_RESUMABLE_UPLOADS.md) for why this is a real, code-acknowledged gap rather than a nice-to-have
- **Real size/format enforcement on the legacy path** - see [05_VIDEO_UPLOAD.md](./05_VIDEO_UPLOAD.md) for the shadowed-validation-method bug that means no size cap currently runs on that path at all

---

## What's Next

The upload form is one of the most functional pieces of the frontend. But there's another major feature area that's entirely visual with no backend connection: the AI features. The next document covers every AI component in the app, what the vision is, and what it would actually take to implement them.
