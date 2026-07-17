"use client"

import { Button } from "@/components/ui/button"

export function TheaterButton({ theater, onToggle }: { theater: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost" size="icon" onClick={onToggle}
      className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
      aria-label={theater ? "Default view" : "Theater mode"}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
        {theater ? (
          <rect x="5" y="7" width="14" height="10" rx="1.5" />
        ) : (
          <rect x="2.5" y="5.5" width="19" height="13" rx="1.5" />
        )}
      </svg>
    </Button>
  )
}