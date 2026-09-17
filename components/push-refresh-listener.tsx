"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refreshes the current page's server data the instant a push
// notification arrives in this tab (see the "push" handler in
// public/sw.js, which broadcasts to every open client). Without this, an
// admin who's already looking at the dashboard only sees a new order
// after a manual reload, even though the notification already told them
// it exists.
export function PushRefreshListener() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "push-received") router.refresh();
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
