// components/MockDataBanner.tsx
import { Eye, Database } from "lucide-react";

export function MockDataBanner() {
  return (
    <div className="bg-linear-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-3 mb-6 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-amber-100 rounded-lg">
          <Eye className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Preview Mode</span> • Using demo data for demonstration
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 rounded-full">
          <Database className="w-3 h-3 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Mock Data</span>
        </div>
      </div>
    </div>
  );
}