"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/offline/db";
import { pullLatestData } from "@/lib/offline/sync";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";

export default function SalesmanHome() {
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");
  const [justCreated, setJustCreated] = useState(false);

  useEffect(() => {
    // Best-effort: if we're offline this just fails silently and the
    // page renders whatever Dexie already has cached from last time.
    pullLatestData().catch(() => {});

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("created") === "1") {
        setJustCreated(true);
        window.history.replaceState(null, "", "/salesman");
      }
    }
  }, []);

  const clients = useLiveQuery(() => db.clients.toArray(), []) ?? [];

  const areas = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) {
      if (c.area_id && c.area_name) map.set(c.area_id, c.area_name);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const filtered = clients
    .filter((c) => c.active)
    .filter((c) => !areaId || c.area_id === areaId)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          My Clients
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pick a client to start a new order.
        </p>
      </div>

      {justCreated && <p className="text-sm text-green-600">Client added.</p>}

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All my areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-2xl space-y-2">
        {clients.length === 0 && (
          <p className="text-sm text-zinc-500">
            No clients cached yet — connect once to load your client list.
          </p>
        )}
        {clients.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-zinc-500">No clients match yet.</p>
        )}
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/salesman/orders/new?client=${c.id}`}
            className="block rounded-lg border border-zinc-200 p-4 text-sm hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {c.name}
              </span>
              <span className="text-xs text-zinc-500">
                Balance Rs {c.current_balance}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>{CUSTOMER_TYPE_LABELS[c.customer_type]}</span>
              <span>{c.area_name ?? "No area"}</span>
              {c.phone && <span>{c.phone}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
