import { ALL, cadence, geoMatrix, networkSummary, specs, topCreatives } from './aggregate.js';

export function buildSheets(ds) {
  const nets = ds.networks;
  const Creatives = [
    ['id', 'firstSeen', 'lastSeen', 'duration_s', 'ratio', 'width', 'height', 'creativeCnt', 'cnt', 'imp_estimate',
      ...nets.map((n) => `cnt ${n}`), 'top_geo', 'copy', 'videoUrl'],
    ...topCreatives(ds, ALL).map(({ c, geos }) => [
      c.id, c.firstSeen, c.lastSeen, c.duration, c.ratio, c.width, c.height, c.creativeCnt, c.cnt, c.imp,
      ...nets.map((n) => c.byNetwork[n]?.cnt ?? 0), geos.join(' '), c.copy, c.videoUrl,
    ]),
  ];
  const Networks = [
    ['network', 'active', 'new', 'cnt', 'cnt_share', 'survival7_rate', 'survival7_eligible'],
    ...networkSummary(ds).map((r) => [r.net === ALL ? 'ALL' : r.net, r.active, r.fresh, r.cnt, r.cntShare, r.survival.rate, r.survival.eligible]),
  ];
  const cads = [ALL, ...nets].map((n) => cadence(ds, n));
  const NewCreatives = [['period', 'ALL', ...nets], ...cads[0].buckets.map((b, i) => [b.key, ...cads.map((x) => x.buckets[i].count)])];
  const m = geoMatrix(ds, 50);
  const Geo = [['geo', ...nets], ...m.geos.map((g) => [g, ...nets.map((n) => m.share[g][n])])];
  const sp = specs(ds, ALL);
  const Specs = [['group', 'label', 'count', 'cnt_share'], ...['ratio', 'duration', 'dup'].flatMap((k) => sp[k].map((r) => [k, r.label, r.count, r.cntShare]))];
  return { Creatives, Networks, NewCreatives, Geo, Specs };
}
