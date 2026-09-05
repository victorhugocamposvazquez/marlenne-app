'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Fingerprint, ScanFace } from 'lucide-react';
import { beginPasskeyLogin, finishPasskeyLogin } from '@/app/actions/webauthn';
import Button from '@/components/ui/Button';
import {
  browserSupportsWebAuthnAutofill,
  isPasskeyAbort,
  platformUnlockAvailable,
  rememberPasskeyHint,
  startAuthentication,
} from '@/hooks/platform-auth';
import { platformUnlockLabel } from '@/lib/webauthn';

function loginErrorMessage(err: unknown): string | null {
  if (isPasskeyAbort(err)) return null;
  const msg = err instanceof Error ? err.message : '';
  if (/no available|not found|unknown credential|no passkey/i.test(msg)) {
    return 'En este móvil aún no hay huella guardada. Entra con email y actívala en Ajustes → Tu cuenta.';
  }
  return 'No se ha podido entrar con huella. Prueba email y contraseña.';
}

export default function PasskeyLoginButton({
  ua,
  onError,
}: {
  ua: string;
  onError: (message: string | null) => void;
}) {
  const [available, setAvailable] = useState(/Android|iPhone|iPad|iPod/i.test(ua));
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const conditionalStarted = useRef(false);
  const label = platformUnlockLabel(ua);
  const FaceIcon = /iPhone|iPad|iPod/i.test(ua) ? ScanFace : Fingerprint;

  useEffect(() => {
    let alive = true;
    platformUnlockAvailable().then(ok => { if (alive) setAvailable(ok); });
    return () => { alive = false; };
  }, []);

  const run = (autofill: boolean) => {
    onError(null);
    startTransition(async () => {
      const started = await beginPasskeyLogin();
      if (!started.ok) {
        if (!autofill) onError(started.error);
        return;
      }
      try {
        setBusy(true);
        const assertion = await startAuthentication({
          optionsJSON: started.options,
          useBrowserAutofill: autofill,
        });
        const done = await finishPasskeyLogin(assertion);
        if (done && !done.ok) onError(done.error);
        else rememberPasskeyHint();
      } catch (err) {
        const message = loginErrorMessage(err);
        if (message && !autofill) onError(message);
      } finally {
        setBusy(false);
      }
    });
  };

  useEffect(() => {
    if (!available || conditionalStarted.current) return;
    if (!browserSupportsWebAuthnAutofill()) return;
    conditionalStarted.current = true;
    run(true);
    // Solo al montar, cuando el aparato ya puede huella/cara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  if (!available) return null;

  return (
    <>
      <Button
        size="lg"
        full
        disabled={pending || busy}
        onClick={() => run(false)}
      >
        <FaceIcon size={20} strokeWidth={2.2} />
        {pending || busy ? 'Esperando el móvil…' : label}
      </Button>
      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-surface-line" />
        <span className="text-caption font-bold uppercase tracking-[.03em] text-ink-3">o con contraseña</span>
        <span className="h-px flex-1 bg-surface-line" />
      </div>
    </>
  );
}
