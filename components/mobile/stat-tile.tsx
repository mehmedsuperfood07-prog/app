import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Neutral gray or a shade of the brand's one green — see app/globals.css
// and components/mobile/status-pill.tsx for the same "soft/medium/
// strong" system used everywhere else color needs to carry meaning.
const TONES = {
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  soft: "bg-accent-soft text-accent-soft-foreground",
  medium: "bg-accent/10 text-accent dark:bg-accent/15",
  strong: "bg-accent text-accent-foreground",
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
