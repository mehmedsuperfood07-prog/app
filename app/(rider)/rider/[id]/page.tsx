import { notFound } from "next/navigation";
import { Phone, MapPin, AlertCircle } from "lucide-react";
import {
  getDeliveryDetail,
  type DeliveryStatus,
} from "@/lib/deliveries";
import { advanceDeliveryAction } from "@/lib/actions/deliveries";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { DeliveryStatusPill } from "@/components/mobile/status-pill";
import { Button } from "@/components/mobile/button";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";

const NEXT_ACTION_LABEL: Record<DeliveryStatus, string | null> = {
  assigned: "Mark picked up",
  picked_up: "Mark on the way",
  on_the_way: "Mark delivered",
  delivered: null,
};

export default async function DeliveryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const delivery = await getDeliveryDetail(id);
  if (!delivery) notFound();

  const nextLabel = NEXT_ACTION_LABEL[delivery.delivery_status];

  return (
    <div>
      <PageHeader
        title={delivery.client?.name ?? "Unknown client"}
        backHref="/rider"
        backLabel="My Deliveries"
        action={<DeliveryStatusPill status={delivery.delivery_status} />}
      />

      {(delivery.client?.address || delivery.client?.phone) && (
        <Card className="mb-4 space-y-1.5">
          {delivery.client?.address && (
            <p className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <MapPin size={16} className="mt-0.5 shrink-0 text-zinc-400" />
              {delivery.client.address}
            </p>
          )}
          {delivery.client?.phone && (
            <a
              href={`tel:${delivery.client.phone}`}
              className="flex items-center gap-2 text-sm font-medium text-accent"
            >
              <Phone size={16} className="shrink-0" />
              {delivery.client.phone}
            </a>
          )}
        </Card>
      )}

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <div className="space-y-2.5 pb-20">
        {delivery.items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {item.product?.name ?? "Unknown product"}
                {item.product?.variant ? ` — ${item.product.variant}` : ""}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.product?.pack_size} {item.product?.unit}
              </p>
            </div>
            <span className="shrink-0 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              × {item.quantity}
            </span>
          </Card>
        ))}
      </div>

      {nextLabel && (
        <BottomActionBar>
          <form action={advanceDeliveryAction}>
            <input type="hidden" name="order_id" value={delivery.id} />
            <Button type="submit" className="w-full py-3.5">
              {nextLabel}
            </Button>
          </form>
        </BottomActionBar>
      )}
    </div>
  );
}
