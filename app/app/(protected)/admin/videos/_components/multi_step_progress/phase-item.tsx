
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
  const Icon = phase.icon;

  return (
    <div className="flex flex-col items-center gap-3 relative">
      {/* Icon Container */}
      <div
        className={cn(
          "relative flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ease-out",
          "border-2",
          isComplete && [
            "bg-gradient-to-br from-primary to-primary/90",
            "border-primary shadow-lg shadow-primary/20",
            "scale-100",
          ],
          isActive && [
            "bg-primary/10 border-primary",
            "shadow-lg shadow-primary/20",
            "animate-pulse",
          ],
          !isActive && !isComplete && [
            "bg-muted/50 border-muted-foreground/20",
          ]
        )}
        style={{
          animationDelay: `${index * 100}ms`,
        }}
      >
        {isActive ? (
          <Loader2 
            className="w-6 h-6 text-primary animate-spin" 
            strokeWidth={2.5}
          />
        ) : isComplete ? (
          <CheckCircle2 
            className="w-6 h-6 text-primary-foreground animate-in zoom-in duration-300" 
            strokeWidth={2.5}
          />
        ) : (
          <Icon 
            className="w-6 h-6 text-muted-foreground" 
            // strokeWidth={2}
          />
        )}

        {/* Active Pulse Ring */}
        {isActive && (
          <div className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-20" />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-xs font-semibold tracking-wide uppercase transition-colors duration-300",
          isComplete && "text-primary",
          isActive && "text-primary",
          !isActive && !isComplete && "text-muted-foreground"
        )}
      >
        {phase.label}
      </span>

      {/* Connector Line */}
      {index < 3 && (
        <div
          className={cn(
            "absolute top-7 left-[calc(50%+28px)] w-[calc(100%-28px)] h-0.5 transition-all duration-700",
            isComplete ? "bg-primary" : "bg-muted-foreground/20"
          )}
          style={{
            transitionDelay: `${index * 150}ms`,
          }}
        />
      )}
    </div>
  );
};