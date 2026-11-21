"use client";

import { createClient } from "@/lib/supabase/client";
import { db, type PendingProspectVisit } from "@/lib/offline/db";

// Prospects (owner, 2026-11-21): stores a salesman visits that aren't customers yet. Each
// visit records who he met, their role and phone, what came of it, when to go back, and
// remarks. Works with no internet: a visit waits on the phone and is sent when the internet
// is back (erp.save_prospect_visit, which stores a resend once). The CEO, the Sales Manager
// and the Administrator see them in the ERP.

export const RESULTS = [
  { key: "interested", label: "Interested" },
  { key: "call_back", label: "Call back later" },
  { key: "not_interested", label: "Not interested" },
  { key: "other_supplier", label: "Buys from someone else" },
] as const;
export const RESULT_LABEL: Record<string, string> = Object.fromEntries(RESULTS.map((r) => [r.key, r.label]));

export const PERSON_ROLES = [
  { key: "owner", label: "Owner" },
  { key: "manager", label: "Manager" },
  { key: "purchaser", label: "Purchaser" },
  { key: "other", label: "Other" },
] as const;
export const ROLE_LABEL: Record<string, string> = Object.fromEntries(PERSON_ROLES.map((r) => [r.key, r.label]));

export type ProspectVisit = {
  id: string;
  visited_at: string;
  day: string;
  person_name: string | null;
  person_role: string | null;
  phone: string | null;
  result: string;
  next_visit: string | null;
  remarks: string | null;
  waiting?: boolean; // still on this phone
  failed?: string; // the server refused it
};

export type Prospect = {
  id: string;
  name: string;
  area_id: string | null;
  area: string | null;
  address: string | null;
  store_type: string | null;
  client_name: string | null;
  created_at: string;
  visits: ProspectVisit[];
};

export type ProspectsCopy = {
  today: string;
  prospects: Prospect[];
  areas: { id: string; name: string; mine: boolean }[];
  fetched_at?: string;
  offline?: boolean; // this phone's copy: the server didn't answer
};

async function currentUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getSession();
  return data.session?.user.id ?? null;
}

const metaKey = (userId: string) => `prospects:${userId}`;

// From the server when it answers, else this phone's copy; with the visits still waiting on
// the phone put in, so the salesman sees what he just saved.
export async function loadProspects(): Promise<ProspectsCopy | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  let copy: ProspectsCopy | null = null;
  if (navigator.onLine) {
    const { data, error } = await createClient().schema("erp").rpc("my_prospects");
    if (!error && data) {
      copy = { ...(data as ProspectsCopy), fetched_at: new Date().toISOString() };
      await db.meta.put({ key: metaKey(userId), value: copy });
    }
  }
  if (!copy) {
    const saved = (await db.meta.get(metaKey(userId)))?.value as ProspectsCopy | undefined;
    copy = saved ? { ...saved, offline: true } : null;
  }
  const pending = (await db.pendingProspectVisits.toArray()).filter((p) => p.user_id === userId);
  return withPending(copy ?? { today: "", prospects: [], areas: [] }, pending);
}

function withPending(copy: ProspectsCopy, pending: PendingProspectVisit[]): ProspectsCopy {
  const prospects = copy.prospects.map((p) => ({ ...p, visits: [...p.visits] }));
  for (const doc of [...pending].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    let p = prospects.find((x) => x.id === doc.prospect_id);
    if (!p) {
      const area = copy.areas.find((a) => a.id === doc.store.area_id);
      p = {
        id: doc.prospect_id,
        name: doc.store.name ?? "",
        area_id: doc.store.area_id ?? null,
        area: area?.name ?? null,
        address: doc.store.address ?? null,
        store_type: doc.store.store_type ?? null,
        client_name: null,
        created_at: doc.created_at,
        visits: [],
      };
      prospects.unshift(p);
    }
    if (p.visits.some((v) => v.id === doc.id)) continue;
    p.visits.unshift({
      id: doc.id,
      visited_at: doc.created_at,
      day: doc.created_at.slice(0, 10),
      person_name: doc.visit.person_name || null,
      person_role: doc.visit.person_role,
      phone: doc.visit.phone || null,
      result: doc.visit.result,
      next_visit: doc.visit.next_visit,
      remarks: doc.visit.remarks || null,
      waiting: doc.status === "queued",
      failed: doc.status === "failed" ? doc.error ?? "Refused." : undefined,
    });
  }
  return { ...copy, prospects };
}

// The phone's location, if it gives one quickly. Never required: a visit is saved without it.
export function quickPosition(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 120_000 },
    );
  });
}

class NoConnection extends Error {}

async function send(doc: PendingProspectVisit, offlineAt: string | null) {
  const { error } = await createClient().schema("erp").rpc("save_prospect_visit", {
    p_visit_id: doc.id,
    p_prospect_id: doc.prospect_id,
    p_store: doc.store,
    p_visit: doc.visit,
    p_offline_at: offlineAt,
  });
  if (error) {
    // The database's own refusals (wrong data, not allowed) won't change by sending again.
    if (/^(22|23|42|P0)/.test(error.code ?? "")) throw new Error(error.message);
    throw new NoConnection(error.message);
  }
}

export type SaveResult = "sent" | "saved";

// Sends the visit, or keeps it on the phone to send when the internet is back. A refusal from
// the server is thrown with its own words.
export async function saveVisit(input: Omit<PendingProspectVisit, "id" | "user_id" | "created_at" | "status" | "error">): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) throw new Error("You are signed out. Sign in again.");
  const doc: PendingProspectVisit = { ...input, id: crypto.randomUUID(), user_id: userId, created_at: new Date().toISOString(), status: "queued" };
  if (navigator.onLine) {
    try {
      await send(doc, null);
      return "sent";
    } catch (err) {
      if (!(err instanceof NoConnection)) throw err;
    }
  }
  await db.pendingProspectVisits.put(doc);
  return "saved";
}

let sending = false;

export async function syncProspectVisits(): Promise<void> {
  if (sending || !navigator.onLine) return;
  sending = true;
  try {
    const userId = await currentUserId();
    if (!userId) return;
    const docs = (await db.pendingProspectVisits.toArray())
      .filter((d) => d.user_id === userId && d.status === "queued")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const doc of docs) {
      try {
        await send(doc, doc.created_at);
        await db.pendingProspectVisits.delete(doc.id);
      } catch (err) {
        if (err instanceof NoConnection) return;
        await db.pendingProspectVisits.update(doc.id, { status: "failed", error: err instanceof Error ? err.message : "Refused." });
      }
    }
  } finally {
    sending = false;
  }
}

// A refused visit the salesman has read and let go of.
export async function dismissVisit(id: string): Promise<void> {
  await db.pendingProspectVisits.delete(id);
}

// The latest visit's next visit date, if it has come: the store should be visited again.
export function dueDate(p: Prospect, today: string): string | null {
  const next = p.visits[0]?.next_visit ?? null;
  return next && today && next <= today && !p.client_name ? next : null;
}
