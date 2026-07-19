"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Video } from "@/lib/types/video";
import { deleteVideo } from "@/lib/apis/video";
import { Button } from "@/components/ui/button";
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
import {
  MoreHorizontal,
  Play,
  Pencil,
  Trash,
  Download,
  Link as LinkIcon,
  Info,
  Copy,
  Loader2,
} from "lucide-react";

export function VideoActionsCell({ video }: { video: Video }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteVideo(video.id),
    onSuccess: () => {
      toast.success(`"${video.title}" deleted`);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["getAllVideosAdmin"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete video");
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
          <DropdownMenuItem
            onClick={() => console.log("Preview", video.id)}
            disabled={!video.manifest_url}
          >
            <Play className="mr-2 h-4 w-4" />
            Preview Video
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log("Edit", video.id)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log("View details", video.id)}>
            <Info className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => console.log("Download", video.id)}
            disabled={!video.manifest_url}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (video.manifest_url) {
                navigator.clipboard.writeText(video.manifest_url);
              }
            }}
            disabled={!video.manifest_url}
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(video.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              // Let the dropdown close normally first — opening the
              // AlertDialog in the same tick (e.g. via preventDefault)
              // stacks two Radix pointer-events locks and leaves
              // document.body permanently unclickable after either closes.
              setTimeout(() => setConfirmOpen(true), 0);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Video
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{video.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the video record, its source file, and its
              thumbnail. This action cannot be undone.
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
