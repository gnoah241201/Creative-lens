import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL, topCreatives, networkSummary, cadence, geoMatrix, specs } from '../lib/aggregate.js';

const T = 'TikTok Ads', G = 'Google Ads';
const sum = (o, k) => Object.values(o).reduce((s, v) => s + v[k], 0);
const mk = (id, firstSeen, lastSeen, byNetwork, geo, extra) =>
  ({ id, firstSeen, lastSeen, byNetwork, geo, cnt: sum(byNetwork, 'cnt'), imp: sum(byNetwork, 'imp'), ...extra });
const g = (cnt) => ({ cnt, imp: 0 });
const ds = {
  start: '2026-09-01', end: '2026-09-30', networks: [T, G],
  creatives: [
    mk('A', '2026-09-02', '2026-09-20', { [T]: { cnt: 80, imp: 900 }, [G]: { cnt: 20, imp: 100 } },
      { [T]: { JP: g(50), KR: g(30) }, [G]: { BR: g(20) }, [ALL]: { JP: g(50), KR: g(30), BR: g(20) } },
      { ratio: '9:16', duration: 29, creativeCnt: 12 }),
    mk('B', '2026-08-01', '2026-09-30', { [G]: { cnt: 50, imp: 500 } },
      { [G]: { BR: g(30), JP: g(20) } }, { ratio: '1:1', duration: 59, creativeCnt: 1 }),
    mk('C', '2026-09-25', '2026-09-26', { [T]: { cnt: 5, imp: 50 } },
      { [T]: { JP: g(5) } }, { ratio: '9:16', duration: 15, creativeCnt: 3 }),
    mk('D', '2026-09-10', '2026-09-12', { [G]: { cnt: 10, imp: 10 } }, {}, { ratio: '16:9', duration: 45, creativeCnt: 1 }),
  ],
};

test('topCreatives ranks by the selected network cnt', () => {
  const t = topCreatives(ds, T);
  assert.deepEqual(t.map((r) => r.c.id), ['A', 'C']);
  assert.equal(t[0].cnt, 80);
  assert.equal(t[0].imp, 900);
  assert.deepEqual(t[0].geos, ['JP', 'KR']);
  const all = topCreatives(ds, ALL);
  assert.deepEqual(all.map((r) => r.c.id), ['A', 'B', 'D', 'C']);
  assert.deepEqual(all[0].geos, ['JP', 'KR', 'BR']);
});

test('networkSummary: active, new, share, 7-day survival without right-censoring', () => {
  const [all, t, gg] = networkSummary(ds);
  assert.equal(all.net, ALL);
  assert.equal(all.active, 4);
  assert.equal(all.fresh, 3); // A, C, D
  assert.deepEqual(all.survival, { eligible: 2, survived: 1, rate: 0.5 }); // C too young; D died
  assert.equal(t.net, T);
  assert.equal(t.active, 2);
  assert.equal(t.fresh, 2);
  assert.equal(t.cnt, 85);
  assert.ok(Math.abs(t.cntShare - 85 / 165) < 1e-9);
  assert.deepEqual(t.survival, { eligible: 1, survived: 1, rate: 1 });
  assert.equal(gg.active, 3);
  assert.equal(gg.fresh, 2);
});

test('cadence by day for windows up to 31 days', () => {
  const c = cadence(ds, ALL);
  assert.equal(c.unit, 'day');
  assert.equal(c.buckets.length, 30);
  assert.equal(c.buckets.find((b) => b.key === '2026-09-02').count, 1);
  assert.equal(c.buckets.reduce((s, b) => s + b.count, 0), 3);
  assert.equal(cadence(ds, T).buckets.reduce((s, b) => s + b.count, 0), 2);
});

test('cadence by ISO week for longer windows', () => {
  const c = cadence({ ...ds, start: '2026-06-01' }, ALL);
  assert.equal(c.unit, 'week');
  assert.equal(c.buckets[0].key, '2026-06-01');
  assert.equal(c.buckets.length, 18);
  assert.equal(c.buckets.reduce((s, b) => s + b.count, 0), 4);
  assert.equal(c.buckets.find((b) => b.key === '2026-07-27').count, 1); // B, a Saturday
});

test('geoMatrix: geos ranked by cnt, cells are share within network', () => {
  const m = geoMatrix(ds);
  assert.deepEqual(m.geos, ['JP', 'BR', 'KR']);
  assert.deepEqual(m.totals, { [T]: 85, [G]: 70 });
  assert.ok(Math.abs(m.share.JP[T] - 55 / 85) < 1e-9);
  assert.ok(Math.abs(m.share.BR[G] - 50 / 70) < 1e-9);
  assert.equal(m.share.KR[G], 0);
});

test('specs buckets ratio, duration and duplication', () => {
  const s = specs(ds, ALL);
  const r916 = s.ratio.find((r) => r.label === '9:16');
  assert.equal(r916.count, 2);
  assert.ok(Math.abs(r916.cntShare - 105 / 165) < 1e-9);
  assert.deepEqual(s.duration.map((r) => r.label), ['0–15s', '16–30s', '31–45s', '46–60s']);
  assert.deepEqual(s.dup.map((r) => [r.label, r.count]), [['1', 2], ['2–4', 1], ['10–49', 1]]);
  assert.deepEqual(specs(ds, T).ratio.map((r) => [r.label, r.count, r.cntShare]), [['9:16', 2, 1]]);
});
