export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800 ${className}`}
    />
  );
}

// Shown instantly by each route's loading.tsx while the real page's data
// is fetched, so tapping a tab always responds immediately instead of
// the screen appearing frozen for a second.
export function PageSkeleton({ tiles = false, rows = 3 }: { tiles?: boolean; rows?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      {tiles && (
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
