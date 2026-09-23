import assert from 'node:assert/strict';
import { test } from 'node:test';
import { offsetFromDay } from '../lib/time';
import {
  isStaffReminderDue,
  providerFirstName,
  staffReminderTitle,
  staffReminderUrl,
} from '../lib/staff-reminder';

test('el aviso nombra a la clienta y a quien atiende', () => {
  assert.equal(
    staffReminderTitle('Manuela Lopez', 'Iria García', 30),
    'Cita con Manuela Lopez en 30 minutos - con Iria',
  );
});

test('un minuto va en singular', () => {
  assert.equal(
    staffReminderTitle('Ana', 'Leo', 1),
    'Cita con Ana en 1 minuto - con Leo',
  );
});

test('sin nombre de profesional cae en el equipo', () => {
  assert.equal(providerFirstName('   '), 'el equipo');
  assert.equal(
    staffReminderTitle('Ana', '', 12),
    'Cita con Ana en 12 minutos - con el equipo',
  );
});

test('el toque abre la ficha de esa cita', () => {
  assert.equal(staffReminderUrl('abc-123'), '/agenda?appt=abc-123');
});

test('el toque abre el día de la cita', () => {
  const starts = '2026-09-23T16:00:00.000Z';
  const url = new URL(staffReminderUrl('abc-123', starts), 'https://marlenne-app.vercel.app');
  assert.equal(url.searchParams.get('appt'), 'abc-123');
  assert.equal(url.searchParams.get('day'), String(offsetFromDay(starts)));
});

test('la ventana es desde ahora hasta 30 minutos', () => {
  const now = new Date('2026-09-23T10:00:00.000Z');
  assert.equal(isStaffReminderDue(new Date('2026-09-23T10:30:00.000Z'), now), true);
  assert.equal(isStaffReminderDue(new Date('2026-09-23T10:30:01.000Z'), now), false);
  assert.equal(isStaffReminderDue(new Date('2026-09-23T10:00:00.000Z'), now), false);
  assert.equal(isStaffReminderDue(new Date('2026-09-23T09:50:00.000Z'), now), false);
});
