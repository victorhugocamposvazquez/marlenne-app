import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clientBatchDeleteBlockedText,
  clientBatchDeletePartialConfirmText,
  deleteImportBatchConfirmText,
  formatImportBatchWhen,
  importBatchSummary,
  type ImportBatchRow,
} from '../lib/import-batch';

const sample: ImportBatchRow = {
  id: 'b1',
  kind: 'clients',
  created_at: '2026-09-21T09:34:00.000Z',
  file_name: 'clientas.xlsx',
  rows_created: 120,
};

test('formatImportBatchWhen usa locale español', () => {
  const s = formatImportBatchWhen(sample.created_at);
  assert.match(s, /2026/);
  assert.match(s, /:\d{2}/);
  assert.match(s, /sept/i);
});

test('importBatchSummary incluye tipo, hora y archivo', () => {
  const s = importBatchSummary(sample);
  assert.match(s, /Clientas/);
  assert.match(s, /120 altas/);
  assert.match(s, /clientas\.xlsx/);
});

test('deleteImportBatchConfirmText avisa si hay citas en clientas', () => {
  const s = deleteImportBatchConfirmText(sample);
  assert.match(s, /120 registros/);
  assert.match(s, /ninguna tiene citas/);
});

test('clientBatchDeleteBlockedText ofrece borrado parcial', () => {
  const s = clientBatchDeleteBlockedText({
    totalClients: 120,
    clientsWithAppointments: 15,
    appointmentCount: 34,
    deletableClients: 105,
    canDeleteAll: false,
  });
  assert.match(s, /15 clientas/);
  assert.match(s, /34 citas/);
  assert.match(s, /105 clientas sin citas/);
});

test('clientBatchDeletePartialConfirmText deja claro qué se queda', () => {
  const s = clientBatchDeletePartialConfirmText(sample, {
    totalClients: 120,
    clientsWithAppointments: 15,
    appointmentCount: 34,
    deletableClients: 105,
    canDeleteAll: false,
  });
  assert.match(s, /105 clientas sin citas/);
  assert.match(s, /15 clientas con citas se quedarán/);
});
