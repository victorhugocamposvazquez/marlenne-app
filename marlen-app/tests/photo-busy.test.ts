import { test } from 'node:test';
import assert from 'node:assert/strict';
import { photoBusyKey, photoChoices, photoObjectPath, groupPhotosByTreatment } from '../lib/photos';

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
  assert.deepEqual(none.map(c => c.label), ['Láser', 'Ficha (sin vincular a un tratamiento)']);
  assert.equal(none[0].serviceId, 's1');

  const withTx = photoChoices(
    [{ id: 't1', serviceId: 's1', name: 'Láser', zone: 'Axila', closed: false, sessionsDone: 0 }],
    [{ id: 's1', name: 'Láser', category: 'corporal' }, { id: 's3', name: 'HIFU', category: 'corporal' }],
  );
  assert.deepEqual(withTx.map(c => c.key), ['t:t1', 's:s3', 'client']);
});

test('las fotos se agrupan por tratamiento y sesión, antes delante', () => {
  const albums = groupPhotosByTreatment(
    [
      {
        id: 't1',
        title: 'HIFU',
        photos: [
          { id: 'a', kind: 'after', zone: 'Rostro', session_no: 2, storage_path: 't1/a.jpg', taken_at: '2026-11-02T10:00:00Z' },
          { id: 'b', kind: 'before', zone: 'Rostro', session_no: 2, storage_path: 't1/b.jpg', taken_at: '2026-11-02T09:00:00Z' },
          { id: 'c', kind: 'before', zone: 'Cuello', session_no: 1, storage_path: 't1/c.jpg', taken_at: '2026-10-01T09:00:00Z' },
        ],
      },
      {
        id: 't2',
        title: 'Láser',
        photos: [
          { id: 'd', kind: 'after', zone: null, session_no: 1, storage_path: 't2/d.jpg', taken_at: '2026-11-20T09:00:00Z' },
        ],
      },
    ],
    [
      { id: 'e', kind: 'before', zone: null, session_no: null, storage_path: 'c/e.jpg', taken_at: '2026-11-10T09:00:00Z' },
    ],
  );
  assert.deepEqual(albums.map(a => a.title), ['Láser', 'Sin tratamiento', 'HIFU']);
  assert.equal(albums[2].sessions.length, 2);
  assert.deepEqual(albums[2].sessions[0].photos.map(p => p.id), ['b', 'a']);
  assert.equal(albums[1].treatmentId, '');
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
