'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/require-session';
import { createClient } from '@/lib/supabase/server';
import { createClientRecord as createClientWrite } from '@/lib/client-write';
import { sellPack, upsertPackTemplate } from '@/lib/pack-write';
import { recordOpsAudit } from '@/lib/ops-support-audit';

export async function createPackTemplateQuick(input: {
  name: string;
  sessionsTotal: number;
  priceCents: number;
  serviceId?: string | null;
  validDays?: number | null;
}): Promise<
  | {
      ok: true;
      template: {
        id: string;
        name: string;
        sessions_total: number;
        price_cents: number;
        service_id: string | null;
      };
    }
  | { ok: false; error: string }
> {
  await requireRole('admin');
  const sb = createClient();
  const r = await upsertPackTemplate(sb, {
    name: input.name,
    sessions_total: Math.max(1, Math.round(input.sessionsTotal)),
    price_cents: Math.max(0, Math.round(input.priceCents)),
    service_id: input.serviceId || null,
    valid_days: input.validDays ?? null,
    is_active: true,
  });
  if (!r.ok || !r.id) return { ok: false, error: r.error || 'No se pudo crear el bono' };

  void recordOpsAudit('pack.template.create', { id: r.id, name: input.name.trim() });
  revalidatePath('/ajustes/bonos');
  revalidatePath('/ajustes/marketing');

  return {
    ok: true,
    template: {
      id: r.id,
      name: input.name.trim(),
      sessions_total: Math.max(1, Math.round(input.sessionsTotal)),
      price_cents: Math.max(0, Math.round(input.priceCents)),
      service_id: input.serviceId || null,
    },
  };
}

export async function createClientQuick(input: {
  fullName: string;
  phone?: string;
}): Promise<{ ok: true; id: string; fullName: string } | { ok: false; error: string }> {
  await requireRole('admin', 'reception');
  const r = await createClientWrite(createClient(), {
    full_name: input.fullName,
    phone: input.phone,
  });
  if (!r.ok || !r.id) return { ok: false, error: r.error || 'No se pudo crear la clienta' };
  void recordOpsAudit('client.create', { id: r.id, full_name: input.fullName, via: 'marketing' });
  revalidatePath('/clientas');
  revalidatePath('/ajustes/marketing');
  return { ok: true, id: r.id, fullName: input.fullName.trim() };
}

export async function sellPackFromMarketing(input: {
  ownerClientId: string;
  templateId: string;
  name: string;
  serviceId: string | null;
  sessionsTotal: number;
  priceCents: number;
}): Promise<{ ok: true; packId: string } | { ok: false; error: string }> {
  await requireRole('admin', 'reception');
  const r = await sellPack(createClient(), {
    ownerClientId: input.ownerClientId,
    templateId: input.templateId,
    name: input.name,
    serviceId: input.serviceId,
    sessionsTotal: input.sessionsTotal,
    priceCents: input.priceCents,
    paidCents: 0,
    paymentMethod: null,
  });
  if (!r.ok || !r.id) return { ok: false, error: r.error || 'No se pudo registrar el bono' };
  void recordOpsAudit('pack.sell', {
    id: r.id,
    templateId: input.templateId,
    clientId: input.ownerClientId,
    via: 'marketing',
  });
  revalidatePath('/ajustes/bonos');
  revalidatePath(`/clientas/${input.ownerClientId}`);
  return { ok: true, packId: r.id };
}
