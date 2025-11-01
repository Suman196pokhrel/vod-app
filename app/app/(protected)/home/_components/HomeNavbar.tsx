// app/(protected)/home/_components/HomeNavbar.tsx
"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Bell, X } from "lucide-react"
import { AvatarDropDown } from "./AvatarDropDown"
import Link from 'next/link'

const HomeNavbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [hasNotifications, setHasNotifications] = useState(true)

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex w-full items-center justify-between h-16 px-4 lg:px-8">
        {/* Left: Logo */}
        <div className="flex items-center flex-1">
          <Link href="/home" className="flex items-center">
            <h1 className="text-4xl font-extrabold bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              VOD
            </h1>
          </Link>
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Search - Desktop */}
          <div className="hidden md:flex items-center">
            {isSearchOpen ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
                <Input
                  placeholder="Search titles, genres..."
                  className="w-64 h-9"
                  autoFocus
                  onBlur={() => setIsSearchOpen(false)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search - Mobile */}
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 md:hidden"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button size="icon" variant="ghost" className="h-9 w-9 relative hidden sm:flex">
            <Bell className="h-4 w-4" />
            {hasNotifications && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Button>

          {/* Avatar Dropdown */}
          <AvatarDropDown />
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="md:hidden border-t p-4 animate-in slide-in-from-top-5">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search titles, genres..."
              className="flex-1"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsSearchOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}

export default HomeNavbar