'use client';

import { LogOut } from 'lucide-react';
import { signOut } from '@/app/actions/auth';
import { avatarColor } from '@/lib/categories';
import { shallowSet, useShallowParam } from '@/hooks/useShallowQuery';
import Button from '@/components/ui/Button';
import Segmented from '@/components/ui/Segmented';
import PasswordForm from '@/components/PasswordForm';
import CatalogEditor from '@/components/CatalogEditor';
import PackTemplatesEditor from '@/components/PackTemplatesEditor';
import CsvImportCard from '@/components/CsvImportCard';
import SoldPacksCard from '@/components/SoldPacksCard';
import TeamEditor from '@/components/TeamEditor';
import IosShortcutsCard from '@/components/IosShortcutsCard';
import VoiceSettingsCard from '@/components/VoiceSettingsCard';
import type { ClientPack, PackTemplate, Provider, ServiceOption, StaffRole } from '@/lib/types';
import type { ReadyItem } from '@/lib/ready';

type Zona = 'centro' | 'cuenta';

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

export default function AjustesView({
  me, team, services, templates, packs, ready, initialZona,
}: {
  me: { id: string; full_name: string; job_title: string | null; role: StaffRole };
  team: Provider[];
  services: ServiceOption[];
  templates: PackTemplate[];
  packs: ClientPack[];
  ready: ReadyItem[];
  initialZona?: Zona;
}) {
  const fallback: Zona = me.role === 'admin' ? 'centro' : 'cuenta';
  const zona = (useShallowParam('zona', initialZona ?? fallback) as Zona | null) ?? fallback;
  const admin = me.role === 'admin';
  const desk = admin || me.role === 'reception';

  return (
    <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-fab pt-5">
      <h1 className="text-h1 font-extrabold tracking-[-.025em]">Más</h1>
      <p className="mt-px text-body font-medium text-ink-2">{me.full_name} · {me.job_title ?? me.role}</p>

      <div className="mt-4">
        <Segmented
          ariaLabel="Secciones de Más"
          value={zona}
          options={[
            { id: 'centro', label: 'Centro' },
            { id: 'cuenta', label: 'Cuenta' },
          ]}
          onChange={id => shallowSet({ zona: id === fallback ? null : id })}
        />
      </div>

      {zona === 'centro' ? (
        <>
          <section className="mt-5">
            {admin ? (
              <TeamEditor team={team} meId={me.id} />
            ) : (
              <>
                <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">Equipo</h2>
                <div className="flex flex-col gap-2">
                  {team.map(p => (
                    <div key={p.id} className="flex items-center gap-3 rounded-row border border-surface-line bg-surface-card p-3 shadow-card">
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-label font-bold text-white"
                        style={{ background: p.color ?? avatarColor(p.full_name) }}
                      >
                        {p.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-bold">{p.full_name}</span>
                        <span className="block truncate text-caption font-medium text-ink-2">{p.job_title}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {admin && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
                Servicios · {services.length}
              </h2>
              <p className="mb-2.5 text-label font-medium text-ink-2">
                Precio, duración u ocultar. Es el catálogo de la agenda, no la ficha clínica.
              </p>
              <CatalogEditor services={services} />
            </section>
          )}

          {admin && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
                Plantillas de bono · {templates.length}
              </h2>
              <p className="mb-2.5 text-label font-medium text-ink-2">
                Lo que se vende: 6 láser, 4 cavitación. El pack amigo se marca al venderlo en la ficha.
              </p>
              <PackTemplatesEditor templates={templates} services={services} />
            </section>
          )}

          {desk && <SoldPacksCard packs={packs} canEdit={desk} />}

          {admin && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
                Importar CSV
              </h2>
              <CsvImportCard />
            </section>
          )}

          {admin && ready.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
                Antes de clientas reales
              </h2>
              <ul className="rounded-row border border-surface-line bg-surface-card px-3.5 py-2 shadow-card">
                {ready.map(item => (
                  <li key={item.label} className="flex items-start gap-2.5 border-b border-surface-line py-2.5 last:border-0">
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.ok ? 'bg-ok' : 'bg-danger'}`} />
                    <span>
                      <span className="block text-body font-semibold">{item.label}</span>
                      <span className="block text-caption font-medium leading-snug text-ink-2">{item.hint}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
