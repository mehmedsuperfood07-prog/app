"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Store, ShoppingCart, Receipt } from "lucide-react";

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
      </div>
    </nav>
  );
}
