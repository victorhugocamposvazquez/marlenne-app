import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enlargeFbCdnUrl, isLikelyLowResAdImage, pickBestCreativeImageUrl } from '../lib/meta-lead-creative';

test('prefiere la imagen grande del anuncio a la miniatura de Meta', () => {
  const url = pickBestCreativeImageUrl({
    thumbnail_url: 'https://cdn.example.com/p64x64/thumb.jpg',
    image_url: 'https://cdn.example.com/full.jpg',
    object_story_spec: {
      link_data: { picture: 'https://cdn.example.com/link-picture-1200.jpg' },
    },
  });
  assert.equal(url, 'https://cdn.example.com/link-picture-1200.jpg');
});

test('detecta miniaturas típicas de Facebook', () => {
  assert.equal(isLikelyLowResAdImage(null), true);
  assert.equal(isLikelyLowResAdImage('https://cdn.example.com/p64x64/foo.jpg'), true);
  assert.equal(isLikelyLowResAdImage('https://scontent.xx.fbcdn.net/v/t.jpg?stp=dst-jpg_p64x64_q75'), true);
  assert.equal(isLikelyLowResAdImage('https://cdn.example.com/p800x800/foo.jpg'), false);
});

test('la miniatura del CDN se pide a 1080', () => {
  assert.equal(
    enlargeFbCdnUrl('https://scontent.xx.fbcdn.net/v/t.jpg?stp=dst-jpg_p64x64_q75&_nc_cat=1'),
    'https://scontent.xx.fbcdn.net/v/t.jpg?stp=dst-jpg_p1080x1080_q75&_nc_cat=1',
  );
  assert.equal(
    enlargeFbCdnUrl('https://cdn.example.com/p960x960/full.jpg'),
    'https://cdn.example.com/p960x960/full.jpg',
  );
});