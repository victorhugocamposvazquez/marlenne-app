/** Comprime en el cliente antes de subir: el bucket guarda JPEGs razonables, no el original de 8 MB. */
export async function compressImage(file: File, max = 1400): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se ha podido comprimir');
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.74));
  if (!blob) throw new Error('No se ha podido comprimir');
  return blob;
}
