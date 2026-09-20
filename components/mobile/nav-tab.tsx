import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const tabClasses = "group flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2 text-[11px] font-medium";

function TabInner({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <>
      <span
        className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
          active ? "bg-accent/12" : "group-active:bg-zinc-100 dark:group-active:bg-zinc-800"
        }`}
      >
        <Icon
          size={21}
          strokeWidth={active ? 2.4 : 1.8}
          className={active ? "text-accent" : "text-zinc-400 dark:text-zinc-500"}
        />
      </span>
      <span className={active ? "text-accent" : "text-zinc-500 dark:text-zinc-400"}>{label}</span>
    </>
  );
}

export function NavTabLink(props: { href: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link href={props.href} className={tabClasses} aria-current={props.active ? "page" : undefined}>
      <TabInner icon={props.icon} label={props.label} active={props.active} />
    </Link>
  );
}

export function NavTabButton(props: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <button type="button" onClick={props.onClick} className={tabClasses}>
      <TabInner icon={props.icon} label={props.label} active={props.active} />
    </button>
  );
}

// Full-width and flush on phones; a floating, centered dock from the sm
// breakpoint up so it doesn't stretch across a tablet or laptop window.
export function NavDock({ children }: { children: React.ReactNode }) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center sm:pb-4">
      <div
        className="pointer-events-auto flex w-full max-w-lg items-stretch justify-around border-t border-zinc-200 bg-surface/95 backdrop-blur-md sm:rounded-2xl sm:border sm:shadow-lg sm:shadow-black/10 dark:border-zinc-800"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {children}
      </div>
    </nav>
  );
}
