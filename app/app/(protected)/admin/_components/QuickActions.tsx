// app/(admin)/admin/dashboard/_components/QuickActions.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, UserPlus, FolderPlus, Settings } from 'lucide-react'
import Link from 'next/link'

const QuickActions = () => {
  const actions = [
    {
      title: 'Upload Video',
      icon: Upload,
      href: '/admin/videos/upload',
    },
    {
      title: 'Add Category',
      icon: FolderPlus,
      href: '/admin/categories',
    },
    {
      title: 'Manage Users',
      icon: UserPlus,
      href: '/admin/users',
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/admin/settings',
    }
  ]

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.title} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full h-auto flex-col gap-2 py-4 hover:scale-105 transition-transform duration-(--duration-fast) ease-(--ease-out-quart)"
                >
                  <div className="p-3 rounded-lg bg-accent">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{action.title}</span>
                </Button>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default QuickActions