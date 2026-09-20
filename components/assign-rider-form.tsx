import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/mobile/submit-button";
import { assignRiderAction } from "@/lib/actions/deliveries";

export function AssignRiderForm({
  orderId,
  riders,
  className = "",
}: {
  orderId: string;
  riders: { id: string; full_name: string }[];
  className?: string;
}) {
  if (riders.length === 0) {
    return (
      <p className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        No active riders yet.{" "}
        <Link href="/admin/accounts" className="font-semibold text-accent underline">
          Add a rider
        </Link>
      </p>
    );
  }

  return (
    <ActionForm action={assignRiderAction} className={`flex items-center gap-2 ${className}`}>
      <input type="hidden" name="order_id" value={orderId} />
      <select
        name="rider_id"
        required
        defaultValue=""
        aria-label="Choose a rider"
        className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-surface px-3 py-2.5 text-sm dark:border-zinc-700"
      >
        <option value="" disabled>
          Choose rider…
        </option>
        {riders.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name}
          </option>
        ))}
      </select>
      <SubmitButton variant="compact" pendingLabel="Assigning…">
        Assign
      </SubmitButton>
    </ActionForm>
  );
}
