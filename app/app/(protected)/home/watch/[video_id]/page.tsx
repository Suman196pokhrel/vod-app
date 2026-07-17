"use client"
// app/home/watch/[id]/page.tsx
import VideoPlayer from "./_components/player/VideoPlayer";
import VideoInfo from "./_components/VideoInfo";
import VideoStats from "./_components/VideoStats";
import RelatedVideos from "./_components/RelatedVideos";
import CommentSection from "./_components/CommentSection";
import AISceneTimeline from "./_components/AISceneTimeline";
import AIMoodAnalysis from "./_components/AIMoodAnalysis";
import AIRecommendations from "./_components/AIRecommendations";
import AIWatchParty from "./_components/AIWatchParty";
import AIContentWarnings from "./_components/AIContentWarnings";
import { use, useEffect, useState } from "react";
import { getVideoById } from "@/lib/apis/video";
import { useTheaterMode } from "./_components/player/useTheaterMode";

const WatchPage = ({ params }: { params: Promise<{ video_id: string }> }) => {
  const { video_id } = use(params)
  const [video, setVideo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { theater, toggle: toggleTheater } = useTheaterMode()

  useEffect(() => {
    getVideoById(video_id)
      .then(setVideo)
      .catch(() => setError("Video not found"));
  }, [video_id]);

  if (error) return <div className="p-8 text-muted-foreground">{error}</div>;
  if (!video) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Player band — full-bleed black letterbox in theater, contained otherwise */}
      <div className={theater ? "w-full bg-black" : ""}>
        <div
          className={
            theater
              ? "mx-auto flex w-full max-w-[1800px] justify-center"
              : "mx-auto w-full max-w-[2000px] px-4 pt-4 lg:px-6"
          }
        >
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
            <AISceneTimeline />
            <VideoStats video={video} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIMoodAnalysis />
              <AIContentWarnings />
            </div>

            <CommentSection videoId={video.id} />
          </div>

          {/* Right Sidebar — becomes a row below the player in theater */}
          <div className={theater ? "" : "space-y-4 lg:sticky lg:top-6 lg:self-start"}>
            <div className={theater ? "grid grid-cols-1 gap-4 md:grid-cols-3" : "space-y-4"}>
              <AIRecommendations />
              <AIWatchParty />
              <RelatedVideos
                currentVideoId={video.id}
                category={video.category}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;