import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/mobile/submit-button";
import { assignRiderAction, changeRiderAction } from "@/lib/actions/deliveries";

// "assign" gives a placed order its first rider (and raises the invoice);
// "change" moves an order that is out for delivery to a different rider.
export function AssignRiderForm({
  orderId,
  riders,
  mode = "assign",
  currentRiderId,
  className = "",
}: {
  orderId: string;
  riders: { id: string; full_name: string }[];
  mode?: "assign" | "change";
  currentRiderId?: string | null;
  className?: string;
}) {
  const choices = riders.filter((r) => r.id !== currentRiderId);

  if (choices.length === 0) {
    return (
      <p className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        {mode === "change" ? "No other active riders." : "No active riders yet."}{" "}
        <Link href="/admin/accounts" className="font-semibold text-accent underline">
          Add a rider
        </Link>
      </p>
    );
  }

  return (
    <ActionForm
      action={mode === "change" ? changeRiderAction : assignRiderAction}
      confirmMessage={
        mode === "change"
          ? "Move this delivery to the chosen rider? They start again from Pick up, and the current rider loses it from their list."
          : undefined
      }
      className={`flex items-center gap-2 ${className}`}
    >
      <input type="hidden" name="order_id" value={orderId} />
      <select
        name="rider_id"
        required
        defaultValue=""
        aria-label="Choose a rider"
        className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-surface px-3 py-2.5 text-sm dark:border-zinc-700"
      >
        <option value="" disabled>
          {mode === "change" ? "New rider…" : "Choose rider…"}
        </option>
        {choices.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name}
          </option>
        ))}
      </select>
      <SubmitButton variant="compact" pendingLabel={mode === "change" ? "Changing…" : "Assigning…"}>
        {mode === "change" ? "Change" : "Assign"}
      </SubmitButton>
    </ActionForm>
  );
}
