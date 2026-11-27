import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoBusyKey, photoChoices, photoObjectPath } from '../lib/photos';

test('photoBusyKey distingue lado y sesión', () => {
  const a = photoBusyKey({ treatmentId: 't1', kind: 'before', zone: 'Abdomen', sessionNo: 3 });
  const b = photoBusyKey({ treatmentId: 't1', kind: 'after', zone: 'Abdomen', sessionNo: 3 });
  const c = photoBusyKey({ treatmentId: 't1', kind: 'after', zone: 'Abdomen', sessionNo: 0 });
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.equal(
    photoBusyKey({ treatmentId: 't1', kind: 'after' }),
    photoBusyKey({ treatmentId: 't1', kind: 'after', sessionNo: 0 }),
  );
});

test('sin cita, la lista sigue siendo de tratamientos o servicios', () => {
  const none = photoChoices([], [
    { id: 's1', name: 'Láser', category: 'corporal' },
    { id: 's2', name: 'Valoración', category: 'valoracion' },
  ]);
  assert.deepEqual(none.map(c => c.label), ['Láser']);
  assert.equal(none[0].serviceId, 's1');

  const withTx = photoChoices(
    [{ id: 't1', serviceId: 's1', name: 'Láser', zone: 'Axila', closed: false, sessionsDone: 0 }],
    [{ id: 's1', name: 'Láser', category: 'corporal' }, { id: 's3', name: 'HIFU', category: 'corporal' }],
  );
  assert.deepEqual(withTx.map(c => c.key), ['t:t1', 's:s3']);
});

test('photoObjectPath guarda en la clienta si no hay tratamiento', () => {
  assert.equal(
    photoObjectPath({ clientId: 'c1', kind: 'before' }, 10),
    'client/c1/before-10.jpg',
  );
  assert.equal(
    photoObjectPath({ treatmentId: 't1', clientId: 'c1', kind: 'after' }, 10),
    't1/after-10.jpg',
  );
  assert.equal(photoObjectPath({ kind: 'before' }, 10), '');
});
