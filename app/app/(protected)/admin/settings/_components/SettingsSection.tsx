import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SettingsSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent rounded-lg">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Separator />
      <div className="space-y-4">{children}</div>
    </div>
  );
}
