import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SettingInputItemProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}

export function SettingsInputItem({
  id,
  label,
  type = "text",
  value,
  onChange,
  suffix,
  placeholder,
}: SettingInputItemProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-900">
        {label}
      </Label>
      <div className="flex gap-2 items-center">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-white border-gray-300 text-gray-900"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}