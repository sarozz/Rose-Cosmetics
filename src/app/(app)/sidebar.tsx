import type { UserRole } from "@prisma/client";

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
  { label: "Suppliers", href: "/suppliers" },
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
  { label: "Returns", href: "/returns", comingPhase: 4 },
  { label: "Reports", href: "/reports", comingPhase: 4 },
  {
    label: "Staff",
    href: "/staff",
    comingPhase: 5,
    roles: ["OWNER", "MANAGER"],
  },
];

export function Sidebar({ role }: { role: UserRole }) {
  const visible = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-gray-200 bg-white md:block">
      <div className="flex h-14 items-center border-b border-gray-200 px-6">
        <span className="text-sm font-semibold text-rose-600">Rose</span>
        <span className="ml-1 text-sm font-semibold text-ink">Cosmetics</span>
      </div>
      <nav className="p-3">
        <ul className="space-y-1">
          {visible.map((item) => (
            <li key={item.href}>
              {item.comingPhase ? (
                <span className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-ink-muted">
                  <span>{item.label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    Soon
                  </span>
                </span>
              ) : (
                <a
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-rose-50 hover:text-rose-700"
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
