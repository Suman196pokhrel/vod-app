// hooks/use-video-processing.ts

"use client";

import { useState, useEffect, useCallback } from "react";
import { ProcessingStatus } from "@/lib/types/video";

interface UseVideoProcessingOptions {
  videoId?: string;
  initialStatus?: ProcessingStatus;
  pollingInterval?: number;
  onComplete?: (videoId: string) => void;
  onError?: (error: Error) => void;
}

interface UseVideoProcessingReturn {
  isOpen: boolean;
  currentStatus: ProcessingStatus;
  openDialog: () => void;
  closeDialog: () => void;
  updateStatus: (status: ProcessingStatus) => void;
  resetProcessing: () => void;
}

export const useVideoProcessing = (
  options: UseVideoProcessingOptions = {}
): UseVideoProcessingReturn => {
  const {
    videoId,
    initialStatus = ProcessingStatus.UPLOADING,
    pollingInterval = 2000,
    onComplete,
    onError,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ProcessingStatus>(initialStatus);

  // Poll for status updates
  useEffect(() => {
    if (!isOpen || !videoId) return;

    const pollStatus = async () => {
      try {
        // Replace with your actual API call
        const response = await fetch(`/api/videos/${videoId}/status`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch video status");
        }

        const data = await response.json();
        const newStatus = data.processing_status as ProcessingStatus;
        
        setCurrentStatus(newStatus);

        // Handle completion
        if (newStatus === ProcessingStatus.COMPLETED) {
          onComplete?.(videoId);
        }

        // Handle failure
        if (newStatus === ProcessingStatus.FAILED) {
          onError?.(new Error("Video processing failed"));
        }
      } catch (error) {
        console.error("Error polling video status:", error);
        onError?.(error as Error);
      }
    };

    // Poll immediately
    pollStatus();

    // Set up polling interval
    const interval = setInterval(pollStatus, pollingInterval);

    return () => clearInterval(interval);
  }, [isOpen, videoId, pollingInterval, onComplete, onError]);

  const openDialog = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updateStatus = useCallback((status: ProcessingStatus) => {
    setCurrentStatus(status);
  }, []);

  const resetProcessing = useCallback(() => {
    setCurrentStatus(ProcessingStatus.UPLOADING);
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    currentStatus,
    openDialog,
    closeDialog,
    updateStatus,
    resetProcessing,
  };
};