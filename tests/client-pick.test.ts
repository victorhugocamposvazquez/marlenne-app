import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterClientOptions } from '../lib/client-pick';
import type { ClientOption } from '../lib/types';

const clients: ClientOption[] = [
  { id: '1', full_name: 'Lucía Ferrer', phone: '600111222' },
  { id: '2', full_name: 'Alba Santamaría', phone: '600333444' },
  { id: '3', full_name: 'Carmen Ruiz', phone: null },
];

test('sin texto, salen todas las clientas', () => {
  assert.equal(filterClientOptions(clients, '').length, 3);
});

test('filtra por nombre sin importar acentos', () => {
  const r = filterClientOptions(clients, 'lucia');
  assert.deepEqual(r.map(c => c.id), ['1']);
});

test('filtra por teléfono a partir de 3 dígitos', () => {
  const r = filterClientOptions(clients, '6003');
  assert.deepEqual(r.map(c => c.id), ['2']);
});
