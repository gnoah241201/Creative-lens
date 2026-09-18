import test from 'node:test';
import assert from 'node:assert/strict';
import { runAnalysis } from '../lib/pipeline.js';

test('runAnalysis joins search, network and per-network geo data', async () => {
  const calls = [];
  const client = {
    searchAll: async () => [
      { id: 'a', width: 720, height: 1280, showCnt: 1, impression: 1, globalFirstTime: '2026-09-02', globalLastTime: '2026-09-05' },
      { id: 'b', width: 720, height: 720, showCnt: 7, impression: 70, globalFirstTime: '2026-09-03', globalLastTime: '2026-09-04' },
    ],
    distributeAll: async (kind, ids, opts) => {
      calls.push({ kind, ids, net: opts.adfactionIds?.[0] });
      if (kind === 'adfaction') {
        return [
          { id: 'a', list: [{ name: 'TikTok Ads', adfactionId: 109, cnt: 8, impression: 80 }, { name: 'Google Ads', adfactionId: 105, cnt: 2, impression: 20 }] },
          { id: 'b', list: [] },
        ];
      }
      return opts.adfactionIds[0] === 109
        ? [{ id: 'a', list: [{ geo: 'JP', cnt: 6, impression: 60 }, { geo: 'KR', cnt: 2, impression: 20 }] }]
        : [{ id: 'a', list: [{ geo: 'JP', cnt: 2, impression: 20 }] }];
    },
  };
  const ds = await runAnalysis({ client, pkg: 'com.a', start: '2026-09-01', end: '2026-09-30' });
  const a = ds.creatives.find((c) => c.id === 'a');
  const b = ds.creatives.find((c) => c.id === 'b');
  assert.equal(ds.pkg, 'com.a');
  assert.deepEqual(ds.networks, ['TikTok Ads', 'Google Ads']);
  assert.deepEqual(ds.networkIds, { 'TikTok Ads': 109, 'Google Ads': 105 });
  assert.equal(a.cnt, 10);
  assert.equal(a.imp, 100);
  assert.deepEqual(a.byNetwork['TikTok Ads'], { cnt: 8, imp: 80 });
  assert.deepEqual(a.geo['TikTok Ads'].JP, { cnt: 6, imp: 60 });
  assert.deepEqual(a.geo['*'].JP, { cnt: 8, imp: 80 });
  assert.equal(b.cnt, 7); // no distribute data → keeps showCnt
  assert.deepEqual(
    calls.filter((c) => c.kind === 'country').map((c) => [c.net, c.ids]),
    [[109, ['a']], [105, ['a']]],
  );
});
