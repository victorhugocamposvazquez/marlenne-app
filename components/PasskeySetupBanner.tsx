'use client';

import { useEffect, useState, useTransition } from 'react';
import { Fingerprint, ScanFace, X } from 'lucide-react';
import { beginPasskeyRegister, finishPasskeyRegister } from '@/app/actions/webauthn';
import {
  dismissPasskeyLater,
  isPasskeyAbort,
  platformUnlockAvailable,
  postponedPasskeySetup,
  rememberPasskeyHint,
  startRegistration,
} from '@/hooks/platform-auth';
import {
  isAppleMobile,
  platformBannerHint,
  platformDeviceName,
  platformRegisterLabel,
  platformWaitingLabel,
} from '@/lib/webauthn';

export default function PasskeySetupBanner({ ua, hasPasskeys }: { ua: string; hasPasskeys: boolean }) {
  const [show, setShow] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const label = platformRegisterLabel(ua);
  const FaceIcon = isAppleMobile(ua) ? ScanFace : Fingerprint;

  useEffect(() => {
    if (hasPasskeys || postponedPasskeySetup()) return;
    let alive = true;
    platformUnlockAvailable().then(ok => { if (alive) setShow(ok); });
    return () => { alive = false; };
  }, [hasPasskeys]);

  if (!show) return null;

  const hide = () => {
    dismissPasskeyLater();
    setShow(false);
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
        setShow(false);
      } catch (err) {
        if (!isPasskeyAbort(err)) setError('No se ha podido guardar. Prueba otra vez.');
      }
    });
  };

  return (
    <div className="mb-5 rounded-row border border-surface-line bg-surface-card p-3.5 shadow-card">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-body font-extrabold tracking-[-.01em]">
            {isAppleMobile(ua) ? 'La próxima vez, Face ID' : 'La próxima vez, un toque'}
          </div>
          <p className="mt-1 text-label font-medium leading-snug text-ink-2">
            {platformBannerHint(ua)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Ahora no"
          onClick={hide}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-icon text-ink-3 motion-safe:active:scale-[.96]"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
      {error && <p className="mt-2 text-label font-semibold text-danger-fg">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={register}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-field bg-grad px-4 text-body font-extrabold text-white shadow-btn motion-safe:active:scale-[.98] disabled:opacity-40"
      >
        <FaceIcon size={18} strokeWidth={2.2} />
        {pending ? platformWaitingLabel(ua) : label}
      </button>
    </div>
  );
}
