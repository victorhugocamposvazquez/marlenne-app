'use client';

const LATER_KEY = 'marlen-staff-reminder-later';

export function staffReminderPostponed(): boolean {
  try {
    return localStorage.getItem(LATER_KEY) === '1';
  } catch {
    return false;
  }
}

export function postponeStaffReminder(): void {
  try {
    localStorage.setItem(LATER_KEY, '1');
  } catch {
    /* modo privado */
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function staffPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

/** Pide permiso, suscribe este dispositivo y lo guarda para el miembro que ha entrado. */
export async function enableStaffPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!staffPushSupported()) {
    return { ok: false, error: 'Este navegador no admite avisos.' };
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { ok: false, error: 'Los avisos están bloqueados en el sistema.' };
  }

  const keyRes = await fetch('/api/push/vapid');
  if (!keyRes.ok) {
    return { ok: false, error: 'Los avisos aún no están configurados en el servidor.' };
  }
  const { publicKey } = await keyRes.json() as { publicKey?: string };
  if (!publicKey) {
    return { ok: false, error: 'Los avisos aún no están configurados en el servidor.' };
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const saved = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!saved.ok) {
    return { ok: false, error: 'No se ha podido guardar este dispositivo.' };
  }

  const pref = await fetch('/api/push/prefs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: true }),
  });
  if (!pref.ok) {
    return { ok: false, error: 'No se han podido activar los avisos.' };
  }
  return { ok: true };
}

export async function readStaffPushEnabled(): Promise<boolean> {
  const res = await fetch('/api/push/prefs');
  if (!res.ok) return false;
  const body = await res.json() as { enabled?: boolean };
  return Boolean(body.enabled);
}

/** Apaga los avisos de esta persona y suelta este dispositivo. */
export async function disableStaffPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const saved = await fetch('/api/push/prefs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false }),
  });
  if (!saved.ok) {
    return { ok: false, error: 'No se han podido desactivar los avisos.' };
  }
  if (staffPushSupported()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
    } catch {
      /* el servidor ya no envía; el navegador puede seguir con el permiso */
    }
  }
  return { ok: true };
}
