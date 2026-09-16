import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-0.5 text-sm font-medium text-accent"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
