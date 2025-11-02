interface RoleBadgeProps {
  role: "user" | "admin";
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const styles = {
    admin: "bg-purple-100 text-purple-700 border-purple-300",
    user: "bg-blue-100 text-blue-700 border-blue-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[role]}`}
    >
      {role}
    </span>
  );
}