import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LEAD_PUSH_TITLE,
  formatLeadDay,
  leadFieldsFromMeta,
  leadFormRowsFromMeta,
  leadPushCopy,
  leadPushUrl,
  leadTagLabel,
  leadTagsSummary,
  leadTone,
  leadAdTitle,
  normalizeLeadDay,
  renderLeadTemplate,
  resolveLeadTemplate,
} from '../lib/leads';

test('las etiquetas tienen nombre y la de volver a llamar puede llevar día', () => {
  assert.equal(leadTagLabel('volver'), 'Volver a llamar');
  assert.equal(leadTagLabel('no_responde'), 'No responde');
  assert.equal(leadTagLabel('Prueba'), 'Prueba');
  assert.equal(formatLeadDay('2026-11-28'), '28 nov');
  assert.equal(formatLeadDay('ayer'), '');
  assert.equal(normalizeLeadDay('2026-11-28T10:00'), '2026-11-28');
  assert.equal(normalizeLeadDay(''), null);
  assert.equal(
    leadTagsSummary(['volver', 'quiere_cita'], '2026-12-02'),
    'Volver a llamar · 2 dic · Quiere cita',
  );
  assert.equal(leadTagsSummary(['volver'], null), 'Volver a llamar');
});

test('el color sigue al último contacto', () => {
  assert.equal(leadTone(null), 'none');
  assert.equal(leadTone('call'), 'call');
  assert.equal(leadTone('whatsapp'), 'whatsapp');
  assert.equal(leadTone('otro'), 'none');
});

test('la plantilla del anuncio gana a la de la campaña y a la del centro', () => {
  assert.equal(resolveLeadTemplate({ ad: 'Del anuncio', campaign: 'De la campaña', salon: 'Del centro' }).scope, 'ad');
  assert.equal(resolveLeadTemplate({ campaign: 'De la campaña', salon: 'Del centro' }).body, 'De la campaña');
  assert.equal(resolveLeadTemplate({ salon: '  ' }).body.includes('{{nombre}}'), true);
});

test('el mensaje rellena nombre, campaña y anuncio', () => {
  const text = renderLeadTemplate(
    'Hola {{nombre}}, vi {{anuncio}} de {{campaña}} en {{centro}}.',
    { nombre: 'Lucía Campos', campana: 'Noviembre', anuncio: 'Láser', centro: 'Arlett' },
  );
  assert.equal(text, 'Hola Lucía, vi LÁSER de Noviembre en Arlett.');
});

test('el titular del anuncio va en mayúsculas', () => {
  assert.equal(leadAdTitle('Limpieza facial'), 'LIMPIEZA FACIAL');
  assert.equal(leadAdTitle('Título', 'nombre meta'), 'TÍTULO');
});

test('el push nombra al lead y abre su ficha', () => {
  assert.deepEqual(leadPushCopy({ name: 'Lucía', campaign: 'Noviembre', ad: 'Láser' }), {
    title: LEAD_PUSH_TITLE,
    body: 'Lucía · Láser',
  });
  assert.deepEqual(leadPushCopy({
    name: 'Lucía',
    ad: 'Láser',
    phone: '+34600111222',
    fromMeta: true,
  }), {
    title: LEAD_PUSH_TITLE,
    body: 'Meta · Lucía · Láser · +34600111222',
  });
  assert.equal(leadPushUrl('abc'), '/leads/abc');
});

test('expone todas las respuestas del formulario con etiquetas', () => {
  const rows = leadFormRowsFromMeta([
    { name: 'full_name', values: ['Ana'] },
    { name: 'city', values: ['Madrid'] },
    { name: 'pregunta_personalizada', values: ['Quiero más info'] },
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows[1].label, 'Ciudad');
  assert.equal(rows[2].label, 'Pregunta personalizada');
});

test('lee nombre y teléfono del formulario de Meta', () => {
  const lead = leadFieldsFromMeta([
    { name: 'first_name', values: ['Lucía'] },
    { name: 'last_name', values: ['Campos'] },
    { name: 'phone_number', values: ['+34 600 111 222'] },
    { name: 'email', values: ['lucia@ejemplo.com'] },
  ]);
  assert.equal(lead.fullName, 'Lucía Campos');
  assert.equal(lead.phone, '+34 600 111 222');
  assert.equal(lead.email, 'lucia@ejemplo.com');
});
