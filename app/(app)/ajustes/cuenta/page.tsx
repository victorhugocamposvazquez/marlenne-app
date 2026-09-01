import { LogOut } from 'lucide-react';
import { requireSession } from '@/lib/require-session';
import { signOut } from '@/app/actions/auth';
import AjustesHeader from '@/components/ajustes/AjustesHeader';
import Button from '@/components/ui/Button';
import PasswordForm from '@/components/PasswordForm';
import IosShortcutsCard from '@/components/IosShortcutsCard';
import VoiceSettingsCard from '@/components/VoiceSettingsCard';

const ROADMAP = [
  { done: true, label: 'Agenda día y semana, arrastrar citas' },
  { done: true, label: 'Nueva cita, detalle, reprogramar, cancelar' },
  { done: true, label: 'Ficha de clienta y lista de espera' },
  { done: true, label: 'Realtime en la agenda del día' },
  { done: true, label: 'Cierre de sesión clínico al marcar Hecha' },
  { done: true, label: 'Subida de fotos a Storage' },
  { done: true, label: 'Login por email y contraseña' },
  { done: true, label: 'Consentimientos RGPD y bloqueos de agenda' },
  { done: true, label: 'Editar precios y duración del catálogo' },
  { done: true, label: 'Recuperar contraseña por email' },
  { done: true, label: 'Alta y baja de equipo; filtro por profesional' },
  { done: true, label: 'No-show desde Hoy' },
  { done: true, label: 'Hablar o escribir comandos de agenda' },
  { done: true, label: 'Próximo hueco, confirmación y por volver' },
  { done: true, label: 'Bonos, pack amigo e importar CSV' },
  { done: false, label: 'App offline usable (agenda del día en local)' },
];

export default async function CuentaPage() {
  await requireSession();

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <AjustesHeader title="Tu cuenta" subtitle="Esto es de cada persona, no del centro." />
      <VoiceSettingsCard />
      <IosShortcutsCard />
      <PasswordForm />
      <section className="mt-6">
        <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">En el radar</h2>
        <ul className="rounded-row border border-surface-line bg-surface-card px-3.5 py-2 shadow-card">
          {ROADMAP.map(item => (
            <li key={item.label} className="flex items-start gap-2.5 border-b border-surface-line py-2.5 last:border-0">
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.done ? 'bg-ok' : 'bg-handle'}`} />
              <span className={`text-body font-semibold ${item.done ? 'text-ink-2' : 'text-ink'}`}>{item.label}</span>
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
    </div>
  );
}