"use client";

import { useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import {
  canPromptInstall,
  dismissInstallPrompt,
  getInstallEnvironment,
  isInstallPromptDismissed,
  promptInstall,
  subscribeToInstallState,
} from "@/lib/pwa-install";

const neverChanges = () => () => {};

const cardClasses = "flex items-start rounded-2xl border border-accent/30 bg-accent/5";
const iconClasses =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent";

// Offers to install the app. Android and desktop Chrome/Edge get a one-tap
// button; iPhones can't be prompted from a page, so they get the two-step
// "Share, then Add to Home Screen" hint instead. Renders nothing inside the
// installed app, the Android APK, or after being waved away.
//
// Every snapshot below is "hidden" on the server and during hydration —
// the real answer depends on browser APIs — so there's nothing to mismatch.
export function InstallAppPrompt({
  iosHint = true,
  className = "mb-4",
}: {
  // Admin and rider home screens already show their own iPhone hint next to
  // the notifications card, so they turn this one off.
  iosHint?: boolean;
  className?: string;
}) {
  const canInstall = useSyncExternalStore(subscribeToInstallState, canPromptInstall, () => false);
  const dismissed = useSyncExternalStore(
    subscribeToInstallState,
    isInstallPromptDismissed,
    () => true,
  );
  const environment = useSyncExternalStore(neverChanges, getInstallEnvironment, () => "installed");

  if (dismissed || environment === "installed") return null;

  const dismissButton = (
    <button
      type="button"
      onClick={dismissInstallPrompt}
      aria-label="Hide for now"
      className="mr-2 mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <X size={16} />
    </button>
  );

  if (canInstall) {
    return (
      <div className={`${cardClasses} ${className}`}>
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="flex min-w-0 flex-1 items-center gap-2.5 p-3.5 text-left transition active:scale-[0.98]"
        >
          <span className={iconClasses}>
            <Download size={17} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Install the app
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Opens in its own window, like any other app
            </span>
          </span>
        </button>
        {dismissButton}
      </div>
    );
  }

  if (iosHint && environment === "ios-browser") {
    return (
      <div className={`${cardClasses} ${className}`}>
        <div className="flex min-w-0 flex-1 items-start gap-2.5 p-3.5">
          <span className={iconClasses}>
            <Share size={17} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Install on your iPhone
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Tap Share, then Add to Home Screen, and open the app from there.
            </span>
          </span>
        </div>
        {dismissButton}
      </div>
    );
  }

  return null;
}
