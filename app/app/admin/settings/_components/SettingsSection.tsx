import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  children: ReactNode;
}

export function SettingsSection({
  icon: Icon,
  title,
  description,
  iconColor,
  children,
}: SettingsSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${iconColor} rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <Separator className="bg-gray-200" />
      <div className="space-y-4">{children}</div>
    </div>
  );
}