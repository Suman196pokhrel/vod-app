import { Eye, Clock, TrendingUp } from "lucide-react";

export interface TopVideo {
  id: number;
  title: string;
  thumbnail: string;
  category: string;
  views: number;
  watchTime: number; // in hours
  avgCompletion: number; // percentage
}

interface TopVideosTableProps {
  videos: TopVideo[];
}

export function TopVideosTable({ videos }: TopVideosTableProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Top Performing Videos</h3>
        <p className="text-sm text-gray-500 mt-1">Videos with the most views this period</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-4 text-xs font-medium text-gray-700 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left p-4 text-xs font-medium text-gray-700 uppercase tracking-wider">
                Video
              </th>
              <th className="text-left p-4 text-xs font-medium text-gray-700 uppercase tracking-wider">
                Category
              </th>
              <th className="text-left p-4 text-xs font-medium text-gray-700 uppercase tracking-wider">
                Views
              </th>
              <th className="text-left p-4 text-xs font-medium text-gray-700 uppercase tracking-wider">
                Watch Time
              </th>
              <th className="text-left p-4 text-xs font-medium text-gray-700 uppercase tracking-wider">
                Completion
              </th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video, index) => (
              <tr key={video.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-20 h-12 object-cover rounded border border-gray-200"
                    />
                    <div>
                      <p className="font-medium text-gray-900 line-clamp-1">{video.title}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
                    {video.category}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-gray-900">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{formatNumber(video.views)}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-gray-900">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{video.watchTime.toFixed(1)}h</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${video.avgCompletion}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">
                      {video.avgCompletion}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}