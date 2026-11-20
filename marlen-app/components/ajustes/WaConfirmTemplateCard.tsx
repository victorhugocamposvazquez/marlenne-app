'use client';

import { useState, useTransition } from 'react';
import { saveWaConfirmTemplate } from '@/app/actions/wa-template';
import AjustesSection from '@/components/ajustes/AjustesSection';
import { inputCls } from '@/components/Sheet';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import { DEFAULT_WA_CONFIRM_TEMPLATE, waConfirmMsg } from '@/lib/phone';

const TOKENS = ['{{cliente}}', '{{cuando}}', '{{servicio}}', '{{enlace}}'] as const;

export default function WaConfirmTemplateCard({ initial }: { initial: string | null }) {
  const toast = useToast();
  const [body, setBody] = useState(initial?.trim() || DEFAULT_WA_CONFIRM_TEMPLATE);
  const [pending, startTransition] = useTransition();

  const preview = waConfirmMsg({
    clientLabel: 'Ana López',
    service: 'Láser',
    startsAt: new Date().toISOString(),
    confirmUrl: 'https://app.marlenapp.com/c/ejemplo',
  }, body);

  const save = () => {
    startTransition(async () => {
      const r = await saveWaConfirmTemplate(body);
      if (!r.ok) toast(r.error ?? 'No se ha podido guardar', 'err');
      else toast('Texto de WhatsApp guardado');
    });
  };

  return (
    <AjustesSection title="WhatsApp de confirmación">
      <p className="border-b border-surface-line py-3 text-body leading-snug text-ink-2">
        El mensaje que se abre al enviar la confirmación. Vaciar y guardar vuelve al texto de siempre.
      </p>
      <div className="flex flex-wrap gap-2 border-b border-surface-line py-3">
        {TOKENS.map(token => (
          <button
            key={token}
            type="button"
            disabled={pending}
            onClick={() => setBody(current => `${current}${current.endsWith(' ') || current.length === 0 ? '' : ' '}${token}`)}
            className="rounded-pill bg-surface-soft px-3 py-1.5 text-label font-bold text-ink"
          >
            {token}
          </button>
        ))}
      </div>
      <textarea
        className={`${inputCls} min-h-[120px] resize-none border-0 bg-transparent py-3`}
        value={body}
        disabled={pending}
        aria-label="Texto de confirmación por WhatsApp"
        onChange={e => setBody(e.target.value)}
      />
      <p className="border-t border-surface-line py-3 text-body leading-snug text-ink-2 whitespace-pre-wrap">
        {preview}
      </p>
      <div className="border-t border-surface-line py-4">
        <Button full disabled={pending} onClick={save}>
          {pending ? 'Guardando…' : 'Guardar texto'}
        </Button>
      </div>
    </AjustesSection>
  );
}
