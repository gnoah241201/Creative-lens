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
  const summary = [{ net: '*', active: 4, fresh: 3, value: 10, share: 1, survival: { eligible: 2, survived: 1, rate: 0.5 } }];
  assert.match(renderCadence(cad, summary, '*'), /3<\/b> creative mới/);
  assert.match(renderCadence(cad, summary, '*'), /Tất cả/);
  const geo = renderGeo({ geos: ['JP'], networks: ['TikTok Ads'], share: { JP: { 'TikTok Ads': 0.5 } }, value: { JP: { 'TikTok Ads': 5 } }, max: 5, totals: { 'TikTok Ads': 10 } });
  assert.match(geo, /50%/);
  assert.match(renderGeo({ geos: [], networks: [], share: {}, value: {}, max: 0, totals: {} }), /Chưa có dữ liệu geo/);
  const sp = renderSpecs({ ratio: [{ label: '9:16', count: 2, share: 0.6 }], duration: [], dup: [] });
  assert.match(sp, /9:16/);
  assert.match(sp, /width:60\.0%/);
});

test('renderTop shows the selected index first and keeps the other alongside', () => {
  const c = { id: 'a1', thumbUrl: 't.jpg', duration: 29, ratio: '9:16', creativeCnt: 3, firstSeen: '2026-09-02', copy: 'x', videoUrl: 'v.mp4' };
  const rows = [{ c, cnt: 120, imp: 41560, geos: ['JP'] }];
  const byCnt = renderTop(rows, 10, 'cnt');
  assert.match(byCnt, /<b>120<\/b> <span class="muted">cnt<\/span>/);
  assert.match(byCnt, /imp 41\.6k/);
  const byImp = renderTop(rows, 10, 'imp');
  assert.match(byImp, /<b>41\.6k<\/b> <span class="muted">imp<\/span>/);
  assert.match(byImp, /cnt 120/);
});

test('renderGeo shades by absolute value, not by column share', () => {
  // Two cells, both 100% of their own column, but one is a hundredth the size.
  const m = {
    geos: ['JP', 'US'], networks: ['Big', 'Tiny'],
    share: { JP: { Big: 1, Tiny: 0 }, US: { Big: 0, Tiny: 1 } },
    value: { JP: { Big: 1000, Tiny: 0 }, US: { Big: 0, Tiny: 10 } },
    max: 1000, totals: { Big: 1000, Tiny: 10 },
  };
  const html = renderGeo(m, 'imp');
  assert.match(html, /--v:1\.000/);   // the big cell is fully saturated
  assert.match(html, /--v:0\.100/);   // sqrt(10/1000) -- the tiny one nearly disappears
  assert.match(html, /100%/);          // yet both still print their column share
});
