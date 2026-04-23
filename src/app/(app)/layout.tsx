import { requireUser } from "@/lib/auth";
import { RoseLogo } from "@/components/rose-logo";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-20 items-center justify-between border-b border-white/10 bg-card px-6">
          {/* Logo only on mobile where the sidebar is hidden, to keep the
              desktop header uncluttered since the sidebar carries the brand. */}
          <div className="md:hidden">
            <RoseLogo size="sm" />
          </div>
          <p className="hidden text-sm text-ink-muted md:block">Point of sale</p>
          <UserMenu displayName={user.displayName} role={user.role} />
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
