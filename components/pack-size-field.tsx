"use client";

import { useState } from "react";
import { PRODUCT_UNITS, type ProductUnit } from "@/lib/constants";
import { addPackSizeAction } from "@/lib/actions/products";
import { useToast } from "@/components/toast";

const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700";

export type PackSizeChoice = { id: string; unit: ProductUnit; size: string; active: boolean };

const ADD_NEW = "__add_new__";

// Numbers in order (1, 2, 5, 10, 25, 50), then any others by name.
function sorted(sizes: PackSizeChoice[]): PackSizeChoice[] {
  const num = (s: string) => (/^\d+(\.\d+)?$/.test(s) ? Number(s) : Infinity);
  return [...sizes].sort((a, b) => num(a.size) - num(b.size) || a.size.localeCompare(b.size));
}

// Unit and pack size together, because the sizes offered depend on the unit: 25 kg is a flour
// pack, 1 L a juice bottle. The sizes are the office's own list (public.pack_sizes, owner
// 2026-11-21); "Add a new size" saves one to that list and chooses it, so nobody has to ask
// for a size to be added. pack_size stays the bare number ("25"), shown beside the unit.
export function UnitAndPackSize({
  unit: initialUnit,
  packSize,
  sizes: initialSizes,
}: {
  unit?: string;
  packSize?: string;
  sizes: PackSizeChoice[];
}) {
  const { show } = useToast();
  const [sizes, setSizes] = useState(initialSizes);
  const [unit, setUnit] = useState<ProductUnit>((initialUnit as ProductUnit) ?? "kg");
  const offered = sorted(sizes.filter((s) => s.unit === unit && (s.active || s.size === packSize)));
  const firstFor = (u: ProductUnit) => sorted(sizes.filter((s) => s.unit === u && s.active))[0]?.size ?? "";
  const [size, setSize] = useState(packSize ?? firstFor(unit));
  const [adding, setAdding] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [saving, setSaving] = useState(false);
  // A product saved before the list, with a size nobody added to it, keeps that size.
  const keepsOldSize = size !== "" && !offered.some((s) => s.size === size);

  async function addSize() {
    if (!newSize.trim()) return;
    setSaving(true);
    const r = await addPackSizeAction(unit, newSize);
    setSaving(false);
    if (!r.ok) {
      show(r.error, "error");
      return;
    }
    setSizes((list) => [...list.filter((s) => s.id !== r.size.id), r.size]);
    setSize(r.size.size);
    setNewSize("");
    setAdding(false);
    show(`${r.size.size} ${unit} added to the pack sizes.`, "success");
  }

  return (
    <>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Unit</span>
        <select
          name="unit"
          value={unit}
          onChange={(e) => {
            const u = e.target.value as ProductUnit;
            setUnit(u);
            setSize(firstFor(u));
            setAdding(false);
          }}
          className={inputClasses}
        >
          {PRODUCT_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Pack size</span>
        {/* The form sends the size chosen, never the "add" choice. */}
        <input type="hidden" name="pack_size" value={size} />
        <select
          aria-label="Pack size"
          value={adding ? ADD_NEW : size}
          onChange={(e) => {
            if (e.target.value === ADD_NEW) {
              setAdding(true);
            } else {
              setAdding(false);
              setSize(e.target.value);
            }
          }}
          className={inputClasses}
        >
          {offered.length === 0 && !keepsOldSize && <option value="">No sizes yet</option>}
          {keepsOldSize && (
            <option value={size}>
              {size} {unit}
            </option>
          )}
          {offered.map((s) => (
            <option key={s.id} value={s.size}>
              {s.size} {unit}
            </option>
          ))}
          <option value={ADD_NEW}>+ Add a new size…</option>
        </select>
      </div>
      {adding && (
        <div className="col-span-2 flex items-end gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
          <label className="block flex-1 space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New size ({unit})</span>
            <input
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addSize();
                }
              }}
              placeholder={unit === "kg" ? "e.g. 40" : "e.g. 1.5 L"}
              className={inputClasses}
              autoFocus
            />
          </label>
          <button
            type="button"
            onClick={() => void addSize()}
            disabled={saving || !newSize.trim()}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add size"}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="px-2 py-2.5 text-sm font-semibold text-zinc-500">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
