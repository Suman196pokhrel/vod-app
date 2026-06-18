# 11 — Frontend: Video Upload Form

The admin uploads a video through a multi-step form. This is one of the most feature-complete frontend flows in the project — it's wired to the real API, handles the `multipart/form-data` quirk, and polls for processing status after upload. Let's walk through exactly how it works.

---

## The Upload Route

**`app/(protected)/admin/videos/upload/page.tsx`** — renders the upload form. Only accessible to admins (protected by the admin layout redirect).

The page is structured as a step-by-step form:
1. **Video file and thumbnail selection** — drag-and-drop zones
2. **Metadata entry** — title, description, category, tags, cast, director, age rating, release date
3. **Review and submit**

---

## VideoUploadForm Component

**`app/(protected)/admin/videos/upload/_components/VideoUploadForm.tsx`**

This is the main form component. It uses React Hook Form for state management and Zod for validation.

### File Selection

**Video drop zone** — accepts MP4 files only (`accept={{ 'video/mp4': ['.mp4'] }}`), with a maximum file size of 5GB. Other formats (MOV, MKV) aren't accepted by the current drop zone configuration (even though the backend accepts them). Dragging a video file onto the zone shows a preview with the file name and size.

**Thumbnail drop zone** — accepts JPEG and PNG images. The thumbnail is effectively **required**: if you try to submit without one, the `onSubmit` handler rejects the form before making the API call. The Zod schema marks it as optional, but the submit handler adds a manual check. This is a slight inconsistency in the implementation — the UX should show a clear error, but currently it silently blocks submission.

### Metadata Fields

- **Title** — required, 5–200 characters
- **Description** — required, 10–2000 characters
- **Category** — required, select from a predefined list (Drama, Action, Comedy, Documentary, etc.)
- **Age Rating** — G, PG, PG-13, R, TV-14, TV-MA — defaults to PG-13
- **Director** — optional free text
- **Cast** — optional free text (comma-separated names; the backend stores and normalizes this)
- **Release Date** — date picker
- **Tags** — tag input, supports adding and removing individual tags
- **Is Public** — there is **no** `is_public` toggle in the current form, despite the Video model having a `is_public` field. All uploads default to private/draft until this is wired up.

### Form Actions

**`_components/FormActions.tsx`** — renders the Submit and Save Draft buttons.

**Submit** — calls `onSubmit`, triggers the API call
**Save Draft** — calls `onSaveDraft`, which is currently a **1-second simulated delay** with no actual API call:

```typescript
const onSaveDraft = async () => {
  setIsSaving(true)
  await new Promise(resolve => setTimeout(resolve, 1000))  // fake delay
  setIsSaving(false)
  toast.success("Draft saved!")
}
```

This is placeholder UI — the toast appears and the button shows a loading spinner, but nothing is saved to the backend.

---

## The Submission Flow

When the admin clicks Submit, `onSubmit` is called:

```typescript
const onSubmit = async (formData) => {
  if (!videoFile || !thumbnailFile) {
    toast.error("Please select a video and thumbnail")
    return
  }

  const metadata = {
    title: formData.title,
    description: formData.description,
    category: formData.category,
    age_rating: formData.ageRating,
    director: formData.director,
    cast: formData.cast,
    release_date: formData.releaseDate,
    tags: formData.tags,
  }

  const form = new FormData()
  form.append('video', videoFile)
  form.append('thumbnail', thumbnailFile)
  form.append('data', JSON.stringify(metadata))  // ← the JSON string quirk

  const response = await createVideo(form)
  setVideoId(response.id)
  setShowProgressDialog(true)
}
```

The key here is `JSON.stringify(metadata)` — the metadata is serialized as a string and placed in the `data` form field, not sent as a separate JSON body. This matches the backend's `data: str = Form(...)` parameter.

The Axios client doesn't set `Content-Type` manually here — it detects the `FormData` body and lets the browser set `multipart/form-data` with the correct boundary automatically.

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

- **File too large** (>5GB) — caught by the drop zone before the API call
- **Wrong file type** — caught by the drop zone configuration
- **API error** — shown as a toast notification; the progress dialog doesn't open
- **Processing failure** — the polling hook detects `status === "failed"`, calls `onError`, and shows an error state in the dialog

---

## Future Upgrades

- **Upload progress bar** — currently no indication of how far through the file upload we are. Implementing this requires tracking XHR upload progress (available via Axios's `onUploadProgress` option).
- **Save Draft (real implementation)** — call `POST /videos/create` with `status: "draft"` and no file yet (or a separate draft endpoint)
- **Multi-file queue** — allow queuing multiple video uploads that process sequentially or in parallel
- **Is Public toggle** — expose the `is_public` field in the form
- **Accept more video formats** — update the drop zone to accept MOV, MKV, and AVI (the backend already accepts them)
- **Resumable upload** — for very large files, implement chunked upload that can resume after a network interruption

---

## What's Next

The upload form is one of the most functional pieces of the frontend. But there's another major feature area that's entirely visual with no backend connection: the AI features. The next document covers every AI component in the app, what the vision is, and what it would actually take to implement them.
