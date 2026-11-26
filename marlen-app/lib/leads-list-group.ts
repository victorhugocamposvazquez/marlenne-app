export type LeadsListGroup = 'campaign' | 'ad';

export function parseLeadsListGroup(value: string | null | undefined): LeadsListGroup {
  return value === 'ad' ? 'ad' : 'campaign';
}