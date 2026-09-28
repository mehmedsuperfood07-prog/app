"use client";

import { useState } from "react";
import {
  CLIENT_CATEGORIES,
  CLIENT_CATEGORY_LABELS,
  CLIENT_SUBTYPES_BY_CATEGORY,
  CLIENT_SUBTYPE_LABELS,
  type ClientCategory,
  type ClientSubtype,
} from "@/lib/constants";

const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700";

// Two selects submitted as plain form fields (client_category,
// client_subtype) — the subtype list depends on the chosen category, so
// this needs to be a client component even though the form around it is
// a native <form action={...}> posting to a Server Action.
export function ClientTypeFields({
  defaultCategory,
  defaultSubtype,
}: {
  defaultCategory?: ClientCategory | null;
  defaultSubtype?: ClientSubtype | null;
}) {
  const initialCategory = defaultCategory ?? "retailer";
  const [category, setCategory] = useState<ClientCategory>(initialCategory);

  const subtypeOptions = CLIENT_SUBTYPES_BY_CATEGORY[category];
  const initialSubtype =
    defaultSubtype && (CLIENT_SUBTYPES_BY_CATEGORY[initialCategory] as string[]).includes(defaultSubtype)
      ? defaultSubtype
      : subtypeOptions[0];
  const [subtype, setSubtype] = useState<ClientSubtype>(initialSubtype);

  function handleCategoryChange(next: ClientCategory) {
    setCategory(next);
    setSubtype(CLIENT_SUBTYPES_BY_CATEGORY[next][0]);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Client type</span>
        <select
          name="client_category"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value as ClientCategory)}
          className={inputClasses}
        >
          {CLIENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CLIENT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {CLIENT_CATEGORY_LABELS[category]} type
        </span>
        <select
          name="client_subtype"
          value={subtype}
          onChange={(e) => setSubtype(e.target.value as ClientSubtype)}
          className={inputClasses}
        >
          {subtypeOptions.map((s) => (
            <option key={s} value={s}>
              {CLIENT_SUBTYPE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
