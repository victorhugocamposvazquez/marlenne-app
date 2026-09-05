'use client';

import { useEffect, useState, useTransition } from 'react';
import { Fingerprint, ScanFace, Trash2 } from 'lucide-react';
import {
  beginPasskeyRegister,
  finishPasskeyRegister,
  listMyPasskeys,
  removePasskey,
  type PasskeyRow,
} from '@/app/actions/webauthn';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/Toast';
import {
  forgetPasskeyHint,
  isPasskeyAbort,
  platformUnlockAvailable,
  rememberPasskeyHint,
  startRegistration,
} from '@/hooks/platform-auth';
import { platformDeviceName, platformRegisterLabel } from '@/lib/webauthn';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PasskeySettingsCard({
  ua,
  initial,
}: {
  ua: string;
  initial: PasskeyRow[];
}) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [available, setAvailable] = useState(/Android|iPhone|iPad|iPod/i.test(ua));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = platformRegisterLabel(ua);
  const FaceIcon = /iPhone|iPad|iPod/i.test(ua) ? ScanFace : Fingerprint;

  useEffect(() => {
    let alive = true;
    platformUnlockAvailable().then(ok => { if (alive) setAvailable(ok); });
    return () => { alive = false; };
  }, []);

  const refresh = async () => {
    const next = await listMyPasskeys();
    setRows(next);
    if (next.length === 0) forgetPasskeyHint();
    else rememberPasskeyHint();
  };

  const register = () => {
    setError(null);
    startTransition(async () => {
      const started = await beginPasskeyRegister();
      if (!started.ok) {
        setError(started.error);
        return;
      }
      try {
        const attestation = await startRegistration({ optionsJSON: started.options });
        const done = await finishPasskeyRegister(attestation, platformDeviceName(ua));
        if (!done.ok) {
          setError(done.error);
          return;
        }
        rememberPasskeyHint();
        await refresh();
        toast('Listo. La próxima vez entra con un toque.');
      } catch (err) {
        if (!isPasskeyAbort(err)) setError('No se ha podido guardar. Prueba otra vez.');
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const done = await removePasskey(id);
      if (!done.ok) {
        setError(done.error);
        return;
      }
      await refresh();
      toast('Huella borrada');
    });
  };

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-body font-extrabold uppercase tracking-[.04em] text-ink-2">
        Huella o cara
      </h2>
      <div className="rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
        <p className="text-label font-medium leading-snug text-ink-2">
          En Android es la huella o el desbloqueo con cara. En el iPhone, Face ID.
          Queda en este móvil; la contraseña sigue valiendo.
        </p>
        {rows.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map(row => (
              <li key={row.id} className="flex items-center gap-2 rounded-chip bg-surface-bg px-3 py-2">
                <FaceIcon size={16} strokeWidth={2.2} className="shrink-0 text-v-d" />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-bold">{row.friendly_name}</span>
                  <span className="block text-caption font-medium text-ink-3">
                    Desde {formatDay(row.created_at)}
                    {row.last_used_at ? ` · último uso ${formatDay(row.last_used_at)}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Borrar ${row.friendly_name}`}
                  disabled={pending}
                  onClick={() => remove(row.id)}
                  className="grid h-11 w-11 place-items-center rounded-icon text-danger-fg motion-safe:active:scale-[.96]"
                >
                  <Trash2 size={16} strokeWidth={2.2} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-2 text-label font-semibold text-danger-fg">{error}</p>}
        {available ? (
          <Button full className="mt-3" onClick={register} disabled={pending}>
            <FaceIcon size={18} strokeWidth={2.2} />
            {pending ? 'Esperando el móvil…' : label}
          </Button>
        ) : (
          <p className="mt-3 text-label font-medium text-ink-3">
            Este aparato no tiene huella ni cara. Prueba en el móvil o en la tablet de recepción.
          </p>
        )}
      </div>
    </section>
  );
}
