import { addDays, daysBetween } from './dates.js';

export const BASE = 'https://data.insightrackr.com/cas/api';
// The creative list lives on v2; only the distribute/* endpoints are v3. Probed 2026-09-18.
export const SEARCH_PATH = '/v2/imagevideo/search';
export const PAGE_SIZE = 40;          // >40 → HTTP 400
export const MAX_PAGES = 200;         // 8,000 rows > the 7,000 server cap
export const CAP_SPLIT = 6900;        // server truncates a window at 7,000 rows
export const DISTRIBUTE_BATCH = 100;  // confirmed in docs/api-notes.md
export const CONCURRENCY = 4;
export const SUCCESS_CODES = [0, 200]; // confirmed in docs/api-notes.md
export const EXPIRED_CODES = [-3106];

export class ApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

export function buildBody({ pkg, start, end, pageIndex = 1, ids, adfactionIds = [] }) {
  const body = {
    keyWord: '', keyWordType: '3,4', isNew: false, materialRemovalRepeat: false,
    productIds: [pkg], languages: [], creativeList: [], appealTypeList: [], interactionList: [],
    productOption: { productType: [], selling: [], monetization: [], payType: [], companyLocation: [], campaignList: [] },
    baseOption: {
      tradeLevel1: [], tradeLevel2: [], tradeLevel3: [], subjectType: [], countryLevel2: [],
      adfactionIds, mediaIds: [], device: [], dayMode: 'DD', startTime: start, endTime: end,
      pageIndex, pageSize: PAGE_SIZE, sortField: '3', sortRule: 'desc',
    },
    classIds: [], seelTargets: [], webTools: [], demoadFormats: [], adMediaType: [], creativeTeam: [], materialTag: [],
  };
  if (ids) body.ids = ids;
  return body;
}

export function extractList(data) {
  if (Array.isArray(data)) return data;
  return data?.list ?? data?.records ?? data?.data ?? [];
}

// distribute/* answers with an object keyed by creative id ({ "<id>": [item, …] }), not a list.
// Normalise it here so everything downstream sees the documented [{ id, list }] shape.
export function distributeEntries(data) {
  if (Array.isArray(data)) return data;
  return Object.entries(data ?? {}).map(([id, list]) => ({ id, list: list ?? [] }));
}

export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

function dedupeById(rows) {
  const byId = new Map();
  for (const r of rows) if (!byId.has(r.id)) byId.set(r.id, r);
  return [...byId.values()];
}

export function createClient({
  fetchFn, getHeaders,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  capSplit = CAP_SPLIT, batchSize = DISTRIBUTE_BATCH,
}) {
  async function post(path, body) {
    const auth = await getHeaders();
    if (!auth || Object.keys(auth).length === 0) throw new ApiError('NO_AUTH', 'Chưa có phiên đăng nhập insightrackr');
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await sleep(1000 * attempt);
      let res;
      try {
        res = await fetchFn(BASE + path, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json;charset=UTF-8', ...auth },
          body: JSON.stringify(body),
        });
      } catch (e) {
        lastErr = new ApiError('NETWORK', `${path}: ${e.message}`);
        continue;
      }
      if (res.status === 401) throw new ApiError('EXPIRED', 'Phiên đăng nhập đã hết hạn');
      if (res.status >= 500) { lastErr = new ApiError('HTTP', `${path}: HTTP ${res.status}`); continue; }
      if (!res.ok) throw new ApiError('HTTP', `${path}: HTTP ${res.status}`);
      const json = await res.json();
      if (EXPIRED_CODES.includes(json.code)) throw new ApiError('EXPIRED', 'Phiên đăng nhập đã hết hạn');
      if (json.code !== undefined && !SUCCESS_CODES.includes(json.code)) {
        throw new ApiError('API', `${path}: code ${json.code} ${json.message ?? ''}`.trim());
      }
      return json.data;
    }
    throw lastErr;
  }

  async function searchWindow(pkg, start, end, onPage) {
    const rows = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const list = extractList(await post(SEARCH_PATH, buildBody({ pkg, start, end, pageIndex: page })));
      if (list.length === 0) break; // a short page is NOT the end
      rows.push(...list);
      onPage(rows.length, page);
    }
    return rows;
  }

  async function searchAll(pkg, start, end, onPage = () => {}) {
    const rows = await searchWindow(pkg, start, end, onPage);
    if (rows.length < capSplit || start >= end) return dedupeById(rows);
    const mid = addDays(start, Math.floor(daysBetween(start, end) / 2));
    const left = await searchAll(pkg, start, mid, onPage);
    const right = await searchAll(pkg, addDays(mid, 1), end, onPage);
    return dedupeById([...left, ...right]);
  }

  async function distributeAll(kind, ids, { pkg, start, end, adfactionIds = [] }, onBatch = () => {}) {
    const batches = chunk(ids, batchSize);
    let done = 0;
    const results = await mapLimit(batches, CONCURRENCY, async (batch) => {
      const data = await post(`/v3/imagevideo/distribute/${kind}`, buildBody({ pkg, start, end, ids: batch, adfactionIds }));
      onBatch(++done, batches.length);
      return distributeEntries(data);
    });
    return results.flat();
  }

  return { post, searchAll, distributeAll };
}
