import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthCells,
  personalSalonIdFromPrefs,
  shiftMonth,
  taskBucket,
  workspaceFromPrefs,
} from '../lib/personal-tasks';

describe('cuenta personal', () => {
  const today = '2026-09-21';

  it('lee el espacio activo', () => {
    assert.equal(workspaceFromPrefs(null), 'company');
    assert.equal(workspaceFromPrefs({ workspace: 'personal' }), 'personal');
    assert.equal(workspaceFromPrefs({ workspace: 'otro' }), 'company');
    assert.equal(personalSalonIdFromPrefs({ personal_salon_id: 'abc' }), 'abc');
    assert.equal(personalSalonIdFromPrefs({}), null);
  });

  it('agrupa por hoy, mañana, esta semana y hechas', () => {
    const at = (day: string) => `${day}T10:00:00.000Z`;
    assert.equal(taskBucket({ due_at: at('2026-09-20'), done_at: null }, today), 'hoy');
    assert.equal(taskBucket({ due_at: at(today), done_at: null }, today), 'hoy');
    assert.equal(taskBucket({ due_at: at('2026-09-22'), done_at: null }, today), 'manana');
    assert.equal(taskBucket({ due_at: at('2026-09-25'), done_at: null }, today), 'semana');
    assert.equal(taskBucket({ due_at: null, done_at: null }, today), 'semana');
    assert.equal(taskBucket({ due_at: at('2026-09-28'), done_at: null }, today), 'despues');
    assert.equal(taskBucket({ due_at: at('2026-09-25'), done_at: at(today) }, today), 'hechas');
  });

  it('arma el mes empezando en lunes', () => {
    const cells = monthCells(2026, 9);
    assert.equal(cells.length % 7, 0);
    assert.equal(cells[0].key, '2026-08-31');
    assert.equal(cells[0].inMonth, false);
    assert.equal(shiftMonth(2026, 12, 1).year, 2027);
    assert.equal(shiftMonth(2026, 12, 1).month, 1);
  });
});