// VibeLogoPulse.tsx - Pulse Wave Alternative

interface VibeLogoPulseProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}

export function VibeLogoPulse({ 
  variant = "full", 
  size = "md", 
  animated = false,
  className = "" 
}: VibeLogoPulseProps) {
  const sizes = {
    sm: { height: 32, fontSize: "text-lg" },
    md: { height: 40, fontSize: "text-xl" },
    lg: { height: 56, fontSize: "text-3xl" },
    xl: { height: 72, fontSize: "text-4xl" },
  };

  const currentSize = sizes[size];

  // Icon Only - Smooth wave
  if (variant === "icon") {
    return (
      <svg
        width={currentSize.height}
        height={currentSize.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Smooth sine wave */}
        <path
          d="M10 50 Q20 30, 30 50 T50 50 Q60 70, 70 50 T90 50"
          stroke="url(#pulse-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          className={animated ? "animate-pulse" : ""}
        />
      </svg>
    );
  }

  // Text Only
  if (variant === "text") {
    return (
      <div className={`font-bold ${currentSize.fontSize} ${className}`}>
        <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
          vibe
        </span>
      </div>
    );
  }

  // Full Logo
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={currentSize.height}
        height={currentSize.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pulse-gradient-full" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Smooth sine wave */}
        <path
          d="M10 50 Q20 30, 30 50 T50 50 Q60 70, 70 50 T90 50"
          stroke="url(#pulse-gradient-full)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          className={animated ? "animate-pulse" : ""}
        />
      </svg>
      
      <span className={`font-bold ${currentSize.fontSize} bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent`}>
        vibe
      </span>
    </div>
  );
}