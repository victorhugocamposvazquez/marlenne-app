function isInstalledOrPhone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(hover: none)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** En el toque: reserva pestaña. En iPhone/PWA no: window.open se come la app o lo bloquean. */
export function reserveWhatsAppWindow() {
  if (isInstalledOrPhone()) return null;
  try {
    return window.open('about:blank', '_blank');
  } catch {
    return null;
  }
}

/** Tras guardar: en el teléfono navega a wa.me (WhatsApp lo intercepta). En desktop usa la pestaña. */
export function goWhatsApp(href: string, win?: Window | null) {
  if (win && !win.closed && !isInstalledOrPhone()) {
    try {
      win.location.replace(href);
      return;
    } catch {
      /* sigue */
    }
  }
  window.location.assign(href);
}
