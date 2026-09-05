import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoBusyKey } from '../lib/photos';

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
