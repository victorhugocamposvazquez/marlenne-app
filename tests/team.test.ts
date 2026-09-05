import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaColumns } from '../lib/team';
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
