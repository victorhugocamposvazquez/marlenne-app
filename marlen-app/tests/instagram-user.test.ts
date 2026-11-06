import assert from 'node:assert/strict';
import { test } from 'node:test';
import { instagramProfileUrl, parseInstagramUser } from '../lib/web/extras';

test('usuario con @, sin @ y URL del perfil', () => {
  for (const raw of [
    'tucentro',
    '@tucentro',
    '  @tucentro  ',
    'https://www.instagram.com/tucentro',
    'https://www.instagram.com/tucentro/',
    'https://instagram.com/tucentro?hl=es',
    'http://m.instagram.com/tucentro/',
    'www.instagram.com/tucentro',
    'instagram.com/tucentro/reels/',
    'https://www.instagram.com/tucentro/?igsh=abc',
    'https://instagr.am/tucentro',
  ]) {
    assert.equal(parseInstagramUser(raw), 'tucentro', raw);
  }
  assert.equal(instagramProfileUrl('@tucentro'), 'https://www.instagram.com/tucentro/');
  assert.equal(instagramProfileUrl('https://instagram.com/tucentro/'), 'https://www.instagram.com/tucentro/');
});

test('un enlace de publicación no es un usuario', () => {
  assert.equal(parseInstagramUser('https://www.instagram.com/p/AbCdEf/'), null);
  assert.equal(parseInstagramUser('https://www.instagram.com/reel/AbCdEf/'), null);
  assert.equal(parseInstagramUser(''), null);
});
