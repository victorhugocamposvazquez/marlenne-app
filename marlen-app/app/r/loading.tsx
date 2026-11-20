import Skeleton from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-8" aria-busy="true" aria-label="Cargando reserva">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-56" />
      <Skeleton className="mt-6 h-24 rounded-card" />
      <Skeleton className="mt-3 h-24 rounded-card" />
      <Skeleton className="mt-3 h-24 rounded-card" />
    </div>
  );
}
