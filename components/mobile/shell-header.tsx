"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, Menu } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import type { Profile } from "@/lib/auth";

export function ShellHeader({
  title,
  profile,
  onMenu,
}: {
  title: string;
  profile: Profile;
  onMenu?: () => void;
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
      className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-surface/95 px-4 py-3 backdrop-blur dark:border-zinc-800"
      style={{ paddingTop: "calc(var(--safe-top) + 0.75rem)" }}
    >
      <div className="flex items-center gap-2">
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
        <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </span>
      </div>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
        >
          {initial}
        </button>
        {open && (
          <div className="absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-surface shadow-lg dark:border-zinc-800">
            <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {profile.full_name}
              </p>
              <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                {profile.role}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-zinc-700 active:bg-zinc-50 dark:text-zinc-300 dark:active:bg-zinc-800"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
