"use client";
import { DataTable } from "./videos_table/data-table";
import { columns } from "./videos_table/columns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Film, TrendingUp, AlertCircle, CloudCog } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminVideoFilters, getAdminVideos } from "@/lib/apis/video";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

export default function AdminVideosPage() {
  // Calculate statistics
 

  const [filters, setFilters] = useState<AdminVideoFilters>({
    skip: 0,
    limit: 20,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const { isPending, isError, error, data } = useQuery({
    queryKey: ["getAllVideosAdmin", filters],
    queryFn: async () => {
      const response = await getAdminVideos(filters);
      return response;
    },
    placeholderData: keepPreviousData,
  });


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
            <div className="text-2xl font-bold">99</div>
            <p className="text-xs text-muted-foreground">
              99 published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99</div>
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
              99M
            </div>
            <p className="text-xs text-muted-foreground">
              99K likes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99</div>
            <p className="text-xs text-muted-foreground">
              {99 > 0 ? "Needs attention" : "All good!"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Videos 
          </TabsTrigger>
          <TabsTrigger value="published">
            Published 
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing 
          </TabsTrigger>
          <TabsTrigger value="failed">Failed </TabsTrigger>
        </TabsList>

        {isPending && (
          <div>
            <Spinner />
          </div>
        )}

        {isError && <div>{error.message}</div>}

        {data && (
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Videos</CardTitle>
                <CardDescription>
                  Complete list of all videos in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={columns} data={data.items} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* <TabsContent value="published" className="space-y-4">
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
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
