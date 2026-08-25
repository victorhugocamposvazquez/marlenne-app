/** iOS Safari ignora vibrate. En la cáscara, Capacitor registra Haptics en Plugins. */

type Kind = 'start' | 'tick';

function nativeImpact(kind: Kind) {
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: { Haptics?: { impact: (o: { style: string }) => Promise<unknown> } } };
  }).Capacitor;
  const h = cap?.Plugins?.Haptics;
  if (!h) return false;
  void h.impact({ style: kind === 'start' ? 'MEDIUM' : 'LIGHT' });
  return true;
}

export function haptic(kind: Kind) {
  try {
    if (nativeImpact(kind)) return;
  } catch { /* plugin aún no montado */ }
  try { navigator.vibrate?.(kind === 'start' ? 12 : 5); } catch { /* iOS web */ }
}
