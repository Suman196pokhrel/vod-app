"use client";

import { useState } from "react";
import { Users, Video, Eye, Clock, Download, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard, Metric } from "./_components/MetricCard";
import { ViewsChart } from "./_components/ViewsCharts";
import { TopVideosTable, TopVideo } from "./_components/TopVideosTable";
import { CategoryPerformance, CategoryData } from "./_components/CategoryPerformance";
import { TimeRangeSelector, TimeRange } from "./_components/TimeRangeSelector";
import { UserActivityChart } from "./_components/UserActivityChart";
import { RealtimeStats } from "./_components/RealtimeStats";

// Mock data
const mockMetrics: Metric[] = [
  {
    title: "Total Users",
    value: "2,847",
    change: 12.5,
    changeLabel: "vs last period",
    icon: Users,
    iconColor: "bg-blue-500",
  },
  {
    title: "Total Videos",
    value: "324",
    change: 8.2,
    changeLabel: "vs last period",
    icon: Video,
    iconColor: "bg-purple-500",
  },
  {
    title: "Total Views",
    value: "125.4K",
    change: 18.7,
    changeLabel: "vs last period",
    icon: Eye,
    iconColor: "bg-green-500",
  },
  {
    title: "Watch Time",
    value: "8.2K hrs",
    change: 15.3,
    changeLabel: "vs last period",
    icon: Clock,
    iconColor: "bg-orange-500",
  },
];

const mockViewsData = [
  { date: "Jan 1", views: 2400 },
  { date: "Jan 2", views: 1398 },
  { date: "Jan 3", views: 3800 },
  { date: "Jan 4", views: 3908 },
  { date: "Jan 5", views: 4800 },
  { date: "Jan 6", views: 3800 },
  { date: "Jan 7", views: 4300 },
  { date: "Jan 8", views: 5200 },
  { date: "Jan 9", views: 4100 },
  { date: "Jan 10", views: 6800 },
  { date: "Jan 11", views: 5900 },
  { date: "Jan 12", views: 7200 },
  { date: "Jan 13", views: 6400 },
  { date: "Jan 14", views: 8100 },
];

const mockUserActivityData = [
  { date: "Jan 1", activeUsers: 450, newUsers: 32 },
  { date: "Jan 2", activeUsers: 380, newUsers: 28 },
  { date: "Jan 3", activeUsers: 520, newUsers: 45 },
  { date: "Jan 4", activeUsers: 490, newUsers: 38 },
  { date: "Jan 5", activeUsers: 610, newUsers: 52 },
  { date: "Jan 6", activeUsers: 580, newUsers: 41 },
  { date: "Jan 7", activeUsers: 650, newUsers: 58 },
  { date: "Jan 8", activeUsers: 720, newUsers: 63 },
  { date: "Jan 9", activeUsers: 590, newUsers: 47 },
  { date: "Jan 10", activeUsers: 840, newUsers: 71 },
  { date: "Jan 11", activeUsers: 780, newUsers: 65 },
  { date: "Jan 12", activeUsers: 920, newUsers: 82 },
  { date: "Jan 13", activeUsers: 850, newUsers: 69 },
  { date: "Jan 14", activeUsers: 980, newUsers: 89 },
];

const mockTopVideos: TopVideo[] = [
  {
    id: 1,
    title: "The Last of Us: Season Finale Breakdown",
    thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=225&fit=crop",
    category: "Drama",
    views: 45200,
    watchTime: 892.5,
    avgCompletion: 87,
  },
  {
    id: 2,
    title: "Complete Guide to Web Development 2024",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=225&fit=crop",
    category: "Educational",
    views: 38900,
    watchTime: 1205.3,
    avgCompletion: 92,
  },
  {
    id: 3,
    title: "Stand-Up Comedy Special: Mike Chen",
    thumbnail: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400&h=225&fit=crop",
    category: "Comedy",
    views: 34500,
    watchTime: 567.8,
    avgCompletion: 78,
  },
  {
    id: 4,
    title: "Nature Documentary: Ocean Wonders",
    thumbnail: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=225&fit=crop",
    category: "Documentary",
    views: 31200,
    watchTime: 743.2,
    avgCompletion: 85,
  },
  {
    id: 5,
    title: "Thriller: The Dark Room",
    thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=225&fit=crop",
    category: "Thriller",
    views: 28700,
    watchTime: 531.4,
    avgCompletion: 81,
  },
];

const mockCategoryData: CategoryData[] = [
  { name: "Drama", views: 45200, videos: 52, color: "bg-purple-500" },
  { name: "Action", views: 38900, videos: 45, color: "bg-red-500" },
  { name: "Comedy", views: 34500, videos: 38, color: "bg-yellow-500" },
  { name: "Documentary", views: 31200, videos: 29, color: "bg-blue-500" },
  { name: "Thriller", views: 28700, videos: 34, color: "bg-gray-700" },
  { name: "Sci-Fi", views: 25100, videos: 27, color: "bg-indigo-500" },
  { name: "Romance", views: 22400, videos: 31, color: "bg-pink-500" },
  { name: "Horror", views: 18900, videos: 22, color: "bg-orange-500" },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
    console.log("Refreshing analytics data...");
  };

  const handleExport = () => {
    console.log("Exporting analytics report...");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">
              Track your platform's performance and insights
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="gap-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-between items-center">
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Real-time Stats */}
        <RealtimeStats
          activeNow={247}
          playingNow={189}
          avgWatchTime="28m"
          peakToday={892}
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockMetrics.map((metric) => (
            <MetricCard key={metric.title} metric={metric} />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ViewsChart data={mockViewsData} title="Views Over Time" />
          <UserActivityChart data={mockUserActivityData} />
        </div>

        {/* Category Performance */}
        <CategoryPerformance data={mockCategoryData} />

        {/* Top Videos Table */}
        <TopVideosTable videos={mockTopVideos} />

        {/* Footer Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Analytics Tips</h4>
              <p className="text-sm text-blue-700 mt-1">
                Track your peak usage times to schedule content releases. Focus on
                categories with high engagement. Monitor completion rates to improve
                content quality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}