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
export async function shareBlob(blob: Blob, filename: string, text?: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return true;
  }
  return false;
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
