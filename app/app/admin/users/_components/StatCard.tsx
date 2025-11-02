import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  valueColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  valueColor = "text-gray-900",
}: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${valueColor}`}>{value}</p>
        </div>
        <div className={`p-3 ${iconColor} rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}