// VibeLogo.tsx - Modern Soundwave Logo

interface VibeLogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}

export function VibeLogo({ 
  variant = "full", 
  size = "md", 
  animated = false,
  className = "" 
}: VibeLogoProps) {
  const sizes = {
    sm: { height: 32, fontSize: "text-lg" },
    md: { height: 40, fontSize: "text-xl" },
    lg: { height: 56, fontSize: "text-3xl" },
    xl: { height: 72, fontSize: "text-4xl" },
  };

  const currentSize = sizes[size];

  // Icon Only - Soundwave bars
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
          <linearGradient id="vibe-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* 5 Frequency bars of different heights */}
        <rect 
          x="15" 
          y="35" 
          width="10" 
          height="30" 
          rx="5" 
          fill="url(#vibe-gradient)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "0ms" } : {}}
        />
        <rect 
          x="30" 
          y="20" 
          width="10" 
          height="60" 
          rx="5" 
          fill="url(#vibe-gradient)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "150ms" } : {}}
        />
        <rect 
          x="45" 
          y="10" 
          width="10" 
          height="80" 
          rx="5" 
          fill="url(#vibe-gradient)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "300ms" } : {}}
        />
        <rect 
          x="60" 
          y="25" 
          width="10" 
          height="50" 
          rx="5" 
          fill="url(#vibe-gradient)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "150ms" } : {}}
        />
        <rect 
          x="75" 
          y="40" 
          width="10" 
          height="20" 
          rx="5" 
          fill="url(#vibe-gradient)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "0ms" } : {}}
        />
      </svg>
    );
  }

  // Text Only
  if (variant === "text") {
    return (
      <div className={`font-bold ${currentSize.fontSize} ${className}`}>
        <span className="bg-linear-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
          vibe
        </span>
      </div>
    );
  }

  // Full Logo (Icon + Text)
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <svg
        width={currentSize.height}
        height={currentSize.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="vibe-gradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* 5 Frequency bars */}
        <rect 
          x="15" 
          y="35" 
          width="10" 
          height="30" 
          rx="5" 
          fill="url(#vibe-gradient-full)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "0ms" } : {}}
        />
        <rect 
          x="30" 
          y="20" 
          width="10" 
          height="60" 
          rx="5" 
          fill="url(#vibe-gradient-full)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "150ms" } : {}}
        />
        <rect 
          x="45" 
          y="10" 
          width="10" 
          height="80" 
          rx="5" 
          fill="url(#vibe-gradient-full)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "300ms" } : {}}
        />
        <rect 
          x="60" 
          y="25" 
          width="10" 
          height="50" 
          rx="5" 
          fill="url(#vibe-gradient-full)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "150ms" } : {}}
        />
        <rect 
          x="75" 
          y="40" 
          width="10" 
          height="20" 
          rx="5" 
          fill="url(#vibe-gradient-full)"
          className={animated ? "animate-pulse" : ""}
          style={animated ? { animationDelay: "0ms" } : {}}
        />
      </svg>
      
      <span className={`font-bold ${currentSize.fontSize} bg-linear-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent`}>
        vibe
      </span>
    </div>
  );
}