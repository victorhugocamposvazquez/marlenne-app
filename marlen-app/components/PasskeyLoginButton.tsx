'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, ScanFace } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  platformUnlockAvailable,
  rememberPasskeyHint,
  runPasskeyLogin,
} from '@/hooks/platform-auth';
import { isNextRedirect } from '@/lib/next-navigation-error';
import {
  isAppleMobile,
  likelyHasPlatformUnlock,
  platformLoginFailed,
  platformMissingCredential,
  platformUnlockLabel,
  platformWaitingLabel,
} from '@/lib/webauthn';

function loginErrorMessage(err: unknown, ua: string): string | null {
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
  const [busy, setBusy] = useState(false);
  const label = platformUnlockLabel(ua);
  const FaceIcon = isAppleMobile(ua) ? ScanFace : Fingerprint;

  useEffect(() => {
    let alive = true;
    platformUnlockAvailable().then(ok => { if (alive) setAvailable(ok); });
    return () => { alive = false; };
  }, []);

  const run = async () => {
    onError(null);
    setBusy(true);
    try {
      const done = await runPasskeyLogin();
      if ('aborted' in done && done.aborted) return;
      if (!done.ok) {
        onError(done.error);
        return;
      }
      rememberPasskeyHint();
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      onError(loginErrorMessage(err, ua));
    } finally {
      setBusy(false);
    }
  };

  if (!available) return null;

  return (
    <>
      <Button
        size="lg"
        full
        disabled={busy}
        onClick={() => void run()}
      >
        <FaceIcon size={20} strokeWidth={2.2} />
        {busy ? platformWaitingLabel(ua) : label}
      </Button>
      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-surface-line" />
        <span className="text-caption font-bold uppercase tracking-[.03em] text-ink-3">o con contraseña</span>
        <span className="h-px flex-1 bg-surface-line" />
      </div>
    </>
  );
}
