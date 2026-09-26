'use client';

import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { beginPasskeyRegister, finishPasskeyRegister } from '@/app/actions/webauthn';
import { PASSKEY_HINT_KEY, PASSKEY_LATER_KEY, platformDeviceName } from '@/lib/webauthn';

let passkeyCeremonies = 0;

/** Evita router.refresh() del realtime mientras Face ID / huella está en curso (p. ej. en Hoy). */
export function beginPasskeyCeremony() {
  passkeyCeremonies += 1;
  return () => { passkeyCeremonies = Math.max(0, passkeyCeremonies - 1); };
}

export function passkeyCeremonyActive() {
  return passkeyCeremonies > 0;
}

export function rememberPasskeyHint() {
  try { localStorage.setItem(PASSKEY_HINT_KEY, '1'); } catch { /* ignore */ }
}

export function forgetPasskeyHint() {
  try { localStorage.removeItem(PASSKEY_HINT_KEY); } catch { /* ignore */ }
}

export function hasPasskeyHint() {
  try { return localStorage.getItem(PASSKEY_HINT_KEY) === '1'; } catch { return false; }
}

export function dismissPasskeyLater() {
  try { localStorage.setItem(PASSKEY_LATER_KEY, '1'); } catch { /* ignore */ }
}

export function postponedPasskeySetup() {
  try { return localStorage.getItem(PASSKEY_LATER_KEY) === '1'; } catch { return false; }
}

export async function platformUnlockAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!browserSupportsWebAuthn()) return false;
  try {
    if (typeof PublicKeyCredential !== 'undefined'
      && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch { /* ignore */ }
  return false;
}

export async function runPasskeyRegistration(
  ua: string,
  friendlyName?: string,
): Promise<{ ok: true } | { ok: false; error: string; aborted?: boolean }> {
  const endCeremony = beginPasskeyCeremony();
  try {
    const started = await beginPasskeyRegister();
    if (!started.ok) return started;
    try {
      const attestation = await startRegistration({ optionsJSON: started.options });
      return await finishPasskeyRegister(
        attestation,
        friendlyName ?? platformDeviceName(ua),
        started.token,
      );
    } catch (err) {
      if (isPasskeyAbort(err)) return { ok: false, error: '', aborted: true };
      return { ok: false, error: 'No se ha podido guardar. Prueba otra vez.' };
    }
  } finally {
    endCeremony();
  }
}

export function isPasskeyAbort(err: unknown): boolean {
  const name = err && typeof err === 'object' && 'name' in err
    ? String((err as { name?: string }).name)
    : '';
  const code = err && typeof err === 'object' && 'code' in err
    ? String((err as { code?: string }).code)
    : '';
  return name === 'NotAllowedError' || name === 'AbortError' || code === 'ERROR_CEREMONY_ABORTED';
}

export { startAuthentication, startRegistration, browserSupportsWebAuthnAutofill };
