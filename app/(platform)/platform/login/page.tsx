export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import PlatformLoginForm from '@/components/platform/PlatformLoginForm';
import PageHeading from '@/components/ui/PageHeading';
import { isPlatformAdmin } from '@/lib/require-platform-admin';
import { createClient } from '@/lib/supabase/server';

export default async function PlatformLoginPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user && (await isPlatformAdmin(user.id))) redirect('/platform/centros');

  return (
    <div>
      <PageHeading
        title="Consola Marlén"
        subtitle="Operadores de plataforma"
      />
      <p className="mt-2 max-w-lg text-body leading-snug text-ink-2">
        Acceso interno para supervisar centros, SMS y salud del sistema.
      </p>
      <PlatformLoginForm />
    </div>
  );
}
