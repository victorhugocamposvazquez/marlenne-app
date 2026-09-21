import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
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

test('deleteImportBatchConfirmText avisa sobre citas en clientas', () => {
  const s = deleteImportBatchConfirmText(sample);
  assert.match(s, /120 registros/);
  assert.match(s, /solo con el nombre/);
});
