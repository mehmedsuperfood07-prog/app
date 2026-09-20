"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Store, ShoppingCart, Receipt } from "lucide-react";
import { NavDock, NavTabLink } from "@/components/mobile/nav-tab";

// Salesman-specific: icon components can't cross the server -> client
// boundary as props (React can't serialize a function reference), so
// this list lives here in the client component rather than being passed
// in from the server layout.
const NAV_ITEMS = [
  { href: "/salesman", label: "Clients", icon: Store },
  { href: "/salesman/orders/new", label: "New Order", icon: ShoppingCart },
  { href: "/salesman/orders", label: "Orders", icon: Receipt },
];

// Task screens (a form the salesman is actively filling out) hide the
// tab bar in favor of a contextual sticky action bar — the standard
// "modal task replaces tabs" pattern in native apps — rather than
// stacking two fixed bottom bars.
const HIDE_ON: string[] = ["/salesman/clients/new"];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (HIDE_ON.includes(pathname)) return null;
  if (pathname === "/salesman/orders/new" && searchParams.get("client")) return null;

  const activeHref = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.href;

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
    </NavDock>
  );
}
