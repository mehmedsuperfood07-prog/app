import { MapPin, PackageCheck, CircleCheck, ChevronRight } from "lucide-react";
import { listMyDeliveries, listMyDeliveredToday } from "@/lib/deliveries";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/mobile/page-header";
import { CardLink } from "@/components/mobile/card";
import { DeliveryStatusPill } from "@/components/mobile/status-pill";
import { PushNotificationSetup } from "@/components/push-notification-setup";

export default async function RiderHome() {
  const [deliveries, completed] = await Promise.all([
    listMyDeliveries(),
    listMyDeliveredToday(),
  ]);

  return (
    <div>
      <PageHeader
        title="My Deliveries"
        subtitle={
          deliveries.length > 0
            ? `${deliveries.length} to deliver`
            : "Orders assigned to you appear here"
        }
      />
      <PushNotificationSetup />

      {deliveries.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
            <PackageCheck size={26} />
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {completed.length > 0 ? "All caught up" : "No deliveries right now"}
          </p>
          <p className="mt-0.5 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            {completed.length > 0
              ? "Nice work — you've delivered everything assigned to you."
              : "You'll get a notification the moment the office assigns you an order."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {deliveries.map((d) => (
            <CardLink key={d.id} href={`/rider/${d.id}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {d.client?.name ?? "Unknown client"}
                </span>
                <DeliveryStatusPill status={d.delivery_status} />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{d.client?.address ?? "No address on file"}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-zinc-400" />
              </div>
            </CardLink>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-7">
          <h2 className="mb-2.5 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Delivered today ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-surface px-4 py-3 dark:border-zinc-800"
              >
                <CircleCheck size={18} className="shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {c.clientName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(c.deliveredAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
