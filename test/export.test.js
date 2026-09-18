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
  assert.ok(s.Creatives[0].includes('cnt TikTok Ads'));
  assert.equal(s.Creatives.length, 2);
  assert.equal(s.Networks.length, 3); // header + ALL + TikTok
  assert.equal(s.NewCreatives.length, 4); // header + 3 days
  assert.deepEqual(s.Geo[1], ['JP', 1]);
});
