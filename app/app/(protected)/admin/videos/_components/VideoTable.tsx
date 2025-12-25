"use client"
import { DataTable } from './videos_table/data-table';
import { columns } from './videos_table/columns';
import { mockVideos } from './videos_table/mock_video_data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, Film, TrendingUp, AlertCircle } from 'lucide-react';

export default function AdminVideosPage() {
  // Calculate statistics
  const stats = {
    total: mockVideos.length,
    published: mockVideos.filter(v => v.status === 'published' && v.is_public).length,
    processing: mockVideos.filter(v => 
      !['completed', 'failed'].includes(v.processing_status)
    ).length,
    failed: mockVideos.filter(v => v.processing_status === 'failed').length,
    totalViews: mockVideos.reduce((sum, v) => sum + v.views_count, 0),
    totalLikes: mockVideos.reduce((sum, v) => sum + v.likes_count, 0),
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Video Management</h1>
        <p className="text-muted-foreground">
          Manage and monitor all videos in your VOD platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.published} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">
              Currently being processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalViews / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats.totalLikes / 1000).toFixed(1)}K likes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.failed > 0 ? 'Needs attention' : 'All good!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Videos ({mockVideos.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Published ({stats.published})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({stats.processing})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({stats.failed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Videos</CardTitle>
              <CardDescription>
                Complete list of all videos in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={mockVideos} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Published Videos</CardTitle>
              <CardDescription>
                Videos that are live and publicly accessible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={mockVideos.filter(v => v.status === 'published' && v.is_public)} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Videos</CardTitle>
              <CardDescription>
                Videos currently being transcoded and processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={mockVideos.filter(v => 
                  !['completed', 'failed'].includes(v.processing_status)
                )} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Failed Videos</CardTitle>
              <CardDescription>
                Videos that encountered errors during processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={mockVideos.filter(v => v.processing_status === 'failed')} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}