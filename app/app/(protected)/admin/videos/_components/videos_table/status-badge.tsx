import { Badge } from "@/components/ui/badge";
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
  Archive,
  LucideIcon,
} from "lucide-react";
import { ProcessingStatus, VideoPublicationStatus } from "@/lib/types/video";

interface ProcessingStatusBadgeProps {
  status: ProcessingStatus;
  showIcon?: boolean;
}

type StatusConfig = {
  label: string;
  variant: "secondary" | "destructive";
  icon: LucideIcon;
  className: string;
};

export function ProcessingStatusBadge({
  status,
  showIcon = true,
}: ProcessingStatusBadgeProps) {
  const config: Record<ProcessingStatus, StatusConfig> = {
    [ProcessingStatus.QUEUED]: {
      label: "Queued",
      variant: "secondary",
      icon: Clock,
      className: "bg-slate-100 text-slate-700 border-slate-300",
    },

    [ProcessingStatus.PREPARING]: {
      label: "Preparing",
      variant: "secondary",
      icon: Loader2,
      className: "bg-blue-100 text-blue-700 border-blue-300 animate-pulse",
    },

    [ProcessingStatus.TRANSCODING]: {
      label: "Transcoding",
      variant: "secondary",
      icon: Film,
      className:
        "bg-purple-100 text-purple-700 border-purple-300 animate-pulse",
    },

    [ProcessingStatus.SEGMENTING]: {
      label: "Segmenting",
      variant: "secondary",
      icon: Scissors,
      className:
        "bg-indigo-100 text-indigo-700 border-indigo-300 animate-pulse",
    },

    [ProcessingStatus.CREATING_MANIFEST]: {
      label: "Creating Manifest",
      variant: "secondary",
      icon: FileText,
      className: "bg-cyan-100 text-cyan-700 border-cyan-300 animate-pulse",
    },

    [ProcessingStatus.UPLOADING_TO_STORAGE]: {
      label: "Uploading",
      variant: "secondary",
      icon: Upload,
      className: "bg-teal-100 text-teal-700 border-teal-300 animate-pulse",
    },

    [ProcessingStatus.FINALIZING]: {
      label: "Finalizing",
      variant: "secondary",
      icon: Sparkles,
      className: "bg-amber-100 text-amber-700 border-amber-300 animate-pulse",
    },

    [ProcessingStatus.COMPLETED]: {
      label: "Completed",
      variant: "secondary",
      icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },

    [ProcessingStatus.FAILED]: {
      label: "Failed",
      variant: "destructive",
      icon: AlertCircle,
      className: "bg-red-100 text-red-700 border-red-300",
    },

    // OPTIONAL: if you want uploading visible
    [ProcessingStatus.UPLOADING]: {
      label: "Uploading",
      variant: "secondary",
      icon: Upload,
      className: "bg-gray-100 text-gray-700 border-gray-300 animate-pulse",
    },

    [ProcessingStatus.AGGREGATING]: {
      label: "Aggregating",
      variant: "secondary",
      icon: Loader2,
      className:
        "bg-violet-100 text-violet-700 border-violet-300 animate-pulse",
    },
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
  status: VideoPublicationStatus;
  isPublic: boolean;
}

export function PublishStatusBadge({
  status,
  isPublic,
}: PublishStatusBadgeProps) {
  if (status === "published" && isPublic) {
    return (
      <Badge className="text-xs bg-emerald-500 text-white hover:bg-emerald-600 border-0">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Published
      </Badge>
    );
  }

  if (status === "published" && !isPublic) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-amber-50 text-amber-700 border-amber-300"
      >
        <Lock className="w-3 h-3 mr-1" />
        Unlisted
      </Badge>
    );
  }

  if (status === "draft") {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-slate-100 text-slate-700 border-slate-300"
      >
        <FileEdit className="w-3 h-3 mr-1" />
        Draft
      </Badge>
    );
  }

  return null;
}
