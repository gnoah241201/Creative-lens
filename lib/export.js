import { ALL, CNT, IMP, cadence, geoMatrix, networkSummary, specs, topCreatives } from './aggregate.js';

// The workbook is a shared artefact, so it never depends on whichever index the panel is showing:
// every sheet carries both cnt (measured) and imp (estimated) side by side.
export function buildSheets(ds) {
  const nets = ds.networks;
  const Creatives = [
    ['id', 'firstSeen', 'lastSeen', 'duration_s', 'ratio', 'width', 'height', 'creativeCnt', 'cnt', 'imp_estimate',
      ...nets.flatMap((n) => [`cnt ${n}`, `imp ${n}`]), 'top_geo', 'copy', 'videoUrl'],
    ...topCreatives(ds, ALL).map(({ c, geos }) => [
      c.id, c.firstSeen, c.lastSeen, c.duration, c.ratio, c.width, c.height, c.creativeCnt, c.cnt, c.imp,
      ...nets.flatMap((n) => [c.byNetwork[n]?.cnt ?? 0, c.byNetwork[n]?.imp ?? 0]), geos.join(' '), c.copy, c.videoUrl,
    ]),
  ];
  const byCnt = networkSummary(ds, CNT);
  const byImp = networkSummary(ds, IMP);
  const Networks = [
    ['network', 'active', 'new', 'cnt', 'cnt_share', 'imp_estimate', 'imp_share', 'survival7_rate', 'survival7_eligible'],
    ...byCnt.map((r, i) => [
      r.net === ALL ? 'ALL' : r.net, r.active, r.fresh, r.value, r.share, byImp[i].value, byImp[i].share,
      r.survival.rate, r.survival.eligible,
    ]),
  ];
  const cads = [ALL, ...nets].map((n) => cadence(ds, n));
  const NewCreatives = [['period', 'ALL', ...nets], ...cads[0].buckets.map((b, i) => [b.key, ...cads.map((x) => x.buckets[i].count)])];
  // Absolute values rather than shares: any share can be derived from them in the spreadsheet.
  const mc = geoMatrix(ds, CNT, 50);
  const mi = geoMatrix(ds, IMP, 50);
  const geos = [...new Set([...mi.geos, ...mc.geos])];
  const Geo = [
    ['geo', ...nets.flatMap((n) => [`cnt ${n}`, `imp ${n}`])],
    ...geos.map((g) => [g, ...nets.flatMap((n) => [mc.value[g]?.[n] ?? 0, mi.value[g]?.[n] ?? 0])]),
  ];
  const spc = specs(ds, ALL, CNT);
  const spi = specs(ds, ALL, IMP);
  const Specs = [
    ['group', 'label', 'count', 'cnt_share', 'imp_share'],
    ...['ratio', 'duration', 'dup'].flatMap((k) => spc[k].map((r) => [
      k, r.label, r.count, r.share, spi[k].find((x) => x.label === r.label)?.share ?? 0,
    ])),
  ];
  return { Creatives, Networks, NewCreatives, Geo, Specs };
}
