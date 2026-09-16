"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, MapPin, UserCog, X, ChevronRight } from "lucide-react";
import { ShellHeader } from "@/components/mobile/shell-header";
import { AdminBottomNav } from "@/components/mobile/admin-bottom-nav";
import type { Profile } from "@/lib/auth";

// Only the sections not already covered by the bottom tab bar — showing
// Dashboard/Orders/Clients/Invoices here too would just duplicate a tap
// target that's already one thumb-reach away.
const MORE_ITEMS = [
  {
    href: "/admin/products",
    label: "Products",
    description: "Catalog and default prices",
    icon: Package,
    tone: "medium" as const,
  },
  {
    href: "/admin/areas",
    label: "Areas",
    description: "Service areas and salesman coverage",
    icon: MapPin,
    tone: "soft" as const,
  },
  {
    href: "/admin/accounts",
    label: "Staff Accounts",
    description: "Salesmen, riders, and admins",
    icon: UserCog,
    tone: "strong" as const,
  },
];

// Same neutral/soft/medium/strong green-family system as everywhere
// else — see app/globals.css and components/mobile/status-pill.tsx.
const TONES = {
  soft: "bg-accent-soft text-accent-soft-foreground",
  medium: "bg-accent/10 text-accent dark:bg-accent/15",
  strong: "bg-accent text-accent-foreground",
};

export function AdminShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <ShellHeader title="Mehmed Admin" profile={profile} />

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-3xl bg-surface shadow-xl"
            style={{ paddingBottom: "calc(var(--safe-bottom) + 5.5rem)" }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-1">
              <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                More
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
            <nav className="flex-1 space-y-2.5 overflow-y-auto px-4 pt-3 pb-2">
              {MORE_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 transition active:scale-[0.98] ${
                      active
                        ? "border-accent/30 bg-accent/5"
                        : "border-zinc-200/80 bg-surface active:bg-zinc-50 dark:border-zinc-800 dark:active:bg-zinc-900"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[item.tone]}`}
                    >
                      <Icon size={20} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {item.label}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-zinc-400" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <main
        className="mx-auto max-w-3xl px-4 py-5"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 5.5rem)" }}
      >
        {children}
      </main>

      <AdminBottomNav onMore={() => setOpen(true)} />
    </div>
  );
}
