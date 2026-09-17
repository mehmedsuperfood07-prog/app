"use client";

import { useEffect } from "react";

// Plays the app's own notification sound, twice in a row, the instant a
// push arrives while this tab is open (see the "push" handler in
// public/sw.js, which broadcasts to every open client). This is separate
// from the OS-level notification sound — no web app, on any browser or
// platform, can override that one — so this is the audible cue for
// whoever actually has the app open and looking at the screen.
export function PushSoundPlayer() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function playTwice() {
      const audio = new Audio("/sounds/notification.mp3");
      let playCount = 0;
      audio.addEventListener("ended", () => {
        playCount += 1;
        if (playCount < 2) {
          audio.currentTime = 0;
          void audio.play().catch(() => {});
        }
      });
      void audio.play().catch(() => {});
    }

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "push-received") playTwice();
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  return null;
}
