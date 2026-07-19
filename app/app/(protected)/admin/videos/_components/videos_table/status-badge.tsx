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

// Three-state visual language (design system has one accent, no per-stage
// rainbow): neutral+static = queued, cyan+pulsing = actively processing,
// neutral+static = completed, destructive = failed. The pulse itself (not
// a distinct hue per stage) is what signals "still working."
const NEUTRAL = "bg-muted text-muted-foreground border-border";
const ACTIVE = "bg-accent text-primary border-primary/20 animate-pulse";

export function ProcessingStatusBadge({
  status,
  showIcon = true,
}: ProcessingStatusBadgeProps) {
  const config: Record<ProcessingStatus, StatusConfig> = {
    [ProcessingStatus.QUEUED]: {
      label: "Queued",
      variant: "secondary",
      icon: Clock,
      className: NEUTRAL,
    },

    [ProcessingStatus.PREPARING]: {
      label: "Preparing",
      variant: "secondary",
      icon: Loader2,
      className: ACTIVE,
    },

    [ProcessingStatus.TRANSCODING]: {
      label: "Transcoding",
      variant: "secondary",
      icon: Film,
      className: ACTIVE,
    },

    [ProcessingStatus.SEGMENTING]: {
      label: "Segmenting",
      variant: "secondary",
      icon: Scissors,
      className: ACTIVE,
    },

    [ProcessingStatus.CREATING_MANIFEST]: {
      label: "Creating Manifest",
      variant: "secondary",
      icon: FileText,
      className: ACTIVE,
    },

    [ProcessingStatus.UPLOADING_TO_STORAGE]: {
      label: "Uploading",
      variant: "secondary",
      icon: Upload,
      className: ACTIVE,
    },

    [ProcessingStatus.FINALIZING]: {
      label: "Finalizing",
      variant: "secondary",
      icon: Sparkles,
      className: ACTIVE,
    },

    [ProcessingStatus.COMPLETED]: {
      label: "Completed",
      variant: "secondary",
      icon: CheckCircle2,
      className: NEUTRAL,
    },

    [ProcessingStatus.FAILED]: {
      label: "Failed",
      variant: "destructive",
      icon: AlertCircle,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },

    // OPTIONAL: if you want uploading visible
    [ProcessingStatus.UPLOADING]: {
      label: "Uploading",
      variant: "secondary",
      icon: Upload,
      className: ACTIVE,
    },

    [ProcessingStatus.AGGREGATING]: {
      label: "Aggregating",
      variant: "secondary",
      icon: Loader2,
      className: ACTIVE,
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
      <Badge className="text-xs bg-accent text-primary border-primary/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Published
      </Badge>
    );
  }

  if (status === "published" && !isPublic) {
    return (
      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
        <Lock className="w-3 h-3 mr-1" />
        Unlisted
      </Badge>
    );
  }

  if (status === "draft") {
    return (
      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
        <FileEdit className="w-3 h-3 mr-1" />
        Draft{!isPublic && " (Private)"}
      </Badge>
    );
  }

  return null;
}
