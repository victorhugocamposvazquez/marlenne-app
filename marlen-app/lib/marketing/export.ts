import { toBlob } from 'html-to-image';

/** Espera a que todas las <img> del nodo estén listas (export off-screen). */
async function waitForImages(root: HTMLElement, timeoutMs = 12000) {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (!imgs.length) return;

  const waitOne = (img: HTMLImageElement) =>
    new Promise<void>((resolve) => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      // Fuerza recarga con CORS si aún no hay píxeles
      if (img.complete && img.naturalWidth === 0 && img.src) {
        const src = img.src;
        img.src = '';
        img.src = src;
      }
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    }).then(async () => {
      try {
        if (img.decode) await img.decode();
      } catch {
        /* decode opcional */
      }
    });

  await Promise.race([
    Promise.all(imgs.map(waitOne)),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/** Captura un nodo (CreativeCanvas a 1080 px de ancho, sin escalar) como PNG */
export async function nodeToPng(node: HTMLElement): Promise<Blob> {
  await waitForImages(node);

  const opts = {
    pixelRatio: 1 as const,
    cacheBust: true,
    // Incluye imágenes same-origin / CORS (proxy stock + logo público)
    includeQueryParams: true,
  };

  let blob = await toBlob(node, opts);
  if (!blob) {
    // Reintento: a veces el primer paso pilla fuentes/imágenes a medias
    await new Promise((r) => setTimeout(r, 120));
    await waitForImages(node, 8000);
    blob = await toBlob(node, opts);
  }
  if (!blob) throw new Error('No se pudo generar el PNG');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Comparte la imagen (archivo). No hace fallback a solo texto/enlace:
 * WhatsApp y similares deben llevar la foto, no un vínculo.
 */
export async function shareBlob(blob: Blob, filename: string, text?: string, title?: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  // Primero solo el archivo (más fiable en WhatsApp)
  const filesOnly: ShareData = { files: [file] };
  if (nav.canShare?.(filesOnly)) {
    try {
      await navigator.share(filesOnly);
      return true;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return true; // usuario canceló
    }
  }
  // Archivo + texto corto opcional (sin forzar URL)
  const withMeta: ShareData = { files: [file], ...(text ? { text } : {}), ...(title ? { title } : {}) };
  if (nav.canShare?.(withMeta)) {
    try {
      await navigator.share(withMeta);
      return true;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return true;
    }
  }
  return false;
}

/** Abre WhatsApp Web/app sin mensaje prellenado (la foto va por share o adjunto). */
export function openWhatsAppChat() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
  if (mobile) {
    window.open('https://wa.me/', '_blank', 'noopener,noreferrer');
  } else {
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
  }
}

/** @deprecated Preferir openWhatsAppChat; wa.me/?text= no adjunta la imagen. */
export function openWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function openEmail(subject: string, body: string) {
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Instagram no deja publicar desde web; abrimos la app/web y el usuario sube el PNG. */
export function openInstagram() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua);
  if (mobile) {
    window.location.href = 'instagram://camera';
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    }, 800);
  } else {
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  }
}

export async function copyBlob(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); } catch { /* sin permiso */ }
}

export const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
