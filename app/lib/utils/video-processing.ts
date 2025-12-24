// utils/video-processing.ts

import { ProcessingStatus } from "@/lib/types/video";
import { PROCESSING_PHASES, STATUS_META, DEFAULT_META } from "@/constants/video-processing";

export const getCurrentPhaseIndex = (status: ProcessingStatus): number => {
  return PROCESSING_PHASES.findIndex((phase) =>
    phase.statuses.includes(status)
  );
};

export const isPhaseComplete = (
  phaseIndex: number,
  currentStatus: ProcessingStatus
): boolean => {
  const currentPhaseIndex = getCurrentPhaseIndex(currentStatus);
  return (
    currentPhaseIndex > phaseIndex ||
    currentStatus === ProcessingStatus.COMPLETED
  );
};

export const isPhaseActive = (
  phaseIndex: number,
  currentStatus: ProcessingStatus
): boolean => {
  return (
    getCurrentPhaseIndex(currentStatus) === phaseIndex &&
    currentStatus !== ProcessingStatus.COMPLETED &&
    currentStatus !== ProcessingStatus.FAILED
  );
};

export const getStatusMeta = (status: ProcessingStatus) => {
  return STATUS_META[status] || DEFAULT_META;
};

export const isProcessingComplete = (status: ProcessingStatus): boolean => {
  return status === ProcessingStatus.COMPLETED;
};

export const isProcessingFailed = (status: ProcessingStatus): boolean => {
  return status === ProcessingStatus.FAILED;
};

export const isProcessingInProgress = (status: ProcessingStatus): boolean => {
  return (
    !isProcessingComplete(status) && 
    !isProcessingFailed(status)
  );
};