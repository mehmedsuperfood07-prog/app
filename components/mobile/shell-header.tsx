"use client";

import { useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import type { Profile } from "@/lib/auth";

export function ShellHeader({
  title,
  profile,
  onMenu,
  contentClassName = "max-w-lg",
  hideTitleOnDesktop = false,
}: {
  title: string;
  profile: Profile;
  onMenu?: () => void;
  contentClassName?: string;
  hideTitleOnDesktop?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  const initial = profile.full_name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header
      className="sticky top-0 z-40 border-b border-zinc-200 bg-surface/90 backdrop-blur-md dark:border-zinc-800"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className={`mx-auto flex items-center justify-between px-4 py-3 ${contentClassName}`}>
        <div className="flex items-center gap-2.5">
          {onMenu && (
            <button
              type="button"
              onClick={onMenu}
              aria-label="Open menu"
              className="-ml-1.5 rounded-full p-1.5 text-zinc-600 active:bg-zinc-100 dark:text-zinc-300 dark:active:bg-zinc-800"
            >
              <Menu size={22} />
            </button>
          )}
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-black text-accent-foreground ${
              hideTitleOnDesktop ? "lg:hidden" : ""
            }`}
          >
            M
          </span>
          <span
            className={`font-bold tracking-tight text-zinc-900 dark:text-zinc-50 ${
              hideTitleOnDesktop ? "lg:hidden" : ""
            }`}
          >
            {title}
          </span>
        </div>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground transition active:scale-95"
          >
            {initial}
          </button>
          {open && (
            <div className="animate-fade absolute right-0 top-11 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-surface shadow-xl dark:border-zinc-800">
              <div className="border-b border-zinc-100 px-3.5 py-3 dark:border-zinc-800">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {profile.full_name}
                </p>
                <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                  {profile.role}
                </p>
              </div>
              <SignOutButton className="px-3.5 py-3 text-zinc-700 active:bg-zinc-50 dark:text-zinc-300 dark:active:bg-zinc-800" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
