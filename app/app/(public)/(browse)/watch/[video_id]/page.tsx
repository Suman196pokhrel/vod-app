"use client"
// app/home/watch/[id]/page.tsx
import VideoPlayer from "./_components/player/VideoPlayer";
import VideoInfo from "./_components/VideoInfo";
import VideoStats from "./_components/VideoStats";
import RelatedVideos from "./_components/RelatedVideos";
import CommentSection from "./_components/CommentSection";
import { use, useEffect, useState } from "react";
import { getVideoById } from "@/lib/apis/video";
import { useTheaterMode } from "./_components/player/useTheaterMode";
import { useAmbientColor } from "./_components/player/useAmbientColor";
import { storageUrl } from "./_components/player/utils";

const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  const [video, setVideo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { theater, toggle: toggleTheater } = useTheaterMode()
  const { color } = useAmbientColor(
    video?.thumbnail_url ? storageUrl(video.thumbnail_url) : null
  )

  useEffect(() => {
    getVideoById(video_id)
      .then(setVideo)
      .catch(() => setError("Video not found"));
  }, [video_id]);

  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-watch p-8 text-muted-foreground">
        {error}. Try going back and selecting another video.
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

  return (
    <div className="min-h-screen bg-surface-watch">
      {/* Player band — full-bleed in theater, contained otherwise. Ambient
          glow (docs/DESIGN_SYSTEM.md §6) tints the space behind the player
          with the video's own artwork. */}
      <div className={theater ? "w-full" : ""}>
        <div
          className={
            theater
              ? "mx-auto flex w-full max-w-[1800px] justify-center"
              : "mx-auto w-full max-w-[2000px] px-4 pt-4 lg:px-6"
          }
        >
          <div className="relative w-full">
            <div
              aria-hidden
              className="ambient-glow absolute -inset-8 -z-10 rounded-[2rem]"
              style={{ "--ambient": color ?? "transparent" } as React.CSSProperties}
            />
            <VideoPlayer
              video={video}
              theater={theater}
              onToggleTheater={toggleTheater}
              className={
                theater
                  ? "aspect-video max-h-[calc(100vh-8rem)] w-auto max-w-full"
                  : "aspect-video w-full"
              }
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[2000px] mx-auto">
        <div
          className={`grid gap-6 p-4 lg:p-6 ${
            theater ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_380px]"
          }`}
        >
          {/* Left Column */}
          <div className="space-y-6">
            <VideoInfo video={video} />
            <VideoStats video={video} />
            <CommentSection videoId={video.id} />
          </div>

          {/* Right Sidebar — becomes a row below the player in theater */}
          <div className={theater ? "" : "space-y-4 lg:sticky lg:top-6 lg:self-start"}>
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
