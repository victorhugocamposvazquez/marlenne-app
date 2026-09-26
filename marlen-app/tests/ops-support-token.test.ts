import assert from 'node:assert/strict';
import test from 'node:test';

import { signOpsEnterToken, verifyOpsEnterToken } from '@/lib/ops-support-token';

test('ops enter token roundtrip', () => {
  process.env.OPS_SUPPORT_SECRET = 'test-ops-secret';
  const { token, payload } = signOpsEnterToken({
    salonId: '00000000-0000-4000-8000-000000000001',
    staffUserId: '00000000-0000-4000-8000-000000000002',
    opsEmail: 'tere@marlen.com',
    companyName: 'Arlett Beauty',
    next: '/agenda',
  });
  const parsed = verifyOpsEnterToken(token);
  assert.ok(parsed);
  assert.equal(parsed?.jti, payload.jti);
  assert.equal(parsed?.opsEmail, 'tere@marlen.com');
});

test('ops enter token rejects tamper', () => {
  process.env.OPS_SUPPORT_SECRET = 'test-ops-secret';
  const { token } = signOpsEnterToken({
    salonId: '00000000-0000-4000-8000-000000000001',
    staffUserId: '00000000-0000-4000-8000-000000000002',
    opsEmail: 'ops@test.com',
    companyName: 'X',
    next: '/agenda',
  });
  assert.equal(verifyOpsEnterToken(`${token}x`), null);
});
