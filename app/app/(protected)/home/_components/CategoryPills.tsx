// app/home/_components/CategoryPills.tsx
"use client"

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const CategoryPills = () => {
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = [
    { name: 'All', icon: '🎬' },
    { name: 'Trending', icon: '🔥' },
    { name: 'New Releases', icon: '✨' },
    { name: 'Sci-Fi', icon: '🚀' },
    { name: 'Action', icon: '💥' },
    { name: 'Drama', icon: '🎭' },
    { name: 'Comedy', icon: '😂' },
    { name: 'Thriller', icon: '🔪' },
    { name: 'Documentary', icon: '📽️' },
    { name: 'Fantasy', icon: '🐉' },
    { name: 'Horror', icon: '👻' },
    { name: 'Romance', icon: '💕' }
  ]

  return (
    <div className="mb-8">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 py-4">
          {categories.map((category) => (
            <Badge
              key={category.name}
              variant={selectedCategory === category.name ? "default" : "secondary"}
              className={`px-4 py-2 text-sm font-medium cursor-pointer transition-all hover:scale-105 ${
                selectedCategory === category.name 
                  ? 'shadow-lg bg-primary text-primary-foreground' 
                  : 'bg-background/80 backdrop-blur-sm border border-border hover:bg-muted text-foreground'
              }`}
              onClick={() => setSelectedCategory(category.name)}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export default CategoryPills