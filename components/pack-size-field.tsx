"use client";

import { useState } from "react";

const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700";

const PACK_SIZE_PRESETS = ["1 kg", "2 kg", "5 kg"];

// A plain <select> covers the standard flour/atta pack sizes the
// business actually wants to standardize on; "Custom size" drops back
// to free text for anything that isn't a kg pack — the juice bottles
// ("1 L bottle") and the 10 kg rice bag already in the catalog need it,
// and it keeps the door open for whatever comes next.
export function PackSizeField({ defaultValue }: { defaultValue?: string }) {
  const isPreset = !defaultValue || PACK_SIZE_PRESETS.includes(defaultValue);
  const [custom, setCustom] = useState(!isPreset);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pack size</span>
        <button
          type="button"
          onClick={() => setCustom((v) => !v)}
          className="text-xs font-semibold text-accent"
        >
          {custom ? "Choose standard size" : "Custom size"}
        </button>
      </div>
      {custom ? (
        <input
          name="pack_size"
          defaultValue={defaultValue}
          placeholder="e.g. 1 L bottle"
          required
          className={inputClasses}
        />
      ) : (
        <select
          name="pack_size"
          defaultValue={isPreset && defaultValue ? defaultValue : PACK_SIZE_PRESETS[0]}
          className={inputClasses}
        >
          {PACK_SIZE_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
