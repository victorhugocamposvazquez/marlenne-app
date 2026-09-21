import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  deleteImportBatchConfirmText,
  formatImportBatchWhen,
  importBatchSummary,
  importFileLabel,
  type ImportBatchRow,
} from '../lib/import-batch';

const sample: ImportBatchRow = {
  id: 'b1',
  kind: 'session',
  created_at: '2026-09-21T09:34:00.000Z',
  file_name: 'clientas.xlsx',
  rows_created: 198,
  clients_created: 198,
  services_created: 0,
  appointments_created: 0,
};

test('formatImportBatchWhen usa locale español', () => {
  const s = formatImportBatchWhen(sample.created_at);
  assert.match(s, /2026/);
  assert.match(s, /:\d{2}/);
  assert.match(s, /sept/i);
});

test('importBatchSummary muestra sesión unificada', () => {
  const s = importBatchSummary(sample);
  assert.match(s, /Importación/);
  assert.match(s, /198 client@s/);
  assert.match(s, /clientas\.xlsx/);
});

test('importFileLabel junta archivos de la misma acción', () => {
  const s = importFileLabel({ clients: 'a.xlsx', appointments: 'b.csv' });
  assert.equal(s, 'a.xlsx · b.csv');
});

test('deleteImportBatchConfirmText avisa sobre clientas con citas', () => {
  const s = deleteImportBatchConfirmText(sample);
  assert.match(s, /198 client@s/);
  assert.match(s, /citas en agenda/);
});
