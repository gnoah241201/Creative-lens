import { toCreative, parseDistribute } from './normalize.js';
import { ALL } from './aggregate.js';

export async function runAnalysis({ client, pkg, start, end, onProgress = () => {} }) {
  const opts = { pkg, start, end };
  const raw = await client.searchAll(pkg, start, end, (done) => onProgress({ stage: 'search', done }));
  const creatives = raw.map(toCreative);
  const byId = new Map(creatives.map((c) => [c.id, c]));

  // Network split. Totals come from here (whole window) rather than the search's showCnt,
  // which is partial when the search window had to be split.
  const adf = parseDistribute(await client.distributeAll('adfaction', [...byId.keys()], opts,
    (done, total) => onProgress({ stage: 'network', done, total })));
  const networkIds = {};
  const netTotal = {};
  for (const [id, items] of adf) {
    const c = byId.get(id);
    if (!c || items.length === 0) continue;
    c.cnt = 0;
    c.imp = 0;
    for (const it of items) {
      c.byNetwork[it.key] = { cnt: it.cnt, imp: it.imp };
      c.cnt += it.cnt;
      c.imp += it.imp;
      netTotal[it.key] = (netTotal[it.key] ?? 0) + it.cnt;
      if (it.keyId != null) networkIds[it.key] = it.keyId;
    }
  }
  const networks = Object.keys(netTotal).filter((n) => netTotal[n] > 0).sort((a, b) => netTotal[b] - netTotal[a]);

  // Geo per network, only for creatives that actually ran there.
  for (const [i, net] of networks.entries()) {
    if (networkIds[net] == null) continue;
    const ids = creatives.filter((c) => (c.byNetwork[net]?.cnt ?? 0) > 0).map((c) => c.id);
    const geo = parseDistribute(await client.distributeAll('country', ids, { ...opts, adfactionIds: [networkIds[net]] },
      (done, total) => onProgress({ stage: 'geo', net, netIndex: i + 1, netCount: networks.length, done, total })));
    for (const [id, items] of geo) {
      const c = byId.get(id);
      if (!c) continue;
      c.geo[net] = {};
      const all = (c.geo[ALL] ??= {});
      for (const it of items) {
        c.geo[net][it.key] = { cnt: it.cnt, imp: it.imp };
        const a = (all[it.key] ??= { cnt: 0, imp: 0 });
        a.cnt += it.cnt;
        a.imp += it.imp;
      }
    }
  }

  return { pkg, start, end, fetchedAt: Date.now(), networks, networkIds, creatives };
}
