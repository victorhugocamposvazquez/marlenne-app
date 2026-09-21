import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import { buildPreview, parseImportPhone, previewClients, CSV_TEMPLATES } from '../lib/csv-import';
import { readImportBuffer } from '../lib/import-file';
import * as fs from 'node:fs';

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

test('parseImportPhone limpia prefijo de Excel y espacios', () => {
  assert.equal(parseImportPhone("'+34 649 92 88 41"), '34649928841');
  assert.equal(parseImportPhone('612 480 331'), '612480331');
});

test('SimplyBook xls: salta cabecera del informe y lee teléfonos', () => {
  const path = '/Users/hugocamposvazquez/Downloads/5374324776ab0fc12b55243.25337096.xls';
  if (!fs.existsSync(path)) return;
  const buf = fs.readFileSync(path);
  const csv = readImportBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'clientas.xls');
  const clients = previewClients(csv, []);
  const withPhone = clients.filter(c => c.phone?.trim());
  assert.ok(clients.length >= 1800);
  assert.ok(withPhone.length >= 1700, `solo ${withPhone.length} con teléfono`);
  assert.equal(clients[0]?.full_name, 'Anais');
  assert.equal(clients[0]?.phone, '34649928841');
});

test('sin ningún archivo devuelve error claro', () => {
  const preview = buildPreview({
    existing: { services: [], clients: [], staff: [], appointments: [], blocks: [] },
  });
  assert.ok(preview.fileErrors.some(e => e.includes('al menos un archivo')));
});
