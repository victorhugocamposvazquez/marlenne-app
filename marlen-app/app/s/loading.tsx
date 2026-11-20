import Skeleton from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-8" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-3 h-4 w-64" />
      <Skeleton className="mt-6 h-40 rounded-card" />
      <Skeleton className="mt-3 h-16 rounded-row" />
    </div>
  );
}