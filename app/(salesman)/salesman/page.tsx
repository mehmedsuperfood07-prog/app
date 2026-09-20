"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Plus, MapPin, Phone, WifiOff, Users } from "lucide-react";
import { db, type CachedClient } from "@/lib/offline/db";
import { pullLatestData } from "@/lib/offline/sync";
import { CUSTOMER_TYPE_LABELS } from "@/lib/constants";
import { formatRs } from "@/lib/format";
import { useToast } from "@/components/toast";
import { PageHeader } from "@/components/mobile/page-header";
import { CardLink } from "@/components/mobile/card";
import { Skeleton } from "@/components/mobile/skeleton";

const EMPTY_CLIENTS: CachedClient[] = [];

type SyncState = "syncing" | "done" | "failed";

export default function SalesmanHome() {
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("syncing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();
  // Captured once at mount so the message survives the URL cleanup below
  // instead of disappearing the instant the query param is replaced away.
  const [justCreated] = useState(() => searchParams.get("created") === "1");

  useEffect(() => {
    // Best-effort: if we're offline this just fails silently and the
    // page renders whatever Dexie already has cached from last time.
    pullLatestData()
      .then(() => setSyncState("done"))
      .catch(() => setSyncState("failed"));
  }, []);

  useEffect(() => {
    if (!justCreated) return;
    show("Client added.");
    router.replace("/salesman");
  }, [justCreated, router, show]);

  const cachedClients = useLiveQuery(() => db.clients.toArray(), []);
  const clients = cachedClients ?? EMPTY_CLIENTS;

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

  // Right after signing in on a fresh device the local cache is empty
  // until the first pull lands — show placeholders for that moment
  // instead of a message that reads like an offline error.
  const loading = cachedClients === undefined || (clients.length === 0 && syncState === "syncing");

  return (
    <div>
      <PageHeader
        title="My Clients"
        subtitle="Tap a client to start a new order"
        action={
          <Link
            href="/salesman/clients/new"
            aria-label="Add client"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/25 transition active:scale-90"
          >
            <Plus size={20} strokeWidth={2.5} />
          </Link>
        }
      />

      <div className="mb-4 space-y-2.5">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients"
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
        {loading &&
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}

        {!loading && clients.length === 0 && syncState === "failed" && (
          <EmptyState
            icon={<WifiOff size={22} />}
            title="Can't load your clients"
            body="Connect to the internet once to load your client list — after that it works offline."
          />
        )}
        {!loading && clients.length === 0 && syncState === "done" && (
          <EmptyState
            icon={<Users size={22} />}
            title="No clients yet"
            body="Add your first client with the + button, or ask the office to assign some to you."
          />
        )}
        {!loading && clients.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">No clients match yet.</p>
        )}

        {filtered.map((c) => (
          <CardLink key={c.id} href={`/salesman/orders/new?client=${c.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-soft-foreground">
                  {c.name.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {c.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {CUSTOMER_TYPE_LABELS[c.customer_type]}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {formatRs(c.current_balance)}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">balance</p>
              </div>
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

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
        {icon}
      </div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
      <p className="mt-0.5 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{body}</p>
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
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-accent text-accent-foreground"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
