import Skeleton from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex min-h-[360px] flex-col bg-white px-4 pt-6" aria-busy="true" aria-label="Cargando reserva">
      <Skeleton className="h-7 w-36" />
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-5 h-20 rounded-card" />
      <Skeleton className="mt-3 h-20 rounded-card" />
    </div>
  );
}
