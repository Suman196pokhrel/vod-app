"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UserActivityChartProps {
  data: Array<{ date: string; activeUsers: number; newUsers: number }>;
}

export function UserActivityChart({ data }: UserActivityChartProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">User Activity</h3>
        <p className="text-sm text-muted-foreground mt-1">Daily active and new users</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
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
          <Area
            type="monotone"
            dataKey="activeUsers"
            stackId="1"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.6}
            name="Active Users"
          />
          <Area
            type="monotone"
            dataKey="newUsers"
            stackId="2"
            stroke="var(--chart-2)"
            fill="var(--chart-2)"
            fillOpacity={0.6}
            name="New Users"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
          <span className="text-sm text-muted-foreground">Active Users</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
          <span className="text-sm text-muted-foreground">New Users</span>
        </div>
      </div>
    </div>
  );
}
