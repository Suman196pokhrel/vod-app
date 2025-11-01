// app/admin/_components/AdminSidebar.tsx
"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Video, 
  Users, 
  BarChart3, 
  FolderTree, 
  Settings,
  ChevronLeft,
  Upload,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'

const AdminSidebar = () => {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    {
      title: 'Videos',
      icon: Video,
      href: '/admin/videos',
      subItems: [
        { title: 'All Videos', icon: List, href: '/admin/videos' },
        { title: 'Upload Video', icon: Upload, href: '/admin/videos/upload' }
      ]
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      href: '/admin/analytics'
    },
    {
      title: 'Users',
      icon: Users,
      href: '/admin/users'
    },
    {
      title: 'Categories',
      icon: FolderTree,
      href: '/admin/categories'
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/admin/settings'
    }
  ]

  return (
    <div
      className={cn(
        "relative border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo - Now links to /admin (the dashboard) */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              VOD
            </h1>
            <span className="text-xs font-semibold text-muted-foreground">ADMIN</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <div key={item.href}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isCollapsed && "justify-center"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Button>
                </Link>

                {/* Sub Items */}
                {!isCollapsed && item.subItems && pathname.startsWith(item.href) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = pathname === subItem.href

                      return (
                        <Link key={subItem.href} href={subItem.href}>
                          <Button
                            variant={isSubActive ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start gap-3"
                          >
                            <SubIcon className="h-3 w-3" />
                            <span className="text-sm">{subItem.title}</span>
                          </Button>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Back to Site Link */}
      <div className="border-t p-4">
        <Link href="/home">
          <Button variant="outline" className={cn(
            "w-full",
            isCollapsed && "px-2"
          )}>
            {isCollapsed ? "→" : "Back to Site"}
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default AdminSidebar