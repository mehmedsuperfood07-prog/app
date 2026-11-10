"use client";

import { createClient } from "@/lib/supabase/client";
import { db, type PendingCheckIn } from "@/lib/offline/db";
import { todayPakistanISO } from "@/lib/format";

// Field staff marking their own attendance (client, 2026-11-08). The phone's location is read
// only at the moment of marking and never tracked. The server checks everything again
// (erp.field_check_in); the checks here are so nobody takes a photo for nothing, and so the
// phone can still say yes or no with no internet.

export type CheckInPlace = { client_id: string; name: string; address: string | null; lat: number; lng: number };
export type CheckInInfo = {
  linked: boolean;
  employee?: string;
  radius_m?: number;
  max_accuracy_m?: number;
  places?: CheckInPlace[];
  today?: { time: string; place: string | null } | null;
  fetched_day?: string;
};

export type Coords = { latitude: number; longitude: number; accuracy: number };

async function currentUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getSession();
  return data.session?.user.id ?? null;
}

const metaKey = (userId: string) => `checkIn:${userId}`;

// From the server when it answers, otherwise this phone's copy.
export async function loadCheckInInfo(): Promise<CheckInInfo | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const today = todayPakistanISO();
  if (navigator.onLine) {
    const { data, error } = await createClient().schema("erp").rpc("my_check_in_places");
    if (!error && data) {
      const info = { ...(data as CheckInInfo), fetched_day: today };
      await db.meta.put({ key: metaKey(userId), value: info });
      return info;
    }
  }
  const saved = (await db.meta.get(metaKey(userId)))?.value as CheckInInfo | undefined;
  if (!saved) return null;
  return saved.fetched_day === today ? saved : { ...saved, today: null };
}

export function getPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This phone can't share its location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location is turned off for this app. Turn it on in your phone's settings, then try again."
              : "Couldn't find your location. Step outside and try again.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 25_000, maximumAge: 0 },
    );
  });
}

export function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a))));
}

// Null when this position is good enough to go on; otherwise what to tell the person.
export function problemWithPosition(info: CheckInInfo, c: Coords): string | null {
  const places = info.places ?? [];
  if (places.length === 0) return "None of your shops has a confirmed location yet. Ask the office.";
  if (c.accuracy > (info.max_accuracy_m ?? 100)) {
    return `Your location isn't exact enough right now (about ${Math.round(c.accuracy)} metres). Step outside and try again.`;
  }
  const nearest = places
    .map((p) => ({ ...p, d: metersBetween(c.latitude, c.longitude, p.lat, p.lng) }))
    .sort((a, b) => a.d - b.d)[0]!;
  const radius = info.radius_m ?? 150;
  if (nearest.d > radius) {
    return `You are about ${nearest.d} metres from the nearest of your shops, ${nearest.name}. You need to be within ${radius} metres to mark attendance.`;
  }
  return null;
}

class NoConnection extends Error {}

// Sends one check-in: the photo, then the record. The id makes a resend harmless.
async function send(doc: Omit<PendingCheckIn, "status" | "error">, offlineAt: string | null) {
  const supabase = createClient();
  const userId = await currentUserId();
  if (!userId) throw new NoConnection("Not signed in.");
  const path = `${userId}/${doc.id}.jpg`;
  const upload = await supabase.storage.from("field-attendance").upload(path, doc.photo, { contentType: "image/jpeg", upsert: true });
  if (upload.error) throw new NoConnection(upload.error.message);
  const { data, error } = await supabase.schema("erp").rpc("field_check_in", {
    p_id: doc.id,
    p_lat: doc.latitude,
    p_lng: doc.longitude,
    p_accuracy: Math.round(doc.accuracy),
    p_selfie_path: path,
    p_offline_at: offlineAt,
  });
  if (error) {
    if (/^(22|23|42|P0)/.test(error.code ?? "")) throw new Error(error.message);
    throw new NoConnection(error.message);
  }
  return data as { time: string; place?: string | null };
}

export type MarkResult = { state: "done"; time: string; place: string | null } | { state: "saved" };

// Marks attendance, or keeps it on the phone to send when the internet is back. A refusal from
// the server (too far, already marked) is thrown with its own words.
export async function markAttendance(c: Coords, photo: Blob): Promise<MarkResult> {
  const doc = { id: crypto.randomUUID(), latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, photo, created_at: new Date().toISOString() };
  if (navigator.onLine) {
    try {
      const r = await send(doc, null);
      return { state: "done", time: r.time, place: r.place ?? null };
    } catch (err) {
      if (!(err instanceof NoConnection)) throw err;
    }
  }
  await db.pendingCheckIns.put({ ...doc, status: "queued" });
  return { state: "saved" };
}

let sending = false;

export async function syncCheckIns(): Promise<void> {
  if (sending || !navigator.onLine) return;
  sending = true;
  try {
    for (const doc of await db.pendingCheckIns.toArray()) {
      if (doc.status === "failed") continue;
      try {
        await send(doc, doc.created_at);
        await db.pendingCheckIns.delete(doc.id);
      } catch (err) {
        if (err instanceof NoConnection) return;
        await db.pendingCheckIns.update(doc.id, { status: "failed", error: err instanceof Error ? err.message : "Refused." });
      }
    }
  } finally {
    sending = false;
  }
}

// A small photo: enough to see who and where, and little to store.
export function photoFromVideo(video: HTMLVideoElement): Promise<Blob> {
  const width = 480;
  const height = Math.round((video.videoHeight / video.videoWidth) * width) || 640;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't take the photo. Try again."))), "image/jpeg", 0.6));
}
