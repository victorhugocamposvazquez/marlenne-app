/** WebAuthn de plataforma (Face ID, huella, cara). Sin DOM ni next/*. */

export const PASSKEY_HINT_KEY = 'marlenne-passkey';
export const PASSKEY_LATER_KEY = 'marlenne-passkey-later';
export const MAX_PASSKEYS = 5;
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function isAppleMobile(ua: string): boolean {
  return /iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS/i.test(ua);
}

export function likelyHasPlatformUnlock(ua: string): boolean {
  return isAppleMobile(ua) || /Android/i.test(ua);
}

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

export function platformUnlockNoun(ua: string): string {
  if (isAppleMobile(ua)) return 'Face ID';
  if (/Macintosh/i.test(ua)) return 'Touch ID';
  return 'huella';
}

/** Texto del botón de login según el aparato. */
export function platformUnlockLabel(ua: string): string {
  if (isAppleMobile(ua)) return 'Entrar con Face ID';
  if (/Macintosh/i.test(ua)) return 'Entrar con Touch ID';
  return 'Entrar con huella o cara';
}

export function platformRegisterLabel(ua: string): string {
  if (isAppleMobile(ua)) return 'Activar Face ID';
  if (/Macintosh/i.test(ua)) return 'Activar Touch ID';
  return 'Activar huella o cara';
}

export function platformWaitingLabel(ua: string): string {
  if (isAppleMobile(ua)) return 'Esperando Face ID…';
  if (/Macintosh/i.test(ua)) return 'Esperando Touch ID…';
  return 'Esperando el móvil…';
}

export function platformSettingsTitle(ua: string): string {
  if (isAppleMobile(ua)) return 'Face ID';
  if (/Macintosh/i.test(ua)) return 'Touch ID';
  return 'Huella o cara';
}

export function platformLoginTitle(ua: string): string {
  return isAppleMobile(ua) ? 'Entra con Face ID' : 'Entra en un toque';
}

export function platformLoginHint(ua: string): string {
  if (isAppleMobile(ua)) {
    return 'En el iPhone y el iPad, Face ID. Si hace falta, email y contraseña. Nadie entra eligiendo un perfil.';
  }
  if (/Android/i.test(ua)) {
    return 'En el móvil, huella o cara. En el iPhone, Face ID. Si hace falta, email y contraseña. Nadie entra eligiendo un perfil.';
  }
  return 'Face ID en el iPhone, huella o cara en Android. Si hace falta, email y contraseña. Nadie entra eligiendo un perfil.';
}

export function platformSettingsHint(ua: string): string {
  if (isAppleMobile(ua)) {
    return 'Face ID en este iPhone o iPad. En Android es la huella o la cara. La contraseña sigue valiendo.';
  }
  return 'Huella o cara en este Android. En el iPhone y el iPad, Face ID. La contraseña sigue valiendo.';
}

export function platformBannerHint(ua: string): string {
  if (isAppleMobile(ua)) {
    return 'Guarda Face ID en este aparato. La próxima vez entras con un toque, sin escribir la contraseña.';
  }
  return 'Guarda la huella o la cara de este móvil. En el iPhone es Face ID. La próxima vez, un toque.';
}

export function platformMissingCredential(ua: string): string {
  const name = platformUnlockNoun(ua);
  if (name === 'huella') {
    return 'En este móvil aún no hay huella guardada. Entra con email y actívala en Ajustes → Tu cuenta.';
  }
  return `En este aparato aún no hay ${name}. Entra con email y actívalo en Ajustes → Tu cuenta.`;
}

export function platformLoginFailed(ua: string): string {
  return `No se ha podido entrar con ${platformUnlockNoun(ua)}. Prueba email y contraseña.`;
}

export function platformUnavailable(ua: string): string {
  return `Aún no está activo el acceso con ${platformUnlockNoun(ua)}. Entra con email y contraseña.`;
}

export function platformRemovedToast(ua: string): string {
  return platformUnlockNoun(ua) === 'huella' ? 'Huella borrada' : `${platformUnlockNoun(ua)} borrado`;
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
