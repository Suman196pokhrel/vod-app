"use client"

import React, { useState } from "react";

import HeroSection from "./_components/HeroSection"
import CategoryPills from "./_components/CategoryPills"
import VideoGrid from "./_components/VideoGrid"

export default function HomePage() {
  const [category, setCategory] = useState("all")

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      {/* No max-width cap here — HeroSection above is also uncapped (w-full),
          so this section fills the same viewport width instead of boxing
          itself into an arbitrary column on wide monitors. Minimal top
          padding: the hero's own bottom fade already resolves to the exact
          same --background color this section sits on, so a big py-12 gap
          on top of that just reads as dead space before content starts. */}
      <div className="w-full px-4 pt-4 pb-12 sm:px-6 lg:px-8">
        <CategoryPills selected={category} onSelect={setCategory} />
        <VideoGrid category={category} />
      </div>
    </div>
  )
}
