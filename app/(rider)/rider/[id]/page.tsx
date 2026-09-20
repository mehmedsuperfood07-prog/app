import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MapPin, Navigation, CircleCheck } from "lucide-react";
import { getDeliveryDetail, type DeliveryStatus } from "@/lib/deliveries";
import { advanceDeliveryAction } from "@/lib/actions/deliveries";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/mobile/page-header";
import { Card } from "@/components/mobile/card";
import { ProductIcon } from "@/components/mobile/product-icon";
import { StepTracker } from "@/components/mobile/step-tracker";
import { SubmitButton } from "@/components/mobile/submit-button";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";

const NEXT_ACTION_LABEL: Record<DeliveryStatus, string | null> = {
  assigned: "Mark picked up",
  picked_up: "Mark on the way",
  on_the_way: "Mark delivered",
  delivered: null,
};

const PENDING_LABEL: Record<DeliveryStatus, string> = {
  assigned: "Updating…",
  picked_up: "Updating…",
  on_the_way: "Delivering…",
  delivered: "",
};

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const delivery = await getDeliveryDetail(id);
  if (!delivery) notFound();

  const nextLabel = NEXT_ACTION_LABEL[delivery.delivery_status];
  const address = delivery.client?.address;

  return (
    <div>
      <PageHeader
        title={delivery.client?.name ?? "Unknown client"}
        backHref="/rider"
        backLabel="My Deliveries"
      />

      <Card className="mb-4">
        <StepTracker status={delivery.delivery_status} />
      </Card>

      {(address || delivery.client?.phone) && (
        <Card className="mb-4 space-y-3">
          {address && (
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <MapPin size={16} className="mt-0.5 shrink-0 text-zinc-400" />
                {address}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent active:bg-accent/20"
              >
                <Navigation size={12} /> Directions
              </a>
            </div>
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

      <h2 className="mb-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
        Items to deliver ({delivery.items.length})
      </h2>
      <div className="space-y-2.5 pb-24">
        {delivery.items.map((item) => (
          <Card key={item.id} className="flex items-center gap-3">
            <ProductIcon
              name={item.product?.name ?? ""}
              unit={item.product?.unit ?? ""}
              className="h-10 w-10"
            />
            <div className="min-w-0 flex-1 text-sm">
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

      {!nextLabel && (
        <Card className="flex items-center gap-3 bg-accent-soft text-accent-soft-foreground">
          <CircleCheck size={22} className="shrink-0" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">Delivered</p>
            <Link href="/rider" className="text-xs font-semibold underline">
              Back to my deliveries
            </Link>
          </div>
        </Card>
      )}

      {nextLabel && (
        <ActionForm action={advanceDeliveryAction}>
          <input type="hidden" name="order_id" value={delivery.id} />
          <BottomActionBar>
            <SubmitButton variant="bar" pendingLabel={PENDING_LABEL[delivery.delivery_status]}>
              {nextLabel}
            </SubmitButton>
          </BottomActionBar>
        </ActionForm>
      )}
    </div>
  );
}
