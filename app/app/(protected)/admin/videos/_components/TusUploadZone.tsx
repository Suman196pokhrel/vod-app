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
