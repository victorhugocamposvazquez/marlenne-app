import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaColumns, agendaNameForImportLabel, providerAgendaLabel, providerShortLabel } from '../lib/team';
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

test('import: persona con cabin_id resuelve a la cabina', () => {
  const staff = [
    { id: 'c1', full_name: 'Cabina 1', initials: null, role: 'provider' as const, job_title: null, color: null },
    { id: 'c2', full_name: 'Cabina 2', initials: null, role: 'provider' as const, job_title: null, color: null },
    { id: 't', full_name: 'Tere Anllo', initials: null, role: 'admin' as const, job_title: null, color: null, cabin_id: 'c1' },
    { id: 'i', full_name: 'Iria ferreiro', initials: null, role: 'admin' as const, job_title: null, color: null, cabin_id: 'c2' },
    { id: 'r', full_name: 'Recepción', initials: null, role: 'reception' as const, job_title: null, color: null, cabin_id: null },
  ];
  assert.equal(agendaNameForImportLabel('Tere Anllo', staff), 'Cabina 1');
  assert.equal(agendaNameForImportLabel('Iria Ferreiro', staff), 'Cabina 2');
  assert.equal(agendaNameForImportLabel('Cabina 1', staff), 'Cabina 1');
  assert.equal(agendaNameForImportLabel('Recepción', staff), '');
});

test('cabecera y avisos muestran cabina con número', () => {
  assert.equal(providerShortLabel('Cabina 3'), 'Cabina 3');
  assert.equal(providerShortLabel('Iria García'), 'Iria');
});
