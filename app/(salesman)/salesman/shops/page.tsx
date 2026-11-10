"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/mobile/button";
import { Card } from "@/components/mobile/card";
import { PageHeader } from "@/components/mobile/page-header";
import { StatusPill } from "@/components/mobile/status-pill";
import { useToast } from "@/components/toast";
import { getPosition } from "@/lib/attendance";
import { db } from "@/lib/offline/db";
import { createClient } from "@/lib/supabase/client";

type Status = "pending" | "confirmed";

async function fetchStatus(): Promise<Map<string, Status>> {
  const { data } = await createClient().from("client_locations").select("client_id, status");
  return new Map((data ?? []).map((r) => [r.client_id as string, r.status as Status]));
}

// A salesman saves a shop's location while standing there. It counts for attendance once the
// office has confirmed it, so nobody can save their own home as a shop.
export default function ShopLocationsPage() {
  const { show } = useToast();
  const clients = useLiveQuery(() => db.clients.toArray(), []);
  const [status, setStatus] = useState<Map<string, Status>>(new Map());
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    void fetchStatus().then((s) => {
      if (current) setStatus(s);
    });
    return () => {
      current = false;
    };
  }, []);

  async function save(id: string, name: string) {
    if (!window.confirm(`Are you standing at ${name} now?`)) return;
    setSaving(id);
    try {
      const c = await getPosition();
      const { error } = await createClient().rpc("save_client_location", {
        p_client: id,
        p_lat: c.latitude,
        p_lng: c.longitude,
        p_accuracy: Math.round(c.accuracy),
      });
      if (error) throw new Error(error.message);
      show(`${name}: location saved. The office will confirm it.`, "success");
      setStatus(await fetchStatus());
    } catch (err) {
      show(err instanceof Error ? err.message : "Couldn't save the location. Try again.", "error");
    }
    setSaving(null);
  }

  const shops = (clients ?? []).filter((c) => c.active).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-2.5">
      <PageHeader title="Shop locations" subtitle="Save each shop while you are standing in it." />
      {shops.map((c) => {
        const s = status.get(c.id);
        return (
          <Card key={c.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <div className="font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</div>
              <div className="text-zinc-500 dark:text-zinc-400">{[c.area_name, c.address].filter(Boolean).join(" · ")}</div>
            </div>
            {s === "confirmed" ? (
              <StatusPill tone="strong">Confirmed</StatusPill>
            ) : (
              <div className="flex shrink-0 flex-col items-end gap-1">
                {s === "pending" && <StatusPill tone="soft">Waiting for office</StatusPill>}
                <Button type="button" variant="ghost" className="px-3 py-2 text-xs" disabled={saving !== null} onClick={() => save(c.id, c.name)}>
                  {saving === c.id ? "Finding…" : s === "pending" ? "Save again" : "I'm at this shop"}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
