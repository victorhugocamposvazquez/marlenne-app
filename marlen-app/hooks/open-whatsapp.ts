import { waAppHref } from '@/lib/phone';

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isInstalledOrPhone() {
  return isIos()
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.matchMedia('(hover: none)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function appHrefFromWeb(web: string) {
  try {
    const u = new URL(web);
    if (!/wa\.me|whatsapp\.com/.test(u.hostname)) return null;
    const phone = u.pathname.replace(/\//g, '');
    return waAppHref(phone, u.searchParams.get('text') ?? undefined);
  } catch {
    return null;
  }
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

/**
 * Un iPhone en Safari abre wa.me en WhatsApp; el mismo enlace desde la PWA
 * (icono en inicio) a menudo no. En iOS vamos primero a whatsapp://.
 */
export function goWhatsApp(href: string, win?: Window | null) {
  if (isIos()) {
    const app = appHrefFromWeb(href);
    if (app) {
      const started = Date.now();
      window.location.href = app;
      window.setTimeout(() => {
        if (document.hidden || Date.now() - started > 1600) return;
        window.location.href = href;
      }, 700);
      return;
    }
  }
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
