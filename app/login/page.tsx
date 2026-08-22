export const dynamic = 'force-dynamic';

import { listLoginProviders } from '@/lib/queries';
import { signInAs } from '@/app/actions/auth';
import { madridNow } from '@/lib/time';
import { ChevronRight, Sparkles } from 'lucide-react';

export default async function LoginPage() {
  const providers = await listLoginProviders();
  const h = madridNow().h;
  const hello = h < 13 ? 'Buenos días.' : h < 20 ? 'Buenas tardes.' : 'Buenas noches.';
  const profiles = [
    { id: 'admin', name: 'Dirección', desc: 'Acceso completo al centro', initials: 'DI', color: '' },
    { id: 'reception', name: 'Recepción', desc: 'Agenda y clientas', initials: 'RE', color: '' },
    ...providers.map(s => ({
      id: s.id, name: s.full_name, desc: s.job_title ?? 'Solo su agenda',
      initials: s.initials ?? '', color: s.color ?? '#8B5CF6',
    })),
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col bg-surface-bg">
      <div className="relative overflow-hidden px-6 pb-[30px] pt-11">
        <div className="absolute -right-[70px] -top-[90px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#DDD3FF,#EEECFA_70%)]" />
        <div className="relative">
          <div className="mb-5 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-grad shadow-[0_10px_24px_rgba(139,92,246,.4)]">
            <Sparkles size={26} className="text-white" strokeWidth={2} />
          </div>
          <div className="text-[13px] font-semibold tracking-[.02em] text-v">Marlenne · Estética avanzada</div>
          <h1 className="mt-1 text-[30px] font-extrabold leading-[1.15] tracking-[-.02em]">
            {hello}<br />¿Quién entra hoy?
          </h1>
          <p className="mt-2.5 max-w-[300px] text-sm font-medium leading-relaxed text-ink-2">
            Elige tu perfil. Cada uno ve exactamente lo que necesita.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-5 pb-7">
        {profiles.map(p => (
          <form key={p.id} action={signInAs}>
            <input type="hidden" name="profile" value={p.id} />
            <button
              type="submit"
              className="flex min-h-[62px] w-full items-center gap-[13px] rounded-[20px] border border-surface-line bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] text-[13px] font-bold text-white"
                style={{ background: p.color || 'linear-gradient(140deg,#8B5CF6,#A855F7)' }}
              >
                {p.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold tracking-[-.01em]">{p.name}</span>
                <span className="block text-[12.5px] font-medium text-ink-3">{p.desc}</span>
              </span>
              <ChevronRight size={18} className="text-ink-3" strokeWidth={2.2} />
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
