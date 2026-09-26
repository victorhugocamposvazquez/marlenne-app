/** Origen público de la PWA (sin barra final). Cambia con APP_URL al migrar dominio. */

export function appOriginFromEnv(): string {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

/** Route Handlers: prioriza el host de la petición (mismo deploy, dominio nuevo). */
export function appOriginFromRequest(req: Request): string {
  try {
    return new URL(req.url).origin;
  } catch {
    return appOriginFromEnv();
  }
}
