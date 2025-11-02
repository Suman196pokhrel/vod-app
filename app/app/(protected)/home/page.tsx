import React from "react";

import HeroSection from "./_components/HeroSection"
import CategoryPills from "./_components/CategoryPills"
import ContinueWatching from "./_components/ContinueWatching"
import Top10ThisWeek from "./_components/Top10ThisWeek"
import PersonalizedRow from "./_components/PersonalizedRow"
import VideoGrid from "./_components/VideoGrid"
import AIWatchTimeBanner from "./_components/AIWatchTimeBanner";
import ContentJourney from "./_components/ContentJourney";
import QuickAccessSidebar from "./_components/QuickAccessSidebar";
import MoodSelectorCompact from "./_components/MoodSelectorCompact";
import MoodSelector from "./_components/MoodSelector";
import { DevelopmentHero } from "./_components/DevelopmentHero";



// Mock data for personalized rows
const becauseYouWatched = [
  {
    id: "vid_006_dark",
    title: "Dark",
    thumbnail: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&q=80"
  },
  {
    id: "vid_015_black_mirror",
    title: "Black Mirror",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80"
  },
  {
    id: "vid_022_true_detective",
    title: "True Detective",
    thumbnail: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80"
  }
]

const newReleases = [
  {
    id: "vid_001_stranger_things_s4",
    title: "Stranger Things: Season 4",
    thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80"
  },
  {
    id: "vid_004_wednesday",
    title: "Wednesday",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80"
  },
  {
    id: "vid_013_house_of_dragon",
    title: "House of the Dragon",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80"
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <div className="w-11/12 m-auto mt-5">
      <DevelopmentHero />

      </div>
     
      <HeroSection />

      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8  relative z-10">
        <CategoryPills />

        {/* Subtle AI Banner */}
        <AIWatchTimeBanner />

        {/* OPTION 1: Prominent Mood Selector (RIGHT AFTER BANNER) */}
        {/* <MoodSelector /> */}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-12">
          {/* Left: Main Feed */}
          <div className="space-y-12">
            <ContinueWatching />
            <Top10ThisWeek />
            
            <PersonalizedRow
              title="Because You Watched Stranger Things"
              subtitle="AI-powered recommendations"
              videos={becauseYouWatched}
            />

            <PersonalizedRow
              title="New Releases"
              videos={newReleases}
            />

            <VideoGrid />
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <ContentJourney />
            
            {/* OPTION 2: Compact Mood Selector in Sidebar (UNCOMMENT TO USE) */}
            <MoodSelectorCompact />
          </div>
        </div>
      </div>

       

      {/* Floating Widget */}
      <QuickAccessSidebar />
    </div>
  )
}