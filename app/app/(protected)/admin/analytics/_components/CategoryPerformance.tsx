"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface CategoryData {
  name: string;
  views: number;
  videos: number;
}

interface CategoryPerformanceProps {
  data: CategoryData[];
}

// Sequential, cyan-led chart palette (docs/DESIGN_SYSTEM.md §2) — cycles for
// however many categories are shown, rather than an arbitrary color per row.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CategoryPerformance({ data }: CategoryPerformanceProps) {
  const sortedData = [...data].sort((a, b) => b.views - a.views);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Category Performance</h3>
        <p className="text-sm text-muted-foreground mt-1">Views by category</p>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            style={{ fontSize: "12px" }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            style={{ fontSize: "12px" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "var(--popover-foreground)",
            }}
          />
          <Bar dataKey="views" radius={[8, 8, 0, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Category List */}
      <div className="mt-6 space-y-3">
        {sortedData.map((category, index) => (
          <div key={category.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground w-6">#{index + 1}</span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="font-medium text-foreground">{category.name}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Views:</span>
                <span className="ml-2 font-semibold text-foreground">
                  {category.views.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Videos:</span>
                <span className="ml-2 font-semibold text-foreground">
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
