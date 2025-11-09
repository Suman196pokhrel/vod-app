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
  return (
    <div className="relative overflow-hidden bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-purple-500/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-size:[50px_50px]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-50 animate-pulse" />
              <div className="relative p-2 bg-green-500/20 rounded-full border border-green-500/30">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Real-time Activity</h3>
              <p className="text-sm text-gray-400">Live platform metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-400">LIVE</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Active Now */}
          <div className="group relative">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/20 to-blue-600/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-blue-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-sm font-medium text-gray-400">Active Now</p>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{activeNow}</p>
              <p className="text-xs text-gray-500">users online</p>
            </div>
          </div>

          {/* Playing Now */}
          <div className="group relative">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/20 to-purple-600/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-purple-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <Play className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-sm font-medium text-gray-400">Playing Now</p>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{playingNow}</p>
              <p className="text-xs text-gray-500">active streams</p>
            </div>
          </div>

          {/* Avg. Session */}
          <div className="group relative">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-emerald-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-gray-400">Avg. Session</p>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{avgWatchTime}</p>
              <p className="text-xs text-gray-500">per user</p>
            </div>
          </div>

          {/* Peak Today */}
          <div className="group relative">
            <div className="absolute inset-0 bg-linear-to-br from-orange-500/20 to-orange-600/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-orange-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-orange-500/20 rounded-lg border border-orange-500/30">
                  <Activity className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-sm font-medium text-gray-400">Peak Today</p>
              </div>
              <p className="text-4xl font-bold text-white mb-1">{peakToday}</p>
              <p className="text-xs text-gray-500">concurrent users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}