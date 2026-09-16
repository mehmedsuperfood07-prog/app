import Link from "next/link";
import { ClipboardList, Truck, Wallet, Receipt, ChevronRight } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard";
import { PageHeader } from "@/components/mobile/page-header";
import { StatTile } from "@/components/mobile/stat-tile";
import { Card } from "@/components/mobile/card";
import { OrderStatusPill } from "@/components/mobile/status-pill";
import { PushNotificationSetup } from "@/components/push-notification-setup";

export default async function AdminHome() {
  const stats = await getDashboardStats();

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Today at a glance" />
      <PushNotificationSetup />

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          href="/admin/orders"
          icon={ClipboardList}
          tone="blue"
          label="Orders today"
          value={String(stats.ordersToday)}
        />
        <StatTile
          href="/admin/orders"
          icon={Truck}
          tone="amber"
          label="Needs a rider"
          value={String(stats.needsRider)}
        />
        <StatTile
          href="/admin/orders"
          icon={Truck}
          tone="purple"
          label="Out for delivery"
          value={String(stats.outForDelivery)}
        />
        <StatTile
          href="/admin/clients"
          icon={Wallet}
          tone="rose"
          label="Outstanding balance"
          value={`Rs ${stats.outstandingBalance.toLocaleString()}`}
        />
      </div>

      <Link
        href="/admin/invoices"
        className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-surface p-4 shadow-sm active:scale-[0.98] dark:border-zinc-800"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Receipt size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {stats.invoicesThisWeek} invoice{stats.invoicesThisWeek === 1 ? "" : "s"} this
              week
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Rs {stats.invoicedThisWeek.toLocaleString()} invoiced
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-zinc-400" />
      </Link>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Recent orders
          </h2>
          <Link href="/admin/orders" className="text-xs font-medium text-accent">
            See all
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">No orders yet.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {stats.recentOrders.map((o) => (
              <Card key={o.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {o.clientName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(o.createdAt).toLocaleString()} · Rs {o.total}
                  </p>
                </div>
                <OrderStatusPill status={o.status} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
