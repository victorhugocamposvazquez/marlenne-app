'use client';

import { useState, useTransition } from 'react';
import { toggleOpsVendorInvoices } from '@/app/actions/live-sms';

export default function VendorInvoicesOpsToggle({
  initialOn,
}: {
  initialOn: boolean;
}) {
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');

  const flip = () => {
    const next = !on;
    setOn(next);
    setNote('');
    startTransition(async () => {
      const r = await toggleOpsVendorInvoices(next);
      if (!r.ok) {
        setOn(!next);
        setNote(r.error ?? 'No se ha podido guardar');
      }
    });
  };

  return (
    <div className="rounded-card border border-[#BBF7D0] bg-white px-5 py-4">
      <button
        type="button"
        disabled={pending}
        onClick={flip}
        className="flex w-full items-center gap-3.5 text-left disabled:opacity-60"
      >
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Facturas Amazon / Meta</p>
          <p className="text-[13px] text-ink-2">
            En su app: Finanzas → Herramientas (sincronizar pedidos y anuncios) y WhatsApp de gestoría en Ajustes → Centro.
          </p>
        </div>
        <span className={`relative h-[30px] w-[50px] shrink-0 rounded-pill ${on ? 'bg-ink' : 'bg-[#D9D8E0]'}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow ${on ? 'left-[23px]' : 'left-[3px]'}`} />
        </span>
      </button>
      {note && <p className="mt-2 text-[13px] font-semibold text-[#B3123B]">{note}</p>}
      <p className="mt-2 text-[12px] text-ink-2">
        {on ? 'Activo en este centro' : 'Apagado · el centro no ve la opción'}
      </p>
    </div>
  );
}
