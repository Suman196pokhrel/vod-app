import { ColumnDef } from '@tanstack/react-table';
import { Video } from './video_types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProcessingStatusBadge, PublishStatusBadge } from './status-badge';
import { 
  formatFileSize, 
  formatDuration, 
  formatNumber, 
  formatDate,
  getResolutionLabel 
} from './helper';
import {
  MoreHorizontal,
  Play,
  Pencil,
  Trash,
  Download,
  Link as LinkIcon,
  Info,
  Eye,
  Heart,
  Video as VideoIcon,
  AlertCircle,
  ArrowUpDown,
  Copy
} from 'lucide-react';
import { useVideoProcessing } from '@/hooks/video/use-video-processing';

export const columns: ColumnDef<Video>[] = [
  // Selection column
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },

  // Video thumbnail + title
  {
    id: 'video',
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0"
        >
          Video
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const video = row.original;
      return (
        <div className="flex items-start gap-3 min-w-[300px]">
          {/* Thumbnail */}
          <div className="relative w-28 h-16 rounded-md overflow-hidden bg-muted shrink-0 border">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <VideoIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {/* Duration overlay */}
            {video.processing_metadata && (
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(video.processing_metadata.duration_seconds)}
              </div>
            )}
          </div>

          {/* Title and metadata */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="font-medium text-sm leading-tight line-clamp-2">
              {video.title}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-normal">
                {video.category}
              </Badge>
              {video.age_rating && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {video.age_rating}
                </Badge>
              )}
              {video.processing_metadata && (
                <span className="text-xs text-muted-foreground">
                  {getResolutionLabel(
                    video.processing_metadata.width,
                    video.processing_metadata.height
                  )}
                </span>
              )}
            </div>
            {/* Video ID for easy reference */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigator.clipboard.writeText(video.id)}
                    className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors text-left w-fit"
                  >
                    ID: {video.id.slice(0, 8)}...
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Click to copy full ID</p>
                  <p className="text-xs font-mono">{video.id}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    },
    size: 350,
  },

  // Status - simplified to show only the most relevant status
  {
    id: 'status',
    accessorKey: 'processing_status',
    header: 'Status',
    cell: ({ row }) => {
      const video = row.original;
        const { isOpen, currentStatus, videoId, openDialog, closeDialog } = useVideoProcessing()
      
      
      // Show processing status if not completed
      if (video.processing_status !== 'completed') {
        return (
          <div className="min-w-[140px]">
            <Button variant={"ghost"} onClick={()=>openDialog()}>
            <ProcessingStatusBadge status={video.processing_status} />

            </Button>


            {video.processing_error && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mt-1.5">
                      <Badge variant="destructive" className="text-xs cursor-help w-fit">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        View Error
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{video.processing_error}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      }
      
      // If completed, show publish status
      return (
        <div className="min-w-[140px]">
          <PublishStatusBadge status={video.status} isPublic={video.is_public} />
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    size: 150,
  },

  // Technical details - cleaner layout
  {
    id: 'technical',
    header: 'Technical',
    cell: ({ row }) => {
      const meta = row.original.processing_metadata;
      if (!meta) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }

      return (
        <div className="space-y-2 min-w-[150px] pr-4">
          {/* Resolution */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Resolution</span>
            <span className="text-sm font-medium">{meta.width}×{meta.height}</span>
          </div>
          
          {/* Duration */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Duration</span>
            <span className="text-sm font-medium">{formatDuration(meta.duration_seconds)}</span>
          </div>
          
          {/* File Size */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Size</span>
            <span className="text-sm font-medium">{formatFileSize(meta.file_size)}</span>
          </div>
        </div>
      );
    },
    size: 160,
  },

  // Available qualities - compact display
  {
    id: 'qualities',
    accessorKey: 'available_qualities',
    header: 'Qualities',
    cell: ({ row }) => {
      const qualities = row.original.available_qualities || [];
      const processingStatus = row.original.processing_status;

      if (processingStatus !== 'completed') {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[100px] pl-4">
            {/* <div className="animate-spin">⏳</div> */}
            <span className="text-xs">Processing...</span>
          </div>
        );
      }

      if (qualities.length === 0) {
        return <span className="text-xs text-muted-foreground pl-4">None</span>;
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help min-w-[100px] pl-4">
                <Badge variant="secondary" className="text-sm font-medium">
                  {qualities.length} {qualities.length === 1 ? 'Quality' : 'Qualities'}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-white border border-gray-200 shadow-lg">
              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                {qualities.map((quality) => (
                  <Badge key={quality} variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300">
                    {quality}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    size: 120,
  },

  // Engagement
  {
    id: 'engagement',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0"
        >
          Engagement
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    accessorKey: 'views_count',
    cell: ({ row }) => {
      const video = row.original;
      return (
        <div className="flex flex-col gap-1.5 text-sm min-w-[100px]">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{formatNumber(video.views_count)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">{formatNumber(video.likes_count)}</span>
          </div>
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      return rowA.original.views_count - rowB.original.views_count;
    },
    size: 120,
  },

  // Created date
  {
    id: 'created',
    accessorKey: 'created_at',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const video = row.original;
      return (
        <div className="text-sm min-w-[110px]">
          {formatDate(video.created_at)}
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      return new Date(rowA.original.created_at).getTime() - new Date(rowB.original.created_at).getTime();
    },
    size: 110,
  },

  // Updated date
  {
    id: 'updated',
    accessorKey: 'updated_at',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="hover:bg-transparent p-0"
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const video = row.original;
      return (
        <div className="text-sm min-w-[110px]">
          {formatDate(video.updated_at)}
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      return new Date(rowA.original.updated_at).getTime() - new Date(rowB.original.updated_at).getTime();
    },
    size: 110,
  },

  // Actions
  {
    id: 'actions',
    cell: ({ row }) => {
      const video = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={() => console.log('Preview', video.id)}
              disabled={!video.manifest_url}
            >
              <Play className="mr-2 h-4 w-4" />
              Preview Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Edit', video.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('View details', video.id)}>
              <Info className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => console.log('Download', video.id)}
              disabled={!video.manifest_url}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                if (video.manifest_url) {
                  navigator.clipboard.writeText(video.manifest_url);
                }
              }}
              disabled={!video.manifest_url}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigator.clipboard.writeText(video.id)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => console.log('Delete', video.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete Video
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    size: 60,
  },
];