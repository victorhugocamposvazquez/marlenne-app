import { toBlob } from 'html-to-image';

/** Captura un nodo (CreativeCanvas a 1080 px de ancho, sin escalar) como PNG */
export async function nodeToPng(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, { pixelRatio: 1, cacheBust: true });
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

/** Hoja de compartir nativa (WhatsApp, Mail, Instagram…) si el dispositivo lo permite */
export async function shareBlob(blob: Blob, filename: string, text?: string, title?: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  const data: ShareData = { files: [file], text, title };
  if (nav.canShare && nav.canShare(data)) {
    await navigator.share(data);
    return true;
  }
  // Sin archivos (escritorio): al menos texto/enlace
  if (typeof navigator.share === 'function' && text) {
    try {
      await navigator.share({ title, text, url: text.startsWith('http') ? text : undefined });
      return true;
    } catch {
      /* cancelado o no soportado */
    }
  }
  return false;
}

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
