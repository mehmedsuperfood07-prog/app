"use client";

import { useState } from "react";
import { Search, SearchX } from "lucide-react";

// Instant client-side search over a server-rendered list: each item's
// card is rendered on the server (so it can contain Server Action forms)
// and handed over as a node; this only decides which ones to show.
export function FilterableList({
  items,
  placeholder,
  emptyMessage,
  className = "",
}: {
  items: { key: string; text: string; node: React.ReactNode }[];
  placeholder: string;
  emptyMessage: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q ? items.filter((i) => i.text.toLowerCase().includes(q)) : items;

  return (
    <div>
      <div className="relative mb-3">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full rounded-xl border border-zinc-200 bg-surface py-2.5 pl-10 pr-3 text-sm shadow-sm dark:border-zinc-800"
        />
      </div>
      {visible.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <SearchX size={20} />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className={className}>
          {visible.map((i) => (
            <div key={i.key}>{i.node}</div>
          ))}
        </div>
      )}
    </div>
  );
}
