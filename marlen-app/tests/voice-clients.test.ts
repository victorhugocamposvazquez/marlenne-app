import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveClient, resolveProvider, scoreClient } from '../lib/voice-clients';

const C = (full_name: string) => ({ full_name });
const BOOK = [
  C('Lucía Pérez'), C('Lucía Gómez'), C('Ana Lucía Ruiz'), C('Rosa María López'), C('Rosario Díaz'),
  C('Marta Sanz'), C('Carmen Ortega'), C('Pilar Campos'), C('Valeria Núñez'),
];
const names = (r: ReturnType<typeof resolveClient<{ full_name: string }>>) =>
  'options' in r ? r.options.map(c => c.full_name) : r.kind === 'one' ? [r.client.full_name] : [];

test('nombre único → una', () => {
  assert.equal(resolveClient(BOOK, 'Marta').kind, 'one');
  assert.deepEqual(names(resolveClient(BOOK, 'marta sanz')), ['Marta Sanz']);
  assert.deepEqual(names(resolveClient(BOOK, 'a Carmen')), ['Carmen Ortega']);
});

test('homónimas → varias, el primer nombre pesa más', () => {
  const r = resolveClient(BOOK, 'Lucía');
  assert.equal(r.kind, 'several');
  assert.deepEqual(names(r), ['Lucía Pérez', 'Lucía Gómez']);
});

test('apellido o inicial decide', () => {
  assert.deepEqual(names(resolveClient(BOOK, 'Lucía Pérez')), ['Lucía Pérez']);
  assert.deepEqual(names(resolveClient(BOOK, 'Lucía P')), ['Lucía Pérez']);
  assert.deepEqual(names(resolveClient(BOOK, 'lucia gomez')), ['Lucía Gómez']);
});

test('dentro de las opciones vale solo el apellido', () => {
  const lucias = BOOK.slice(0, 2);
  assert.deepEqual(names(resolveClient(BOOK, 'Pérez', lucias)), ['Lucía Pérez']);
  assert.deepEqual(names(resolveClient(BOOK, 'la Gómez', lucias)), ['Lucía Gómez']);
  // Y si dicen otra clienta, se busca fuera.
  assert.deepEqual(names(resolveClient(BOOK, 'Marta', lucias)), ['Marta Sanz']);
});

test('dictado sucio → parecida', () => {
  const r = resolveClient(BOOK, 'Lusía');
  assert.equal(r.kind, 'similar');
  assert.ok(names(r).includes('Lucía Pérez'));
  assert.equal(resolveClient(BOOK, 'Valeri').kind, 'one');
  assert.equal(resolveClient(BOOK, 'Balería').kind, 'similar');
});

test('nombre que no está pero suena a otras → parecidas; nada → none', () => {
  const r = resolveClient(BOOK, 'Rosa');
  assert.equal(r.kind, 'one', 'Rosa es prefijo exacto de Rosa María');
  const r2 = resolveClient(BOOK, 'Rosalía');
  assert.equal(r2.kind, 'similar');
  assert.ok(names(r2).includes('Rosario Díaz'));
  assert.equal(resolveClient(BOOK, 'Federico').kind, 'none');
  assert.equal(resolveClient(BOOK, '').kind, 'none');
});

test('scoreClient no pasa por alias de servicios', () => {
  assert.ok(scoreClient('Vacum Pérez', 'vacum') >= 80);
  assert.equal(scoreClient('Lucía Pérez', 'Lucía Pérez'), 100);
});

test('Vale es Valeria; la de láser mira el puesto', () => {
  assert.equal(resolveClient(BOOK, 'Vale').kind, 'one');
  assert.deepEqual(names(resolveClient(BOOK, 'Vale')), ['Valeria Núñez']);
  const team = [
    { full_name: 'Valeria Núñez', job_title: 'Láser' },
    { full_name: 'Ana López', job_title: 'Facial' },
  ];
  const byJob = resolveProvider(team, 'la de láser');
  assert.equal(byJob.kind, 'one');
  if (byJob.kind === 'one') assert.equal(byJob.client.full_name, 'Valeria Núñez');
  const nick = resolveProvider(team, 'con Vale');
  assert.equal(nick.kind, 'one');
});
