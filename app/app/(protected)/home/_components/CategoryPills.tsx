// app/home/_components/CategoryPills.tsx
"use client"

import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { MorphIcon } from '@/lib/motion/MorphIcon'
import { CATEGORY_ICONS, type CategoryIconKey } from '@/lib/icons/categoryIcons'

const categories: { name: string; icon: CategoryIconKey }[] = [
  { name: 'All', icon: 'all' },
  { name: 'Trending', icon: 'trending' },
  { name: 'New Releases', icon: 'new-releases' },
  { name: 'Sci-Fi', icon: 'sci-fi' },
  { name: 'Action', icon: 'action' },
  { name: 'Drama', icon: 'drama' },
  { name: 'Comedy', icon: 'comedy' },
  { name: 'Thriller', icon: 'thriller' },
  { name: 'Documentary', icon: 'documentary' },
  { name: 'Fantasy', icon: 'fantasy' },
  { name: 'Horror', icon: 'horror' },
  { name: 'Romance', icon: 'romance' },
]

const CategoryPills = () => {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="mb-8">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 py-4">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.name
            const isMorphed = isSelected || hovered === category.name
            return (
              <Badge
                key={category.name}
                variant={isSelected ? "default" : "secondary"}
                className={`px-4 py-2 text-sm font-medium cursor-pointer transition-all duration-(--duration-fast) ease-(--ease-out-quart) hover:scale-105 ${
                  isSelected
                    ? 'shadow-lg bg-primary text-primary-foreground'
                    : 'bg-background/80 backdrop-blur-sm border border-border hover:bg-accent text-foreground'
                }`}
                onClick={() => setSelectedCategory(category.name)}
                onMouseEnter={() => setHovered(category.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="relative mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                  <MorphIcon
                    from={CATEGORY_ICONS[category.icon]}
                    to={Check}
                    active={isMorphed}
                    size={14}
                  />
                </span>
                {category.name}
              </Badge>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export default CategoryPills
