import assert from 'node:assert/strict';
import { test } from 'node:test';
import { servicePickSections, serviceShortcuts } from '../lib/service-pick';
import type { ServiceOption } from '../lib/types';

const s = (id: string, name: string, category: string): ServiceOption => ({
  id, name, category, duration_min: 30, price_cents: 2000,
});

const catalog = [
  s('laser', 'Láser piernas', 'laser'),
  s('facial', 'Limpieza facial', 'facial'),
  s('corpo', 'Presoterapia', 'corporal'),
  s('cejas', 'Cejas', 'micro'),
];

test('el último va primero', () => {
  const [first] = servicePickSections(catalog, { lastId: 'cejas' });
  assert.equal(first.key, 'last');
  assert.equal(first.items[0].id, 'cejas');
});

test('los más pedidos van después del último, sin repetirlo', () => {
  const sections = servicePickSections(catalog, {
    lastId: 'laser',
    counts: { corpo: 12, laser: 40, facial: 8, cejas: 3 },
  });
  assert.equal(sections[0].items[0].id, 'laser');
  assert.deepEqual(sections[1].items.map(i => i.id), ['corpo', 'facial', 'cejas']);
  assert.ok(!sections.slice(2).some(sec => sec.items.some(i => i.id === 'laser')));
});

test('la tira rápida junta último y más pedidos', () => {
  const row = serviceShortcuts(catalog, {
    lastId: 'laser',
    counts: { corpo: 12, facial: 8, cejas: 3 },
  });
  assert.deepEqual(row.map(i => i.id), ['laser', 'corpo', 'facial', 'cejas']);
});

test('la búsqueda recorta último y más pedidos', () => {
  const sections = servicePickSections(catalog, {
    lastId: 'laser',
    counts: { corpo: 12, facial: 8 },
    query: 'facial',
  });
  assert.equal(sections[0].title, 'Más pedidos');
  assert.deepEqual(sections[0].items.map(i => i.id), ['facial']);
  assert.ok(!sections.some(sec => sec.items.some(i => i.id === 'laser')));
});
