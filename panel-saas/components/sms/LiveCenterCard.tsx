'use client';

import { useState, useTransition } from 'react';
import { toggleOpsAutoSend } from '@/app/actions/live-sms';
import type { LiveCenter } from '@/lib/live-center';

const when = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function statusLabel(status: string) {
  if (status === 'sent') return 'Enviado';
  if (status === 'failed') return 'Error';
  if (status === 'skipped') return 'Omitido';
  return status;
}

export default function LiveCenterCard({ center }: { center: LiveCenter | null }) {
  const [on, setOn] = useState(center?.opsOn ?? false);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');

  if (!center) {
    return (
      <div className="rounded-card border border-line bg-white p-5">
        <h2 className="text-[16px] font-bold">Arlett Beauty</h2>
        <p className="mt-2 text-[14px] text-ink-2">No se ha podido leer el centro en producción.</p>
      </div>
    );
  }

  const flip = () => {
    const next = !on;
    setOn(next);
    setNote('');
    startTransition(async () => {
      const r = await toggleOpsAutoSend(next);
      if (!r.ok) {
        setOn(!next);
        setNote(r.error ?? 'No se ha podido guardar');
      }
    });
  };

  return (
    <section className="space-y-3 rounded-card border border-[#BBF7D0] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-bold">{center.name}</h2>
            <span className="inline-flex items-center rounded-pill bg-[#E7F8EE] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#15803D]">
              Live
            </span>
          </div>
          <p className="mt-1 text-[13px] text-ink-2">
            Remitente {center.sender || 'sin nombre'} · el centro los tiene {center.centerOn ? 'encendidos' : 'apagados'}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={flip}
          className="flex items-center gap-3 rounded-pill border border-line bg-page px-4 py-2 text-left"
        >
          <span>
            <span className="block text-[13px] font-bold">Avisos automáticos</span>
            <span className="block text-[12px] text-ink-2">{on ? 'Encendidos' : 'Apagados'}</span>
          </span>
          <span className={`relative h-[30px] w-[50px] shrink-0 rounded-pill ${on ? 'bg-[#15803D]' : 'bg-[#D9D8E0]'}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow ${on ? 'left-[23px]' : 'left-[3px]'}`} />
          </span>
        </button>
      </div>
      {note && <p className="text-[13px] font-semibold text-[#B3123B]">{note}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] bg-page p-4">
          <p className="text-[12px] font-semibold text-ink-2">Saldo</p>
          <p className="mt-1 text-[16px] font-bold">Sin cupo</p>
          <p className="mt-1 text-[12px] text-ink-2">Todavía no hay bonos cargados en Marlén</p>
        </div>
        <div className="rounded-[14px] bg-page p-4">
          <p className="text-[12px] font-semibold text-ink-2">Enviados</p>
          <p className="mt-1 text-[22px] font-bold">{center.sent}</p>
        </div>
        <div className="rounded-[14px] bg-page p-4">
          <p className="text-[12px] font-semibold text-ink-2">Errores</p>
          <p className="mt-1 text-[22px] font-bold">{center.failed}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-bold">Historial</h3>
        {center.sends.length === 0 ? (
          <p className="text-[13px] text-ink-2">Aún no hay envíos.</p>
        ) : (
          <ul className="divide-y divide-line">
            {center.sends.map(s => (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold">
                    {statusLabel(s.status)} · {s.phone}
                  </p>
                  <p className="text-[12px] text-ink-2">{when.format(new Date(s.when))}</p>
                </div>
                <p className="mt-1 text-[13px] text-ink-2">{s.body}</p>
                {s.error && <p className="mt-1 text-[13px] font-semibold text-[#B3123B]">{s.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
