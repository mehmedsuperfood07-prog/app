import { MapPin } from "lucide-react";
import { listMyDeliveries } from "@/lib/deliveries";
import { PageHeader } from "@/components/mobile/page-header";
import { CardLink } from "@/components/mobile/card";
import { DeliveryStatusPill } from "@/components/mobile/status-pill";

export default async function RiderHome() {
  const deliveries = await listMyDeliveries();

  return (
    <div>
      <PageHeader
        title="My Deliveries"
        subtitle="Orders assigned to you, not yet delivered"
      />

      <div className="space-y-2.5">
        {deliveries.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            No deliveries assigned right now.
          </p>
        )}
        {deliveries.map((d) => (
          <CardLink key={d.id} href={`/rider/${d.id}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {d.client?.name ?? "Unknown client"}
              </span>
              <DeliveryStatusPill status={d.delivery_status} />
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <MapPin size={12} />
              {d.client?.address ?? "No address on file"}
            </div>
          </CardLink>
        ))}
      </div>
    </div>
  );
}
