// hooks/use-video-processing.ts

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ProcessingStatus } from "@/lib/types/video";
import { ApiError, getVideoStatus } from "@/lib/apis/video";

interface UseVideoProcessingOptions {
  pollingInterval?: number;
  onComplete?: (videoId: string) => void;
  onError?: (error: Error) => void;
}


interface UseVideoProcessingReturn {
  isOpen: boolean;
  currentStatus: ProcessingStatus;
  videoId: string | null;
  openDialog: (videoId?: string) => void;
  closeDialog: () => void;
  resetProcessing: () => void;
}

export const useVideoProcessing = (
  options: UseVideoProcessingOptions = {}
): UseVideoProcessingReturn => {
  const {
    pollingInterval = 2000,
    onComplete,
    onError,
  } = options;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentStatus, setCurrentStatus] = useState<ProcessingStatus>(
    ProcessingStatus.UPLOADING
  );
  //  Use ref to store videoId - available immediately, no re-render delays
  const videoIdRef = useRef<string | null>(null);

  // Poll for status updates
  useEffect(() => {
    if (!isOpen || !videoIdRef.current) {
      console.log('Not polling:', { isOpen, videoId: videoIdRef.current });
      return;
    }

    console.log(' Starting polling for video:', videoIdRef.current);

    const pollStatus = async (): Promise<void> => {
      try {
        //  Use the helper function instead of fetch
        const data = await getVideoStatus(videoIdRef.current!);
        
        console.log(' Polled status:', data.status, data);
        setCurrentStatus(data.status);

        // Handle completion
        if (data.is_completed) {
          console.log(' Processing complete!');
          onComplete?.(videoIdRef.current!);
        }

        // Handle failure
        if (data.is_failed) {
          console.log(' Processing failed!');
          onError?.(new Error(data.error || "Video processing failed"));
        }
      } catch (error) {
        console.error("Error polling video status:", error);
        
        // Handle ApiError type
        const apiError = error as ApiError;
        onError?.(new Error(apiError.message || "Failed to fetch status"));
      }
    };

    // Poll immediately
    pollStatus();

    // Then poll on interval
    const interval = setInterval(pollStatus, pollingInterval);

    // Cleanup
    return () => {
      console.log(' Stopping polling');
      clearInterval(interval);
    };
  }, [isOpen, pollingInterval, onComplete, onError]);

  const openDialog = useCallback((videoId?: string) => {
    console.log(' Opening dialog for video:', videoId);
    if(videoId && videoId.trim() !== ""){
    videoIdRef.current = videoId;  // Store in ref (immediate)
    }
    setIsOpen(true);               // Open dialog (triggers useEffect)
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
    videoId: videoIdRef.current,
    openDialog,
    closeDialog,
    resetProcessing,
  };
};