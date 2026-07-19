"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ViewsChartProps {
  data: Array<{ date: string; views: number }>;
  title: string;
}

export function ViewsChart({ data, title }: ViewsChartProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
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
          <Line
            type="monotone"
            dataKey="views"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ fill: "var(--chart-1)", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
