/** WebAuthn de plataforma (huella, cara, Face ID). Sin DOM ni next/*. */

export const PASSKEY_HINT_KEY = 'marlenne-passkey';
export const PASSKEY_LATER_KEY = 'marlenne-passkey-later';
export const MAX_PASSKEYS = 5;
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function rpIdFromOrigin(origin: string): string {
  return new URL(origin).hostname;
}

export function resolveRequestOrigin(input: {
  origin?: string | null;
  forwardedHost?: string | null;
  host?: string | null;
  forwardedProto?: string | null;
  appUrl?: string | null;
}): string {
  if (input.origin) return input.origin.replace(/\/$/, '');
  const host = input.forwardedHost ?? input.host;
  if (host) {
    const proto = input.forwardedProto ?? (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  if (input.appUrl) return input.appUrl.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/** Texto del botón de login según el aparato. */
export function platformUnlockLabel(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Entrar con Face ID';
  if (/Macintosh/i.test(ua)) return 'Entrar con Touch ID';
  if (/Android/i.test(ua)) return 'Entrar con huella o cara';
  return 'Entrar con huella o cara';
}

export function platformRegisterLabel(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Activar Face ID';
  if (/Macintosh/i.test(ua)) return 'Activar Touch ID';
  if (/Android/i.test(ua)) return 'Activar huella o cara';
  return 'Activar huella o cara';
}

export function platformDeviceName(ua: string): string {
  if (/iPad/i.test(ua)) return 'Este iPad';
  if (/iPhone|iPod/i.test(ua)) return 'Este iPhone';
  if (/Android/i.test(ua)) return 'Este Android';
  if (/Macintosh/i.test(ua)) return 'Este Mac';
  return 'Este dispositivo';
}

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(value, 'base64url');
  const out = new Uint8Array(buf.length);
  out.set(buf);
  return out;
}
