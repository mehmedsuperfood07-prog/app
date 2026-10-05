"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/pwa-install";

// Mounted once in the root layout so the browser's install offer is caught
// whichever page the visit starts on, and kept across client-side navigation
// (e.g. login -> home) for InstallAppPrompt to use.
export function InstallPromptCapture() {
  useEffect(() => captureInstallPrompt(), []);
  return null;
}
