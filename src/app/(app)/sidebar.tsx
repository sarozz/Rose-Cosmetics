"use client";

import { useState } from "react";
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
    label: "Online",
    href: "/online",
    icon: <PackageIcon />,
    roles: ["OWNER", "MANAGER", "CASHIER", "INVENTORY"],
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

/**
 * Hover-expanding sidebar (Instagram-style). Sits at 4.5rem wide showing
 * just icons; on mouse-enter it slides out to 14rem with full labels and
 * collapses again when the cursor leaves. Keyboard focus inside the
 * sidebar also expands it (focus-within) so tab nav still reveals labels.
 */
export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);
  const expanded = hovered;

  const visible = NAV.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        // Only collapse when focus leaves the aside entirely. Sub-elements
        // exchanging focus would otherwise oscillate.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setHovered(false);
        }
      }}
      className={`hidden flex-shrink-0 flex-col border-r border-white/10 bg-card transition-[width] duration-200 ease-out md:flex ${
        expanded ? "w-56" : "w-[4.5rem]"
      }`}
      aria-label="Primary"
    >
      <div
        className={`flex h-20 items-center border-b border-white/10 ${
          expanded ? "justify-start px-4" : "justify-center"
        }`}
      >
        {expanded ? (
          <RoseLogo size="lg" />
        ) : (
          <span
            className="font-[Allura,cursive] text-3xl text-rose-400 drop-shadow-[0_0_6px_rgba(233,80,125,0.4)]"
            aria-hidden
          >
            R
          </span>
        )}
      </div>

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
                  title={expanded ? undefined : item.label}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-rose-500/15 text-rose-200"
                      : "text-ink-soft hover:bg-white/5 hover:text-ink"
                  } ${expanded ? "" : "justify-center"}`}
                >
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
                  {/*
                    Label slot is always rendered so the row width is stable as
                    we expand. We just toggle opacity + visibility so the
                    transition reads as a fade rather than a snap.
                  */}
                  <span
                    className={`truncate transition-opacity duration-150 ${
                      expanded ? "opacity-100" : "pointer-events-none w-0 opacity-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={`border-t border-white/5 ${
          expanded ? "p-3" : "p-2 text-center"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wider text-ink-muted">
          v1.0
        </p>
      </div>
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
function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 13v8" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 5.5l9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
