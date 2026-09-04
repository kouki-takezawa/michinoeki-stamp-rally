export function StationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 last:border-b-0"
        >
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface-2" />
            <div className="h-2.5 w-1/5 animate-pulse rounded bg-surface-2" />
          </div>
          <div className="h-3.5 w-10 animate-pulse rounded bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
