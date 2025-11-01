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
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Add Category',
      icon: FolderPlus,
      href: '/admin/categories',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Manage Users',
      icon: UserPlus,
      href: '/admin/users',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/admin/settings',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
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
                  className="w-full h-auto flex-col gap-2 py-4 hover:scale-105 transition-transform"
                >
                  <div className={`p-3 rounded-lg ${action.bgColor}`}>
                    <Icon className={`h-5 w-5 ${action.color}`} />
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