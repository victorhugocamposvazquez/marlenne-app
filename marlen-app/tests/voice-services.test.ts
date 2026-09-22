import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseVariantSpec, resolveService, serviceBase, variantLabel, variantQuestion } from '../lib/voice-services';
import { stitchVoice } from '../lib/voice-stitch';

type S = { name: string; duration_min: number; category: string | null };

const S = (name: string, duration_min: number, category: string): S => ({ name, duration_min, category });

const CATALOG: S[] = [
  S('Radiofrecuencia', 30, 'corporal'),
  S('Criolipólisis', 60, 'corporal'),
  S('Criolipólisis - 2 h', 120, 'corporal'),
  S('Cavitación', 30, 'corporal'),
  S('Presoterapia', 30, 'corporal'),
  S('Vacumterapia', 30, 'corporal'),
  S('Vacumterapia - 1 hora', 60, 'corporal'),
  S('Vacumterapia + cavitación', 45, 'corporal'),
  S('Onnafit Corporal', 60, 'corporal'),
  S('Lipoláser', 60, 'corporal'),
  S('Core fit - 45 min', 45, 'corporal'),
  S('Facial radiance lifting - 45 m', 45, 'facial'),
  S('Facial radiance lifting', 60, 'facial'),
  S('Resurfacing', 60, 'facial'),
  S('Tratamiento express', 60, 'facial'),
  S('Purifying', 60, 'facial'),
  S('Facial Bloom', 90, 'facial'),
  S('HIFU - 1 hora', 60, 'facial'),
  S('D. Láser - 15 min', 15, 'laser'),
  S('D. Láser - 30 min', 30, 'laser'),
  S('D. Láser - 1 hora', 60, 'laser'),
  S('D. Láser - 1 h 30 min', 90, 'laser'),
  S('D. Láser - 2 horas', 120, 'laser'),
  S('D. Láser - 3 horas', 180, 'laser'),
  S('Microblading - 30 min', 30, 'micro'),
  S('Microblading - 90 min', 90, 'micro'),
  S('Masaje relajante', 60, 'bienestar'),
  S('Valoración gratuita criolipólisis', 15, 'valoracion'),
  S('Valoración criolipólisis', 15, 'valoracion'),
  S('Valoración HIFU', 15, 'valoracion'),
  S('Valoración facial', 15, 'valoracion'),
  S('Valoración corporal', 15, 'valoracion'),
  S('Info / asesoramiento', 60, 'valoracion'),
];

const one = (q: string, within?: S[]) => {
  const r = resolveService(CATALOG, q, within ?? null);
  assert.equal(r.kind, 'one', `${q} → ${r.kind}${'options' in r ? `: ${r.options.map(s => s.name).join(' | ')}` : ''}`);
  return r.kind === 'one' ? r.service.name : '';
};
const names = (r: ReturnType<typeof resolveService<S>>) =>
  r.kind === 'variants' || r.kind === 'list' ? r.options.map(s => s.name) : [];

test('serviceBase quita la variante', () => {
  assert.equal(serviceBase('D. Láser - 1 h 30 min'), 'D. Láser');
  assert.equal(serviceBase('Vacumterapia + cavitación'), 'Vacumterapia');
  assert.equal(serviceBase('Info / asesoramiento'), 'Info / asesoramiento');
});

test('duración con palabras y números', () => {
  assert.equal(parseVariantSpec('láser de una hora').durationMin, 60);
  assert.equal(parseVariantSpec('la de media hora').durationMin, 30);
  assert.equal(parseVariantSpec('hora y media').durationMin, 90);
  assert.equal(parseVariantSpec('la de dos horas').durationMin, 120);
  assert.equal(parseVariantSpec('45 minutos').durationMin, 45);
  assert.equal(parseVariantSpec('cuarto de hora').durationMin, 15);
  assert.equal(parseVariantSpec('90 minutos').durationMin, 90);
});

test('la última duración manda', () => {
  const s = parseVariantSpec('Vacumterapia - 1 hora la de media hora');
  assert.equal(s.durationMin, 30);
  assert.equal(s.rest, 'vacumterapia');
});

test('cavitación como variante o como tratamiento', () => {
  assert.partialDeepStrictEqual(parseVariantSpec('vacum con cavitación'), { cavit: true, rest: 'vacum' });
  assert.partialDeepStrictEqual(parseVariantSpec('vacumterapia cavitación'), { cavit: true, rest: 'vacumterapia' });
  assert.partialDeepStrictEqual(parseVariantSpec('cavitación'), { cavit: null, rest: 'cavitacion' });
  assert.equal(parseVariantSpec('sin cavitación').cavit, false);
});

test('corta, larga, normal', () => {
  assert.equal(parseVariantSpec('la corta').size, 'short');
  assert.equal(parseVariantSpec('la más larga').size, 'long');
  assert.equal(parseVariantSpec('la normal').size, 'base');
  assert.equal(parseVariantSpec('da igual').size, 'base');
});

test('nombre completo tal cual', () => {
  assert.equal(one('D. Láser - 30 min'), 'D. Láser - 30 min');
  assert.equal(one('Vacumterapia + cavitación'), 'Vacumterapia + cavitación');
});

test('familia con una sola opción', () => {
  assert.equal(one('presoterapia'), 'Presoterapia');
  assert.equal(one('preso'), 'Presoterapia');
  assert.equal(one('hifu'), 'HIFU - 1 hora');
  assert.equal(one('masaje'), 'Masaje relajante');
  assert.equal(one('cavitación'), 'Cavitación');
  assert.equal(one('radiofrecuencia'), 'Radiofrecuencia');
  assert.equal(one('express'), 'Tratamiento express');
  assert.equal(one('bloom'), 'Facial Bloom');
  assert.equal(one('valoración hifu'), 'Valoración HIFU');
  assert.equal(one('valoración de criolipólisis'), 'Valoración criolipólisis');
  assert.equal(one('valoración gratuita'), 'Valoración gratuita criolipólisis');
});

test('familia + duración → una', () => {
  assert.equal(one('láser una hora'), 'D. Láser - 1 hora');
  assert.equal(one('láser de media hora'), 'D. Láser - 30 min');
  assert.equal(one('depilación láser hora y media'), 'D. Láser - 1 h 30 min');
  assert.equal(one('láser 3 horas'), 'D. Láser - 3 horas');
  assert.equal(one('vacum una hora'), 'Vacumterapia - 1 hora');
  assert.equal(one('vacumterapia con cavitación'), 'Vacumterapia + cavitación');
  assert.equal(one('vacumterapia normal'), 'Vacumterapia');
  assert.equal(one('crio de dos horas'), 'Criolipólisis - 2 h');
  assert.equal(one('lifting de tres cuartos'), 'Facial radiance lifting - 45 m');
  assert.equal(one('microblading 90 minutos'), 'Microblading - 90 min');
});

test('como lo oye el dictado', () => {
  assert.equal(one('con terapia de una hora'), 'Vacumterapia - 1 hora');
  assert.equal(resolveService(CATALOG, 'bakum terapia').kind, 'variants');
  assert.equal(one('bakum terapia media hora'), 'Vacumterapia');
});

test('vacum sin más → tres variantes de la familia', () => {
  const r = resolveService(CATALOG, 'vacum');
  assert.equal(r.kind, 'variants');
  assert.equal(r.kind === 'variants' && r.base, 'Vacumterapia');
  assert.deepEqual(names(r), ['Vacumterapia', 'Vacumterapia - 1 hora', 'Vacumterapia + cavitación']);
});

test('la familia a secas pregunta aunque exista como servicio', () => {
  assert.equal(resolveService(CATALOG, 'Vacumterapia').kind, 'variants');
  assert.equal(resolveService(CATALOG, 'Criolipólisis').kind, 'variants');
});

test('láser → familia D. Láser, no Lipoláser', () => {
  const r = resolveService(CATALOG, 'láser');
  assert.equal(r.kind, 'variants');
  assert.equal(names(r).length, 6);
});

test('micro → microblading', () => {
  assert.deepEqual(names(resolveService(CATALOG, 'micro')), ['Microblading - 30 min', 'Microblading - 90 min']);
});

test('etiquetas con la duración real y oído cosido', () => {
  const fam = CATALOG.filter(s => serviceBase(s.name) === 'Criolipólisis');
  assert.deepEqual(fam.map(s => variantLabel(s, fam)), ['de una hora', 'de dos horas']);
  const vac = CATALOG.filter(s => serviceBase(s.name) === 'Vacumterapia');
  assert.deepEqual(vac.map(s => variantLabel(s, vac)), ['de media hora', 'de una hora', 'con cavitación']);
  const q = variantQuestion('Vacumterapia', vac);
  assert.equal(q.ear, '¿De media hora, de una hora o con cavitación?');
  assert.equal(q.say, 'Vacumterapia: ¿de media hora, de una hora o con cavitación?');
  assert.deepEqual(stitchVoice(q.ear), [
    '/voice/de-media-hora.mp3',
    'pause:140',
    '/voice/de-una-hora.mp3',
    '/voice/o.mp3',
    '/voice/con-cavitacion.mp3',
  ]);
  assert.deepEqual(stitchVoice('¿De una hora o de dos horas?'), [
    '/voice/de-una-hora.mp3',
    '/voice/o.mp3',
    '/voice/de-dos-horas.mp3',
  ]);
});

test('respuesta a la pregunta: solo la variante', () => {
  const vac = CATALOG.filter(s => serviceBase(s.name) === 'Vacumterapia');
  const laser = CATALOG.filter(s => serviceBase(s.name) === 'D. Láser');
  assert.equal(one('la de una hora', vac), 'Vacumterapia - 1 hora');
  assert.equal(one('media hora', vac), 'Vacumterapia');
  assert.equal(one('con cavitación', vac), 'Vacumterapia + cavitación');
  assert.equal(one('la normal', vac), 'Vacumterapia');
  assert.equal(one('da igual', vac), 'Vacumterapia');
  assert.equal(one('la corta', laser), 'D. Láser - 15 min');
  assert.equal(one('la larga', laser), 'D. Láser - 3 horas');
  assert.equal(one('treinta', laser), 'D. Láser - 30 min');
  assert.equal(one('de dos horas', laser), 'D. Láser - 2 horas');
});

test('respuesta con nombre nuevo fuera de las opciones', () => {
  const vac = CATALOG.filter(s => serviceBase(s.name) === 'Vacumterapia');
  const laser = CATALOG.filter(s => serviceBase(s.name) === 'D. Láser');
  assert.equal(one('mejor presoterapia', vac), 'Presoterapia');
  assert.equal(one('hifu', laser), 'HIFU - 1 hora');
});

test('respuesta que no es nada → none (el servidor reofrece las mismas opciones)', () => {
  const laser = CATALOG.filter(s => serviceBase(s.name) === 'D. Láser');
  assert.equal(resolveService(CATALOG, 'la de cinco horas', laser).kind, 'none');
});

test('con cavitación sin opciones delante', () => {
  assert.equal(one('con cavitación'), 'Vacumterapia + cavitación');
});

test('chip de familia dentro de una categoría → pregunta variante', () => {
  const facial = CATALOG.filter(s => s.category === 'facial');
  const r = resolveService(CATALOG, 'Facial radiance lifting', facial);
  assert.equal(r.kind, 'variants');
  assert.equal(names(r).length, 2);
});

test('facial → lista con título', () => {
  const r = resolveService(CATALOG, 'facial');
  assert.equal(r.kind, 'list');
  if (r.kind === 'list') {
    assert.equal(r.title, 'Facial');
    assert.ok(r.families.includes('Facial radiance lifting'));
    assert.ok(r.families.includes('HIFU'));
    assert.ok(!r.families.includes('Valoración facial'));
  }
});

test('valoración → las seis', () => {
  const r = resolveService(CATALOG, 'valoración');
  assert.equal(r.kind, 'list');
  assert.equal(names(r).length, 6);
});

test('basura → none', () => {
  assert.equal(resolveService(CATALOG, 'patatas fritas').kind, 'none');
  assert.equal(resolveService(CATALOG, '').kind, 'none');
});
