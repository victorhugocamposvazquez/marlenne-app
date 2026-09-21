import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import { buildPreview, previewClients, CSV_TEMPLATES } from '../lib/csv-import';
import { readImportBuffer } from '../lib/import-file';

test('solo clientas: preview y conteos', () => {
  const preview = buildPreview({
    clientsCsv: CSV_TEMPLATES.clientas,
    existing: { services: [], clients: [], staff: [], appointments: [], blocks: [] },
  });
  assert.equal(preview.fileErrors.length, 0);
  assert.equal(preview.counts.clientsNew, 1);
  assert.equal(preview.clients[0]?.full_name, 'Ana Pérez');
});

test('clientas duplicadas por teléfono se saltan', () => {
  const preview = buildPreview({
    clientsCsv: CSV_TEMPLATES.clientas,
    existing: {
      services: [],
      clients: [{ id: 'c1', full_name: 'Ana Vieja', phone: '+34612480331' }],
      staff: [],
      appointments: [],
      blocks: [],
    },
  });
  assert.equal(preview.counts.clientsNew, 0);
  assert.equal(preview.counts.clientsSkip, 1);
});

test('acepta cabeceras habituales de export (nombre completo, móvil)', () => {
  const csv = 'Nombre completo;Móvil;Email\nLucía García;612111222;lucia@test.com\n';
  const rows = previewClients(csv, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.full_name, 'Lucía García');
  assert.equal(rows[0]?.phone, '612111222');
  assert.equal(rows[0]?.action, 'create');
});

test('une nombre y apellidos si no hay columna completa', () => {
  const csv = 'Nombre;Apellidos;Teléfono\nMaría;López;612000111\n';
  const rows = previewClients(csv, []);
  assert.equal(rows[0]?.full_name, 'María López');
  assert.equal(rows[0]?.action, 'create');
});

test('lee Excel (.xlsx) y convierte a clientas', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nombre completo', 'Móvil', 'Email'],
    ['Elena Ruiz', '612999888', 'elena@test.com'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const csv = readImportBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'clientes.xlsx');
  const preview = buildPreview({
    clientsCsv: csv,
    existing: { services: [], clients: [], staff: [], appointments: [], blocks: [] },
  });
  assert.equal(preview.counts.clientsNew, 1);
  assert.equal(preview.clients[0]?.full_name, 'Elena Ruiz');
});

test('sin ningún archivo devuelve error claro', () => {
  const preview = buildPreview({
    existing: { services: [], clients: [], staff: [], appointments: [], blocks: [] },
  });
  assert.ok(preview.fileErrors.some(e => e.includes('al menos un archivo')));
});
