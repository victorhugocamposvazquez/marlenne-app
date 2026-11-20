'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WaitlistSheet from '@/components/agenda/WaitlistSheet';
import { loadWaitlist } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { readSheetCatalog, subscribeSheetCatalog, warmSheetCatalog } from '@/hooks/sheet-catalog';
import { useShallowParam } from '@/hooks/useShallowQuery';
import type { ServiceOption, WaitItem } from '@/lib/types';

export default function WaitlistSheetHost({ initialOpen }: { initialOpen?: boolean }) {
  const open = useShallowParam('wait', initialOpen ? '1' : null);
  const router = useRouter();
  const snap = readSheetCatalog();
  const [items, setItems] = useState<WaitItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>(snap?.services ?? []);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeSheetCatalog(cat => {
    if (cat.services.length) setServices(cat.services);
  }), []);

  useEffect(() => {
    if (open !== '1') return;
    let alive = true;
    const sb = createClient();
    const known = readSheetCatalog();
    if (known?.services.length) setServices(known.services);
    const load = async () => {
      const [w] = await Promise.all([
        loadWaitlist(sb),
        warmSheetCatalog(sb),
      ]);
      if (!alive) return;
      setItems(w);
      const latest = readSheetCatalog();
      if (latest?.services.length) setServices(latest.services);
      setLoading(false);
    };
    setLoading(true);
    void load();
    const ch = sb.channel('wait-sheet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, () => {
        void load();
        router.refresh();
      });
    void ch.subscribe();
    return () => {
      alive = false;
      void sb.removeChannel(ch);
    };
  }, [open, router]);

  if (open !== '1') return null;

  return (
    <WaitlistSheet
      items={items}
      services={services}
      loading={loading && items.length === 0}
    />
  );
}
