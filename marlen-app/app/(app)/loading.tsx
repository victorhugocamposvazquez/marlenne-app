import Skeleton from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col px-5 pt-5" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-5 h-[120px] rounded-card" />
      <div className="mt-3 flex gap-2.5">
        <Skeleton className="h-24 flex-1 rounded-row" />
        <Skeleton className="h-24 flex-1 rounded-row" />
      </div>
      <Skeleton className="mt-5 h-16 rounded-row" />
      <Skeleton className="mt-2.5 h-16 rounded-row" />
      <Skeleton className="mt-2.5 h-16 rounded-row" />
    </div>
  );
}
