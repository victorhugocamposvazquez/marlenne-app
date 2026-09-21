import Link from 'next/link';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import AjustesSection from '@/components/ajustes/AjustesSection';

export default function SmsSetupNeeded({ kind }: { kind: 'migration' | 'platform' }) {
  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-fab pt-5">
      <AjustesHeader title="SMS">
        <span className="text-body-lg text-ink-2">Recordatorios</span>
      </AjustesHeader>
      <AjustesSection title="Falta configurar la base de datos">
        {kind === 'migration' ? (
          <>
            <p className="py-2 text-body leading-snug text-ink-2">
              Las tablas SMS aún no existen en Supabase. Aplica la migración{' '}
              <code className="text-label">20260921160000_platform_sms.sql</code>{' '}
              en el SQL editor del proyecto.
            </p>
            <p className="pb-2 text-body leading-snug text-ink-2">
              Está en{' '}
              <code className="text-label">supabase/migrations/20260921160000_platform_sms.sql</code>
              {' '}del repo. Después recarga esta página.
            </p>
          </>
        ) : (
          <p className="py-2 text-body leading-snug text-ink-2">
            No tienes acceso a la consola de plataforma. Pide que te añadan en la tabla{' '}
            <code className="text-label">platform_admins</code>.
          </p>
        )}
      </AjustesSection>
      {kind === 'platform' && (
        <p className="mt-4 text-body text-ink-2">
          <Link href="/platform/login" className="font-semibold text-v-d underline">
            Ir a /platform/login
          </Link>
        </p>
      )}
    </div>
  );
}
