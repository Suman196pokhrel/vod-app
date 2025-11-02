"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UserActivityChartProps {
  data: Array<{ date: string; activeUsers: number; newUsers: number }>;
}

export function UserActivityChart({ data }: UserActivityChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
        <p className="text-sm text-gray-500 mt-1">Daily active and new users</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
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
          <Area
            type="monotone"
            dataKey="activeUsers"
            stackId="1"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
            name="Active Users"
          />
          <Area
            type="monotone"
            dataKey="newUsers"
            stackId="2"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
            name="New Users"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-sm text-gray-600">Active Users</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-sm text-gray-600">New Users</span>
        </div>
      </div>
    </div>
  );
}