"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users, Receipt, Menu } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
];

export function AdminBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  // "/admin" would prefix-match every admin route, so it only counts as
  // active on an exact match — everything else uses prefix matching.
  const activeHref = [...NAV_ITEMS]
    .filter((item) => item.href !== "/admin")
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.href ??
    (pathname === "/admin" ? "/admin" : undefined);

  const onMoreSection =
    !activeHref &&
    (pathname.startsWith("/admin/products") ||
      pathname.startsWith("/admin/areas") ||
      pathname.startsWith("/admin/accounts"));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-surface/95 backdrop-blur dark:border-zinc-800"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-accent" : "text-zinc-400 dark:text-zinc-500"}
              />
              <span className={active ? "text-accent" : "text-zinc-500 dark:text-zinc-400"}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
        >
          <Menu
            size={22}
            strokeWidth={onMoreSection ? 2.4 : 1.8}
            className={onMoreSection ? "text-accent" : "text-zinc-400 dark:text-zinc-500"}
          />
          <span className={onMoreSection ? "text-accent" : "text-zinc-500 dark:text-zinc-400"}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
