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

      // Clear Uppy's internal file store on success — without this,
      // restrictions.maxNumberOfFiles: 1 silently rejects every subsequent
      // addFile() for the rest of the page's lifetime (the Uppy instance is
      // created once per mount), and Uppy signals that rejection via a
      // "restriction-failed" event, not "error"/"upload-error", so it was
      // going completely unsurfaced: the Upload button would look like it
      // does nothing on a second video.
      try {
        uppyRef.current?.clear()
      } catch {
        // no-op: only throws if an upload is still in progress, which it
        // isn't here — the upload just completed.
      }
      fileIdRef.current = null
      thumbnailFileRef.current = null

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

    // Restriction violations (e.g. a stale file still in Uppy's store from
    // maxNumberOfFiles: 1) surface here, not via "error"/"upload-error" —
    // without this listener they fail completely silently.
    uppy.on("restriction-failed", (_file, error) => {
      setPhase("error")
      toast.error("Couldn't start upload", { description: error.message })
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
    try {
      const fileId = uppyRef.current.addFile({
        name: videoFile.name,
        type: videoFile.type,
        data: videoFile,
        meta: { token, title: data.title, category: data.category, filetype: videoFile.type },
      })
      fileIdRef.current = fileId
      lastProgressRef.current = { bytes: 0, time: Date.now() }
      setProgress({ percent: 0, uploaded: 0, total: 0 })
      setSpeedBytesPerSec(0)
      setPhase("uploading")
      uppyRef.current.upload().catch((error: Error) => {
        setPhase("error")
        toast.error("Upload failed", { description: error.message })
      })
    } catch {
      // addFile() throws synchronously on a restriction violation (e.g. a
      // stale file already in Uppy's store) — the "restriction-failed"
      // listener above already surfaces a toast for this same error; catch
      // here only to stop it propagating as an uncaught exception.
    }
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
  // progress/speedBytesPerSec are reset here too (not just at the next
  // onSubmit) so a fresh file selection right after a failure never has a
  // window to render leftover numbers from the failed attempt.
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
    setProgress({ percent: 0, uploaded: 0, total: 0 })
    setSpeedBytesPerSec(0)
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
