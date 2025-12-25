import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  Upload,
  Film,
  Scissors,
  FileText,
  Sparkles,
  Lock,
  FileEdit,
  Archive
} from 'lucide-react';
import { ProcessingStatus, VideoStatus } from './video_types';

interface ProcessingStatusBadgeProps {
  status: ProcessingStatus;
  showIcon?: boolean;
}

export function ProcessingStatusBadge({ status, showIcon = true }: ProcessingStatusBadgeProps) {
  const config = {
    'queued': {
      label: 'Queued',
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-slate-100 text-slate-700 border-slate-300'
    },
    'preparing': {
      label: 'Preparing',
      variant: 'secondary' as const,
      icon: Loader2,
      className: 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse'
    },
    'transcoding': {
      label: 'Transcoding',
      variant: 'secondary' as const,
      icon: Film,
      className: 'bg-purple-100 text-purple-700 border-purple-300 animate-pulse'
    },
    'segmenting': {
      label: 'Segmenting',
      variant: 'secondary' as const,
      icon: Scissors,
      className: 'bg-indigo-100 text-indigo-700 border-indigo-300 animate-pulse'
    },
    'creating_manifest': {
      label: 'Creating Manifest',
      variant: 'secondary' as const,
      icon: FileText,
      className: 'bg-cyan-100 text-cyan-700 border-cyan-300 animate-pulse'
    },
    'uploading to storage': {
      label: 'Uploading',
      variant: 'secondary' as const,
      icon: Upload,
      className: 'bg-teal-100 text-teal-700 border-teal-300 animate-pulse'
    },
    'finalizing': {
      label: 'Finalizing',
      variant: 'secondary' as const,
      icon: Sparkles,
      className: 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse'
    },
    'completed': {
      label: 'Completed',
      variant: 'secondary' as const,
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-300'
    },
    'failed': {
      label: 'Failed',
      variant: 'destructive' as const,
      icon: AlertCircle,
      className: 'bg-red-100 text-red-700 border-red-300'
    }
  };

  const { label, variant, icon: Icon, className } = config[status];

  return (
    <Badge variant={variant} className={`text-xs border ${className}`}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  );
}

interface PublishStatusBadgeProps {
  status: VideoStatus;
  isPublic: boolean;
}

export function PublishStatusBadge({ status, isPublic }: PublishStatusBadgeProps) {
  if (status === 'published' && isPublic) {
    return (
      <Badge className="text-xs bg-emerald-500 text-white hover:bg-emerald-600 border-0">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Published
      </Badge>
    );
  }

  if (status === 'published' && !isPublic) {
    return (
      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
        <Lock className="w-3 h-3 mr-1" />
        Unlisted
      </Badge>
    );
  }

  if (status === 'draft') {
    return (
      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-300">
        <FileEdit className="w-3 h-3 mr-1" />
        Draft
      </Badge>
    );
  }

  if (status === 'archived') {
    return (
      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
        <Archive className="w-3 h-3 mr-1" />
        Archived
      </Badge>
    );
  }

  return null;
}