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
          "relative flex items-center justify-center xl:w-14 xl:h-14 w-10 h-10 rounded-2xl transition-all duration-(--duration-slow) ease-(--ease-out-quart)",
          "border-2",
          isComplete && ["bg-accent border-primary"],
          isActive && ["bg-accent border-primary animate-pulse"],
          !isActive && !isComplete && ["bg-card border-border"]
        )}
        style={{
          animationDelay: `${index * 100}ms`,
        }}
      >
        {isActive ? (
          <Icon
            className="xl:w-8 w-6 xl:h-8 h-6 text-primary"
            strokeWidth={2}
          />
        ) : isComplete ? (
          <Icon
            className="xl:w-8 w-7 xl:h-8 h-7 text-primary transition ease-(--ease-out-quart)"
            strokeWidth={2}
          />
        ) : (
          <Icon
            className="xl:w-6 w-6 xl:h-6 h-6 text-muted-foreground"
            strokeWidth={2}
          />
        )}


      </div>

      {/* Label */}
      <span className="eyebrow transition-colors duration-(--duration-fast)">
        <span className={isComplete || isActive ? "text-primary" : undefined}>
          {phase.label}
        </span>
      </span>

      {/* Connector Line */}
       {index < PROCESSING_PHASES.length - 1 && (
        <div
          className={cn(
            "absolute top-10 xl:top-7 h-2 w-0.5 xl:left-[calc(50%+28px)] xl:w-[calc(100%-40px)] xl:h-0.5 transition-all duration-(--duration-slow) ease-(--ease-out-quart) z-0",
            isComplete ? "bg-primary" : "bg-border"
          )}
          style={{
            transitionDelay: `${index * 150}ms`,
          }}
        />
      )}
    </div>
  );
};
