import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaColumns, providerAgendaLabel, providerShortLabel } from '../lib/team';
import type { Provider } from '../lib/types';

function person(role: Provider['role'], id = role): Provider {
  return { id, full_name: id, initials: id.slice(0, 1).toUpperCase(), role, job_title: null, color: null };
}

test('con profesionales, solo ellas en la grilla', () => {
  const staff = [person('admin', 'a'), person('provider', 'v'), person('provider', 's')];
  assert.deepEqual(agendaColumns(staff).map(p => p.id), ['v', 's']);
});

test('sin profesionales, el equipo no deja la agenda vacía', () => {
  const staff = [person('admin', 'hugo')];
  assert.deepEqual(agendaColumns(staff).map(p => p.id), ['hugo']);
});

test('equipo vacío sigue vacío', () => {
  assert.deepEqual(agendaColumns([]), []);
});

test('picker de agenda usa el nombre completo guardado', () => {
  const p = { ...person('provider'), full_name: 'Cabina 1', job_title: 'Esteticista' };
  assert.equal(providerAgendaLabel(p), 'Cabina 1');
  assert.equal(providerAgendaLabel({ ...p, full_name: 'Cabina 2' }), 'Cabina 2');
});

test('cabecera y avisos muestran cabina con número', () => {
  assert.equal(providerShortLabel('Cabina 3'), 'Cabina 3');
  assert.equal(providerShortLabel('Iria García'), 'Iria');
});
