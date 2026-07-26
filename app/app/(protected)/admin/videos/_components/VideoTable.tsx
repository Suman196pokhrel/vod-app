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
import { Video, Film, TrendingUp, AlertCircle } from "lucide-react";
import { useState } from "react";
import { AdminVideoFilters, getAdminVideos } from "@/lib/apis/video";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { useVideoProcessing } from "@/hooks/video/use-video-processing";
import { VideoProcessingDialog } from "./multi_step_progress/video-processing-dialog";

export default function AdminVideosPage() {
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

  // One shared dialog instance for the whole table — any row's status badge
  // opens it against that row's video ID, so it's reachable again after
  // being closed instead of only appearing once at upload time.
  const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing({
    pollingInterval: 3000,
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <VideoProcessingDialog
        isOpen={isOpen}
        onClose={closeDialog}
        currentStatus={currentStatus}
        videoId={videoId || undefined}
      />

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl tracking-tight">Video Management</h1>
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
          <TabsTrigger value="all">All Videos</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
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
                <DataTable
                  columns={columns}
                  data={data.items}
                  meta={{ openProcessingDialog: openDialog }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
