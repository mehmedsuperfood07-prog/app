"use client";

import { useState } from "react";

const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700";

export type PaymentTerm = "cash" | "credit";

// Credit limit only means anything for a credit account — hidden
// entirely for a cash client rather than shown-but-irrelevant, and the
// server also zeroes it out server-side if a cash client somehow arrives
// with one set (see normalizeClientInput in lib/clients.ts).
export function PaymentTermFields({
  defaultPaymentTerm,
  defaultCreditLimit,
}: {
  defaultPaymentTerm?: PaymentTerm | null;
  defaultCreditLimit?: number | null;
}) {
  const [term, setTerm] = useState<PaymentTerm>(defaultPaymentTerm ?? "cash");

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Payment term</span>
        <select
          name="payment_term"
          value={term}
          onChange={(e) => setTerm(e.target.value as PaymentTerm)}
          className={inputClasses}
        >
          <option value="cash">Cash</option>
          <option value="credit">Credit</option>
        </select>
      </label>
      {term === "credit" && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Credit limit (Rs)
          </span>
          <input
            name="credit_limit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultCreditLimit?.toString() ?? "0"}
            required
            className={inputClasses}
          />
        </label>
      )}
    </div>
  );
}
