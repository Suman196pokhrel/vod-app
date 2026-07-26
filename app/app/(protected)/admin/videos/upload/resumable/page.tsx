"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Uppy } from "@uppy/core"
import Tus from "@uppy/tus"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VideoProcessingDialog } from "@/app/(protected)/admin/videos/_components/multi_step_progress/video-processing-dialog"
import { useVideoProcessing } from "@/hooks/video/use-video-processing"
import { tokenManager } from "@/lib/utils/tokenManager"
import { isResumableUploadsEnabled } from "@/lib/utils/featureFlags"
import { getTusUploadStatus } from "@/lib/apis/tusUpload"
import { toast } from "sonner"

const CATEGORIES = ["action", "drama", "comedy", "scifi", "thriller", "documentary", "fantasy", "horror"]
const TUS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost"}/files/`

// tusd is the source of truth for the upload ID — Uppy's `file.id` is a
// client-side hash generated in addFile() and never overwritten by the Tus
// plugin. The real, backend-assigned ID only shows up in the Location header
// tusd returns on upload creation, which Uppy surfaces as `file.uploadURL`
// (e.g. "http://localhost/files/<uuid>+<multipartId>") once the upload
// succeeds. Extract the last path segment from that URL instead.
const extractUploadId = (uploadURL: string | undefined): string | null => {
  if (!uploadURL) return null
  const segments = uploadURL.split("/").filter(Boolean)
  const last = segments.at(-1)
  return last ? decodeURIComponent(last) : null
}

export default function ResumableUploadPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const uppyRef = useRef<Uppy | null>(null)

  const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
    pollingInterval: 3000,
    onComplete: () => toast.success("Processing complete"),
    onError: (error) => toast.error("Processing failed", { description: error.message }),
  })

  useEffect(() => {
    if (!isResumableUploadsEnabled()) {
      router.replace("/admin/videos/upload")
    }
  }, [router])

  useEffect(() => {
    const uppy = new Uppy({ restrictions: { maxNumberOfFiles: 1 } })
    uppy.use(Tus, { endpoint: TUS_ENDPOINT, chunkSize: 50 * 1024 * 1024 })

    uppy.on("upload-progress", (_file, p) => {
      if (p.bytesTotal) setProgress(Math.round((p.bytesUploaded / p.bytesTotal) * 100))
    })

    uppy.on("complete", async (result) => {
      const file = result.successful?.[0]
      if (!file) return
      setIsUploading(false)

      const uploadId = extractUploadId(file.uploadURL)
      if (!uploadId) {
        toast.error("Upload finished but no upload ID was returned — check the admin videos table")
        return
      }

      const pollForVideoId = async (attempt = 0): Promise<void> => {
        try {
          const status = await getTusUploadStatus(uploadId)
          if (status.video_id) {
            openDialog(status.video_id)
            return
          }
        } catch {
          // not found yet — keep polling briefly, post-finish may still be in flight
        }
        if (attempt < 20) {
          setTimeout(() => pollForVideoId(attempt + 1), 1500)
        } else {
          toast.error("Upload finished but processing didn't start — check the admin videos table")
        }
      }
      pollForVideoId()
    })

    // "error" covers Uppy-level failures (e.g. restriction violations); the
    // per-file network/retry-exhaustion failures that actually matter during
    // a resume test surface on "upload-error" instead — hook both so a
    // failed resume shows a toast rather than leaving the bar frozen mid-upload.
    uppy.on("error", (error) => {
      setIsUploading(false)
      toast.error("Upload failed", { description: error.message })
    })

    uppy.on("upload-error", (_file, error) => {
      setIsUploading(false)
      toast.error("Upload failed", { description: error.message })
    })

    uppyRef.current = uppy
    return () => uppy.destroy()
    // openDialog is a stable useCallback ([] deps in useVideoProcessing) — listed
    // here to satisfy exhaustive-deps without changing when this effect re-runs.
  }, [openDialog])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uppyRef.current) return
    if (!title.trim() || !category) {
      toast.error("Enter a title and category before selecting a file")
      return
    }

    const token = tokenManager.getAccessToken() || ""
    uppyRef.current.addFile({
      name: file.name,
      type: file.type,
      data: file,
      meta: { token, title, category, filetype: file.type },
    })
    setIsUploading(true)
    uppyRef.current.upload()
  }

  if (!isResumableUploadsEnabled()) return null

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Resumable Upload (Beta)</h1>

      <div className="space-y-2">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isUploading} />
        <Select value={category} onValueChange={setCategory} disabled={isUploading}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          disabled={isUploading || !title.trim() || !category}
          onChange={handleFileSelect}
        />
        {isUploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><span>Uploading...</span><span>{progress}%</span></div>
            <Progress value={progress} />
          </div>
        )}
      </div>

      <VideoProcessingDialog
        isOpen={isOpen}
        onClose={closeDialog}
        currentStatus={currentStatus}
        videoId={videoId || undefined}
        fileName={title}
        onRetry={() => {}}
      />
    </div>
  )
}
