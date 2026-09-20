import { notFound } from "next/navigation";
import { MapPin, Phone, UserRound, Truck, Download, FileText } from "lucide-react";
import { getAdminOrderDetail } from "@/lib/admin-orders";
import { listActiveRiders } from "@/lib/staff";
import { formatDateTime, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import {
  DeliveryStatusPill,
  OrderStatusPill,
  ORDER_STATUS_LABEL,
} from "@/components/mobile/status-pill";
import { AssignRiderForm } from "@/components/assign-rider-form";

const HISTORY_LABELS: Record<string, string> = {
  placed: "Order placed",
  out_for_delivery: "Assigned to a rider",
  delivered: "Delivered",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, riders] = await Promise.all([getAdminOrderDetail(id), listActiveRiders()]);
  if (!order) notFound();

  const { client } = order;
  const overLimit = client && client.creditLimit > 0 && client.balance > client.creditLimit;
  const usedPct =
    client && client.creditLimit > 0
      ? Math.min(100, Math.round((client.balance / client.creditLimit) * 100))
      : 0;

  return (
    <div>
      <PageHeader
        title={client?.name ?? "Unknown client"}
        subtitle={formatDateTime(order.createdAt)}
        backHref="/admin/orders"
        backLabel="Orders"
        action={<OrderStatusPill status={order.status} />}
      />

      <div className="grid items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {order.status === "placed" && (
            <Card>
              <p className="mb-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Assign a rider
              </p>
              <AssignRiderForm orderId={order.id} riders={riders} />
            </Card>
          )}

          <div>
            <h2 className="mb-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Items ({order.items.length})
            </h2>
            <div className="space-y-2">
              {order.items.map((item) => (
                <Card key={item.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                      {item.name}
                      {item.variant ? ` — ${item.variant}` : ""}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.packSize} {item.unit} · {item.quantity} × {formatRs(item.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatRs(item.quantity * item.unitPrice)}
                  </span>
                </Card>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#1b7a3e] to-[#1b3a12] px-4 py-3.5 text-white">
              <span className="text-sm font-medium text-white/85">Order total</span>
              <span className="text-lg font-bold">{formatRs(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <Card className="space-y-2.5 text-sm">
            {client?.address && (
              <p className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                <MapPin size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                <span>
                  {client.address}
                  {client.areaName ? ` · ${client.areaName}` : ""}
                </span>
              </p>
            )}
            {client?.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-2 font-medium text-accent"
              >
                <Phone size={16} className="shrink-0" />
                {client.phone}
              </a>
            )}
            <p className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <UserRound size={16} className="shrink-0 text-zinc-400" />
              Taken by {order.salesmanName ?? "an unknown salesman"}
            </p>
            {order.riderName && (
              <p className="flex items-center justify-between gap-2 text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-2">
                  <Truck size={16} className="shrink-0 text-zinc-400" />
                  Rider: {order.riderName}
                </span>
                {order.deliveryStatus && <DeliveryStatusPill status={order.deliveryStatus} />}
              </p>
            )}
          </Card>

          {client && (
            <Card>
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Client balance
                </p>
                {overLimit && (
                  <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    Over limit
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {formatRs(client.balance)}
              </p>
              {client.creditLimit > 0 ? (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${overLimit ? "bg-zinc-900 dark:bg-zinc-100" : "bg-accent"}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    of {formatRs(client.creditLimit)} credit limit
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">No credit limit set</p>
              )}
            </Card>
          )}

          {order.invoice && (
            <Card className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {order.invoice.number}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatRs(order.invoice.amount)}
                  </p>
                </div>
              </div>
              {order.invoice.downloadUrl && (
                <a
                  href={order.invoice.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Download invoice"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <Download size={17} />
                </a>
              )}
            </Card>
          )}

          <Card>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Timeline</p>
            {order.history.length === 0 ? (
              <p className="text-xs text-zinc-500">No history recorded.</p>
            ) : (
              <ol className="space-y-0">
                {order.history.map((h, i) => {
                  const last = i === order.history.length - 1;
                  return (
                    <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                      {!last && (
                        <span className="absolute left-[5px] top-4 h-full w-px bg-zinc-200 dark:bg-zinc-800" />
                      )}
                      <span
                        className={`relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full ${
                          last ? "bg-accent" : "bg-accent-soft ring-2 ring-accent/30"
                        }`}
                      />
                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {HISTORY_LABELS[h.status] ?? ORDER_STATUS_LABEL[h.status] ?? h.status}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDateTime(h.changedAt)}
                          {h.changedBy ? ` · ${h.changedBy}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>

    </div>
  );
}
