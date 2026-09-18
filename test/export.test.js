import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSheets } from '../lib/export.js';

test('buildSheets produces 5 sheets with per-network columns', () => {
  const ds = {
    pkg: 'com.a', start: '2026-09-01', end: '2026-09-03', networks: ['TikTok Ads'],
    creatives: [{
      id: 'a', firstSeen: '2026-09-02', lastSeen: '2026-09-03', duration: 29, ratio: '9:16', width: 720, height: 1280,
      creativeCnt: 2, cnt: 10, imp: 100, copy: 'hi', videoUrl: 'v', thumbUrl: 't',
      byNetwork: { 'TikTok Ads': { cnt: 10, imp: 100 } },
      geo: { 'TikTok Ads': { JP: { cnt: 10, imp: 100 } }, '*': { JP: { cnt: 10, imp: 100 } } },
    }],
  };
  const s = buildSheets(ds);
  assert.deepEqual(Object.keys(s), ['Creatives', 'Networks', 'NewCreatives', 'Geo', 'Specs']);
  // every sheet carries both indices, whichever one the panel happens to be showing
  assert.ok(s.Creatives[0].includes('cnt TikTok Ads'));
  assert.ok(s.Creatives[0].includes('imp TikTok Ads'));
  assert.equal(s.Creatives.length, 2);
  assert.equal(s.Networks.length, 3); // header + ALL + TikTok
  assert.deepEqual(s.Networks[0].slice(3, 7), ['cnt', 'cnt_share', 'imp_estimate', 'imp_share']);
  assert.deepEqual(s.Networks[2].slice(3, 7), [10, 1, 100, 1]);
  assert.equal(s.NewCreatives.length, 4); // header + 3 days
  assert.deepEqual(s.Geo[0], ['geo', 'cnt TikTok Ads', 'imp TikTok Ads']);
  assert.deepEqual(s.Geo[1], ['JP', 10, 100]); // absolute values, not shares
  assert.deepEqual(s.Specs[0], ['group', 'label', 'count', 'cnt_share', 'imp_share']);
});
