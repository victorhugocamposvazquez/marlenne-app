import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLikelyLowResAdImage, pickBestCreativeImageUrl } from '../lib/meta-lead-creative';

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
  assert.equal(isLikelyLowResAdImage('https://cdn.example.com/p600x600/foo.jpg'), false);
});