import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export function createClient() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => store.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { store.set({ name, value, ...options }); } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try { store.set({ name, value: '', ...options }); } catch {}
        },
      },
    },
  );
}

function mergeEmbedCookies(options: CookieOptions, crossSiteEmbed: boolean): CookieOptions {
  if (!crossSiteEmbed) return options;
  return {
    ...options,
    secure: true,
    sameSite: 'none',
  };
}

/** Route Handlers: copia las cookies de sesión al redirect (iframe / ops enter). */
export function createClientOnResponse(response: NextResponse, crossSiteEmbed = false) {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => store.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          const merged = mergeEmbedCookies(options, crossSiteEmbed);
          try { store.set({ name, value, ...merged }); } catch { /* layout read-only */ }
          response.cookies.set({ name, value, ...merged });
        },
        remove: (name: string, options: CookieOptions) => {
          const merged = mergeEmbedCookies(options, crossSiteEmbed);
          try { store.set({ name, value: '', ...merged }); } catch { /* layout read-only */ }
          response.cookies.set({ name, value: '', ...merged, maxAge: 0 });
        },
      },
    },
  );
}
