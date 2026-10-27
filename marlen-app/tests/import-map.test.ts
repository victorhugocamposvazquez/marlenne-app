import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyColumnMapToCsv,
  columnMapReady,
  parseTimeRange,
  suggestColumnMap,
  listCsvHeaders,
  uniqueMappedValues,
} from '../lib/import-map';

test('sugiere mapa SimplyBook / Treatwell-like', () => {
  const csv = 'Fecha,Hora,Servicio,Unidad,Nombre de cliente,Teléfono del cliente\nx\n';
  const map = suggestColumnMap(listCsvHeaders(csv));
  assert.equal(map.fecha, 'date');
  assert.equal(map.hora, 'time');
  assert.equal(map.servicio, 'service');
  assert.equal(map.unidad, 'staff');
  assert.equal(map.nombre_de_cliente, 'client_name');
  assert.equal(map.telefono_del_cliente, 'phone');
  assert.equal(columnMapReady(map), null);
});

test('parseTimeRange entiende rangos y hora suelta', () => {
  assert.deepEqual(parseTimeRange('13:30 - 14:00'), { startMin: 810, endMin: 840 });
  assert.deepEqual(parseTimeRange('09:00'), { startMin: 540, endMin: null });
});

test('applyColumnMapToCsv saca hora inicio y minutos del rango', () => {
  const raw = [
    'Fecha,Hora,Servicio,Unidad,Nombre de cliente,Teléfono del cliente',
    '27-01-2027,"13:30 - 14:00",Vacumterapia,"Iria Ferreiro",Úrsula,\'+34616780940',
  ].join('\n');
  const map = suggestColumnMap(listCsvHeaders(raw));
  const out = applyColumnMapToCsv(raw, map);
  const line = out.split('\n')[1] ?? '';
  assert.ok(line.includes('13:30'));
  assert.ok(line.includes(',30,'));
  assert.ok(line.includes('Iria Ferreiro'));
  assert.ok(!line.includes("'+"));
  assert.deepEqual(uniqueMappedValues(out, 'profesional'), ['Iria Ferreiro']);
});
