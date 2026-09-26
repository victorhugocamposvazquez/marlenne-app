'use server';

import {
  CLIENT_LIST_PAGE,
  findSimilarClients,
  getClientPickerOption,
  listClientsPage,
  searchClientPicker,
  searchClientsPage,
} from '@/lib/clients-list-page';
import type { ClientListRow, ClientOption } from '@/lib/types';

export async function loadClientsPage(
  offset: number,
  limit = CLIENT_LIST_PAGE,
  query?: string,
): Promise<{ rows: ClientListRow[]; total: number; nextOffset: number }> {
  const q = query?.trim() ?? '';
  const page = q.length >= 2
    ? await searchClientsPage(q, offset, limit)
    : await listClientsPage(offset, limit);
  const nextOffset = offset + page.rows.length;
  return { ...page, nextOffset };
}

export async function loadSimilarClients(name: string, phone: string): Promise<ClientOption[]> {
  return findSimilarClients(name, phone);
}

export async function loadClientPickerSearch(query: string): Promise<ClientOption[]> {
  return searchClientPicker(query);
}

export async function loadClientPickerById(id: string): Promise<ClientOption | null> {
  return getClientPickerOption(id);
}
