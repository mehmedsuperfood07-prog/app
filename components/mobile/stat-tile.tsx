import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const TONES = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
} as const;

export function StatTile({
  href,
  icon: Icon,
  tone,
  label,
  value,
}: {
  href?: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  label: string;
  value: string;
}) {
  const content = (
    <div className="rounded-2xl border border-zinc-200/80 bg-surface p-4 shadow-sm transition active:scale-[0.98] dark:border-zinc-800">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
