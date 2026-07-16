"use client"
// app/home/watch/[id]/page.tsx
import VideoPlayer from "./_components/VideoPlayer";
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



const WatchPage =  ({ params }: {params: Promise<{video_id:string}>}) => {
  const { video_id } = use(params)
  const [video, setVideo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVideoById(video_id)
      .then(setVideo)
      .catch(() => setError("Video not found"));
  }, [video_id]);

  if (error) return <div className="p-8 text-muted-foreground">{error}</div>;
  if (!video) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[2000px] mx-auto">
        {/* Video Player */}
        <div className="w-full">
          <VideoPlayer video={video} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-4 lg:p-6">
          {/* Left Column */}
          <div className="space-y-6">
            <VideoInfo video={video} />

            {/* AI Scene Timeline - NEW */}
            <AISceneTimeline />

            <VideoStats video={video} />

            {/* AI Features Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIMoodAnalysis />
              <AIContentWarnings />
            </div>

            <CommentSection videoId={video.id} />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
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
  );
};

export default WatchPage;
