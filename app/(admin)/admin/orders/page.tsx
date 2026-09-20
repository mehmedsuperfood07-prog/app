import Link from "next/link";
import { Inbox, UserRound, Truck } from "lucide-react";
import {
  getOrderCounts,
  listAdminOrders,
  ORDER_FILTERS,
  type OrderFilter,
} from "@/lib/admin-orders";
import { listActiveRiders } from "@/lib/staff";
import { formatDateTime, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { DeliveryStatusPill, OrderStatusPill } from "@/components/mobile/status-pill";
import { AssignRiderForm } from "@/components/assign-rider-form";

const FILTER_LABELS: Record<OrderFilter, string> = {
  all: "All",
  placed: "Needs a rider",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const cardBase =
  "overflow-hidden rounded-2xl border border-zinc-200/80 bg-surface shadow-sm dark:border-zinc-800";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: OrderFilter = ORDER_FILTERS.includes(status as OrderFilter)
    ? (status as OrderFilter)
    : "all";

  const [orders, counts, riders] = await Promise.all([
    listAdminOrders(filter),
    getOrderCounts(),
    listActiveRiders(),
  ]);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Everything your salesmen have placed" />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {ORDER_FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Link
              key={f}
              href={f === "all" ? "/admin/orders" : `/admin/orders?status=${f}`}
              replace
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-accent text-accent-foreground"
                  : "bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {FILTER_LABELS[f]}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                  active ? "bg-white/25" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                }`}
              >
                {counts[f]}
              </span>
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <Inbox size={22} />
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">No orders here</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Orders will show up as soon as a salesman places one.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-2.5 lg:grid-cols-2">
          {orders.map((o) => (
            <div key={o.id} className={cardBase}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="block p-4 transition active:bg-zinc-50 dark:active:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                      {o.clientName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <UserRound size={12} className="shrink-0" />
                      <span className="truncate">{o.salesmanName ?? "Unknown salesman"}</span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(o.createdAt)} · {o.itemCount} item
                      {o.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {formatRs(o.total)}
                    </span>
                    <OrderStatusPill status={o.status} />
                  </div>
                </div>
                {o.riderName && (
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Truck size={12} className="shrink-0" />
                      Rider: {o.riderName}
                    </span>
                    {o.deliveryStatus && <DeliveryStatusPill status={o.deliveryStatus} />}
                  </div>
                )}
              </Link>
              {o.status === "placed" && (
                <AssignRiderForm
                  orderId={o.id}
                  riders={riders}
                  className="border-t border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
