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
import {
  isAppleMobile,
  likelyHasPlatformUnlock,
  platformLoginFailed,
  platformMissingCredential,
  platformUnlockLabel,
  platformWaitingLabel,
} from '@/lib/webauthn';

function loginErrorMessage(err: unknown, ua: string): string | null {
  if (isPasskeyAbort(err)) return null;
  const msg = err instanceof Error ? err.message : '';
  if (/no available|not found|unknown credential|no passkey/i.test(msg)) {
    return platformMissingCredential(ua);
  }
  return platformLoginFailed(ua);
}

export default function PasskeyLoginButton({
  ua,
  onError,
}: {
  ua: string;
  onError: (message: string | null) => void;
}) {
  const [available, setAvailable] = useState(likelyHasPlatformUnlock(ua));
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const conditionalStarted = useRef(false);
  const label = platformUnlockLabel(ua);
  const FaceIcon = isAppleMobile(ua) ? ScanFace : Fingerprint;

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
        const message = loginErrorMessage(err, ua);
        if (message && !autofill) onError(message);
      } finally {
        setBusy(false);
      }
    });
  };

  useEffect(() => {
    if (!available || conditionalStarted.current) return;
    // En iOS el sheet de Face ID es lo fiable; el autofill condicional a menudo no abre la cara.
    if (isAppleMobile(ua) || !browserSupportsWebAuthnAutofill()) return;
    conditionalStarted.current = true;
    run(true);
    // Solo al montar, cuando Android ya puede huella/cara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, ua]);

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
        {pending || busy ? platformWaitingLabel(ua) : label}
      </Button>
      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-surface-line" />
        <span className="text-caption font-bold uppercase tracking-[.03em] text-ink-3">o con contraseña</span>
        <span className="h-px flex-1 bg-surface-line" />
      </div>
    </>
  );
}
