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
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Categories</p>
            <p className="text-3xl font-bold mt-2 text-foreground">
              {totalCategories}
            </p>
          </div>
          <div className="p-3 bg-accent rounded-lg">
            <Folder className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-3xl font-bold mt-2 text-foreground">
              {activeCategories}
            </p>
          </div>
          <div className="p-3 bg-accent rounded-lg">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Videos</p>
            <p className="text-3xl font-bold mt-2 text-foreground">
              {totalVideos}
            </p>
          </div>
          <div className="p-3 bg-accent rounded-lg">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Views</p>
            <p className="text-3xl font-bold mt-2 text-foreground">
              {totalViews.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-accent rounded-lg">
            <Eye className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
