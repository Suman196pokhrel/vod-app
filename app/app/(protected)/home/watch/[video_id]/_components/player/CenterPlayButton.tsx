import { Play } from "lucide-react"

export function CenterPlayButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`absolute inset-0 grid place-items-center bg-gradient-to-b from-black/10 to-black/40 transition-opacity duration-500 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-label="Play"
    >
      <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/20">
        <Play className="h-7 w-7 translate-x-0.5 fill-white text-white" />
      </span>
    </button>
  )
}