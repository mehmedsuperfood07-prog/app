import { Check } from "lucide-react";

const STEPS = [
  { key: "assigned", label: "Assigned" },
  { key: "picked_up", label: "Picked up" },
  { key: "on_the_way", label: "On the way" },
  { key: "delivered", label: "Delivered" },
];

// Where a delivery is in its four steps, at a glance.
export function StepTracker({ status }: { status: string }) {
  const current = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status),
  );

  return (
    <ol className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i < current || status === "delivered";
        const active = i === current && status !== "delivered";
        return (
          <li key={step.key} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span
                className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${
                  i <= current || status === "delivered"
                    ? "bg-accent"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? "bg-accent text-accent-foreground"
                  : active
                    ? "bg-surface text-accent ring-2 ring-accent"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              }`}
            >
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`mt-1.5 text-center text-[11px] leading-tight ${
                done || active
                  ? "font-semibold text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
