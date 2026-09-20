"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Receipt,
  Package,
  MapPin,
  UserCog,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import type { Profile } from "@/lib/auth";

const MAIN_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
];

const MANAGE_ITEMS = [
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/areas", label: "Areas", icon: MapPin },
  { href: "/admin/accounts", label: "Staff Accounts", icon: UserCog },
];

// Desktop-only navigation (lg and up). Phones and tablets keep the
// bottom tab bar; a laptop gets the sidebar layout an office team
// expects instead of a stretched phone screen.
export function AdminSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
  }

  function renderItem(item: { href: string; label: string; icon: typeof LayoutDashboard }) {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
          active
            ? "bg-accent/10 font-semibold text-accent"
            : "font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        }`}
      >
        <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200 bg-surface lg:flex dark:border-zinc-800">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-black text-accent-foreground">
          M
        </span>
        <div className="leading-tight">
          <p className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Mehmed</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Order Manager</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {MAIN_ITEMS.map(renderItem)}
        <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Manage
        </p>
        {MANAGE_ITEMS.map(renderItem)}
      </nav>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="mb-1 flex items-center gap-3 px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
            {profile.full_name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {profile.full_name}
            </p>
            <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">{profile.role}</p>
          </div>
        </div>
        <SignOutButton className="rounded-xl px-3 py-2.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900" />
      </div>
    </aside>
  );
}
