// app/home/_components/CategoryPills.tsx
"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

// Values must match the category enum videos are actually tagged with
// (BasicInformationSection.tsx's upload form select) — filtering only works
// if these agree with what's really stored.
const categories = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Action' },
  { value: 'drama', label: 'Drama' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'scifi', label: 'Sci-Fi' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'horror', label: 'Horror' },
]

interface CategoryPillsProps {
  selected: string
  onSelect: (value: string) => void
}

const CategoryPills = ({ selected, onSelect }: CategoryPillsProps) => {
  return (
    <div className="mb-8">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-1 py-2">
          {categories.map((category) => {
            const isSelected = selected === category.value
            return (
              <Badge
                key={category.value}
                variant="outline"
                className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast) ease-(--ease-out-quart) ${
                  isSelected
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onSelect(category.value)}
              >
                {category.label}
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
