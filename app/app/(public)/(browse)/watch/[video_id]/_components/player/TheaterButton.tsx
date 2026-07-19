"use client"

import { Clapperboard, RectangleHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconSwap } from "@/lib/motion/IconSwap"

export function TheaterButton({ theater, onToggle }: { theater: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost" size="icon" onClick={onToggle}
      className="h-10 w-10 text-foreground hover:bg-accent hover:text-accent-foreground"
      aria-label={theater ? "Default view" : "Theater mode"}
    >
      {/* Distinct silhouettes (plain box vs. clapperboard), not just a
          resized rect — the previous pair looked identical at icon size. */}
      <IconSwap icon={theater ? Clapperboard : RectangleHorizontal} size={20} />
    </Button>
  )
}