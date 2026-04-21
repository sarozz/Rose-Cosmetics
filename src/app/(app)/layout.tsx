import { requireUser } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <p className="text-sm text-ink-muted">Rose Cosmetics POS</p>
          <UserMenu displayName={user.displayName} role={user.role} />
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
