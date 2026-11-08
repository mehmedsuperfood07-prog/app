"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/mobile/submit-button";
import type { AreaCoverage } from "@/lib/areas";
import type { ActionResult } from "@/lib/actions/result";

type Action = (formData: FormData) => Promise<ActionResult>;

const customers = (n: number) => `${n} customer${n === 1 ? "" : "s"}`;

// Which areas a salesman covers. Ticking a new area brings its customers to this salesman,
// and the form says how many, and from whom, before anything is saved.
export function SalesmanAreasForm({
  salesman,
  areas,
  action,
}: {
  salesman: { id: string; full_name: string };
  areas: AreaCoverage[];
  action: Action;
}) {
  const original = areas.filter((a) => a.salesmanIds.includes(salesman.id)).map((a) => a.id);
  const [ticked, setTicked] = useState<string[]>(original);
  const [move, setMove] = useState(true);

  const taken = areas.filter((a) => ticked.includes(a.id) && !original.includes(a.id));
  const coming = taken.flatMap((a) => a.customers.filter((c) => c.salesmanId !== salesman.id));
  const total = coming.reduce((s, c) => s + c.count, 0);
  const from = [...new Set(coming.map((c) => c.salesmanName ?? "no salesman"))].join(", ");

  return (
    <ActionForm
      action={action}
      className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800"
      confirmMessage={move && total > 0 ? `${customers(total)} will move to ${salesman.full_name} from ${from}. Continue?` : undefined}
    >
      <input type="hidden" name="id" value={salesman.id} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Areas this salesman covers</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {areas.map((a) => {
            const count = a.customers.reduce((s, c) => s + c.count, 0);
            return (
              <label key={a.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  name="area_ids"
                  value={a.id}
                  checked={ticked.includes(a.id)}
                  onChange={(e) => setTicked((t) => (e.target.checked ? [...t, a.id] : t.filter((x) => x !== a.id)))}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {a.name}
                <span className="text-xs text-zinc-400">{customers(count)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {taken.length > 0 && (
        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="move_customers" checked={move} onChange={(e) => setMove(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>
            Move the new areas&apos; customers to this salesman
            <span className="block text-xs text-zinc-500">
              {total > 0 ? `${customers(total)}, now with ${from}.` : "Nobody to move."} Their unpaid invoices go with them. Ask salesmen to sync their phones first.
            </span>
          </span>
        </label>
      )}
      <SubmitButton pendingLabel="Saving…">Save areas</SubmitButton>
    </ActionForm>
  );
}

// Two salesmen exchange areas and those areas' customers in one go.
export function SwapAreasForm({
  salesmen,
  areas,
  action,
}: {
  salesmen: { id: string; full_name: string }[];
  areas: AreaCoverage[];
  action: Action;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const name = (id: string) => salesmen.find((s) => s.id === id)?.full_name ?? "";
  const covers = (id: string, other: string) => areas.filter((x) => x.salesmanIds.includes(id) && !x.salesmanIds.includes(other));
  const theirs = (id: string, other: string) =>
    covers(id, other)
      .flatMap((x) => x.customers.filter((c) => c.salesmanId === id))
      .reduce((s, c) => s + c.count, 0);
  const ready = !!a && !!b && a !== b;
  const line = (id: string, other: string) =>
    `${name(id)}: ${covers(id, other).map((x) => x.name).join(", ") || "no areas"}, ${customers(theirs(id, other))}`;
  const select = "w-full rounded-xl border border-zinc-300 bg-surface px-3 py-2.5 text-sm dark:border-zinc-700";

  return (
    <ActionForm
      action={action}
      resetOnSuccess
      className="space-y-3"
      confirmMessage={ready ? `Swap areas and customers?\n${line(a, b)}\n${line(b, a)}` : undefined}
    >
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Swap two salesmen&apos;s areas</div>
      <div className="grid grid-cols-2 gap-2">
        {([["salesman_a", a, setA, "First salesman"], ["salesman_b", b, setB, "Second salesman"]] as const).map(([field, value, set, label]) => (
          <select key={field} name={field} required aria-label={label} value={value} onChange={(e) => set(e.target.value)} className={select}>
            <option value="">{label}…</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        ))}
      </div>
      {ready && (
        <p className="text-xs text-zinc-500">
          {line(a, b)}.
          <br />
          {line(b, a)}.
        </p>
      )}
      <SubmitButton variant="outline" pendingLabel="Swapping…">
        Swap areas and customers
      </SubmitButton>
    </ActionForm>
  );
}
