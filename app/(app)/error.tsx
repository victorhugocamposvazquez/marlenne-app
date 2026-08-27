'use client';

import Button from '@/components/ui/Button';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-h1 font-extrabold tracking-[-.025em]">Algo ha fallado</p>
      <p className="mt-2 max-w-[280px] text-body font-medium text-ink-2">
        Prueba otra vez. Si sigue, recarga la app.
      </p>
      <Button className="mt-5" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
