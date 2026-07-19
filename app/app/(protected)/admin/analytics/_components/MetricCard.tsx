import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface Metric {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
}

interface MetricCardProps {
  metric: Metric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const getTrendIcon = () => {
    if (!metric.change) return null;
    if (metric.change > 0) return <TrendingUp className="w-4 h-4" />;
    if (metric.change < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!metric.change) return "text-muted-foreground";
    if (metric.change > 0) return "text-primary";
    if (metric.change < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const Icon = metric.icon;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
        <div className="p-2 bg-accent rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-foreground">{metric.value}</p>
          {metric.change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="font-medium">
                {metric.change > 0 ? "+" : ""}
                {metric.change}%
              </span>
              {metric.changeLabel && (
                <span className="text-muted-foreground ml-1">{metric.changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}