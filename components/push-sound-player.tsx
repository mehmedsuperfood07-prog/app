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

    const audio = new Audio("/sounds/notification.mp3");
    audio.preload = "auto";

    let plays = 0;
    audio.addEventListener("ended", () => {
      plays += 1;
      if (plays < 2) {
        audio.currentTime = 0;
        void audio.play().catch(() => {});
      }
    });

    // Browsers only let a page make sound after the person has interacted
    // with it. A silent play on the first tap/keypress "unlocks" audio, so
    // a notification arriving later can ring without needing another tap.
    let unlocked = false;
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "push-received") return;
      plays = 0;
      audio.muted = false;
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }
    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      audio.pause();
    };
  }, []);

  return null;
}
