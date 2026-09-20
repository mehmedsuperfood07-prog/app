"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users, Receipt, Menu } from "lucide-react";
import { NavDock, NavTabButton, NavTabLink } from "@/components/mobile/nav-tab";

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
    <NavDock>
      {NAV_ITEMS.map((item) => (
        <NavTabLink
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={item.href === activeHref}
        />
      ))}
      <NavTabButton onClick={onMore} icon={Menu} label="More" active={onMoreSection} />
    </NavDock>
  );
}
