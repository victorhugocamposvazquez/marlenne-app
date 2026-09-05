import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND, BRAND_NAME, BRAND_UI, SPLASH_SEEN_KEY } from '../lib/brand';

describe('brand', () => {
  it('mantiene el nombre y el degradado oficial', () => {
    assert.equal(BRAND_NAME, 'Marlenne');
    assert.match(BRAND.gradient, /#FF1F5B/);
    assert.match(BRAND.gradient, /#B621C8/);
    assert.match(BRAND.gradient, /#2D65FF/);
    assert.equal(BRAND_UI.theme, '#B621C8');
    assert.equal(SPLASH_SEEN_KEY, 'marlenne-booted');
  });
});
