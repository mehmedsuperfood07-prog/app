"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Plus, MapPin, Phone } from "lucide-react";
import { db, type CachedClient } from "@/lib/offline/db";
import { pullLatestData } from "@/lib/offline/sync";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/mobile/page-header";
import { CardLink } from "@/components/mobile/card";

const EMPTY_CLIENTS: CachedClient[] = [];

export default function SalesmanHome() {
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Captured once at mount so the banner survives the URL cleanup below
  // instead of disappearing the instant the query param is replaced away.
  const [justCreated] = useState(() => searchParams.get("created") === "1");

  useEffect(() => {
    // Best-effort: if we're offline this just fails silently and the
    // page renders whatever Dexie already has cached from last time.
    pullLatestData().catch(() => {});
  }, []);

  useEffect(() => {
    if (justCreated) router.replace("/salesman");
  }, [justCreated, router]);

  const clients = useLiveQuery(() => db.clients.toArray(), []) ?? EMPTY_CLIENTS;

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
    <div>
      <PageHeader
        title="My Clients"
        subtitle="Pick a client to start a new order"
        action={
          <Link
            href="/salesman/clients/new"
            aria-label="Add client"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground active:bg-accent/90"
          >
            <Plus size={20} strokeWidth={2.5} />
          </Link>
        }
      />

      {justCreated && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Client added.
        </p>
      )}

      <div className="mb-4 space-y-2.5">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full rounded-xl border border-zinc-200 bg-surface py-2.5 pl-10 pr-3 text-sm shadow-sm dark:border-zinc-800"
          />
        </div>
        {areas.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Chip active={areaId === ""} onClick={() => setAreaId("")}>
              All areas
            </Chip>
            {areas.map((a) => (
              <Chip key={a.id} active={areaId === a.id} onClick={() => setAreaId(a.id)}>
                {a.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {clients.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            No clients cached yet — connect once to load your client list.
          </p>
        )}
        {clients.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            No clients match yet.
          </p>
        )}
        {filtered.map((c) => (
          <CardLink key={c.id} href={`/salesman/orders/new?client=${c.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {c.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                    {c.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {CUSTOMER_TYPE_LABELS[c.customer_type]}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Rs {c.current_balance}
              </span>
            </div>
            {(c.area_name || c.phone) && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {c.area_name && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {c.area_name}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {c.phone}
                  </span>
                )}
              </div>
            )}
          </CardLink>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap ${
        active
          ? "bg-accent text-accent-foreground"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
