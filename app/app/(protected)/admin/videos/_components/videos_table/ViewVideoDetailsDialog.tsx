"use client"

import { toast } from "sonner"
import { Copy } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { Video } from "@/lib/types/video"
import { ProcessingStatusBadge, PublishStatusBadge } from "./status-badge"
import {
  formatFileSize,
  formatDuration,
  formatNumber,
  formatDate,
  formatDateTime,
  getResolutionLabel,
} from "./helper"

interface ViewVideoDetailsDialogProps {
  video: Video
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value}</span>
    </div>
  )
}

function CopyableId({ value }: { value: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value)
        toast.success("Copied to clipboard")
      }}
      className="group inline-flex items-center gap-1.5 rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground"
      title={value}
    >
      {value}
      <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

export function ViewVideoDetailsDialog({ video, open, onOpenChange }: ViewVideoDetailsDialogProps) {
  const meta = video.processing_metadata

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{video.title}</DialogTitle>
          <DialogDescription asChild>
            <CopyableId value={video.id} />
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <PublishStatusBadge status={video.status} isPublic={video.is_public} />
          <ProcessingStatusBadge status={video.processing_status} />
          {video.category && <Badge variant="outline">{video.category}</Badge>}
          {video.age_rating && <Badge variant="outline">{video.age_rating}</Badge>}
        </div>

        {video.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{video.description}</p>
        )}

        <Separator />

        <div>
          <DetailRow label="Director" value={video.director} />
          <DetailRow label="Cast" value={video.cast?.join(", ")} />
          <DetailRow
            label="Tags"
            value={
              video.tags && video.tags.length > 0 ? (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  {video.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal">
                      #{tag}
                    </Badge>
                  ))}
                </span>
              ) : null
            }
          />
          <DetailRow
            label="Release date"
            value={video.release_date ? formatDate(video.release_date) : null}
          />
          <DetailRow label="Views" value={formatNumber(video.views_count)} />
          <DetailRow label="Likes" value={formatNumber(video.likes_count)} />
          <DetailRow label="Created" value={formatDateTime(video.created_at)} />
          <DetailRow label="Last updated" value={formatDateTime(video.updated_at)} />
          {(video.user_username || video.user_email) && (
            <DetailRow
              label="Uploaded by"
              value={video.user_username ?? video.user_email}
            />
          )}
        </div>

        {meta && (
          <>
            <Separator />
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                Technical
              </p>
              <DetailRow
                label="Resolution"
                value={
                  meta.width && meta.height
                    ? `${meta.width}×${meta.height} (${getResolutionLabel(meta.width, meta.height)})`
                    : null
                }
              />
              <DetailRow
                label="Duration"
                value={meta.duration_seconds ? formatDuration(meta.duration_seconds) : null}
              />
              <DetailRow label="Codec" value={meta.codec} />
              <DetailRow
                label="Bitrate"
                value={meta.bitrate ? `${Math.round(meta.bitrate / 1000)} kbps` : null}
              />
              <DetailRow
                label="File size"
                value={meta.file_size ? formatFileSize(meta.file_size) : null}
              />
              <DetailRow
                label="Qualities"
                value={video.available_qualities?.length ? video.available_qualities.join(", ") : null}
              />
            </div>
          </>
        )}

        {video.processing_error && (
          <>
            <Separator />
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-xs font-medium uppercase text-destructive">Processing error</p>
              <p className="mt-1 text-sm text-destructive">{video.processing_error}</p>
            </div>
          </>
        )}

        <Separator />

        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Storage (debug)
          </p>
          <DetailRow label="Raw video" value={<CopyableId value={video.raw_video_path} />} />
          {video.thumbnail_url && (
            <DetailRow label="Thumbnail" value={<CopyableId value={video.thumbnail_url} />} />
          )}
          {video.manifest_url && (
            <DetailRow label="Manifest" value={<CopyableId value={video.manifest_url} />} />
          )}
          {video.celery_task_id && (
            <DetailRow label="Celery task" value={<CopyableId value={video.celery_task_id} />} />
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
