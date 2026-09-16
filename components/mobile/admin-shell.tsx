"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  MapPin,
  ClipboardList,
  Receipt,
  UserCog,
  X,
} from "lucide-react";
import { ShellHeader } from "@/components/mobile/shell-header";
import type { Profile } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/areas", label: "Areas", icon: MapPin },
  { href: "/admin/accounts", label: "Staff Accounts", icon: UserCog },
];

export function AdminShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const activeHref = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.href;

  return (
    <div className="min-h-screen bg-background">
      <ShellHeader title="Mehmed Admin" profile={profile} onMenu={() => setOpen(true)} />

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-surface shadow-xl"
            style={{ paddingTop: "var(--safe-top)" }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-full p-1.5 text-zinc-500 active:bg-zinc-100 dark:active:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
              {NAV_ITEMS.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-zinc-700 active:bg-zinc-100 dark:text-zinc-300 dark:active:bg-zinc-800"
                    }`}
                  >
                    <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <main
        className="mx-auto max-w-3xl px-4 py-5"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1.25rem)" }}
      >
        {children}
      </main>
    </div>
  );
}
