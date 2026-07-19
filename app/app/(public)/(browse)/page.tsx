import React from "react";

import HeroSection from "./_components/HeroSection"
import CategoryPills from "./_components/CategoryPills"
import VideoGrid from "./_components/VideoGrid"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      <div className="max-w-[2000px] mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <CategoryPills />
        <VideoGrid />
      </div>
    </div>
  )
}
