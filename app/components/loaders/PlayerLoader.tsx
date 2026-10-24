import { VibeLogo } from "@/components/logos/VibeLogo"

// Full-screen loader for the player route. It's shown both while the route
// itself loads (loading.tsx) and while the video's data is fetched
// (play/page.tsx), so the user sees one continuous screen instead of a
// loader that flips to a skeleton and then to the player.
export function PlayerLoader() {
  return (
    <div
      role="status"
      aria-label="Loading video"
      className="flex h-screen w-full items-center justify-center bg-surface-watch"
    >
      <VibeLogo variant="icon" size="xl" className="animate-bop" />
    </div>
  )
}
