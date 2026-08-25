'use client';

import { useEffect, useState } from 'react';
import AppointmentSheet from '@/components/agenda/AppointmentSheet';
import Sheet from '@/components/Sheet';
import { createClient } from '@/lib/supabase/client';
import { APPT_SELECT, mapAppt } from '@/lib/agenda-appt';
import { useShallowParam } from '@/hooks/useShallowQuery';
import type { AgendaAppt, Provider } from '@/lib/types';

export default function AppointmentSheetHost({
  appointments, providers, canMoveProvider, initialId, startClosing,
}: {
  appointments: AgendaAppt[];
  providers: Provider[];
  canMoveProvider: boolean;
  initialId?: string | null;
  startClosing?: boolean;
}) {
  const id = useShallowParam('appt', initialId ?? null);
  const closeQ = useShallowParam('close', startClosing ? '1' : null);
  const seed = id ? appointments.find(a => a.id === id) ?? null : null;
  const [fetched, setFetched] = useState<AgendaAppt | null>(null);
  const [sms, setSms] = useState<{ status: string; sent_at: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const appt = seed ?? fetched;

  useEffect(() => {
    if (!id) {
      setFetched(null);
      setSms(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(!seed);
    if (seed) setFetched(null);
    const sb = createClient();
    void (async () => {
      const [{ data: row }, { data: smsRow }] = await Promise.all([
        seed
          ? Promise.resolve({ data: null as unknown })
          : sb.from('appointments').select(APPT_SELECT).eq('id', id).maybeSingle(),
        sb.from('sms_log').select('status, sent_at').eq('appointment_id', id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!alive) return;
      if (!seed) setFetched(row ? mapAppt(row) : null);
      setSms(smsRow ?? null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id, seed?.id]);

  if (!id) return null;
  if (!appt && loading) {
    return (
      <Sheet title="Cita">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-40 rounded-[10px] bg-surface-line" />
          <div className="h-12 rounded-[12px] bg-surface-line" />
          <div className="h-12 rounded-[12px] bg-surface-line" />
        </div>
      </Sheet>
    );
  }
  if (!appt) return null;

  return (
    <AppointmentSheet
      appt={appt}
      providers={providers}
      canMoveProvider={canMoveProvider}
      startClosing={closeQ === '1'}
      sms={sms}
    />
  );
}
