"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface CategoryData {
  name: string;
  views: number;
  videos: number;
  color: string;
}

interface CategoryPerformanceProps {
  data: CategoryData[];
}

export function CategoryPerformance({ data }: CategoryPerformanceProps) {
  const sortedData = [...data].sort((a, b) => b.views - a.views);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
        <p className="text-sm text-gray-500 mt-1">Views by category</p>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
          />
          <Bar dataKey="views" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Category List */}
      <div className="mt-6 space-y-3">
        {sortedData.map((category, index) => (
          <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-500 w-6">#{index + 1}</span>
              <div className={`w-3 h-3 rounded-full ${category.color}`} />
              <span className="font-medium text-gray-900">{category.name}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500">Views:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {category.views.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Videos:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {category.videos}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}