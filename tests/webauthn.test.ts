import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHALLENGE_TTL_MS,
  PASSKEY_HINT_KEY,
  fromBase64Url,
  platformDeviceName,
  platformRegisterLabel,
  platformUnlockLabel,
  resolveRequestOrigin,
  rpIdFromOrigin,
  toBase64Url,
} from '../lib/webauthn';
import { signChallenge, verifyChallenge } from '../lib/webauthn-challenge';

describe('webauthn dominio', () => {
  it('saca el RP ID del origen', () => {
    assert.equal(rpIdFromOrigin('https://marlenne-app-three.vercel.app'), 'marlenne-app-three.vercel.app');
    assert.equal(rpIdFromOrigin('http://localhost:3000'), 'localhost');
  });

  it('resuelve el origen de la petición', () => {
    assert.equal(
      resolveRequestOrigin({ origin: 'https://marlenne-app-three.vercel.app/' }),
      'https://marlenne-app-three.vercel.app',
    );
    assert.equal(
      resolveRequestOrigin({ forwardedHost: 'preview.vercel.app', forwardedProto: 'https' }),
      'https://preview.vercel.app',
    );
    assert.equal(
      resolveRequestOrigin({ host: 'localhost:3000' }),
      'http://localhost:3000',
    );
  });

  it('nombra el desbloqueo según el aparato', () => {
    assert.equal(platformUnlockLabel('Mozilla/5.0 (Linux; Android 15) Chrome/130'), 'Entrar con huella o cara');
    assert.equal(platformUnlockLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)'), 'Entrar con Face ID');
    assert.equal(platformUnlockLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 14)'), 'Entrar con Touch ID');
    assert.equal(platformRegisterLabel('Mozilla/5.0 (Linux; Android 15)'), 'Activar huella o cara');
    assert.equal(platformDeviceName('Mozilla/5.0 (iPad; CPU OS 18_0)'), 'Este iPad');
    assert.equal(platformDeviceName('Mozilla/5.0 (Linux; Android 14)'), 'Este Android');
  });

  it('redondea bytes a base64url y de vuelta', () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 255]);
    assert.deepEqual(fromBase64Url(toBase64Url(bytes)), bytes);
  });

  it('firma y comprueba el challenge', () => {
    const now = 1_700_000_000_000;
    const token = signChallenge({ c: 'abc', k: 'a', e: now + CHALLENGE_TTL_MS }, 'secret');
    const ok = verifyChallenge(token, 'secret', now);
    assert.equal(ok?.c, 'abc');
    assert.equal(ok?.k, 'a');
    assert.equal(verifyChallenge(token, 'otro', now), null);
    assert.equal(verifyChallenge(token, 'secret', now + CHALLENGE_TTL_MS + 1), null);
    assert.equal(verifyChallenge('roto', 'secret', now), null);
    assert.equal(PASSKEY_HINT_KEY, 'marlenne-passkey');
  });
});
