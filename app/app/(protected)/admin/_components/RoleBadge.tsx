interface RoleBadgeProps {
  role: "user" | "admin";
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const styles = {
    admin: "bg-accent text-primary border-primary/20",
    user: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[role]}`}
    >
      {role}
    </span>
  );
}