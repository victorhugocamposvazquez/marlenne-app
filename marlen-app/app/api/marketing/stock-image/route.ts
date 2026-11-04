import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAllowedStockImageUrl } from '@/lib/marketing/stock';

export const runtime = 'nodejs';

/** Proxy de imagen stock (Pixabay/Pexels) para canvas sin CORS. */
export async function GET(req: Request) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No auth' }, { status: 401 });
  }

  const src = new URL(req.url).searchParams.get('src')?.trim() ?? '';
  if (!src || !isAllowedStockImageUrl(src)) {
    return NextResponse.json({ error: 'URL no permitida' }, { status: 400 });
  }

  const upstream = await fetch(src, {
    headers: { Accept: 'image/*' },
    next: { revalidate: 86400 },
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'No se pudo cargar la imagen' }, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
