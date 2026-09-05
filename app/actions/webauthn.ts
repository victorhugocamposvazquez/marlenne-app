'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { BRAND_NAME } from '@/lib/brand';
import { getSession } from '@/lib/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { signChallenge, verifyChallenge } from '@/lib/webauthn-challenge';
import {
  CHALLENGE_TTL_MS,
  MAX_PASSKEYS,
  fromBase64Url,
  platformDeviceName,
  platformUnavailable,
  platformUnlockNoun,
  resolveRequestOrigin,
  rpIdFromOrigin,
  toBase64Url,
} from '@/lib/webauthn';

const COOKIE = 'marlenne_wa';

export type PasskeyRow = {
  id: string;
  friendly_name: string;
  created_at: string;
  last_used_at: string | null;
};

type StaffPasskey = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number | string;
  transports: string[] | null;
};

function hmacSecret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el servidor');
  return key;
}

function requestUa() {
  return headers().get('user-agent') ?? '';
}

function unavailable() {
  return platformUnavailable(requestUa());
}

function unlockName() {
  return platformUnlockNoun(requestUa());
}

function currentOrigin() {
  const h = headers();
  return resolveRequestOrigin({
    origin: h.get('origin'),
    forwardedHost: h.get('x-forwarded-host'),
    host: h.get('host'),
    forwardedProto: h.get('x-forwarded-proto'),
    appUrl: process.env.APP_URL
      ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null),
  });
}

function setChallenge(payload: Parameters<typeof signChallenge>[0]) {
  cookies().set(COOKIE, signChallenge(payload, hmacSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  });
}

function readChallenge() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  return verifyChallenge(raw, hmacSecret());
}

function clearChallenge() {
  cookies().set(COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}

function tableMissing(message?: string) {
  return /staff_passkeys|does not exist|schema cache/i.test(message ?? '');
}

function asTransports(value: string[] | null | undefined): string[] | undefined {
  if (!value?.length) return undefined;
  return value;
}

async function requireActiveStaff(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('staff')
    .select('id, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (!data?.is_active) return null;
  return data;
}

export async function beginPasskeyLogin(): Promise<
  { ok: true; options: PublicKeyCredentialRequestOptionsJSON } | { ok: false; error: string }
> {
  try {
    const origin = currentOrigin();
    const options = await generateAuthenticationOptions({
      rpID: rpIdFromOrigin(origin),
      userVerification: 'required',
    });
    setChallenge({ c: options.challenge, k: 'a', e: Date.now() + CHALLENGE_TTL_MS });
    return { ok: true, options };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    return { ok: false, error: tableMissing(message) ? unavailable() : `No se ha podido preparar el acceso con ${unlockName()}.` };
  }
}

export async function finishPasskeyLogin(response: AuthenticationResponseJSON): Promise<{ ok: false; error: string } | void> {
  const challenge = readChallenge();
  clearChallenge();
  if (!challenge || challenge.k !== 'a') {
    return { ok: false, error: `El acceso con ${unlockName()} ha caducado. Prueba otra vez.` };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: unavailable() };
  }

  const { data: row, error: lookupError } = await admin
    .from('staff_passkeys')
    .select('id, user_id, credential_id, public_key, counter, transports')
    .eq('credential_id', response.id)
    .maybeSingle();

  if (lookupError && tableMissing(lookupError.message)) return { ok: false, error: unavailable() };
  const passkey = row as StaffPasskey | null;
  if (!passkey) return { ok: false, error: `Este ${unlockName()} no está registrado en Marlén.` };

  const staff = await requireActiveStaff(passkey.user_id);
  if (!staff) return { ok: false, error: 'Esta cuenta ya no está activa.' };

  const origin = currentOrigin();
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.c,
      expectedOrigin: origin,
      expectedRPID: rpIdFromOrigin(origin),
      credential: {
        id: passkey.credential_id,
        publicKey: fromBase64Url(passkey.public_key),
        counter: Number(passkey.counter),
        transports: asTransports(passkey.transports),
      },
      requireUserVerification: true,
    });
    if (!verification.verified) return { ok: false, error: `No se ha podido comprobar ${unlockName()}.` };
    await admin
      .from('staff_passkeys')
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id);
  } catch {
    return { ok: false, error: `No se ha podido comprobar ${unlockName()}.` };
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(passkey.user_id);
  const email = userData.user?.email;
  if (userError || !email) return { ok: false, error: 'No hemos encontrado el email de esta cuenta.' };

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) return { ok: false, error: 'No se ha podido abrir la sesión.' };

  const sb = createClient();
  const { error: otpError } = await sb.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
  if (otpError) return { ok: false, error: 'No se ha podido abrir la sesión.' };

  redirect('/hoy');
}

export async function beginPasskeyRegister(): Promise<
  { ok: true; options: PublicKeyCredentialCreationOptionsJSON } | { ok: false; error: string }
> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Entra primero con email y contraseña.' };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: unavailable() };
  }

  const { data: existing, error, count } = await admin
    .from('staff_passkeys')
    .select('credential_id, transports', { count: 'exact' })
    .eq('user_id', me.id);

  if (error) return { ok: false, error: tableMissing(error.message) ? unavailable() : `No se han podido leer los accesos con ${unlockName()}.` };
  if ((count ?? existing?.length ?? 0) >= MAX_PASSKEYS) {
    return { ok: false, error: `Como mucho ${MAX_PASSKEYS} móviles. Borra uno para añadir otro.` };
  }

  const { data: userData } = await admin.auth.admin.getUserById(me.id);
  const email = userData.user?.email ?? me.full_name;
  const origin = currentOrigin();

  try {
    const options = await generateRegistrationOptions({
      rpName: BRAND_NAME,
      rpID: rpIdFromOrigin(origin),
      userName: email,
      userDisplayName: me.full_name,
      userID: new TextEncoder().encode(me.id),
      attestationType: 'none',
      excludeCredentials: (existing ?? []).map(row => ({
        id: row.credential_id as string,
        transports: asTransports(row.transports as string[] | null),
      })),
      preferredAuthenticatorType: 'localDevice',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
    });
    setChallenge({ c: options.challenge, k: 'r', u: me.id, e: Date.now() + CHALLENGE_TTL_MS });
    return { ok: true, options };
  } catch {
    return { ok: false, error: 'No se ha podido preparar el registro.' };
  }
}

export async function finishPasskeyRegister(
  response: RegistrationResponseJSON,
  friendlyName?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Entra primero con email y contraseña.' };

  const challenge = readChallenge();
  clearChallenge();
  if (!challenge || challenge.k !== 'r' || challenge.u !== me.id) {
    return { ok: false, error: 'El registro ha caducado. Prueba otra vez.' };
  }

  const origin = currentOrigin();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.c,
      expectedOrigin: origin,
      expectedRPID: rpIdFromOrigin(origin),
      requireUserVerification: true,
    });
  } catch {
    return { ok: false, error: `No se ha podido guardar ${unlockName()}.` };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: `No se ha podido guardar ${unlockName()}.` };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const ua = headers().get('user-agent') ?? '';
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: unavailable() };
  }

  const { error } = await admin.from('staff_passkeys').insert({
    user_id: me.id,
    credential_id: credential.id,
    public_key: toBase64Url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? null,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    friendly_name: (friendlyName ?? '').trim() || platformDeviceName(ua),
  });
  if (error) {
    if (tableMissing(error.message)) return { ok: false, error: unavailable() };
    if (error.code === '23505') return { ok: false, error: 'Este aparato ya está guardado.' };
    return { ok: false, error: `No se ha podido guardar ${unlockName()}.` };
  }
  return { ok: true };
}

export async function listMyPasskeys(): Promise<PasskeyRow[]> {
  const me = await getSession();
  if (!me) return [];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('staff_passkeys')
      .select('id, friendly_name, created_at, last_used_at')
      .eq('user_id', me.id)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []).map(row => ({
      id: row.id as string,
      friendly_name: (row.friendly_name as string | null) ?? 'Este dispositivo',
      created_at: row.created_at as string,
      last_used_at: (row.last_used_at as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function countMyPasskeys(): Promise<number> {
  const me = await getSession();
  if (!me) return 0;
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('staff_passkeys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', me.id);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function removePasskey(id: string): Promise<{ ok: true; remaining: number } | { ok: false; error: string }> {
  const me = await getSession();
  if (!me) return { ok: false, error: 'Sin sesión.' };
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('staff_passkeys')
      .delete()
      .eq('id', id)
      .eq('user_id', me.id);
    if (error) return { ok: false, error: tableMissing(error.message) ? unavailable() : 'No se ha podido borrar.' };
    const remaining = await countMyPasskeys();
    return { ok: true, remaining };
  } catch {
    return { ok: false, error: unavailable() };
  }
}
