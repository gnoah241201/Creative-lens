import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL, CNT, IMP, topCreatives, networkSummary, cadence, geoMatrix, specs } from '../lib/aggregate.js';

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
  assert.equal(t.value, 85);
  assert.ok(Math.abs(t.share - 85 / 165) < 1e-9);
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
  assert.ok(Math.abs(r916.share - 105 / 165) < 1e-9);
  assert.deepEqual(s.duration.map((r) => r.label), ['0–15s', '16–30s', '31–45s', '46–60s']);
  assert.deepEqual(s.dup.map((r) => [r.label, r.count]), [['1', 2], ['2–4', 1], ['10–49', 1]]);
  assert.deepEqual(specs(ds, T).ratio.map((r) => [r.label, r.count, r.share]), [['9:16', 2, 1]]);
});

test('networkSummary and specs can be indexed on imp', () => {
  const [, tCnt] = networkSummary(ds, CNT);
  const [, tImp] = networkSummary(ds, IMP);
  assert.equal(tCnt.value, 85);          // 80 + 5
  assert.equal(tImp.value, 950);         // 900 + 50
  assert.ok(Math.abs(tImp.share - 950 / 1560) < 1e-9);
  // creative counts never depend on the index
  assert.equal(tCnt.active, tImp.active);
  assert.equal(tCnt.fresh, tImp.fresh);
  assert.deepEqual(tCnt.survival, tImp.survival);
  // 9:16 is A + C; at ALL level that is each creative's total imp (1000 + 50) over 1560
  assert.ok(Math.abs(specs(ds, ALL, IMP).ratio.find((r) => r.label === '9:16').share - 1050 / 1560) < 1e-9);
});

test('topCreatives keeps ranking on cnt but picks top geos by the index', () => {
  // B outranks C on cnt (50 vs 5) under either index.
  assert.deepEqual(topCreatives(ds, ALL, IMP).map((r) => r.c.id), ['A', 'B', 'D', 'C']);
  assert.deepEqual(topCreatives(ds, ALL, CNT)[0].geos, ['JP', 'KR', 'BR']);
});

test('geoMatrix exposes absolute values and the largest cell for shading', () => {
  const m = geoMatrix(ds, CNT);
  assert.equal(m.value.JP[T], 55);
  assert.equal(m.value.KR[G], 0);
  assert.equal(m.max, 55);
  // A tiny network owning one geo scores a high share but a low absolute value: that is exactly
  // the case the shading must not exaggerate.
  const small = {
    start: '2026-09-01', end: '2026-09-30', networks: [T, G],
    creatives: [
      mk('A', '2026-09-02', '2026-09-20', { [T]: { cnt: 1000, imp: 0 } }, { [T]: { JP: g(1000) } }, {}),
      mk('B', '2026-09-02', '2026-09-20', { [G]: { cnt: 10, imp: 0 } }, { [G]: { US: g(10) } }, {}),
    ],
  };
  const sm = geoMatrix(small, CNT);
  assert.equal(sm.share.US[G], 1);        // 100% of that network's column
  assert.equal(sm.value.US[G], 10);       // but only 1% of the largest cell
  assert.equal(sm.max, 1000);
  assert.ok(Math.sqrt(sm.value.US[G] / sm.max) < 0.15);
});

test('geoMatrix ranks geos by the selected index', () => {
  const byImp = {
    start: '2026-09-01', end: '2026-09-30', networks: [T],
    creatives: [mk('A', '2026-09-02', '2026-09-20', { [T]: { cnt: 110, imp: 340 } },
      { [T]: { JP: { cnt: 100, imp: 40 }, FR: { cnt: 10, imp: 300 } } }, {})],
  };
  assert.deepEqual(geoMatrix(byImp, CNT).geos, ['JP', 'FR']);
  assert.deepEqual(geoMatrix(byImp, IMP).geos, ['FR', 'JP']); // panel bias reversed by the estimate
});
