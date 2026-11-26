import assert from 'node:assert/strict';
import { test } from 'node:test';
import { graphAfter, metaLeadIsFresh, metaLeadWhen, newestMetaInstant, nextImportCursor } from '../lib/meta-leads-sync';

test('la página de Facebook sigue si Meta devuelve cursor', () => {
  assert.equal(graphAfter({ next: 'https://graph.facebook.com/next', cursors: { after: 'abc' } }), 'abc');
  assert.equal(graphAfter({ cursors: { after: 'abc' } }), null);
  assert.equal(graphAfter(null), null);
});

test('sin cursor se pasa al siguiente formulario y al final se acaba', () => {
  assert.deepEqual(nextImportCursor({ formCount: 2, formAt: 0, pageAfter: 'abc' }), {
    done: false,
    cursor: { formAt: 0, after: 'abc' },
  });
  assert.deepEqual(nextImportCursor({ formCount: 2, formAt: 0, pageAfter: null }), {
    done: false,
    cursor: { formAt: 1, after: null },
  });
  assert.deepEqual(nextImportCursor({ formCount: 2, formAt: 1, pageAfter: null }), { done: true });
});

test('solo un lead reciente dispara el aviso', () => {
  const now = Date.parse('2026-11-26T18:00:00.000Z');
  assert.equal(metaLeadIsFresh('2026-11-26T17:00:00+0000', now), true);
  assert.equal(metaLeadIsFresh('2026-11-20T17:00:00+0000', now), false);
  assert.equal(metaLeadIsFresh('', now), false);
  assert.equal(newestMetaInstant(['2026-11-01T10:00:00+0000', '2026-11-26T12:00:00+0000']), '2026-11-26T12:00:00.000Z');
});

test('la fecha del lead de Meta se guarda en ISO', () => {
  assert.equal(metaLeadWhen('2026-11-01T10:00:00+0000'), '2026-11-01T10:00:00.000Z');
  assert.equal(metaLeadWhen(''), null);
  assert.equal(metaLeadWhen('no-es-fecha'), null);
});
