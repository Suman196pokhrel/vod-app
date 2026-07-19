import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SettingSwitchItemProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingSwitchItem({
  label,
  description,
  checked,
  onCheckedChange,
}: SettingSwitchItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}