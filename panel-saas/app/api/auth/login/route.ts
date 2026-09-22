import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!email.includes('@') || password.length < 4) {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 400 });
  }

  cookies().set(SESSION_COOKIE, email, sessionCookieOptions());
  return NextResponse.json({ ok: true, email });
}
