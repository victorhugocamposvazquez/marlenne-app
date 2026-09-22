'use client';

import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { PASSKEY_HINT_KEY, PASSKEY_LATER_KEY } from '@/lib/webauthn';

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
