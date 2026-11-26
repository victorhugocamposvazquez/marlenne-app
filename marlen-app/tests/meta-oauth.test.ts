import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adAccountsFromGraph,
  metaAppConfigured,
  metaAuthUrl,
  metaOrigin,
  metaRedirectUri,
  pagesFromGraph,
} from '../lib/meta-oauth';

test('la conexión pide id y secreto', () => {
  assert.equal(metaAppConfigured({ appId: '1', appSecret: 's' }), true);
  assert.equal(metaAppConfigured({ appId: '1', appSecret: '  ' }), false);
});

test('la vuelta usa el host que abrió el admin', () => {
  assert.equal(
    metaOrigin({
      origin: 'https://marlenne-xxx.vercel.app',
      forwardedHost: 'marlenne-app.vercel.app',
      forwardedProto: 'https',
    }),
    'https://marlenne-app.vercel.app',
  );
  assert.equal(
    metaOrigin({ origin: 'https://app.marlenapp.com', forwardedHost: null, forwardedProto: null }),
    'https://app.marlenapp.com',
  );
});

test('la vuelta del inicio de sesión es fija', () => {
  assert.equal(
    metaRedirectUri('https://app.marlenapp.com/'),
    'https://app.marlenapp.com/api/meta/oauth/callback',
  );
});

test('la url de Facebook lleva el estado y no el secreto', () => {
  const url = new URL(metaAuthUrl({
    appId: '123',
    redirectUri: 'https://app.marlenapp.com/api/meta/oauth/callback',
    state: 'abc',
  }));
  assert.equal(url.searchParams.get('client_id'), '123');
  assert.equal(url.searchParams.get('state'), 'abc');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.has('client_secret'), false);
  assert.equal(url.searchParams.get('scope')?.includes('leads_retrieval'), true);
  assert.equal(url.searchParams.has('config_id'), false);
});

test('con configuración de empresa mantiene el inicio de empresa', () => {
  const url = new URL(metaAuthUrl({
    appId: '123',
    redirectUri: 'https://app.marlenapp.com/api/meta/oauth/callback',
    state: 'abc',
    configId: '999',
  }));
  assert.equal(url.searchParams.get('config_id'), '999');
  assert.equal(url.searchParams.get('scope')?.includes('leads_retrieval'), true);
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.has('override_default_response_type'), false);
  assert.equal(url.searchParams.get('scope')?.includes('business_management'), true);
});

test('de las páginas solo entran las que traen token', () => {
  const pages = pagesFromGraph({
    data: [
      { id: '1', name: 'Arlett', access_token: 'tok' },
      { id: '2', name: 'Sin token' },
    ],
  });
  assert.deepEqual(pages, [{ id: '1', name: 'Arlett', token: 'tok' }]);
});

test('lee la cuenta publicitaria', () => {
  const accounts = adAccountsFromGraph({ data: [{ id: 'act_9', name: 'Arlett Ads' }] });
  assert.deepEqual(accounts, [{ id: 'act_9', name: 'Arlett Ads' }]);
});
