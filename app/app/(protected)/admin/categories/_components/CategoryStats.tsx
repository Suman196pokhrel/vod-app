import { Folder, TrendingUp, Eye, CheckCircle } from "lucide-react";

interface CategoryStatsProps {
  totalCategories: number;
  activeCategories: number;
  totalVideos: number;
  totalViews: number;
}

export function CategoryStats({
  totalCategories,
  activeCategories,
  totalVideos,
  totalViews,
}: CategoryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Categories</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">
              {totalCategories}
            </p>
          </div>
          <div className="p-3 bg-blue-500 rounded-lg">
            <Folder className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold mt-2 text-green-600">
              {activeCategories}
            </p>
          </div>
          <div className="p-3 bg-green-500 rounded-lg">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Videos</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">
              {totalVideos}
            </p>
          </div>
          <div className="p-3 bg-purple-500 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Views</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">
              {totalViews.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-orange-500 rounded-lg">
            <Eye className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}