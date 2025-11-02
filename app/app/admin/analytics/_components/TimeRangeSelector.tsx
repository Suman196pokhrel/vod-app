import { Button } from "@/components/ui/button";

export type TimeRange = "7d" | "30d" | "90d" | "1y";

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last Year" },
];

export function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-1">
      {timeRanges.map((range) => (
        <Button
          key={range.value}
          variant={selected === range.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(range.value)}
          className={`${
            selected === range.value
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}