// components/video-processing/phase-item.tsx

"use client";

import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhaseItemProps } from "@/lib/types/video";
import { PROCESSING_PHASES } from "@/constants/video-processing";

export const PhaseItem: React.FC<PhaseItemProps> = ({
  phase,
  isActive,
  isComplete,
  index,
}) => {
  const Icon = phase.icon as any;

  return (
    <div className="flex flex-col items-center gap-3 relative">
      {/* Icon Container */}
      <div
        className={cn(
          "relative flex items-center justify-center xl:w-14 xl:h-14 w-10 h-10 rounded-2xl transition-all duration-500 ease-out",
          "border-2",
          isComplete && [
             "bg-linear-to-br from-purple-500 via-purple-600 to-blue-600",
            "border-purple-500",
            "shadow-lg shadow-purple-500/30",
          ],
          isActive && [
            "bg-linear-to-br from-purple-50 to-blue-600 via-purple-600  animate-bounce",
            "border-purple-500",
            "shadow-lg shadow-purple-400/20",
            "animate-pulse",
          ],
          !isActive && !isComplete && [
             "bg-white border-gray-200",
            "shadow-sm",
          ]
        )}
        style={{
          animationDelay: `${index * 100}ms`,
        }}
      >
        {isActive ? (
          <Icon 
            className="xl:w-8 w-6 xl:h-8 h-6 text-white" 
            strokeWidth={2}
          />
        ) : isComplete ? (
          <Icon 
            className="xl:w-8 w-7 xl:h-8 h-7 text-white transition ease-in-out" 
            strokeWidth={2}
          />
        ) : (
          <Icon 
            className="xl:w-6 w-6 xl:h-6 h-6 text-gray-400" 
            strokeWidth={2}
          />
        )}


      </div>

      {/* Label */}
      <span
        className={cn(
          "text-xs font-semibold tracking-wide uppercase transition-colors duration-300",
          isComplete && "text-purple-600",
          isActive && "text-purple-600",
          !isActive && !isComplete && "text-gray-400"
        )}
      >
        {phase.label}
      </span>

      {/* Connector Line */}
       {index < PROCESSING_PHASES.length - 1 && (
        <div
          className={cn(
            "absolute top-10 xl:top-7 h-2 w-0.5 xl:left-[calc(50%+28px)] xl:w-[calc(100%-40px)] xl:h-0.5 transition-all duration-700 z-0",
            isComplete 
              ? "bg-linear-to-r from-purple-500 to-blue-500" 
              : "bg-gray-200"
          )}
          style={{
            transitionDelay: `${index * 150}ms`,
          }}
        />
      )}
    </div>
  );
};