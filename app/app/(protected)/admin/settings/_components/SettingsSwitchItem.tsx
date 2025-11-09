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
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="space-y-0.5">
        <Label className="text-gray-900">{label}</Label>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}