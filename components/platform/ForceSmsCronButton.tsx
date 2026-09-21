'use client';

import { useTransition } from 'react';
import { forceSmsCronForSalon } from '@/app/actions/platform';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';

export default function ForceSmsCronButton({ salonId }: { salonId: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await forceSmsCronForSalon(salonId);
          if (!r.ok) toast(r.error ?? 'No se ha podido lanzar el cron', 'err');
          else toast('Cron SMS lanzado');
        });
      }}
    >
      {pending ? 'Lanzando…' : 'Forzar cron SMS'}
    </Button>
  );
}
