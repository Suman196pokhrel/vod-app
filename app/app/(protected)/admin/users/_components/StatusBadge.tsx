interface StatusBadgeProps {
  status: "active" | "suspended" | "inactive";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    active: "bg-accent text-primary border-primary/20",
    suspended: "bg-destructive/10 text-destructive border-destructive/20",
    inactive: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {status}
    </span>
  );
}