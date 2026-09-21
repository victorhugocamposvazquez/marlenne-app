import Link from 'next/link';

export default function PlatformSchemaBanner() {
  return (
    <div className="mb-6 rounded-card border border-danger-fg/20 bg-danger-bg px-4 py-3 text-body leading-snug text-danger-fg">
      <p className="font-semibold">Migración SMS pendiente</p>
      <p className="mt-1 text-ink-2">
        Aplica{' '}
        <code className="text-label">20260921160000_platform_sms.sql</code>{' '}
        en Supabase. Luego añade tu usuario a{' '}
        <code className="text-label">platform_admins</code>.
      </p>
      <p className="mt-2">
        <Link href="/ajustes/sms" className="font-semibold text-v-d underline">
          Ver instrucciones en Ajustes → SMS
        </Link>
      </p>
    </div>
  );
}
