import { addDays, daysBetween, mondayOf } from './dates.js';
import { RATIO_LABELS } from './normalize.js';

export const ALL = '*';

export const cntIn = (c, net) => (net === ALL ? c.cnt : (c.byNetwork[net]?.cnt ?? 0));
export const impIn = (c, net) => (net === ALL ? c.imp : (c.byNetwork[net]?.imp ?? 0));
export const creativesIn = (ds, net) => (net === ALL ? ds.creatives : ds.creatives.filter((c) => cntIn(c, net) > 0));
export const isNew = (c, ds) => c.firstSeen != null && c.firstSeen >= ds.start && c.firstSeen <= ds.end;
const sumCnt = (list, net) => list.reduce((s, c) => s + cntIn(c, net), 0);

export function topGeos(c, net, n = 3) {
  return Object.entries(c.geo[net] ?? {}).sort((a, b) => b[1].cnt - a[1].cnt).slice(0, n).map(([geo]) => geo);
}

export function topCreatives(ds, net) {
  return creativesIn(ds, net)
    .map((c) => ({ c, cnt: cntIn(c, net), imp: impIn(c, net), geos: topGeos(c, net) }))
    .sort((a, b) => b.cnt - a.cnt || b.imp - a.imp);
}

// Only creatives old enough to have had 7 days count (removes right-censoring).
export function survival7(newList, end) {
  const eligible = newList.filter((c) => daysBetween(c.firstSeen, end) >= 7);
  const survived = eligible.filter((c) => c.lastSeen && daysBetween(c.firstSeen, c.lastSeen) >= 7).length;
  return { eligible: eligible.length, survived, rate: eligible.length ? survived / eligible.length : null };
}

export function networkSummary(ds) {
  const networkTotal = ds.networks.reduce((s, net) => s + sumCnt(ds.creatives, net), 0);
  return [ALL, ...ds.networks].map((net) => {
    const list = creativesIn(ds, net);
    const fresh = list.filter((c) => isNew(c, ds));
    const cnt = sumCnt(list, net);
    return {
      net, active: list.length, fresh: fresh.length, cnt,
      cntShare: net === ALL ? 1 : (networkTotal ? cnt / networkTotal : 0),
      survival: survival7(fresh, ds.end),
    };
  });
}

export function cadence(ds, net) {
  const unit = daysBetween(ds.start, ds.end) <= 31 ? 'day' : 'week';
  const keyOf = unit === 'day' ? (d) => d : mondayOf;
  const step = unit === 'day' ? 1 : 7;
  const buckets = new Map();
  for (let d = keyOf(ds.start); d <= ds.end; d = addDays(d, step)) buckets.set(d, 0);
  for (const c of creativesIn(ds, net)) {
    if (!isNew(c, ds)) continue;
    const k = keyOf(c.firstSeen);
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return { unit, buckets: [...buckets].map(([key, count]) => ({ key, count })) };
}

export function geoMatrix(ds, topN = 15) {
  const cells = {}, totals = {}, geoTotal = {};
  for (const net of ds.networks) {
    totals[net] = 0;
    for (const c of ds.creatives) {
      for (const [geo, v] of Object.entries(c.geo[net] ?? {})) {
        totals[net] += v.cnt;
        geoTotal[geo] = (geoTotal[geo] ?? 0) + v.cnt;
        const row = (cells[geo] ??= {});
        row[net] = (row[net] ?? 0) + v.cnt;
      }
    }
  }
  const geos = Object.keys(geoTotal).sort((a, b) => geoTotal[b] - geoTotal[a]).slice(0, topN);
  const share = {};
  for (const geo of geos) {
    share[geo] = {};
    for (const net of ds.networks) share[geo][net] = totals[net] ? (cells[geo]?.[net] ?? 0) / totals[net] : 0;
  }
  return { geos, networks: ds.networks, share, totals };
}

export const DURATION_BUCKETS = [['0–15s', 0, 15], ['16–30s', 16, 30], ['31–45s', 31, 45], ['46–60s', 46, 60], ['>60s', 61, Infinity]];
export const DUP_BUCKETS = [['1', 1, 1], ['2–4', 2, 4], ['5–9', 5, 9], ['10–49', 10, 49], ['50+', 50, Infinity]];

const rangeLabel = (buckets, v) => (v == null ? 'N/A' : (buckets.find(([, lo, hi]) => v >= lo && v <= hi)?.[0] ?? 'N/A'));

function bucketize(list, net, labels, labelOf) {
  const total = sumCnt(list, net);
  return labels
    .map((label) => {
      const members = list.filter((c) => labelOf(c) === label);
      return { label, count: members.length, cntShare: total ? sumCnt(members, net) / total : 0 };
    })
    .filter((r) => r.count > 0);
}

export function specs(ds, net) {
  const list = creativesIn(ds, net);
  return {
    ratio: bucketize(list, net, RATIO_LABELS, (c) => c.ratio),
    duration: bucketize(list, net, [...DURATION_BUCKETS.map((b) => b[0]), 'N/A'],
      (c) => rangeLabel(DURATION_BUCKETS, c.duration == null ? null : Math.round(c.duration))),
    dup: bucketize(list, net, [...DUP_BUCKETS.map((b) => b[0]), 'N/A'], (c) => rangeLabel(DUP_BUCKETS, c.creativeCnt)),
  };
}
