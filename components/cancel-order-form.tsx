import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/mobile/submit-button";
import { cancelOrderAction } from "@/lib/actions/orders";
import { formatRs } from "@/lib/format";

// Tucked behind a disclosure so it's never tapped by accident, and confirmed
// with a prompt that spells out what happens to the invoice and the balance.
export function CancelOrderForm({
  orderId,
  invoice,
}: {
  orderId: string;
  invoice: { number: string; amount: number } | null;
}) {
  const confirmMessage = invoice
    ? `Cancel this order? Invoice ${invoice.number} will be marked void and ${formatRs(invoice.amount)} taken off the client's balance. This can't be undone.`
    : "Cancel this order? This can't be undone.";

  return (
    <details className="group rounded-2xl border border-zinc-200/80 bg-surface px-4 py-3 shadow-sm dark:border-zinc-800">
      <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        Cancel this order…
      </summary>
      <p className="mb-2.5 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {invoice
          ? "The invoice is kept for the record but marked void, and its amount comes off the client's balance."
          : "No invoice has been raised yet, so the balance doesn't change."}{" "}
        The rider and salesman are notified.
      </p>
      <ActionForm action={cancelOrderAction} confirmMessage={confirmMessage} className="space-y-2">
        <input type="hidden" name="order_id" value={orderId} />
        <input
          name="reason"
          required
          maxLength={300}
          placeholder="Reason, e.g. client refused, out of stock"
          aria-label="Reason for cancelling"
          className="w-full rounded-xl border border-zinc-300 bg-surface px-3 py-2.5 text-sm dark:border-zinc-700"
        />
        <SubmitButton variant="compactOutline" pendingLabel="Cancelling…">
          Cancel order
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
