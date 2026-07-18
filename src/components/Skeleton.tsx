/**
 * Skeleton simple avec effet shimmer néon, cohérent avec l'identité MedLingo.
 * Usage : <Skeleton className="h-6 w-32 rounded-lg" />
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white/5 ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}
