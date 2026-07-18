// VibeLogo.tsx - Modern Soundwave Logo

interface VibeLogoProps {
  variant?: "full" | "icon" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  mono?: boolean;
  className?: string;
}

export function VibeLogo({
  variant = "full",
  size = "md",
  animated = false,
  mono = false,
  className = "",
}: VibeLogoProps) {
  const sizes = {
    sm: { height: 32, fontSize: "text-lg" },
    md: { height: 40, fontSize: "text-xl" },
    lg: { height: 56, fontSize: "text-3xl" },
    xl: { height: 72, fontSize: "text-4xl" },
  };

  const currentSize = sizes[size];
  // mono: solid currentColor fill for the new monochrome landing/auth
  // surfaces. Non-mono keeps the original gradient for surfaces (e.g. the
  // logged-in home nav) that are out of scope for this redesign.
  const barFill = mono ? "currentColor" : "url(#vibe-gradient)";
  const barFillFull = mono ? "currentColor" : "url(#vibe-gradient-full)";
  const textClass = mono
    ? "text-current"
    : "bg-linear-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent";

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
        {!mono && (
          <defs>
            <linearGradient id="vibe-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        )}

        <rect x="15" y="35" width="10" height="30" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
        <rect x="30" y="20" width="10" height="60" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="45" y="10" width="10" height="80" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "300ms" } : {}} />
        <rect x="60" y="25" width="10" height="50" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="75" y="40" width="10" height="20" rx="5" fill={barFill} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
      </svg>
    );
  }

  // Text Only
  if (variant === "text") {
    return (
      <div className={`font-bold ${currentSize.fontSize} ${className}`}>
        <span className={textClass}>vibe</span>
      </div>
    );
  }

  // Full Logo (Icon + Text)
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <svg width={currentSize.height} height={50} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {!mono && (
          <defs>
            <linearGradient id="vibe-gradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: "#6366f1", stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        )}

        <rect x="15" y="35" width="10" height="30" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
        <rect x="30" y="20" width="10" height="60" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="45" y="10" width="10" height="80" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "300ms" } : {}} />
        <rect x="60" y="25" width="10" height="50" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "150ms" } : {}} />
        <rect x="75" y="40" width="10" height="20" rx="5" fill={barFillFull} className={animated ? "animate-pulse" : ""} style={animated ? { animationDelay: "0ms" } : {}} />
      </svg>

      <span className={`font-bold ${currentSize.fontSize} ${textClass}`}>VOD</span>
    </div>
  );
}
