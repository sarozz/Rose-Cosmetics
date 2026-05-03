import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { RoseLogo } from "@/components/rose-logo";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import { HeaderBreadcrumb } from "./header-breadcrumb";
import { GlobalScanListener } from "@/components/global-scan-listener";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  // Read the sidebar collapsed state from a cookie so the server renders
  // the right width on first paint — eliminates the brief "flash of
  // expanded sidebar" we used to get with localStorage hydration.
  const cookieStore = await cookies();
  const sidebarCollapsed =
    cookieStore.get("rose-sidebar-collapsed")?.value === "1";

  return (
    <div className="flex min-h-screen bg-page">
      <GlobalScanListener role={user.role} />
      <Sidebar role={user.role} initialCollapsed={sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-card px-4 sm:h-20 sm:px-6">
          {/* Logo only on mobile where the sidebar is hidden, to keep the
              desktop header uncluttered since the sidebar carries the brand. */}
          <div className="md:hidden">
            <RoseLogo size="sm" />
          </div>
          <HeaderBreadcrumb />
          <UserMenu displayName={user.displayName} role={user.role} />
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
