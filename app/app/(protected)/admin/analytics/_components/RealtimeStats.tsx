import { Activity, Users, Play, Clock, Zap } from "lucide-react";

interface RealtimeStatsProps {
  activeNow: number;
  playingNow: number;
  avgWatchTime: string;
  peakToday: number;
}

export function RealtimeStats({
  activeNow,
  playingNow,
  avgWatchTime,
  peakToday,
}: RealtimeStatsProps) {
  const stats = [
    { label: "Active Now", value: activeNow, unit: "users online", icon: Users },
    { label: "Playing Now", value: playingNow, unit: "active streams", icon: Play },
    { label: "Avg. Session", value: avgWatchTime, unit: "per user", icon: Clock },
    { label: "Peak Today", value: peakToday, unit: "concurrent users", icon: Activity },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent rounded-full">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Real-time Activity</h3>
            <p className="text-sm text-muted-foreground">Live platform metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-accent border border-primary/20 rounded-full">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="eyebrow text-primary">Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-muted/50 border border-border rounded-xl p-6 transition-colors duration-(--duration-fast) hover:bg-muted"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-accent rounded-lg">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-4xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.unit}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
