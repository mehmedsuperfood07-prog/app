import Link from "next/link";

const cardClasses =
  "rounded-2xl border border-zinc-200/80 bg-surface p-4 shadow-sm dark:border-zinc-800";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`${cardClasses} ${className}`}>{children}</div>;
}

export function CardLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`block ${cardClasses} transition active:scale-[0.98] active:bg-zinc-50 dark:active:bg-zinc-900 ${className}`}
    >
      {children}
    </Link>
  );
}
