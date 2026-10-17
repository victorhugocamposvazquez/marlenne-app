import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function keyBytes(): Buffer | null {
  const raw = process.env.VENDOR_TOKEN_SECRET?.trim()
    || process.env.CRON_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw) return null;
  return createHash('sha256').update(raw).digest();
}

/** Cifra un token para guardarlo en BD. Sin secreto → null (no guardar en claro). */
export function encryptSecret(plain: string): string | null {
  const key = keyBytes();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptSecret(blob: string | null | undefined): string | null {
  if (!blob) return null;
  const key = keyBytes();
  if (!key) return null;
  const parts = blob.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  try {
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const data = Buffer.from(parts[3], 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
