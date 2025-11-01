// app/home/watch/[id]/page.tsx
import VideoPlayer from './_components/VideoPlayer'
import VideoInfo from './_components/VideoInfo'
import VideoStats from './_components/VideoStats'
import RelatedVideos from './_components/RelatedVideos'
import CommentSection from './_components/CommentSection'
import AISceneTimeline from './_components/AISceneTimeline'
import AIMoodAnalysis from './_components/AIMoodAnalysis'
import AIRecommendations from './_components/AIRecommendations'
import AIWatchParty from './_components/AIWatchParty'
import AIContentWarnings from './_components/AIContentWarnings'

interface WatchPageProps {
  params: {
    id: string
  }
}

const WatchPage = ({ params }: WatchPageProps) => {
  const mockVideo = {
    id: params.id,
    title: "Stranger Things: Season 4",
    thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    duration: "2h 15m",
    views: "12.5M",
    category: "Sci-Fi Thriller",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    releaseDate: "2024-05-27",
    rating: 4.7,
    ageRating: "TV-14",
    director: "The Duffer Brothers",
    cast: ["Millie Bobby Brown", "Finn Wolfhard", "Winona Ryder"],
    tags: ["sci-fi", "thriller", "supernatural", "80s"],
    isNew: true,
    isTrending: true,
    isFeatured: true,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[2000px] mx-auto">
        {/* Video Player */}
        <div className="w-full">
          <VideoPlayer video={mockVideo} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-4 lg:p-6">
          {/* Left Column */}
          <div className="space-y-6">
            <VideoInfo video={mockVideo} />
            
            {/* AI Scene Timeline - NEW */}
            <AISceneTimeline />
            
            <VideoStats video={mockVideo} />
            
            {/* AI Features Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AIMoodAnalysis />
              <AIContentWarnings />
            </div>
            
            <CommentSection videoId={mockVideo.id} />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <AIRecommendations />
            <AIWatchParty />
            <RelatedVideos currentVideoId={mockVideo.id} category={mockVideo.category} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default WatchPage