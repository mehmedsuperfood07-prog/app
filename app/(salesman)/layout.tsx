import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { RoleShell } from "@/components/role-shell";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";

const NAV_LINKS = [
  { href: "/salesman", label: "My Clients" },
  { href: "/salesman/clients/new", label: "New Client" },
  { href: "/salesman/orders", label: "My Orders" },
];

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("salesman");

  return (
    <RoleShell title="Mehmed Sales" profile={profile}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <nav className="flex flex-wrap gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <SyncStatusIndicator />
      </div>
      {children}
    </RoleShell>
  );
}
