export function BufferingSpinner({ show }: { show: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-(--duration-slow) ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-foreground/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary [animation-duration:0.7s]" />
      </div>
    </div>
  )
}