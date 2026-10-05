// Client-only helpers for the in-app "Install the app" offer.
//
// The browser hands over a one-shot "install this app" handle
// (`beforeinstallprompt`) early in a page's life — often before whichever
// screen wants to show an Install button has mounted, and long before a
// salesman has signed in and moved (client-side, no reload) to another
// screen. So it's captured once, app-wide (InstallPromptCapture in the root
// layout) and kept here for any component to read.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "mehmed-install-prompt-dismissed-at";
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let dismissedThisVisit = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function captureInstallPrompt() {
  function onBeforeInstallPrompt(event: Event) {
    // Stops Chrome's own mini-infobar so the in-app card is the one obvious
    // way to install; the browser's menu entry keeps working.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  }
  function onInstalled() {
    deferredPrompt = null;
    emit();
  }

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function subscribeToInstallState(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return;
  // A captured event can only be used once, whatever the user answers.
  deferredPrompt = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "dismissed") dismissInstallPrompt();
}

// Hidden for two weeks after the user waves the card away, so it never nags.
export function isInstallPromptDismissed() {
  if (dismissedThisVisit) return true;
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt() {
  // Remembered in memory too, so it still goes away when storage is blocked
  // (private mode) — it just comes back on the next visit.
  dismissedThisVisit = true;
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
  emit();
}

export type InstallEnvironment = "installed" | "ios-browser" | "browser";

// "installed" covers the home-screen/desktop app, the Android APK (a
// Trusted Web Activity reports standalone and an android-app:// referrer)
// and anything else already running outside a normal browser tab.
export function getInstallEnvironment(): InstallEnvironment {
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://");
  if (installed) return "installed";

  // iPadOS 13+ reports itself as a Mac, so touch support gives it away.
  const isIos =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIos ? "ios-browser" : "browser";
}
