import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ratioLabel, toIsoDate, toCreative, parseDistribute } from '../lib/normalize.js';
import { extractList, distributeEntries } from '../lib/api.js';

test('ratioLabel', () => {
  assert.equal(ratioLabel(720, 1280), '9:16');
  assert.equal(ratioLabel(576, 1024), '9:16');
  assert.equal(ratioLabel(1280, 720), '16:9');
  assert.equal(ratioLabel(720, 900), '4:5');
  assert.equal(ratioLabel(720, 960), '3:4');
  assert.equal(ratioLabel(720, 720), '1:1');
  assert.equal(ratioLabel(600, 627), 'Khác');
  assert.equal(ratioLabel(0, 0), 'N/A');
});

test('toIsoDate handles strings and Beijing-midnight epochs', () => {
  assert.equal(toIsoDate('2026-09-03 10:00:00'), '2026-09-03');
  assert.equal(toIsoDate(Date.UTC(2026, 8, 2, 16)), '2026-09-03');
  assert.equal(toIsoDate(null), null);
});

test('toCreative maps a search row', () => {
  const raw = {
    id: 'abc', width: 720, height: 1280, videoTimeSpan: 29, creativeCnt: 5, showCnt: 120, impression: 5000,
    globalFirstTime: '2026-09-03 10:00:00', globalLastTime: '2026-09-15 00:00:00', title: 'Relax',
    videoUrl: 'https://x.oss-accelerate.aliyuncs.com/videos_v3/a/b.mp4?Expires=1&Signature=z',
  };
  assert.deepEqual(toCreative(raw), {
    id: 'abc', width: 720, height: 1280, ratio: '9:16', duration: 29, creativeCnt: 5, cnt: 120, imp: 5000,
    firstSeen: '2026-09-03', lastSeen: '2026-09-15', copy: 'Relax',
    videoUrl: 'https://x.oss-accelerate.aliyuncs.com/videos_v3/a/b.mp4',
    thumbUrl: 'https://x.oss-accelerate.aliyuncs.com/videos_keyframe_v3/a/b.jpg',
    byNetwork: {}, geo: {},
  });
});

test('parseDistribute: network and country entries', () => {
  const adf = parseDistribute([
    { id: 'a', list: [{ name: 'TikTok Ads', adfactionId: 109, cnt: 10, impression: 100 }, { name: 'Google Ads', adfactionId: 105, cnt: 5, impression: 40 }] },
    { id: 'b', list: [] },
  ]);
  assert.deepEqual(adf.get('a'), [
    { key: 'TikTok Ads', keyId: 109, cnt: 10, imp: 100 },
    { key: 'Google Ads', keyId: 105, cnt: 5, imp: 40 },
  ]);
  assert.deepEqual(adf.get('b'), []);
  const geo = parseDistribute([{ id: 'a', list: [{ geo: 'JP', cnt: 3, impression: 9 }] }]);
  assert.deepEqual(geo.get('a'), [{ key: 'JP', keyId: null, cnt: 3, imp: 9 }]);
});

test('real fixtures normalize without losing ids', () => {
  const load = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url)));
  const rows = extractList(load('search.json').data);
  assert.ok(rows.length > 0);
  for (const c of rows.map(toCreative)) {
    assert.ok(c.id && c.id !== 'undefined');
    assert.match(c.firstSeen ?? '', /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(c.videoUrl?.startsWith('http'));
  }
  const adf = parseDistribute(distributeEntries(load('adfaction.json').data));
  assert.ok(adf.size > 0);
  for (const items of adf.values()) for (const it of items) assert.equal(typeof it.cnt, 'number');
});
