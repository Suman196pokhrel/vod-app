// app/home/_components/HeroSection.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Info, Plus, Volume2, VolumeX } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface FeaturedVideo {
  id: string
  title: string
  description: string
  backdrop: string
  logo?: string
  category: string
  rating: number
  year: string
}

const HeroSection = () => {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)

  const featuredVideos: FeaturedVideo[] = [
    {
      id: "vid_001_stranger_things_s4",
      title: "Stranger Things: Season 4",
      description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
      backdrop: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&q=80",
      category: "Sci-Fi Thriller",
      rating: 4.7,
      year: "2024"
    },
    {
      id: "vid_005_last_of_us",
      title: "The Last of Us",
      description: "Twenty years after a fungal outbreak ravages the planet, survivors Joel and Ellie embark on a brutal journey across America.",
      backdrop: "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=1920&q=80",
      category: "Post-Apocalyptic",
      rating: 4.8,
      year: "2023"
    },
    {
      id: "vid_008_the_witcher",
      title: "The Witcher",
      description: "Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.",
      backdrop: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1920&q=80",
      category: "Fantasy Adventure",
      rating: 4.4,
      year: "2019"
    }
  ]

  const currentVideo = featuredVideos[currentIndex]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredVideos.length)
    }, 8000) // Auto-rotate every 8 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-[85vh] w-full overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0">
        <Image
          src={currentVideo.backdrop}
          alt={currentVideo.title}
          fill
          className="object-cover transition-all duration-1000 ease-in-out"
          priority
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-2xl space-y-6">
          {/* Category Badge */}
          <Badge variant="secondary" className="text-sm">
            {currentVideo.category}
          </Badge>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white">
            {currentVideo.title}
          </h1>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-white/90">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              <span className="font-semibold">{currentVideo.rating}</span>
            </div>
            <span>•</span>
            <span>{currentVideo.year}</span>
            <span>•</span>
            <Badge variant="outline" className="text-white border-white/30">
              HD
            </Badge>
          </div>

          {/* Description */}
          <p className="text-lg text-white/80 line-clamp-3 max-w-xl">
            {currentVideo.description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="text-lg px-8"
              onClick={() => router.push(`/home/watch/${currentVideo.id}`)}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Play Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => router.push(`/home/watch/${currentVideo.id}`)}
            >
              <Info className="mr-2 h-5 w-5" />
              More Info
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mute Button */}
      <Button
        size="icon"
        variant="outline"
        className="absolute bottom-8 right-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
        onClick={() => setIsMuted(!isMuted)}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </Button>

      {/* Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {featuredVideos.map((_, index) => (
          <button
            key={index}
            className={`h-1 transition-all duration-300 rounded-full ${
              index === currentIndex ? 'w-12 bg-white' : 'w-6 bg-white/50'
            }`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}

export default HeroSection