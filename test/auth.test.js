import test from 'node:test';
import assert from 'node:assert/strict';
import { pickAuthHeaders } from '../lib/auth.js';

test('keeps custom auth headers, drops standard ones', () => {
  const out = pickAuthHeaders([
    { name: 'Email', value: 'a@b.c' }, { name: 'ECF07FD99F7847C0', value: 'tok' },
    { name: 'Authorization', value: 'QmVhcmVy' }, { name: 'Language', value: 'en' },
    { name: 'Content-Type', value: 'application/json' }, { name: 'sec-ch-ua', value: 'x' },
    { name: 'Cookie', value: 'c=1' }, { name: 'User-Agent', value: 'ua' },
  ]);
  assert.deepEqual(out, { Email: 'a@b.c', ECF07FD99F7847C0: 'tok', Authorization: 'QmVhcmVy', Language: 'en' });
});

test('returns {} when only Language is present', () => {
  assert.deepEqual(pickAuthHeaders([{ name: 'Language', value: 'en' }, { name: 'Accept', value: '*/*' }]), {});
});

test('handles missing input', () => {
  assert.deepEqual(pickAuthHeaders(undefined), {});
});
