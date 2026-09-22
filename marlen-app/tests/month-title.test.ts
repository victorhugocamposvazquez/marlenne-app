import assert from 'node:assert/strict';
import { test } from 'node:test';
import { monthTitleFromOffset } from '../lib/time';

test('mes y año en una sola línea, sin «de»', () => {
  const title = monthTitleFromOffset(0);
  assert.match(title, /^[A-ZÁÉÍÓÚÑ]/);
  assert.doesNotMatch(title, /\bde\b/i);
  assert.match(title, /\d{4}$/);
  assert.match(title, /^[\p{L}]+ \d{4}$/u);
});
