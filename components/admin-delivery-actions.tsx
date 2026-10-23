import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/mobile/submit-button";
import { adminDeliveryAction } from "@/lib/actions/orders";
import type { AdvancedStatus, DeliveryStatus } from "@/lib/deliveries";

const NEXT: Partial<Record<DeliveryStatus, AdvancedStatus>> = {
  assigned: "picked_up",
  picked_up: "on_the_way",
};

const LABEL: Record<AdvancedStatus, string> = {
  picked_up: "Mark picked up",
  on_the_way: "Mark on the way",
  delivered: "Mark delivered",
};

function StepButton({
  orderId,
  status,
  primary,
  confirmMessage,
  children,
}: {
  orderId: string;
  status: AdvancedStatus;
  primary?: boolean;
  confirmMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <ActionForm action={adminDeliveryAction} confirmMessage={confirmMessage}>
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={primary ? "compact" : "compactOutline"} pendingLabel="Saving…">
        {children}
      </SubmitButton>
    </ActionForm>
  );
}

// The office doing the rider's job. On an order out for delivery: the rider's
// next step, or straight to delivered. On an order with no rider yet: deliver
// it directly (client collected it, or the office delivered it).
export function AdminDeliveryActions({
  orderId,
  orderStatus,
  deliveryStatus,
}: {
  orderId: string;
  orderStatus: string;
  deliveryStatus: DeliveryStatus | null;
}) {
  if (orderStatus === "placed") {
    return (
      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          No rider needed? If the client collected it or the office delivered it:
        </p>
        <StepButton
          orderId={orderId}
          status="delivered"
          confirmMessage="Mark this order delivered without a rider? Its invoice is raised now and the amount is added to the client's balance."
        >
          Mark delivered without a rider
        </StepButton>
      </div>
    );
  }

  if (orderStatus !== "out_for_delivery" || deliveryStatus === "delivered") return null;
  const next = deliveryStatus ? NEXT[deliveryStatus] : undefined;

  return (
    <div className="flex flex-wrap gap-2">
      {next && (
        <StepButton orderId={orderId} status={next}>
          {LABEL[next]}
        </StepButton>
      )}
      <StepButton
        orderId={orderId}
        status="delivered"
        primary={!next}
        confirmMessage="Mark this order delivered on the rider's behalf? It leaves the rider's list."
      >
        {LABEL.delivered}
      </StepButton>
    </div>
  );
}
