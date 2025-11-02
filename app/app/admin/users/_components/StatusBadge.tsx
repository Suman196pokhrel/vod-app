interface StatusBadgeProps {
  status: "active" | "suspended" | "inactive";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: "bg-green-100 text-green-700 border-green-300",
    suspended: "bg-red-100 text-red-700 border-red-300",
    inactive: "bg-gray-100 text-gray-700 border-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {status}
    </span>
  );
}