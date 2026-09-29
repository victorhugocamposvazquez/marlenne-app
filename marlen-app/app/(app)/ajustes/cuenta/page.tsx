import { headers } from 'next/headers';
import { LogOut } from 'lucide-react';
import { getStaffVoicePrefs } from '@/lib/queries';
import { requireSession } from '@/lib/require-session';
import { signOut } from '@/app/actions/auth';
import { listMyPasskeys } from '@/app/actions/webauthn';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import { ajustesCardCls, ajustesSectionTitleCls } from '@/components/ajustes/AjustesSection';
import Button from '@/components/ui/Button';
import PasswordForm from '@/components/PasswordForm';
import PasskeySettingsCard from '@/components/PasskeySettingsCard';
import IosShortcutsCard from '@/components/IosShortcutsCard';
import VoiceSettingsCard from '@/components/VoiceSettingsCard';
import StaffReminderSettings from '@/components/StaffReminderSettings';

const ROADMAP = [
  { done: true, label: 'Agenda día y semana, arrastrar citas' },
  { done: true, label: 'Nueva cita, detalle, reprogramar, cancelar' },
  { done: true, label: 'Ficha de clienta y lista de espera' },
  { done: true, label: 'Realtime en la agenda del día' },
  { done: true, label: 'Cierre de sesión clínico al marcar Hecha' },
  { done: true, label: 'Subida de fotos a Storage' },
  { done: true, label: 'Login, registro, recuperar contraseña, huella o Face ID' },
  { done: true, label: 'Consentimientos RGPD y bloqueos de agenda' },
  { done: true, label: 'Editar precios y duración del catálogo' },
  { done: true, label: 'Recuperar contraseña por email' },
  { done: true, label: 'Alta y baja de equipo; filtro por profesional' },
  { done: true, label: 'No-show desde Hoy' },
  { done: true, label: 'Hablar o escribir comandos de agenda' },
  { done: true, label: 'Próximo hueco, confirmación y por volver' },
  { done: true, label: 'Bonos, pack amigo e importar CSV' },
  { done: true, label: 'Aviso al equipo 30 minutos antes de cada cita' },
  { done: false, label: 'App offline usable (agenda del día en local)' },
];

export default async function CuentaPage() {
  const me = await requireSession();
  const passkeys = await listMyPasskeys();
  const ua = headers().get('user-agent') ?? '';
  const initialVoice = await getStaffVoicePrefs(me.id);

  return (
    <AjustesHeader title="Tu cuenta">
      <PasskeySettingsCard ua={ua} initial={passkeys} />
      <StaffReminderSettings />
      <VoiceSettingsCard initialVoice={initialVoice} />
      <IosShortcutsCard />
      <PasswordForm />
      <section className="mt-8">
        <h2 className={ajustesSectionTitleCls}>En el radar</h2>
        <ul className={ajustesCardCls}>
          {ROADMAP.map(item => (
            <li key={item.label} className="flex items-start gap-3 border-b border-surface-line py-4 last:border-0">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.done ? 'bg-ok' : 'bg-handle'}`} />
              <span className={`text-body-lg font-semibold ${item.done ? 'text-ink-2' : 'text-ink'}`}>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>
      <form action={signOut} className="mt-8">
        <Button type="submit" variant="secondary" full className="text-danger-fg">
          <LogOut size={17} strokeWidth={2.2} />
          Cerrar sesión
        </Button>
      </form>
    </AjustesHeader>
  );
}