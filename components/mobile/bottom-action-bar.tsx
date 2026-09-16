export function BottomActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-surface/95 px-4 pt-3 backdrop-blur dark:border-zinc-800"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
    >
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}
