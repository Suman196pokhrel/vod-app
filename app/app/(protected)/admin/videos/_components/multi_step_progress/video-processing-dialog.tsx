// components/video-processing/video-processing-dialog.tsx

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, RefreshCw, FileVideo } from "lucide-react";
import { cn } from "@/lib/utils";

import { VideoProcessingDialogProps } from "@/lib/types/video";
import { PROCESSING_PHASES } from "@/constants/video-processing";
import {
  getStatusMeta,
  isPhaseActive,
  isPhaseComplete,
  isProcessingComplete,
  isProcessingFailed,
  isProcessingInProgress,
} from "@/lib/utils/video-processing";
import { PhaseItem } from "./phase-item";

export const VideoProcessingDialog: React.FC<VideoProcessingDialogProps> = ({
  isOpen,
  onClose,
  currentStatus,
  videoId,
  fileName,
  onRetry,
}) => {
  const statusMeta = getStatusMeta(currentStatus);
  const isComplete = isProcessingComplete(currentStatus);
  const isFailed = isProcessingFailed(currentStatus);
  const isInProgress = isProcessingInProgress(currentStatus);

  const handleClose = () => {
    // if (!isInProgress) {
      onClose();
    // }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
     <DialogContent
        className={cn(
          "sm:max-w-[580px] xl:min-w-4xl gap-6 p-0 overflow-hidden border-0",
          "bg-popover shadow-2xl"
        )}
        overlayClassName="bg-surface-watch/20 backdrop-blur-sm" //  Custom light overlay
        onInteractOutside={(e) => {
          if (isInProgress) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isInProgress) {
            e.preventDefault();
          }
        }}
      >
        {/* Header Section */}
        <div className="px-6 pt-6 pb-0">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                  {isComplete
                    ? "Processing Complete"
                    : isFailed
                    ? "Processing Failed"
                    : "Processing Video"}
                </DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  {fileName ? (
                    <span className="flex items-center gap-2">
                      <FileVideo className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">{fileName}</span>
                    </span>
                  ) : (
                    "Your video is being prepared for streaming"
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Progress Section */}
        <div className="px-6 space-y-4">
          {!isFailed && (
            <>
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-(--duration-slow) ease-(--ease-out-quart) rounded-full"
                    style={{ width: `${statusMeta.progress}%` }}
                  >
                    <div className="h-full w-full animate-shimmer bg-linear-to-r from-transparent via-foreground/30 to-transparent" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">
                    {statusMeta.message}
                  </span>
                  <span className="font-semibold text-primary tabular-nums text-base">
                    {statusMeta.progress}%
                  </span>
                </div>
              </div>

              {/* Processing Phases */}
              <div className="relative pt-4 pb-2 ">
                <div className="xl:grid  xl:grid-cols-7 xl:gap-3 xl:overflow-x-auto pb-2 flex flex-col items-center gap-5">
                  {PROCESSING_PHASES.map((phase, index) => (
                    <PhaseItem
                      key={phase.id}
                      phase={phase}
                      isActive={isPhaseActive(index, currentStatus)}
                      isComplete={isPhaseComplete(index, currentStatus)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Success Alert */}
          {isComplete && (
            <Alert className="border-border bg-card animate-in fade-in slide-in-from-bottom-4 duration-(--duration-slow)">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <AlertDescription className="text-foreground font-medium">
                Your video is ready to stream! All quality versions have been
                generated successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {isFailed && (
            <Alert className="border-destructive/20 bg-destructive/10 animate-in fade-in slide-in-from-bottom-4 duration-(--duration-slow)">
              <XCircle className="h-5 w-5 text-destructive" />
              <AlertDescription className="text-foreground">
                <p className="font-medium mb-2">
                  We encountered an issue processing your video.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please try uploading again or contact support if the problem
                  persists.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
          {isFailed && onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
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
      </DialogContent>
    </Dialog>
  );
};