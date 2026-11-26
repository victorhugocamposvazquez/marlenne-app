import type { LeadsListGroup } from '@/lib/leads-list-group';
import type { LeadTone } from '@/lib/leads';

export type LeadsToneFilter = 'todas' | LeadTone;

export type LeadsListFilter = {
  before?: string | null;
  tone?: LeadsToneFilter;
  groupKind?: LeadsListGroup;
  groupName?: string | null;
  q?: string;
};

export function normalizeLeadsListFilter(input?: string | null | LeadsListFilter): LeadsListFilter {
  if (input === null || input === undefined || typeof input === 'string') {
    return { before: input ?? undefined };
  }
  return input;
}