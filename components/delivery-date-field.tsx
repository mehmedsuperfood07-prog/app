"use client";

import { CalendarDays } from "lucide-react";
import { addDaysToISODate, describeDeliveryDate, todayPakistanISO } from "@/lib/format";

// The date a salesman promises the client while taking the order. Most orders
// are for today, tomorrow or the day after, so those are one tap; anything
// else goes through the phone's own date picker. `value` is "YYYY-MM-DD", or
// "" while nothing is chosen. `invalid` is set when the salesman tried to place
// the order without one.
export function DeliveryDateField({
  value,
  onChange,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const today = todayPakistanISO();
  const presets = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: addDaysToISODate(today, 1) },
    { label: "In 2 days", value: addDaysToISODate(today, 2) },
  ];

  return (
    <div
      className={`rounded-2xl border bg-surface p-3.5 shadow-sm transition-colors ${
        invalid ? "border-accent ring-2 ring-accent/30" : "border-zinc-200/80 dark:border-zinc-800"
      }`}
    >
      <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <CalendarDays size={16} className="text-accent" />
        Expected delivery date
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const selected = value === preset.value;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.value)}
              aria-pressed={selected}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                selected
                  ? "bg-accent text-accent-foreground"
                  : "bg-zinc-100 text-zinc-600 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <label className="mt-2.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        Other date
        <input
          type="date"
          min={today}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Choose another delivery date"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-surface px-2.5 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
        />
      </label>

      <p
        className={`mt-2.5 text-xs ${
          value
            ? "font-semibold text-zinc-700 dark:text-zinc-300"
            : invalid
              ? "font-semibold text-accent"
              : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {value
          ? `Delivery: ${describeDeliveryDate(value)}`
          : invalid
            ? "Choose a delivery date to place this order."
            : "Choose when the client wants this delivered."}
      </p>
    </div>
  );
}
