"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { RoseLogo } from "@/components/rose-logo";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: UserRole[];
};

const STORAGE_KEY = "rose-sidebar-collapsed";

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Inventory", href: "/inventory", icon: <BoxIcon /> },
  { label: "Products", href: "/products", icon: <TagIcon /> },
  { label: "Categories", href: "/categories", icon: <FolderIcon /> },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: <TruckIcon />,
    roles: ["OWNER", "MANAGER", "INVENTORY"],
  },
  {
    label: "Receiving",
    href: "/receiving",
    icon: <DownloadIcon />,
    roles: ["OWNER", "MANAGER", "INVENTORY"],
  },
  {
    label: "POS",
    href: "/pos",
    icon: <CartIcon />,
    roles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    label: "Day close",
    href: "/close",
    icon: <ClockIcon />,
    roles: ["OWNER", "MANAGER", "CASHIER"],
  },
  {
    label: "Returns",
    href: "/returns",
    icon: <ReturnIcon />,
    roles: ["OWNER", "MANAGER"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <ChartIcon />,
    roles: ["OWNER", "MANAGER"],
  },
  { label: "Staff", href: "/staff", icon: <UsersIcon />, roles: ["OWNER"] },
  {
    label: "Settings",
    href: "/settings/telegram",
    icon: <CogIcon />,
    roles: ["OWNER"],
  },
  { label: "Audit", href: "/audit", icon: <ShieldIcon />, roles: ["OWNER"] },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read once on mount; default expanded if nothing is stored.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside
      // Width transitions from 14rem → 4.5rem so the collapse animates rather
      // than snapping. md:block hides the whole aside on phones (mobile drawer
      // is a future job — for now the page content scrolls full-width).
      className={`hidden flex-shrink-0 flex-col border-r border-white/10 bg-card transition-[width] duration-200 ease-out md:flex ${
        collapsed ? "w-[4.5rem]" : "w-56"
      }`}
      aria-label="Primary"
    >
      {collapsed ? (
        // The entire header block is the expand button — bigger hit-target,
        // chevron sits centred and prominent so the affordance is obvious.
        <button
          type="button"
          onClick={toggle}
          aria-label="Expand sidebar"
          aria-pressed
          title="Expand sidebar"
          className="group/expand flex h-20 items-center justify-center border-b border-white/10 transition-colors hover:bg-rose-500/5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/30 transition-all group-hover/expand:bg-rose-500/20 group-hover/expand:text-rose-200">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M9 6 15 12 9 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      ) : (
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-4">
          <RoseLogo size="lg" />
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-surface/60 text-ink-muted transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M15 6 9 12 15 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const active =
              pathname === item.href ||
              (pathname?.startsWith(item.href + "/") ?? false);
            return (
              <li key={item.href}>
                <Link
                  href={item.href as Route}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-rose-500/15 text-rose-200"
                      : "text-ink-soft hover:bg-white/5 hover:text-ink"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  {/* Active indicator bar — vertical accent on the left. */}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-rose-400"
                      style={{ width: 3 }}
                    />
                  ) : null}
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center transition-colors ${
                      active
                        ? "text-rose-300"
                        : "text-ink-muted group-hover:text-ink"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed ? (
                    <span className="truncate">{item.label}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!hydrated ? null : (
        <div
          className={`border-t border-white/5 ${
            collapsed ? "p-2 text-center" : "p-3"
          }`}
        >
          <p
            className={`text-[10px] uppercase tracking-wider text-ink-muted ${
              collapsed ? "" : ""
            }`}
          >
            v1.0
          </p>
        </div>
      )}
    </aside>
  );
}

/* --------------------------------- Icons --------------------------------- */
// Inline strokes — small, theme-able, no library dependency.

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <rect x="3" y="3" width="7" height="9" stroke="currentColor" strokeWidth="2" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" stroke="currentColor" strokeWidth="2" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" stroke="currentColor" strokeWidth="2" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" stroke="currentColor" strokeWidth="2" rx="1.5" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M3 7l9-4 9 4-9 4-9-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 11v10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M3 12V4h8l10 10-8 8L3 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <rect x="2" y="7" width="11" height="9" stroke="currentColor" strokeWidth="2" rx="1.5" />
      <path d="M13 10h5l3 3v3h-8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.8" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="18" r="1.8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M3 4h2l2 12h12l2-8H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.6" fill="currentColor" />
      <circle cx="17" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M9 14 4 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h11a5 5 0 0 1 5 5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M4 20V8M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.6" stroke="currentColor" strokeWidth="2" />
      <path d="M16 14h.5a5 5 0 0 1 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1A1.7 1.7 0 0 0 4.8 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.4l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
