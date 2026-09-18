import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtNum, fmtPct, fmtDur, esc } from '../ui/format.js';
import { barChart } from '../ui/chart.js';
import { renderTop, renderGeo, renderCadence, renderSpecs } from '../ui/views.js';

test('formatters', () => {
  assert.equal(fmtNum(41560), '41.6k');
  assert.equal(fmtNum(1000), '1k');
  assert.equal(fmtNum(3380000000), '3.4B');
  assert.equal(fmtNum(999), '999');
  assert.equal(fmtNum(null), '–');
  assert.equal(fmtPct(0.5151), '52%');
  assert.equal(fmtPct(0.05), '5.0%');
  assert.equal(fmtPct(null), '–');
  assert.equal(fmtDur(59), '0:59');
  assert.equal(fmtDur(59.6), '1:00');
  assert.equal(fmtDur(61), '1:01');
  assert.equal(esc('<a&"\''), '&lt;a&amp;&quot;&#39;');
});

test('barChart draws one rect per bucket, tolerates all-zero', () => {
  const svg = barChart([{ key: '2026-09-01', count: 2 }, { key: '2026-09-02', count: 0 }]);
  assert.equal((svg.match(/<rect/g) ?? []).length, 2);
  assert.match(svg, /09-01/);
  assert.equal((barChart([{ key: '2026-09-01', count: 0 }]).match(/<rect/g) ?? []).length, 1);
});

test('renderTop escapes copy, limits rows, shows the more button', () => {
  const c = { id: 'a1', thumbUrl: 't.jpg', duration: 29, ratio: '9:16', creativeCnt: 3, firstSeen: '2026-09-02', copy: '<b>x</b>', videoUrl: 'v.mp4' };
  const rows = [{ c, cnt: 41560, imp: 1e6, geos: ['JP', 'KR'] }, { c: { ...c, id: 'a2' }, cnt: 5, imp: 1, geos: [] }];
  const html = renderTop(rows, 1);
  assert.match(html, /data-play="a1"/);
  assert.doesNotMatch(html, /data-play="a2"/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(html, /41\.6k/);
  assert.match(html, /Xem thêm \(1 còn lại\)/);
  assert.match(renderTop([], 50), /Không có creative/);
});

test('renderCadence, renderGeo, renderSpecs render key content', () => {
  const cad = { unit: 'day', buckets: [{ key: '2026-09-01', count: 3 }] };
  const summary = [{ net: '*', active: 4, fresh: 3, cnt: 10, cntShare: 1, survival: { eligible: 2, survived: 1, rate: 0.5 } }];
  assert.match(renderCadence(cad, summary, '*'), /3<\/b> creative mới/);
  assert.match(renderCadence(cad, summary, '*'), /Tất cả/);
  const geo = renderGeo({ geos: ['JP'], networks: ['TikTok Ads'], share: { JP: { 'TikTok Ads': 0.5 } }, totals: { 'TikTok Ads': 10 } });
  assert.match(geo, /50%/);
  assert.match(renderGeo({ geos: [], networks: [], share: {}, totals: {} }), /Chưa có dữ liệu geo/);
  const sp = renderSpecs({ ratio: [{ label: '9:16', count: 2, cntShare: 0.6 }], duration: [], dup: [] });
  assert.match(sp, /9:16/);
  assert.match(sp, /width:60\.0%/);
});
