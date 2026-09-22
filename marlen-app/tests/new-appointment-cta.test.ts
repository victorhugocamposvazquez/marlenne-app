import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newAppointmentCta } from '../lib/new-appointment-cta';

test('con hora ya marcada, el botón es Guardar cita', () => {
  const r = newAppointmentCta({
    missingClient: false,
    missingService: false,
    hasTime: true,
    pending: false,
    step: 'who',
  });
  assert.equal(r.label, 'Guardar cita');
  assert.equal(r.kind, 'save');
});

test('sin hora, en quién pide Elegir hora', () => {
  const r = newAppointmentCta({
    missingClient: false,
    missingService: false,
    hasTime: false,
    pending: false,
    step: 'who',
  });
  assert.equal(r.label, 'Elegir hora');
  assert.equal(r.kind, 'time');
});

test('falta el servicio antes que la hora', () => {
  const r = newAppointmentCta({
    missingClient: false,
    missingService: true,
    hasTime: true,
    pending: false,
    step: 'who',
  });
  assert.equal(r.label, 'Elige el servicio');
  assert.equal(r.kind, 'service');
});
