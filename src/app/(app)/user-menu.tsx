import type { UserRole } from "@prisma/client";

export function UserMenu({
  displayName,
  role,
}: {
  displayName: string;
  role: UserRole;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium text-ink">{displayName}</p>
        <p className="text-xs text-ink-muted">{role}</p>
      </div>
      <form action="/logout" method="post">
        <button type="submit" className="btn-secondary text-sm">
          Sign out
        </button>
      </form>
    </div>
  );
}
