'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Phone, Plus, Search, UserRound } from 'lucide-react';
import { createManualLead, listLeadsPage, type LeadRow } from '@/app/actions/leads';
import type { LeadsListGroup } from '@/lib/leads-list-group';
import type { LeadsListFilter } from '@/lib/leads-list-query';
import Chip from '@/components/ui/Chip';
import EmptyState from '@/components/ui/EmptyState';
import PageHeading from '@/components/ui/PageHeading';
import { HeaderIconButton, screenHeaderCls } from '@/components/ui/ScreenHeader';
import { leadTone } from '@/lib/leads';

const TONE = {
  none: { bg: '#F2F2F7', ink: '#6E6B7B' },
  call: { bg: '#E8F2FF', ink: '#0879FF' },
  whatsapp: { bg: '#E7F8EE', ink: '#15803D' },
} as const;

const FILTERS = [
  { id: 'todas', label: 'Todos' },
  { id: 'none', label: 'Sin tocar' },
  { id: 'call', label: 'Llamados' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

export default function LeadsView({
  leads: initialLeads,
  hasMore: initialHasMore,
  listGroup,
  groupNames,
}: {
  leads: LeadRow[];
  hasMore: boolean;
  listGroup: LeadsListGroup;
  groupNames: string[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('todas');
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [campaign, setCampaign] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState(initialLeads);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, start] = useTransition();
  const [listPending, startList] = useTransition();
  const leads = rows;
  const filtersReady = useRef(false);

  const buildFilters = useCallback(
    (before?: string | null): LeadsListFilter => ({
      before,
      tone: filter,
      groupKind: listGroup,
      groupName: campaignFilter,
      q: q.trim().length >= 2 ? q : undefined,
    }),
    [filter, listGroup, campaignFilter, q],
  );

  const fetchList = useCallback(
    (before?: string | null) => {
      startList(async () => {
        const page = await listLeadsPage(buildFilters(before));
        if (before) {
          setRows(current => {
            const seen = new Set(current.map(lead => lead.id));
            return [...current, ...page.rows.filter(lead => !seen.has(lead.id))];
          });
        } else {
          setRows(page.rows);
        }
        setHasMore(page.hasMore);
      });
    },
    [buildFilters],
  );

  useEffect(() => {
    setRows(initialLeads);
    setHasMore(initialHasMore);
  }, [initialLeads, initialHasMore]);

  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      return;
    }
    fetchList();
  }, [filter, campaignFilter, listGroup, fetchList]);

  useEffect(() => {
    if (!filtersReady.current) return;
    const t = window.setTimeout(() => fetchList(), 320);
    return () => window.clearTimeout(t);
  }, [q, fetchList]);

  const saveNew = () => {
    setError(null);
    start(async () => {
      const res = await createManualLead({ fullName: name, phone, campaignName: campaign });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAdding(false);
      setName('');
      setPhone('');
      setCampaign('');
      router.push(`/leads/${res.id}`);
    });
  };

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <header className={screenHeaderCls}>
        <PageHeading title="Leads" subtitle={leads.length === 1 ? '1 ficha' : `${leads.length} fichas`}>
          <HeaderIconButton label="Nuevo lead" onClick={() => setAdding(v => !v)}>
            <Plus size={22} strokeWidth={2.2} />
          </HeaderIconButton>
        </PageHeading>
        {adding && (
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={e => { e.preventDefault(); saveNew(); }}
          >
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre"
              aria-label="Nombre del lead"
              className="w-full rounded-field bg-surface-soft px-4 py-3.5 text-[16px] font-medium outline-none"
            />
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Teléfono"
              inputMode="tel"
              aria-label="Teléfono del lead"
              className="w-full rounded-field bg-surface-soft px-4 py-3.5 text-[16px] font-medium outline-none"
            />
            <input
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
              placeholder="Campaña, si la sabes"
              aria-label="Campaña"
              className="w-full rounded-field bg-surface-soft px-4 py-3.5 text-[16px] font-medium outline-none"
            />
            {error && <p className="text-label font-semibold text-danger-fg">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="min-h-[48px] rounded-pill bg-grad text-[16px] font-bold text-white disabled:opacity-50"
            >
              {pending ? 'Guardando…' : 'Guardar y avisar'}
            </button>
          </form>
        )}
        <div className="mt-3 flex h-[54px] items-center gap-2.5 rounded-field bg-surface-soft px-4">
          <Search size={18} className="text-ink-3" strokeWidth={2.2} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar leads"
            className="h-6 flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
          />
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {FILTERS.map(f => (
            <Chip key={f.id} className="shrink-0" active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
        {groupNames.length > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto">
            <Chip className="shrink-0" active={campaignFilter == null} onClick={() => setCampaignFilter(null)}>
              {listGroup === 'ad' ? 'Anuncios' : 'Campañas'}
            </Chip>
            {groupNames.map(name => (
              <Chip key={name} className="shrink-0" active={campaignFilter === name} onClick={() => setCampaignFilter(name)}>
                {name}
              </Chip>
            ))}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 pb-fab pt-1">
        {listPending && leads.length === 0 && (
          <p className="mt-4 text-label font-medium text-ink-2">Cargando…</p>
        )}
        {!listPending && leads.length === 0 && (
          <EmptyState
            icon={UserRound}
            title={
              filter === 'todas' && !campaignFilter && q.trim().length < 2
                ? 'Todavía no hay leads.'
                : 'Ningún lead con ese filtro.'
            }
            hint={
              filter === 'todas' && !campaignFilter && q.trim().length < 2
                ? 'Importa desde Facebook en Ajustes → Leads, o crea uno con + arriba.'
                : undefined
            }
          />
        )}
        {leads.map(lead => {
          const tone = leadTone(lead.last_channel);
          const paint = TONE[tone];
          const from = (listGroup === 'ad' ? lead.ad_name : lead.campaign_name)?.trim() ?? '';
          return (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="mt-2 flex items-center gap-3 rounded-row px-3.5 py-3 no-underline"
              style={{ background: paint.bg }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-lg font-semibold text-ink">{lead.full_name}</span>
                <span className="block truncate text-label font-medium text-ink-2">
                  {lead.phone || 'Sin teléfono'}
                  {from ? ` · ${from}` : ''}
                </span>
                {lead.tags.length > 0 && (
                  <span className="mt-1 block truncate text-label text-ink-3">{lead.tags.join(' · ')}</span>
                )}
              </span>
              {tone === 'call' && <Phone size={20} strokeWidth={2.2} style={{ color: paint.ink }} aria-label="Llamado" />}
              {tone === 'whatsapp' && <MessageCircle size={20} strokeWidth={2.2} style={{ color: paint.ink }} aria-label="WhatsApp" />}
            </Link>
          );
        })}

        {hasMore && (
          <button
            type="button"
            disabled={listPending}
            onClick={() => {
              const last = rows[rows.length - 1]?.created_at;
              if (last) fetchList(last);
            }}
            className="mt-3 min-h-[44px] w-full rounded-pill bg-surface-soft text-label font-bold text-ink disabled:opacity-50"
          >
            Ver más
          </button>
        )}
      </div>
    </div>
  );
}
