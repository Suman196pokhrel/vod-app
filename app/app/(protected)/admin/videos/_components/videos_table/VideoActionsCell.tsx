"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Video } from "@/lib/types/video";
import { deleteVideo, updateVideoVisibility, getVideoDownloadUrl } from "@/lib/apis/video";
import { Button } from "@/components/ui/button";
import { IconSwap } from "@/lib/motion/IconSwap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditVideoDialog } from "./EditVideoDialog";
import { ViewVideoDetailsDialog } from "./ViewVideoDetailsDialog";
import {
  MoreHorizontal,
  Play,
  Pencil,
  Trash,
  Download,
  Link as LinkIcon,
  Info,
  Copy,
  Check,
  Loader2,
  Globe,
  Lock,
} from "lucide-react";

// Radix's DropdownMenu and Dialog/AlertDialog both use portals + a
// pointer-events lock while open. Opening one from the other's onClick in
// the same tick (or via onSelect + preventDefault) stacks two locks and
// leaves document.body permanently unclickable once either closes. Letting
// the dropdown finish its own close cycle first (onSelect, no
// preventDefault, deferred via setTimeout) avoids that — see the delete
// confirmation below, which this mirrors.
const deferOpen = (fn: () => void) => setTimeout(fn, 0);

export function VideoActionsCell({ video }: { video: Video }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"link" | "id" | null>(null);
  const queryClient = useQueryClient();

  const invalidateTable = () =>
    queryClient.invalidateQueries({ queryKey: ["getAllVideosAdmin"] });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVideo(video.id),
    onSuccess: () => {
      toast.success(`"${video.title}" removed from listings`);
      setConfirmOpen(false);
      invalidateTable();
    },
    onError: (error: Error) => {
      console.error("[VideoActionsCell] delete failed", { videoId: video.id, error });
      toast.error(error.message || "Failed to delete video");
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: () => updateVideoVisibility(video.id, !video.is_public),
    onSuccess: (updated) => {
      toast.success(
        updated.is_public ? `"${video.title}" is now public` : `"${video.title}" is now private`
      );
      invalidateTable();
    },
    onError: (error: Error) => {
      console.error("[VideoActionsCell] visibility toggle failed", { videoId: video.id, error });
      toast.error(error.message || "Failed to update visibility");
    },
  });

  const handlePreview = () => {
    console.debug("[VideoActionsCell] previewing video", video.id);
    router.push(`/watch/${video.id}`);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/watch/${video.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
    setCopiedField("link");
    setTimeout(() => setCopiedField((f) => (f === "link" ? null : f)), 1500);
  };

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(video.id);
    toast.success("Video ID copied to clipboard");
    setCopiedField("id");
    setTimeout(() => setCopiedField((f) => (f === "id" ? null : f)), 1500);
  };

  const downloadMutation = useMutation({
    mutationFn: () => getVideoDownloadUrl(video.id),
    onSuccess: (url) => {
      console.debug("[VideoActionsCell] got download URL for", video.id);
      // Content-Disposition: attachment is set on MinIO's own response for
      // this URL, so navigating to it downloads the file rather than
      // playing it inline — a plain <a download> can't force that here
      // since storage is served from a different origin than the frontend.
      window.location.href = url;
    },
    onError: (error: Error) => {
      console.error("[VideoActionsCell] download failed", { videoId: video.id, error });
      toast.error(error.message || "Failed to download video");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handlePreview} disabled={!video.manifest_url}>
            <Play className="mr-2 h-4 w-4" />
            Preview Video
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => deferOpen(() => setEditOpen(true))}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => visibilityMutation.mutate()}
            disabled={visibilityMutation.isPending}
          >
            {video.is_public ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Make Private
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Make Public
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => deferOpen(() => setDetailsOpen(true))}>
            <Info className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => downloadMutation.mutate()}
            disabled={!video.raw_video_path || downloadMutation.isPending}
          >
            {downloadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            <IconSwap icon={copiedField === "link" ? Check : LinkIcon} size={16} className="mr-2" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyId}>
            <IconSwap icon={copiedField === "id" ? Check : Copy} size={16} className="mr-2" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => deferOpen(() => setConfirmOpen(true))}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Video
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditVideoDialog video={video} open={editOpen} onOpenChange={setEditOpen} />
      <ViewVideoDetailsDialog video={video} open={detailsOpen} onOpenChange={setDetailsOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete "${video.title}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the video from browsing, search, and playback everywhere.
              The underlying files are kept in storage, not erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
