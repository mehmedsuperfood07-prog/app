"use client";

import { LoaderCircle } from "lucide-react";
import { useFormPending } from "@/components/action-form";

const VARIANTS = {
  primary:
    "w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-foreground active:bg-accent/90",
  bar: "w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-accent-foreground active:bg-accent/90",
  outline:
    "w-full rounded-full border border-zinc-300 py-2.5 text-sm font-medium text-zinc-600 active:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:active:bg-zinc-900",
  compact:
    "shrink-0 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-semibold text-accent-foreground active:bg-accent/90",
  compactOutline:
    "shrink-0 rounded-xl border border-zinc-300 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 active:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:active:bg-zinc-900",
  link: "text-xs font-semibold text-zinc-500 underline dark:text-zinc-400",
} as const;

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const pending = useFormPending();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex items-center justify-center gap-2 transition disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {pending && <LoaderCircle size={15} className="animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
