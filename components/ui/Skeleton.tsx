export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-chip bg-surface-line ${className}`} />;
}

/** Bloque estándar de skeleton para sheets que cargan datos. */
export function SheetSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  );
}
