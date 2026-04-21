import type { UserRole } from "@prisma/client";
import { RoseLogo } from "@/components/rose-logo";

type NavItem = {
  label: string;
  href: string;
  comingPhase?: number;
  roles?: UserRole[];
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  {
    label: "Suppliers",
    href: "/suppliers",
    roles: ["OWNER", "MANAGER", "INVENTORY"],
  },
  {
    label: "Receiving",
    href: "/receiving",
    roles: ["OWNER", "MANAGER", "INVENTORY"],
  },
  {
    label: "POS",
    href: "/pos",
    roles: ["OWNER", "MANAGER", "CASHIER"],
  },
  { label: "Returns", href: "/returns", roles: ["OWNER", "MANAGER"] },
  { label: "Reports", href: "/reports", roles: ["OWNER", "MANAGER"] },
  { label: "Staff", href: "/staff", roles: ["OWNER"] },
  { label: "Settings", href: "/settings/telegram", roles: ["OWNER"] },
  { label: "Audit", href: "/audit", roles: ["OWNER"] },
];

export function Sidebar({ role }: { role: UserRole }) {
  const visible = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-white/10 bg-card md:block">
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <RoseLogo size="sm" />
      </div>
      <nav className="p-3">
        <ul className="space-y-1">
          {visible.map((item) => (
            <li key={item.href}>
              {item.comingPhase ? (
                <span className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-ink-muted">
                  <span>{item.label}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    Soon
                  </span>
                </span>
              ) : (
                <a
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-rose-500/10 hover:text-rose-300"
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
