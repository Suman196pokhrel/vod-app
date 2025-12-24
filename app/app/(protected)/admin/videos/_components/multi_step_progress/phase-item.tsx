// components/video-processing/phase-item.tsx

"use client";

import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhaseItemProps } from "@/lib/types/video";

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
          "relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ease-out",
          "border-2",
          isComplete && [
             "bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600",
            "border-purple-500",
            "shadow-lg shadow-purple-500/30",
          ],
          isActive && [
            "bg-gradient-to-br from-purple-50 to-blue-50",
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
          <Loader2 
            className="w-6 h-6 text-purple-600 animate-spin" 
            strokeWidth={2.5}
          />
        ) : isComplete ? (
          <CheckCircle2 
            className="w-6 h-6 text-white animate-in zoom-in duration-300" 
            strokeWidth={2.5}
          />
        ) : (
          <Icon 
            className="w-6 h-6 text-gray-400" 
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
       {index < 3 && (
        <div
          className={cn(
            "absolute top-7 left-[calc(50%+28px)] w-[calc(100%-40px)] h-0.5 transition-all duration-700 z-0",
            isComplete 
              ? "bg-gradient-to-r from-purple-500 to-blue-500" 
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