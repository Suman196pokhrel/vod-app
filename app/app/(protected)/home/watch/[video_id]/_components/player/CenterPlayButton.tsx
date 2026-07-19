import { Play } from "lucide-react"

export function CenterPlayButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`absolute inset-0 grid place-items-center bg-gradient-to-b from-surface-watch/10 to-surface-watch/40 transition-opacity duration-(--duration-slow) ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-label="Play"
    >
      <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-foreground/10 ring-1 ring-foreground/20 backdrop-blur-md transition-all duration-(--duration-fast) hover:scale-110 hover:bg-foreground/20">
        <Play className="h-7 w-7 translate-x-0.5 fill-foreground text-foreground" />
      </span>
    </button>
  )
}