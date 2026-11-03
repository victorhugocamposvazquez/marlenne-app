/** Comprime en el cliente antes de subir: el bucket guarda JPEGs razonables, no el original de 8 MB. */

async function canvasToJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se ha podido comprimir');
  ctx.drawImage(source, 0, 0, w, h);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.74));
  if (!blob) throw new Error('No se ha podido comprimir');
  return blob;
}

function scaledSize(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

async function compressViaBitmap(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  try {
    const { w, h } = scaledSize(bmp.width, bmp.height, max);
    return await canvasToJpeg(bmp, w, h);
  } finally {
    bmp.close();
  }
}

/** Fallback iOS/HEIC: createImageBitmap a veces falla; <img> + object URL suele funcionar. */
async function compressViaImg(file: File, max: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen'));
      el.src = url;
    });
    const { w, h } = scaledSize(img.naturalWidth || img.width, img.naturalHeight || img.height, max);
    return await canvasToJpeg(img, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file: File, max = 1400): Promise<Blob> {
  try {
    return await compressViaBitmap(file, max);
  } catch {
    try {
      return await compressViaImg(file, max);
    } catch {
      throw new Error(
        'No se pudo leer esa foto. Prueba JPEG o PNG, o «Elegir archivo» en lugar de Live Photo.',
      );
    }
  }
}
