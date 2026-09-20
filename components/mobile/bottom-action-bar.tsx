// The primary action for a task screen, pinned to the bottom. Flush on
// phones; from the sm breakpoint up it sits as a centered card so it
// doesn't stretch across a wide window.
export function BottomActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center sm:pb-4">
      <div
        className="pointer-events-auto w-full max-w-lg border-t border-zinc-200 bg-surface/95 px-4 pt-3 backdrop-blur-md sm:rounded-2xl sm:border sm:shadow-lg sm:shadow-black/10 dark:border-zinc-800"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
      >
        {children}
      </div>
    </div>
  );
}
