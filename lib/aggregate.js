import { addDays, daysBetween, mondayOf } from './dates.js';
import { RATIO_LABELS } from './normalize.js';

export const ALL = '*';

// The two indices. cnt (Times Detected) is what insightrackr actually counted, but its panel
// is unevenly distributed across geos; imp is their estimate, corrected for that coverage.
// Compare geo-to-geo or network-to-network with IMP; rank creatives inside one network with CNT.
export const CNT = 'cnt';
export const IMP = 'imp';

export const cntIn = (c, net) => (net === ALL ? c.cnt : (c.byNetwork[net]?.cnt ?? 0));
export const impIn = (c, net) => (net === ALL ? c.imp : (c.byNetwork[net]?.imp ?? 0));
export const valueIn = (c, net, metric) => (metric === IMP ? impIn(c, net) : cntIn(c, net));
// Membership is a yes/no question ("did it run here"), so it always keys off the measured count.
export const creativesIn = (ds, net) => (net === ALL ? ds.creatives : ds.creatives.filter((c) => cntIn(c, net) > 0));
export const isNew = (c, ds) => c.firstSeen != null && c.firstSeen >= ds.start && c.firstSeen <= ds.end;
const sumValue = (list, net, metric) => list.reduce((s, c) => s + valueIn(c, net, metric), 0);

export function topGeos(c, net, metric = CNT, n = 3) {
  return Object.entries(c.geo[net] ?? {})
    .sort((a, b) => (b[1][metric] ?? 0) - (a[1][metric] ?? 0))
    .slice(0, n).map(([geo]) => geo);
}

// Ranking stays on cnt whichever index is selected: inside one network the sampling conditions
// are the same, so the measured count is the fairer comparison. Both values are returned so the
// view can show the selected one first and keep the other alongside it.
export function topCreatives(ds, net, metric = CNT) {
  return creativesIn(ds, net)
    .map((c) => ({ c, cnt: cntIn(c, net), imp: impIn(c, net), geos: topGeos(c, net, metric) }))
    .sort((a, b) => b.cnt - a.cnt || b.imp - a.imp);
}

// Only creatives old enough to have had 7 days count (removes right-censoring).
export function survival7(newList, end) {
  const eligible = newList.filter((c) => daysBetween(c.firstSeen, end) >= 7);
  const survived = eligible.filter((c) => c.lastSeen && daysBetween(c.firstSeen, c.lastSeen) >= 7).length;
  return { eligible: eligible.length, survived, rate: eligible.length ? survived / eligible.length : null };
}

// active / fresh / survival count creatives, so they are the same under either index.
export function networkSummary(ds, metric = CNT) {
  const networkTotal = ds.networks.reduce((s, net) => s + sumValue(ds.creatives, net, metric), 0);
  return [ALL, ...ds.networks].map((net) => {
    const list = creativesIn(ds, net);
    const fresh = list.filter((c) => isNew(c, ds));
    const value = sumValue(list, net, metric);
    return {
      net, active: list.length, fresh: fresh.length, value,
      share: net === ALL ? 1 : (networkTotal ? value / networkTotal : 0),
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

// `share` is the cell's weight inside its own network column; `value` is its absolute size and
// `max` the largest value on show. The view prints share but shades by value/max, so a tiny
// network cannot look important just because one geo owns most of its small total.
export function geoMatrix(ds, metric = CNT, topN = 15) {
  const cells = {}, totals = {}, geoTotal = {};
  for (const net of ds.networks) {
    totals[net] = 0;
    for (const c of ds.creatives) {
      for (const [geo, v] of Object.entries(c.geo[net] ?? {})) {
        const val = v[metric] ?? 0;
        totals[net] += val;
        geoTotal[geo] = (geoTotal[geo] ?? 0) + val;
        const row = (cells[geo] ??= {});
        row[net] = (row[net] ?? 0) + val;
      }
    }
  }
  const geos = Object.keys(geoTotal).sort((a, b) => geoTotal[b] - geoTotal[a]).slice(0, topN);
  const share = {}, value = {};
  let max = 0;
  for (const geo of geos) {
    share[geo] = {};
    value[geo] = {};
    for (const net of ds.networks) {
      const val = cells[geo]?.[net] ?? 0;
      value[geo][net] = val;
      share[geo][net] = totals[net] ? val / totals[net] : 0;
      if (val > max) max = val;
    }
  }
  return { geos, networks: ds.networks, share, value, max, totals };
}

export const DURATION_BUCKETS = [['0–15s', 0, 15], ['16–30s', 16, 30], ['31–45s', 31, 45], ['46–60s', 46, 60], ['>60s', 61, Infinity]];
export const DUP_BUCKETS = [['1', 1, 1], ['2–4', 2, 4], ['5–9', 5, 9], ['10–49', 10, 49], ['50+', 50, Infinity]];

const rangeLabel = (buckets, v) => (v == null ? 'N/A' : (buckets.find(([, lo, hi]) => v >= lo && v <= hi)?.[0] ?? 'N/A'));

function bucketize(list, net, metric, labels, labelOf) {
  const total = sumValue(list, net, metric);
  return labels
    .map((label) => {
      const members = list.filter((c) => labelOf(c) === label);
      return { label, count: members.length, share: total ? sumValue(members, net, metric) / total : 0 };
    })
    .filter((r) => r.count > 0);
}

export function specs(ds, net, metric = CNT) {
  const list = creativesIn(ds, net);
  return {
    ratio: bucketize(list, net, metric, RATIO_LABELS, (c) => c.ratio),
    duration: bucketize(list, net, metric, [...DURATION_BUCKETS.map((b) => b[0]), 'N/A'],
      (c) => rangeLabel(DURATION_BUCKETS, c.duration == null ? null : Math.round(c.duration))),
    dup: bucketize(list, net, metric, [...DUP_BUCKETS.map((b) => b[0]), 'N/A'], (c) => rangeLabel(DUP_BUCKETS, c.creativeCnt)),
  };
}
