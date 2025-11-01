// app/admin/page.tsx
import React from 'react'
import StatsCards from './_components/StatsCards'
import RecentActivity from './_components/RecentActivity'
import PopularVideos from './_components/PopularVideos'
import UserGrowthChart from './_components/UserGrowthChart'
import QuickActions from './_components/QuickActions'

const AdminDashboardPage = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Cards */}
      <StatsCards />

      {/* Charts & Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UserGrowthChart />
        <PopularVideos />
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}

export default AdminDashboardPage