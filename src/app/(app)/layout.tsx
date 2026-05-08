import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { RoseLogo } from "@/components/rose-logo";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";
import { HeaderBreadcrumb } from "./header-breadcrumb";
import { GlobalScanListener } from "@/components/global-scan-listener";
import { ChatDock } from "@/components/chat-dock";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-page">
      <GlobalScanListener role={user.role} />
      <Sidebar role={user.role} />
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
      <Suspense fallback={null}>
        <ChatDock />
      </Suspense>
    </div>
  );
}
