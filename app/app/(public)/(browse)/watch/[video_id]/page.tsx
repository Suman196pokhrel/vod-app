"use client"
// app/home/watch/[id]/page.tsx
import VideoPlayer from "./_components/player/VideoPlayer";
import VideoInfo from "./_components/VideoInfo";
import RelatedVideos from "./_components/RelatedVideos";
import { use } from "react";
import { useVideo } from "@/hooks/video/use-video";
import { useTheaterMode } from "./_components/player/useTheaterMode";
import { useAmbientColor } from "@/lib/motion/useAmbientColor";
import { useStaggeredReveal } from "@/lib/motion/useStaggeredReveal";
import { storageUrl } from "./_components/player/utils";

// Width of the right sidebar (related videos column) — the only place
// this needs to change. Referenced below via a CSS var since Tailwind's
// grid-cols-[...] arbitrary value has to stay static text for its
// build-time class scan; it can't take a JS variable directly.
const SIDEBAR_WIDTH = "500px"

const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  const { data: video, isError } = useVideo(video_id)
  const { theater, toggle: toggleTheater } = useTheaterMode()
  const { color } = useAmbientColor(
    video?.thumbnail_url ? storageUrl(video.thumbnail_url) : null
  )
  const contentRef = useStaggeredReveal<HTMLDivElement>([video?.id])

  if (isError)
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-watch p-8 text-muted-foreground">
        Video not found. Try going back and selecting another video.
      </div>
    );
  if (!video)
    return (
      <div className="min-h-screen bg-surface-watch">
        <div className="mx-auto w-full max-w-[2000px] px-4 pt-4 lg:px-6">
          <div className="skeleton aspect-video w-full rounded-xl" />
        </div>
        <div className="max-w-[2000px] mx-auto">
          <div className="grid gap-6 p-4 lg:grid-cols-[1fr_380px] lg:p-6">
            <div className="space-y-4">
              <div className="skeleton h-8 w-2/3" />
              <div className="skeleton h-4 w-1/3" />
            </div>
            <div className="space-y-4">
              <div className="skeleton aspect-video w-full rounded-lg" />
              <div className="skeleton h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
    );

  // Ambient glow (docs/DESIGN_SYSTEM.md §6) tints the space behind the
  // player with the video's own artwork. Same size in both modes — only
  // the width of its container changes (full page width in theater, the
  // grid's left column otherwise), height is capped identically so
  // toggling theater never changes vertical space, only horizontal.
  // --ambient itself is set once, on the page wrapper below, and cascades
  // down to this div along with .ambient-glow-page.
  const playerBlock = (
    <div className="relative w-full ">
      <div
        aria-hidden
        className="ambient-glow absolute -inset-8 -z-10 rounded-4xl"
      />
      <VideoPlayer
        video={video}
        theater={theater}
        onToggleTheater={toggleTheater}
        className="aspect-video max-h-[78vh] w-full"
      />
    </div>
  );

  return (
    <div
      className="min-h-screen overflow-x-clip bg-surface-watch"
      style={{ "--ambient": color ?? "transparent" } as React.CSSProperties}
    >
      {/* Page-wide ambient — same signature tint as the player-local glow,
          spread thin across the whole viewport so the cinematic atmosphere
          reaches the page edges rather than staying pooled around the
          player. Fixed + -z-10 so it never affects layout or scrolling. */}
      <div aria-hidden className="ambient-glow-page fixed inset-0 -z-10" />

      {/* overflow-x-clip above clips the glow's intentional -inset-8 bleed
          so it can't push the page into horizontal scroll — `clip` (not
          `hidden`) so this div doesn't become a scroll container, which
          would break the sidebar's lg:sticky positioning below. */}
      <div className="mx-auto w-full max-w-[2000px]  px-4 pt-4 lg:px-6">
        {/* One grid, three items placed by grid-column/-row — never by
            conditionally mounting in different branches. The player
            (and its <video>/HLS instance) stays mounted at the same
            tree position across theater toggles; only which grid cells
            it occupies changes, so playback never resets. */}
        <div
          ref={contentRef}
          className="grid grid-cols-1 gap-6 pb-4 lg:grid-cols-[minmax(0,1fr)_var(--sidebar-w)] lg:pb-6"
          style={{ "--sidebar-w": SIDEBAR_WIDTH } as React.CSSProperties}
        >
          <div
            className={`min-w-0 lg:col-start-1 lg:row-start-1  ${
              theater ? "lg:col-span-2" : "lg:col-span-1 "
            }`}
          >
            {playerBlock}
          </div>

          <div className="min-w-0  space-y-6 lg:col-start-1 lg:row-start-2">
            <VideoInfo video={video} />
          </div>

          {/* Right Sidebar — always column 2. Spans both rows (beside
              player + meta) by default; in theater mode the player takes
              row 1 across both columns, so this collapses to row 2 only. */}
          <div
            className={`space-y-4  lg:col-start-2 lg:sticky lg:top-6 lg:self-start ${
              theater ? "lg:row-start-2" : "lg:row-start-1 lg:row-span-2"
            }`}
          >
            <RelatedVideos
              currentVideoId={video.id}
              category={video.category}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
