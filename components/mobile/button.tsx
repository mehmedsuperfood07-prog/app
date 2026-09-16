import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground active:bg-accent/90",
  secondary:
    "bg-zinc-100 text-zinc-900 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:active:bg-zinc-700",
  ghost:
    "bg-transparent text-zinc-700 border border-zinc-300 active:bg-zinc-100 dark:text-zinc-300 dark:border-zinc-700 dark:active:bg-zinc-900",
  danger: "bg-red-600 text-white active:bg-red-700",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
