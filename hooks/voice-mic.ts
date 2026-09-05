export type MicPerm = 'unknown' | 'prompt' | 'granted' | 'denied';

function mapState(state: string): MicPerm {
  if (state === 'granted' || state === 'denied' || state === 'prompt') return state;
  return 'unknown';
}

/** SpeechRecognition no vuelve a mostrar el diálogo; getUserMedia sí, si sigue en prompt. */
export async function queryMicPerm(): Promise<MicPerm> {
  if (typeof navigator === 'undefined') return 'unknown';
  try {
    const q = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return mapState(q.state);
  } catch {
    return 'unknown';
  }
}

export async function requestMic(): Promise<MicPerm> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'denied';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const t of stream.getTracks()) t.stop();
    return 'granted';
  } catch {
    return 'denied';
  }
}

export function watchMicPerm(cb: (perm: MicPerm) => void): () => void {
  let status: PermissionStatus | null = null;
  let dead = false;
  const onChange = () => {
    if (!status) return;
    cb(mapState(status.state));
  };
  void (async () => {
    try {
      status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (dead) return;
      status.addEventListener('change', onChange);
    } catch { /* Safari viejo no tiene Permissions API */ }
  })();
  return () => {
    dead = true;
    try { status?.removeEventListener('change', onChange); } catch { /* */ }
  };
}

export function micBlockedSay() {
  const nav = navigator as Navigator & { standalone?: boolean };
  const pwa = window.matchMedia('(display-mode: standalone)').matches || !!nav.standalone;
  if (pwa) {
    return 'El micro está bloqueado. En Ajustes permite el micrófono a Marlén y toca el micro otra vez.';
  }
  return 'El micro está bloqueado. Permítelo en los ajustes del navegador y toca el micro otra vez.';
}
