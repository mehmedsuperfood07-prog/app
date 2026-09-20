import Link from "next/link";
import { ClipboardList, Truck, Wallet, Receipt, ChevronRight, ArrowRight } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard";
import { getCurrentProfile } from "@/lib/auth";
import { formatRs, formatDateTime, formatLongDate, greeting, firstName } from "@/lib/format";
import { StatTile } from "@/components/mobile/stat-tile";
import { CardLink, Card } from "@/components/mobile/card";
import { OrderStatusPill } from "@/components/mobile/status-pill";
import { PushNotificationSetup } from "@/components/push-notification-setup";

export default async function AdminHome() {
  const [stats, profile] = await Promise.all([getDashboardStats(), getCurrentProfile()]);
  const waiting = stats.needsRider;

  return (
    <div>
      <section className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b7a3e] to-[#1b3a12] p-5 text-white shadow-lg shadow-[#1b7a3e]/20 lg:p-7">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-white/75">{formatLongDate()}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight lg:text-3xl">
            {greeting()}
            {profile ? `, ${firstName(profile.full_name)}` : ""}
          </h1>
          <p className="mt-2 text-sm text-white/85">
            {waiting > 0
              ? `${waiting} order${waiting === 1 ? " is" : "s are"} waiting for a rider.`
              : "You're all caught up — no orders are waiting for a rider."}
          </p>
          {waiting > 0 && (
            <Link
              href="/admin/orders?status=placed"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b3a12] transition active:scale-95"
            >
              Assign riders <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>

      <PushNotificationSetup />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          href="/admin/orders"
          icon={ClipboardList}
          tone="medium"
          label="Orders today"
          value={String(stats.ordersToday)}
        />
        <StatTile
          href="/admin/orders?status=placed"
          icon={Truck}
          tone="soft"
          label="Needs a rider"
          value={String(stats.needsRider)}
        />
        <StatTile
          href="/admin/orders?status=out_for_delivery"
          icon={Truck}
          tone="medium"
          label="Out for delivery"
          value={String(stats.outForDelivery)}
        />
        <StatTile
          href="/admin/clients"
          icon={Wallet}
          tone="strong"
          label="Outstanding balance"
          value={formatRs(stats.outstandingBalance)}
        />
      </div>

      <Link
        href="/admin/invoices"
        className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-surface p-4 shadow-sm transition active:scale-[0.98] dark:border-zinc-800"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
            <Receipt size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {stats.invoicesThisWeek} invoice{stats.invoicesThisWeek === 1 ? "" : "s"} this
              week
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatRs(stats.invoicedThisWeek)} invoiced
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-400" />
      </Link>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs font-semibold text-accent">
            See all
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">No orders yet.</p>
          </Card>
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {stats.recentOrders.map((o) => (
              <CardLink key={o.id} href={`/admin/orders/${o.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {o.clientName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(o.createdAt)} · {formatRs(o.total)}
                    </p>
                  </div>
                  <OrderStatusPill status={o.status} />
                </div>
              </CardLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
