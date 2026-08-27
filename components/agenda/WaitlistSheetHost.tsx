'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WaitlistSheet from '@/components/agenda/WaitlistSheet';
import Sheet from '@/components/Sheet';
import Skeleton from '@/components/ui/Skeleton';
import { loadClientOptions, loadServices, loadWaitlist } from '@/lib/agenda-catalog';
import { createClient } from '@/lib/supabase/client';
import { useShallowParam } from '@/hooks/useShallowQuery';
import type { ClientOption, ServiceOption, WaitItem } from '@/lib/types';

export default function WaitlistSheetHost({ initialOpen }: { initialOpen?: boolean }) {
  const open = useShallowParam('wait', initialOpen ? '1' : null);
  const router = useRouter();
  const [items, setItems] = useState<WaitItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open !== '1') return;
    let alive = true;
    const sb = createClient();
    const load = async () => {
      const [w, c, s] = await Promise.all([
        loadWaitlist(sb), loadClientOptions(sb), loadServices(sb),
      ]);
      if (!alive) return;
      setItems(w);
      setClients(c);
      setServices(s);
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
  if (loading && items.length === 0 && clients.length === 0) {
    return (
      <Sheet title="Lista de espera">
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Sheet>
    );
  }

  return <WaitlistSheet items={items} clients={clients} services={services} />;
}
