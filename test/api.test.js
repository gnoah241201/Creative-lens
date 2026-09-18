import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, buildBody, mapLimit, ApiError } from '../lib/api.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const auth = async () => ({ Email: 'x', TOKEN: 'y' });
const noSleep = async () => {};
const rows = (prefix, n) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }));

test('buildBody sets package, window, paging, ids, filters', () => {
  const b = buildBody({ pkg: 'com.a', start: '2026-09-01', end: '2026-09-30', pageIndex: 3, ids: ['x'], adfactionIds: [109] });
  assert.deepEqual(b.productIds, ['com.a']);
  assert.equal(b.baseOption.startTime, '2026-09-01');
  assert.equal(b.baseOption.endTime, '2026-09-30');
  assert.equal(b.baseOption.pageIndex, 3);
  assert.equal(b.baseOption.pageSize, 40);
  assert.deepEqual(b.baseOption.adfactionIds, [109]);
  assert.deepEqual(b.ids, ['x']);
  assert.equal(b.isNew, false);
  assert.equal(b.materialRemovalRepeat, false);
});

test('NO_AUTH when no headers were captured', async () => {
  const c = createClient({ fetchFn: async () => ok({ code: 0, data: [] }), getHeaders: async () => undefined, sleep: noSleep });
  await assert.rejects(c.post('/x', {}), (e) => e instanceof ApiError && e.kind === 'NO_AUTH');
});

test('EXPIRED on code -3106 even with HTTP 200', async () => {
  const c = createClient({ fetchFn: async () => ok({ code: -3106, message: 'Login expired' }), getHeaders: auth, sleep: noSleep });
  await assert.rejects(c.post('/x', {}), (e) => e.kind === 'EXPIRED');
});

test('API error on unknown non-success code', async () => {
  const c = createClient({ fetchFn: async () => ok({ code: 500123, message: 'boom' }), getHeaders: auth, sleep: noSleep });
  await assert.rejects(c.post('/x', {}), (e) => e.kind === 'API' && /500123/.test(e.message));
});

test('sends auth headers and JSON body, returns data', async () => {
  let seen;
  const c = createClient({ fetchFn: async (url, init) => { seen = { url, init }; return ok({ code: 0, data: { list: [1] } }); }, getHeaders: auth, sleep: noSleep });
  assert.deepEqual(await c.post('/v3/imagevideo/count', { a: 1 }), { list: [1] });
  assert.equal(seen.url, 'https://data.insightrackr.com/cas/api/v3/imagevideo/count');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers.Email, 'x');
  assert.equal(seen.init.body, '{"a":1}');
});

test('retries 5xx then succeeds', async () => {
  let n = 0;
  const c = createClient({ fetchFn: async () => (++n < 3 ? { ok: false, status: 502 } : ok({ code: 0, data: 'ok' })), getHeaders: auth, sleep: noSleep });
  assert.equal(await c.post('/x', {}), 'ok');
  assert.equal(n, 3);
});

test('searchAll keeps paging past a short page and stops only on an empty page', async () => {
  const pages = { 1: rows('a', 40), 2: rows('b', 39), 3: rows('c', 40), 4: [] };
  const c = createClient({
    getHeaders: auth, sleep: noSleep,
    fetchFn: async (_u, init) => ok({ code: 0, data: { list: pages[JSON.parse(init.body).baseOption.pageIndex] ?? [] } }),
  });
  assert.equal((await c.searchAll('com.a', '2026-09-01', '2026-09-30')).length, 119);
});

test('searchAll splits the window when it hits the cap and merges by id', async () => {
  const byWindow = {
    '2026-09-01|2026-09-10': rows('w', 3), // reaches capSplit = 3
    '2026-09-01|2026-09-05': [{ id: 'a' }, { id: 'b' }],
    '2026-09-06|2026-09-10': [{ id: 'b' }, { id: 'c' }],
  };
  const calls = [];
  const c = createClient({
    capSplit: 3, getHeaders: auth, sleep: noSleep,
    fetchFn: async (_u, init) => {
      const o = JSON.parse(init.body).baseOption;
      calls.push(`${o.startTime}|${o.endTime}|${o.pageIndex}`);
      return ok({ code: 0, data: { list: o.pageIndex === 1 ? byWindow[`${o.startTime}|${o.endTime}`] ?? [] : [] } });
    },
  });
  const out = await c.searchAll('com.a', '2026-09-01', '2026-09-10');
  assert.deepEqual(out.map((r) => r.id).sort(), ['a', 'b', 'c']);
  assert.ok(calls.includes('2026-09-06|2026-09-10|1'));
});

test('distributeAll batches ids and forwards the network filter', async () => {
  const bodies = [];
  const c = createClient({
    batchSize: 2, getHeaders: auth, sleep: noSleep,
    fetchFn: async (url, init) => { const b = JSON.parse(init.body); bodies.push({ url, b }); return ok({ code: 0, data: b.ids.map((id) => ({ id, list: [] })) }); },
  });
  const out = await c.distributeAll('country', ['a', 'b', 'c'], { pkg: 'com.a', start: '2026-09-01', end: '2026-09-30', adfactionIds: [109] });
  assert.equal(bodies.length, 2);
  assert.ok(bodies[0].url.endsWith('/v3/imagevideo/distribute/country'));
  assert.deepEqual(bodies.map((x) => x.b.ids), [['a', 'b'], ['c']]);
  assert.deepEqual(bodies[0].b.baseOption.adfactionIds, [109]);
  assert.deepEqual(out.map((x) => x.id), ['a', 'b', 'c']);
});

test('distributeAll with no ids makes no request', async () => {
  const c = createClient({ getHeaders: auth, sleep: noSleep, fetchFn: async () => { throw new Error('should not fetch'); } });
  assert.deepEqual(await c.distributeAll('adfaction', [], { pkg: 'com.a', start: '2026-09-01', end: '2026-09-02' }), []);
});

test('mapLimit preserves order and caps concurrency', async () => {
  let live = 0, peak = 0;
  const out = await mapLimit([1, 2, 3, 4, 5], 2, async (x) => {
    live++; peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live--; return x * 10;
  });
  assert.deepEqual(out, [10, 20, 30, 40, 50]);
  assert.equal(peak, 2);
});
