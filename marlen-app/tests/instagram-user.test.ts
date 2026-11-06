import assert from 'node:assert/strict';
import { test } from 'node:test';
import { instagramProfileUrl, parseInstagramUser } from '../lib/web/extras';
import { mediaFromInstagramEmbedHtml } from '../lib/web/instagram';

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

test('el HTML del embed da fotos para el diseño propio', () => {
  const html = [
    'shortcode\\":\\"AbCdEf12\\"',
    'display_url\\":\\"https:\\\\\\/\\\\\\/scontent.cdninstagram.com\\\\\\/v\\\\\\/foto.jpg?oh=1&amp;oe=2\\"',
  ].join(',');
  const media = mediaFromInstagramEmbedHtml(html, 9);
  assert.equal(media.length, 1);
  assert.equal(media[0].id, 'AbCdEf12');
  assert.equal(media[0].permalink, 'https://www.instagram.com/p/AbCdEf12/');
  assert.ok(media[0].mediaUrl.startsWith('https://scontent.cdninstagram.com/'));
});

test('un enlace de publicación no es un usuario', () => {
  assert.equal(parseInstagramUser('https://www.instagram.com/p/AbCdEf/'), null);
  assert.equal(parseInstagramUser('https://www.instagram.com/reel/AbCdEf/'), null);
  assert.equal(parseInstagramUser(''), null);
});
