// VibeLogoRipple.tsx - Signal Ripple Design

interface VibeLogoRippleProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  className?: string;
}

export function VibeLogoRipple({ 
  variant = "full", 
  size = "md", 
  animated = false,
  className = "" 
}: VibeLogoRippleProps) {
  const sizes = {
    sm: { height: 32, fontSize: "text-lg" },
    md: { height: 40, fontSize: "text-xl" },
    lg: { height: 56, fontSize: "text-3xl" },
    xl: { height: 72, fontSize: "text-4xl" },
  };

  const currentSize = sizes[size];

  // Icon Only - Concentric circles
  if (variant === "icon") {
    return (
      <div className="relative" style={{ width: currentSize.height, height: currentSize.height }}>
        {animated && (
          <>
            <div className="absolute inset-0 border-4 border-purple-500 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping opacity-20" style={{ animationDelay: "1s" }} />
          </>
        )}
        <svg
          width={currentSize.height}
          height={currentSize.height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
        >
          <defs>
            <linearGradient id="ripple-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          
          {/* Center dot */}
          <circle cx="50" cy="50" r="8" fill="url(#ripple-gradient)" />
          
          {/* Ripple circles */}
          <circle cx="50" cy="50" r="20" stroke="url(#ripple-gradient)" strokeWidth="3" opacity="0.8" />
          <circle cx="50" cy="50" r="32" stroke="url(#ripple-gradient)" strokeWidth="2.5" opacity="0.5" />
          <circle cx="50" cy="50" r="44" stroke="url(#ripple-gradient)" strokeWidth="2" opacity="0.3" />
        </svg>
      </div>
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
      <div className="relative" style={{ width: currentSize.height, height: currentSize.height }}>
        {animated && (
          <>
            <div className="absolute inset-0 border-4 border-purple-500 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping opacity-20" style={{ animationDelay: "1s" }} />
          </>
        )}
        <svg
          width={currentSize.height}
          height={currentSize.height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
        >
          <defs>
            <linearGradient id="ripple-gradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          
          {/* Center dot */}
          <circle cx="50" cy="50" r="8" fill="url(#ripple-gradient-full)" />
          
          {/* Ripple circles */}
          <circle cx="50" cy="50" r="20" stroke="url(#ripple-gradient-full)" strokeWidth="3" opacity="0.8" />
          <circle cx="50" cy="50" r="32" stroke="url(#ripple-gradient-full)" strokeWidth="2.5" opacity="0.5" />
          <circle cx="50" cy="50" r="44" stroke="url(#ripple-gradient-full)" strokeWidth="2" opacity="0.3" />
        </svg>
      </div>
      
      <span className={`font-bold ${currentSize.fontSize} bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent`}>
        vibe
      </span>
    </div>
  );
}