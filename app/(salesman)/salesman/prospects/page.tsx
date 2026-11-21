"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/mobile/button";
import { Card } from "@/components/mobile/card";
import { PageHeader } from "@/components/mobile/page-header";
import { StatusPill } from "@/components/mobile/status-pill";
import { useToast } from "@/components/toast";
import { CLIENT_SUBTYPES, CLIENT_SUBTYPE_LABELS } from "@/lib/constants";
import { addDaysToISODate, formatDate, formatDateTime, todayPakistanISO } from "@/lib/format";
import { db } from "@/lib/offline/db";
import {
  PERSON_ROLES,
  RESULTS,
  RESULT_LABEL,
  ROLE_LABEL,
  dismissVisit,
  dueDate,
  loadProspects,
  quickPosition,
  saveVisit,
  syncProspectVisits,
  type Prospect,
  type ProspectsCopy,
} from "@/lib/prospects";

const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700";

type View = { kind: "list" } | { kind: "store"; id: string } | { kind: "visit"; id: string | null };

// One page for the list, a store's visits and the visit form, so it all opens with no internet
// once the page has been opened once (the service worker keeps each page address it has seen).
export default function ProspectsPage() {
  const [copy, setCopy] = useState<ProspectsCopy | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const pendingCount = useLiveQuery(() => db.pendingProspectVisits.count(), []);

  const reload = useCallback(async () => {
    setCopy(await loadProspects());
  }, []);

  // On opening, and whenever the phone's waiting visits change (one saved, or sent in the
  // background): send what is waiting, then show the server's copy.
  useEffect(() => {
    void syncProspectVisits().then(reload);
  }, [pendingCount, reload]);

  if (!copy) return <p className="py-10 text-center text-sm text-zinc-500">Loading…</p>;
  const store = view.kind !== "list" && view.id ? copy.prospects.find((p) => p.id === view.id) ?? null : null;

  if (view.kind === "visit") {
    return (
      <VisitForm
        copy={copy}
        store={store}
        onCancel={() => setView(store ? { kind: "store", id: store.id } : { kind: "list" })}
        onSaved={async (id) => {
          await reload();
          setView({ kind: "store", id });
        }}
      />
    );
  }
  if (view.kind === "store" && store) {
    return (
      <StoreView
        store={store}
        today={copy.today || todayPakistanISO()}
        onBack={() => setView({ kind: "list" })}
        onAddVisit={() => setView({ kind: "visit", id: store.id })}
        onDismiss={async (id) => {
          await dismissVisit(id);
          await reload();
        }}
      />
    );
  }
  return <ProspectList copy={copy} onOpen={(id) => setView({ kind: "store", id })} onNew={() => setView({ kind: "visit", id: null })} />;
}

function ProspectList({ copy, onOpen, onNew }: { copy: ProspectsCopy; onOpen: (id: string) => void; onNew: () => void }) {
  const [search, setSearch] = useState("");
  const today = copy.today || todayPakistanISO();
  const shown = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const list = copy.prospects.filter((p) => {
      const text = [p.name, p.area, p.address, ...p.visits.flatMap((v) => [v.person_name, v.phone])].join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    });
    // Due first (oldest date first), then the most recently visited.
    return list.sort((a, b) => {
      const da = dueDate(a, today);
      const dbb = dueDate(b, today);
      if (da && dbb) return da.localeCompare(dbb);
      if (da || dbb) return da ? -1 : 1;
      return (b.visits[0]?.visited_at ?? b.created_at).localeCompare(a.visits[0]?.visited_at ?? a.created_at);
    });
  }, [copy.prospects, search, today]);
  const dueCount = copy.prospects.filter((p) => dueDate(p, today)).length;

  return (
    <div className="space-y-2.5">
      <PageHeader
        title="Prospects"
        subtitle={dueCount > 0 ? `${dueCount} to visit again` : "Stores you visit that aren't customers yet"}
        action={
          <Button type="button" className="px-4 py-2.5" onClick={onNew}>
            <Plus size={16} /> New visit
          </Button>
        }
      />
      <label className="relative block">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search store, area, person or phone"
          aria-label="Search prospects"
          className={`${inputClasses} pl-10`}
        />
      </label>
      {copy.offline && copy.fetched_at && (
        <p className="text-xs text-zinc-500">No internet: showing this phone&apos;s copy from {formatDateTime(copy.fetched_at)}.</p>
      )}
      {shown.map((p) => {
        const last = p.visits[0];
        const due = dueDate(p, today);
        return (
          <button key={p.id} type="button" onClick={() => onOpen(p.id)} className="block w-full text-left">
            <Card className="flex items-center gap-3">
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</div>
                <div className="text-zinc-500 dark:text-zinc-400">{[p.area, p.address].filter(Boolean).join(" · ") || "No area"}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {p.client_name ? (
                    <StatusPill tone="strong">Customer now</StatusPill>
                  ) : (
                    last && <StatusPill tone={last.result === "interested" ? "medium" : "neutral"}>{RESULT_LABEL[last.result] ?? last.result}</StatusPill>
                  )}
                  {due && <StatusPill tone="strong">Visit again{due < today ? ` (since ${formatDate(due)})` : " today"}</StatusPill>}
                  {!due && last?.next_visit && !p.client_name && <span className="text-xs text-zinc-500">Next visit {formatDate(last.next_visit)}</span>}
                  {p.visits.some((v) => v.waiting) && <StatusPill tone="soft">Waiting to send</StatusPill>}
                  {p.visits.some((v) => v.failed) && <StatusPill tone="neutral">Couldn&apos;t be sent</StatusPill>}
                </div>
              </div>
              <div className="shrink-0 text-right text-xs text-zinc-500">
                {last ? formatDate(last.visited_at) : ""}
                <div>
                  {p.visits.length} visit{p.visits.length === 1 ? "" : "s"}
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-zinc-400" aria-hidden="true" />
            </Card>
          </button>
        );
      })}
      {shown.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-500">
          {copy.prospects.length === 0 ? "No prospects yet. Tap New visit after you visit a store." : "Nothing matches the search."}
        </p>
      )}
    </div>
  );
}

function StoreView({
  store,
  today,
  onBack,
  onAddVisit,
  onDismiss,
}: {
  store: Prospect;
  today: string;
  onBack: () => void;
  onAddVisit: () => void;
  onDismiss: (id: string) => void;
}) {
  const type = store.store_type ? CLIENT_SUBTYPE_LABELS[store.store_type as keyof typeof CLIENT_SUBTYPE_LABELS] ?? store.store_type : null;
  const due = dueDate(store, today);
  return (
    <div className="space-y-2.5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-0.5 text-sm font-medium text-accent">
        <ChevronLeft size={18} strokeWidth={2.5} /> Prospects
      </button>
      <PageHeader
        title={store.name}
        subtitle={[type, store.area, store.address].filter(Boolean).join(" · ") || undefined}
        action={
          <Button type="button" className="px-4 py-2.5" onClick={onAddVisit}>
            <Plus size={16} /> Add visit
          </Button>
        }
      />
      {store.client_name && (
        <Card className="text-sm">
          <StatusPill tone="strong">Customer now</StatusPill> <span className="ml-1">{store.client_name}</span>
        </Card>
      )}
      {due && (
        <Card className="text-sm font-medium">Visit again: the next visit was set for {formatDate(due)}.</Card>
      )}
      {store.visits.map((v, i) => (
        <Card key={v.id} className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              Visit {store.visits.length - i} · {formatDateTime(v.visited_at)}
            </span>
            <StatusPill tone={v.result === "interested" ? "medium" : "neutral"}>{RESULT_LABEL[v.result] ?? v.result}</StatusPill>
          </div>
          {(v.person_name || v.person_role || v.phone) && (
            <div className="text-zinc-700 dark:text-zinc-300">
              Met {[v.person_name, v.person_role ? `(${ROLE_LABEL[v.person_role] ?? v.person_role})` : null].filter(Boolean).join(" ")}
              {v.phone && (
                <>
                  {" · "}
                  <a href={`tel:${v.phone}`} className="font-medium text-accent">
                    {v.phone}
                  </a>
                </>
              )}
            </div>
          )}
          {v.remarks && <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{v.remarks}</p>}
          {v.next_visit && <div className="text-xs text-zinc-500">Next visit {formatDate(v.next_visit)}</div>}
          {v.waiting && <StatusPill tone="soft">Waiting to send: it goes when the internet is back</StatusPill>}
          {v.failed && (
            <div className="space-y-1.5 rounded-xl bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
              <div className="font-semibold">Couldn&apos;t be sent: {v.failed}</div>
              <button type="button" className="font-semibold text-accent" onClick={() => onDismiss(v.id)}>
                Remove from this phone
              </button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function VisitForm({
  copy,
  store,
  onCancel,
  onSaved,
}: {
  copy: ProspectsCopy;
  store: Prospect | null;
  onCancel: () => void;
  onSaved: (prospectId: string) => void;
}) {
  const { show } = useToast();
  const last = store?.visits[0];
  const [name, setName] = useState(store?.name ?? "");
  const [areaId, setAreaId] = useState(store?.area_id ?? copy.areas.find((a) => a.mine)?.id ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [storeType, setStoreType] = useState(store?.store_type ?? "");
  const [person, setPerson] = useState(last?.person_name ?? "");
  const [role, setRole] = useState(last?.person_role ?? "");
  const [phone, setPhone] = useState(last?.phone ?? "");
  const [result, setResult] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [position, setPosition] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const today = todayPakistanISO();

  // The location is read once, now, if the phone gives it; the visit never waits for it.
  useEffect(() => {
    void quickPosition().then(setPosition);
  }, []);

  const mine = copy.areas.filter((a) => a.mine);
  const others = copy.areas.filter((a) => !a.mine);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return show("Write the store's name.", "error");
    if (!result) return show("Choose what came of the visit.", "error");
    if (nextVisit && nextVisit < today) return show("The next visit can't be before today.", "error");
    setSaving(true);
    const prospectId = store?.id ?? crypto.randomUUID();
    try {
      const r = await saveVisit({
        prospect_id: prospectId,
        store: { name: name.trim(), area_id: areaId || null, address: address.trim(), store_type: storeType },
        visit: {
          person_name: person.trim(),
          person_role: role || null,
          phone: phone.trim(),
          result,
          next_visit: nextVisit || null,
          remarks: remarks.trim(),
          ...(position ?? {}),
        },
      });
      show(r === "sent" ? "Visit saved." : "Saved on this phone. It will be sent when the internet is back.", "success");
      onSaved(prospectId);
    } catch (err) {
      show(err instanceof Error ? err.message : "Couldn't save the visit. Try again.", "error");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3.5 pb-24">
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-0.5 text-sm font-medium text-accent">
        <ChevronLeft size={18} strokeWidth={2.5} /> {store ? store.name : "Prospects"}
      </button>
      <PageHeader title={store ? "Add visit" : "New visit"} subtitle={store ? undefined : "A store that isn't a customer yet"} />

      <Section title="Store">
        <TextBox label="Store name" value={name} onChange={setName} required />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Area</span>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={inputClasses}>
            <option value="">No area</option>
            {mine.length > 0 && (
              <optgroup label="Your areas">
                {mine.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label="Other areas">
                {others.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <TextBox label="Address" value={address} onChange={setAddress} />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Store type</span>
          <select value={storeType} onChange={(e) => setStoreType(e.target.value)} className={inputClasses}>
            <option value="">Not sure</option>
            {CLIENT_SUBTYPES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_SUBTYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Person you met">
        <TextBox label="Name" value={person} onChange={setPerson} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Their role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClasses}>
              <option value="">Choose…</option>
              {PERSON_ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <TextBox label="Phone" value={phone} onChange={setPhone} type="tel" />
        </div>
      </Section>

      <Section title="What came of it">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="What came of the visit">
          {RESULTS.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={result === r.key}
              onClick={() => setResult(r.key)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                result === r.key ? "border-accent bg-accent text-accent-foreground" : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Next visit (if any)</span>
          <input type="date" min={today} value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} className={inputClasses} />
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            ["Tomorrow", 1],
            ["In 3 days", 3],
            ["In a week", 7],
          ].map(([label, days]) => (
            <button
              key={label}
              type="button"
              onClick={() => setNextVisit(addDaysToISODate(today, days as number))}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Remarks</span>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className={inputClasses} />
        </label>
      </Section>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Save visit"}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-zinc-200 pt-3.5 first:border-t-0 dark:border-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      {children}
    </div>
  );
}

function TextBox({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className={inputClasses} />
    </label>
  );
}
