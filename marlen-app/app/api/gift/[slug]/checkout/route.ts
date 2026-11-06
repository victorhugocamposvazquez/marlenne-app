import { NextResponse } from 'next/server';
import { startGiftCheckout } from '@/lib/web/gift-checkout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  amountEur?: number;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  recipientName?: string;
  message?: string;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const r = await startGiftCheckout({
    slug,
    amountEur: Number(body.amountEur),
    buyerName: body.buyerName || '',
    buyerEmail: body.buyerEmail || '',
    buyerPhone: body.buyerPhone,
    recipientName: body.recipientName,
    message: body.message,
    origin,
  });

  if (!r.ok) {
    return NextResponse.json(r, { status: 400 });
  }
  return NextResponse.json(r);
}
