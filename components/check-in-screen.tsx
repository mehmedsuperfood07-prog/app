"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Camera, CheckCircle2, CloudOff, MapPin, TriangleAlert } from "lucide-react";
import { Button } from "@/components/mobile/button";
import { Card } from "@/components/mobile/card";
import { PageHeader } from "@/components/mobile/page-header";
import { useToast } from "@/components/toast";
import { getPosition, loadCheckInInfo, markAttendance, photoFromVideo, problemWithPosition, syncCheckIns, type CheckInInfo, type Coords } from "@/lib/attendance";
import { db } from "@/lib/offline/db";

type Phase = "idle" | "locating" | "camera" | "sending";

// The field staff's "Mark attendance": finds where they are, and only if that is right takes a
// live photo (from the camera, not the gallery), then marks the day.
export function CheckInScreen({ shopsHref }: { shopsHref?: string }) {
  const { show } = useToast();
  const [info, setInfo] = useState<CheckInInfo | null | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const coords = useRef<Coords | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const pending = useLiveQuery(() => db.pendingCheckIns.toArray(), []);

  const reload = () =>
    loadCheckInInfo()
      .then(setInfo)
      .catch(() => setInfo(null));

  useEffect(() => {
    void syncCheckIns().then(reload);
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (phase === "camera" && video.current && stream.current) video.current.srcObject = stream.current;
  }, [phase]);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  async function begin() {
    if (!info) return;
    setProblem(null);
    setPhase("locating");
    try {
      const c = await getPosition();
      const wrong = problemWithPosition(info, c);
      if (wrong) throw new Error(wrong);
      coords.current = c;
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false });
      } catch {
        throw new Error("The camera is turned off for this app. Allow it in your phone's settings, then try again.");
      }
      setPhase("camera");
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setPhase("idle");
    }
  }

  async function capture() {
    if (!video.current || !coords.current) return;
    setPhase("sending");
    try {
      const photo = await photoFromVideo(video.current);
      stopCamera();
      const r = await markAttendance(coords.current, photo);
      if (r.state === "done") {
        show(`Attendance marked at ${r.time}.`, "success");
        await reload();
      } else {
        show("No internet. Saved on this phone; it is sent by itself.", "success");
      }
    } catch (err) {
      stopCamera();
      setProblem(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
    setPhase("idle");
  }

  const waiting = (pending ?? []).filter((p) => p.status === "queued");
  const failed = (pending ?? []).filter((p) => p.status === "failed");
  const markedToday = info?.today;

  // Once the phone has sent what it was holding, show the day as marked.
  const queuedCount = waiting.length;
  const wasQueued = useRef(0);
  useEffect(() => {
    if (wasQueued.current > 0 && queuedCount === 0) void syncCheckIns().then(reload);
    wasQueued.current = queuedCount;
  }, [queuedCount]);

  return (
    <div className="space-y-3">
      <PageHeader title="Attendance" subtitle="Your location is read only when you mark, never during the day." />

      {info === undefined && <p className="py-8 text-center text-sm text-zinc-500">Loading…</p>}

      {info === null && (
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Connect to the internet once to set this up on your phone.</p>
        </Card>
      )}

      {info && !info.linked && (
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Your login isn&apos;t linked to a staff record yet. Ask the office.</p>
        </Card>
      )}

      {info?.linked && (
        <>
          {markedToday ? (
            <Card className="flex items-center gap-3">
              <CheckCircle2 size={26} className="shrink-0 text-accent" />
              <div className="text-sm">
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">Marked at {markedToday.time}</div>
                {markedToday.place && <div className="text-zinc-500 dark:text-zinc-400">{markedToday.place}</div>}
              </div>
            </Card>
          ) : waiting.length > 0 ? (
            <Card className="flex items-center gap-3">
              <CloudOff size={24} className="shrink-0 text-zinc-500" />
              <div className="text-sm text-zinc-700 dark:text-zinc-300">Saved on this phone. It is sent by itself when the internet is back.</div>
            </Card>
          ) : phase === "camera" ? (
            <Card className="space-y-3">
              <video ref={video} autoPlay playsInline muted className="h-[50vh] w-full -scale-x-100 rounded-xl bg-black object-cover" />
              <Button type="button" onClick={capture} className="w-full py-3.5">
                <Camera size={18} /> Take photo and mark attendance
              </Button>
            </Card>
          ) : (
            <Card className="space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Be at {info.places?.length === 1 ? info.places[0]!.name : "one of your shops"}, with location and camera allowed for this app.
              </p>
              <Button type="button" onClick={begin} disabled={phase !== "idle"} className="w-full py-3.5">
                <MapPin size={18} />
                {phase === "locating" ? "Finding your location…" : phase === "sending" ? "Marking…" : "Mark attendance"}
              </Button>
            </Card>
          )}

          {problem && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl bg-zinc-900 px-3.5 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
              <TriangleAlert size={17} className="mt-0.5 shrink-0" />
              <span>{problem}</span>
            </div>
          )}

          {failed.map((f) => (
            <div key={f.id} role="alert" className="flex items-start gap-2 rounded-2xl bg-zinc-900 px-3.5 py-3 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
              <TriangleAlert size={17} className="mt-0.5 shrink-0" />
              <span>The attendance saved on this phone couldn&apos;t be sent: {f.error} Tell the office.</span>
            </div>
          ))}

          {shopsHref && (
            <p className="pt-1 text-center text-sm">
              <Link href={shopsHref} className="font-medium text-accent underline">
                Save your shops&apos; locations
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
