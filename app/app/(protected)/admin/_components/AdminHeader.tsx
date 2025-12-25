// app/(admin)/admin/_components/AdminHeader.tsx
"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AvatarDropDown } from '@/app/(protected)/home/_components/AvatarDropDown'

const AdminHeader = () => {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Search */}
        {/* <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos, users..."
              className="pl-10 h-9"
            />
          </div>
        </div> */}

        {/* Actions */}
        {/* <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </Button>

          <AvatarDropDown />
        </div> */}
      </div>
    </header>
  )
}

export default AdminHeader