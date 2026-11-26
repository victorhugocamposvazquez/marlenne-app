'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, MessageCircle, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
import {
  createManualLead,
  listLeadsPage,
  listTrashedLeads,
  purgeLead,
  restoreLead,
  type LeadRow,
  type LeadTrashRow,
} from '@/app/actions/leads';
import type { LeadsListGroup } from '@/lib/leads-list-group';
import type { LeadsListFilter } from '@/lib/leads-list-query';
import EmptyState from '@/components/ui/EmptyState';
import FilterDropdown from '@/components/ui/FilterDropdown';
import PageHeading from '@/components/ui/PageHeading';
import { HeaderIconButton, screenHeaderCls } from '@/components/ui/ScreenHeader';
import { leadTagsSummary, leadTone } from '@/lib/leads';

const TONE = {
  none: { bg: '#F2F2F7', ink: '#6E6B7B' },
  call: { bg: '#B7D4FF', ink: '#0357C4' },
  whatsapp: { bg: '#A6E6C3', ink: '#0D7A38' },
} as const;

const FILTERS = [
  { id: 'todas', label: 'Todos' },
  { id: 'none', label: 'Sin tocar' },
  { id: 'call', label: 'Llamados' },
  { id: 'whatsapp', label: 'WhatsApp' },
] as const;

function leadDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LeadsView({
  leads: initialLeads,
  hasMore: initialHasMore,
  listGroup,
  groupNames,
  trashLeads: initialTrash,
  trashHasMore: initialTrashHasMore,
}: {
  leads: LeadRow[];
  hasMore: boolean;
  listGroup: LeadsListGroup;
  groupNames: string[];
  trashLeads: LeadTrashRow[];
  trashHasMore: boolean;
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
  const [trashOpen, setTrashOpen] = useState(initialTrash.length > 0);
  const [trashRows, setTrashRows] = useState(initialTrash);
  const [trashHasMore, setTrashHasMore] = useState(initialTrashHasMore);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [trashError, setTrashError] = useState<string | null>(null);
  const [trashPending, startTrash] = useTransition();
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
    setTrashRows(initialTrash);
    setTrashHasMore(initialTrashHasMore);
    if (initialTrash.length > 0) setTrashOpen(true);
  }, [initialTrash, initialTrashHasMore]);

  useEffect(() => {
    setCampaignFilter(null);
  }, [listGroup]);

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

  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === 'visible') fetchList();
    };
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('pageshow', resync);
    window.addEventListener('focus', resync);
    return () => {
      document.removeEventListener('visibilitychange', resync);
      window.removeEventListener('pageshow', resync);
      window.removeEventListener('focus', resync);
    };
  }, [fetchList]);

  const refreshTrash = useCallback((before?: string | null) => {
    startTrash(async () => {
      const page = await listTrashedLeads(before);
      if (before) {
        setTrashRows(current => {
          const seen = new Set(current.map(row => row.id));
          return [...current, ...page.rows.filter(row => !seen.has(row.id))];
        });
      } else {
        setTrashRows(page.rows);
      }
      setTrashHasMore(page.hasMore);
    });
  }, []);

  const runTrash = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) => {
    setTrashError(null);
    startTrash(async () => {
      const res = await fn();
      if (!res.ok) {
        setTrashError(res.error ?? 'No se ha podido');
        return;
      }
      onOk?.();
      refreshTrash();
      router.refresh();
    });
  };

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
        <div className="mt-2 flex h-11 items-center gap-2 rounded-field bg-surface-soft px-3">
          <Search size={17} className="shrink-0 text-ink-3" strokeWidth={2.2} aria-hidden />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar leads"
            className="min-w-0 flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
          />
        </div>
        <div className="mt-1.5 flex gap-2">
          <FilterDropdown
            className="min-w-0 flex-1"
            ariaLabel="Estado del lead"
            value={filter}
            onChange={v => setFilter(v as (typeof FILTERS)[number]['id'])}
            options={FILTERS.map(f => ({ value: f.id, label: f.label }))}
          />
          {groupNames.length > 0 && (
            <FilterDropdown
              className="min-w-0 flex-1"
              ariaLabel={listGroup === 'ad' ? 'Filtrar por anuncio' : 'Filtrar por campaña'}
              value={campaignFilter ?? ''}
              onChange={v => setCampaignFilter(v || null)}
              options={[
                { value: '', label: listGroup === 'ad' ? 'Anuncios' : 'Campañas' },
                ...groupNames.map(name => ({ value: name, label: name })),
              ]}
            />
          )}
        </div>
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
                <span className="mt-0.5 block truncate text-label text-ink-3">{leadDateTime(lead.created_at)}</span>
                {lead.tags.length > 0 && (
                  <span className="mt-0.5 block truncate text-label text-ink-3">{leadTagsSummary(lead.tags, lead.callback_at)}</span>
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

        <div className="mt-8 border-t border-surface-line pt-4">
          <button
            type="button"
            onClick={() => setTrashOpen(v => !v)}
            className="flex w-full min-h-[44px] items-center justify-between gap-2 text-left"
            aria-expanded={trashOpen}
          >
            <span className="inline-flex items-center gap-2 text-body font-bold text-ink">
              <Trash2 size={18} strokeWidth={2.2} className="text-ink-3" aria-hidden />
              Papelera
              {trashRows.length > 0 && (
                <span className="text-label font-semibold text-ink-3">({trashRows.length}{trashHasMore ? '+' : ''})</span>
              )}
            </span>
            <ChevronDown
              size={18}
              strokeWidth={2.4}
              className={`shrink-0 text-ink-3 transition-transform ${trashOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          {trashOpen && (
            <div className="mt-2">
              {trashRows.length === 0 && !trashPending && (
                <p className="text-label text-ink-3">Vacía. Al borrar un lead desde su ficha, aparece aquí.</p>
              )}
              {trashRows.map(row => (
                <div key={row.id} className="mt-2 rounded-row bg-surface-soft px-3.5 py-3">
                  <p className="truncate text-body font-semibold text-ink">{row.full_name}</p>
                  <p className="mt-0.5 truncate text-label text-ink-2">
                    {row.phone || 'Sin teléfono'}
                    {' · '}
                    Borrado {leadDateTime(row.deleted_at)}
                  </p>
                  {purgeId === row.id ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <p className="w-full text-label font-semibold text-danger-fg">¿Borrar para siempre? No se puede deshacer.</p>
                      <button
                        type="button"
                        disabled={trashPending}
                        onClick={() => runTrash(() => purgeLead(row.id), () => setPurgeId(null))}
                        className="min-h-[40px] rounded-pill bg-danger-fg px-4 text-label font-bold text-white disabled:opacity-50"
                      >
                        Sí, borrar
                      </button>
                      <button
                        type="button"
                        disabled={trashPending}
                        onClick={() => setPurgeId(null)}
                        className="min-h-[40px] rounded-pill bg-surface-card px-4 text-label font-bold text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={trashPending}
                        onClick={() => runTrash(() => restoreLead(row.id))}
                        className="min-h-[40px] rounded-pill bg-surface-card px-4 text-label font-bold text-ink disabled:opacity-50"
                      >
                        Recuperar
                      </button>
                      <button
                        type="button"
                        disabled={trashPending}
                        onClick={() => setPurgeId(row.id)}
                        className="min-h-[40px] rounded-pill px-4 text-label font-bold text-danger-fg disabled:opacity-50"
                      >
                        Borrar definitivo
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {trashHasMore && (
                <button
                  type="button"
                  disabled={trashPending}
                  onClick={() => {
                    const last = trashRows[trashRows.length - 1]?.deleted_at;
                    if (last) refreshTrash(last);
                  }}
                  className="mt-2 min-h-[44px] w-full rounded-pill bg-surface-soft text-label font-bold text-ink disabled:opacity-50"
                >
                  Ver más en papelera
                </button>
              )}
              {trashError && <p className="mt-2 text-label font-semibold text-danger-fg">{trashError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
