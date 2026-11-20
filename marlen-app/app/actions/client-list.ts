'use server';

import { CLIENT_LIST_PAGE } from '@/lib/client-list-size';
import {
  countClientsSearch,
  findSimilarClients,
  getClientPickerOption,
  listClientPickerInitial,
  listClientsPage,
  searchClientPicker,
  searchClientsPage,
} from '@/lib/clients-list-page';
import type { ClientListRow, ClientOption } from '@/lib/types';

export async function loadClientsPage(
  offset: number,
  limit = CLIENT_LIST_PAGE,
  query?: string,
): Promise<{ rows: ClientListRow[]; total: number; exact: boolean; nextOffset: number }> {
  const q = query?.trim() ?? '';
  if (q.length >= 2) {
    const page = await searchClientsPage(q, offset, limit);
    const nextOffset = offset + page.rows.length;
    return { rows: page.rows, total: nextOffset, exact: false, nextOffset };
  }
  const page = await listClientsPage(offset, limit);
  const nextOffset = offset + page.rows.length;
  return { rows: page.rows, total: page.total, exact: true, nextOffset };
}

export async function countClientSearch(query: string): Promise<number | null> {
  return countClientsSearch(query);
}

export async function loadSimilarClients(name: string, phone: string): Promise<ClientOption[]> {
  return findSimilarClients(name, phone);
}

export async function loadClientPickerSearch(query: string): Promise<ClientOption[]> {
  return searchClientPicker(query);
}

export async function loadClientPickerInitial(limit = 40): Promise<ClientOption[]> {
  return listClientPickerInitial(limit);
}

export async function loadClientPickerById(id: string): Promise<ClientOption | null> {
  return getClientPickerOption(id);
}
