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
import { Progress } from "@/components/ui/progress";
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
    if (!isInProgress) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
     <DialogContent
        className={cn(
          "sm:max-w-[580px] xl:min-w-4xl gap-6 p-0 overflow-hidden border-0",
          "bg-white shadow-2xl shadow-purple-500/10"
        )}
        overlayClassName="bg-black/20 backdrop-blur-sm" //  Custom light overlay
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
                <DialogTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {isComplete
                    ? "Processing Complete"
                    : isFailed
                    ? "Processing Failed"
                    : "Processing Video"}
                </DialogTitle>
                <DialogDescription className="text-base text-gray-600">
                  {fileName ? (
                    <span className="flex items-center gap-2">
                      <FileVideo className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-700">{fileName}</span>
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
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-linear-to-r from-purple-500 via-purple-600 to-blue-600 transition-all duration-700 ease-out rounded-full shadow-lg shadow-purple-500/30"
                    style={{ width: `${statusMeta.progress}%` }}
                  >
                    <div className="h-full w-full animate-shimmer bg-linear-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">
                    {statusMeta.message}
                  </span>
                  <span className="font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent tabular-nums text-base">
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
            <Alert className="border-green-200 bg-green-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-900 font-medium">
                Your video is ready to stream! All quality versions have been
                generated successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {isFailed && (
            <Alert className="border-red-200 bg-red-50 animate-in fade-in-from-bottom-4 duration-500">
              <XCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <p className="font-medium mb-2">
                  We encountered an issue processing your video.
                </p>
                <p className="text-sm text-red-800">
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
            <Button
              onClick={onRetry}
              variant="outline"
              className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}
          
          {!isInProgress && (
            <Button
              onClick={handleClose}
              className={cn(
                "bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/30",
                isComplete && "from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-500/30"
              )}
            >
              {isComplete ? "Done" : "Close"}
            </Button>
          )}

          {isInProgress && (
            <Button disabled variant="outline" className="border-purple-200 text-purple-600">
              Processing...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};