export const RATIO_TABLE = [
  ['9:16', 9 / 16], ['16:9', 16 / 9], ['1:1', 1], ['4:5', 4 / 5], ['2:3', 2 / 3],
  ['3:4', 3 / 4], ['5:4', 5 / 4], ['3:2', 3 / 2], ['4:3', 4 / 3],
];
export const RATIO_LABELS = [...RATIO_TABLE.map(([label]) => label), 'Khác', 'N/A'];

// Raw field names of /v3/imagevideo/product/search — confirmed in docs/api-notes.md.
export const F = {
  id: 'id', width: 'width', height: 'height', duration: 'videoTimeSpan', creativeCnt: 'creativeCnt',
  cnt: 'showCnt', imp: 'impression', firstSeen: 'globalFirstTime', lastSeen: 'globalLastTime', videoUrl: 'videoUrl',
  copy: ['title', 'body', 'adContent', 'content'],
  thumb: ['coverUrl', 'imageUrl', 'picUrl'],
};

const BEIJING_OFFSET = 8 * 3600e3; // epoch dates are Beijing midnight
const num = (v) => (v == null || v === '' ? null : Number(v));
const firstOf = (raw, keys) => keys.map((k) => raw[k]).find((v) => v != null && v !== '');

export function ratioLabel(w, h) {
  if (!w || !h) return 'N/A';
  const r = w / h;
  return RATIO_TABLE.find(([, v]) => Math.abs(r - v) < 0.02)?.[0] ?? 'Khác';
}

export function toIsoDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return new Date(v + BEIJING_OFFSET).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// OSS links work without the ?Expires signature, so the bare URL never expires.
const stripQuery = (u) => (u ? String(u).split('?')[0] : null);
const keyframeUrl = (video) => (video ? video.replace('/videos_v3/', '/videos_keyframe_v3/').replace(/\.mp4$/, '.jpg') : null);

export function toCreative(raw) {
  const width = num(raw[F.width]);
  const height = num(raw[F.height]);
  const videoUrl = stripQuery(raw[F.videoUrl]);
  return {
    id: String(raw[F.id]),
    width, height, ratio: ratioLabel(width, height),
    duration: num(raw[F.duration]),
    creativeCnt: num(raw[F.creativeCnt]),
    cnt: num(raw[F.cnt]) ?? 0,
    imp: num(raw[F.imp]) ?? 0,
    firstSeen: toIsoDate(raw[F.firstSeen]),
    lastSeen: toIsoDate(raw[F.lastSeen]),
    copy: firstOf(raw, F.copy) ?? '',
    videoUrl,
    thumbUrl: stripQuery(firstOf(raw, F.thumb)) ?? keyframeUrl(videoUrl),
    byNetwork: {},
    geo: {},
  };
}

// distribute/* response accessors — confirmed in docs/api-notes.md.
const entryId = (e) => String(e.id ?? e.materialId);
const itemsOf = (e) => e.list ?? e.data ?? e.items ?? [];
const keyOf = (it) => it.geo ?? it.countryName ?? it.name ?? it.adfactionName ?? it.mediaName ?? String(it.id);
const keyIdOf = (it) => it.adfactionId ?? it.id ?? null;

export function parseDistribute(data) {
  const out = new Map();
  for (const entry of data ?? []) {
    out.set(entryId(entry), itemsOf(entry).map((it) => ({
      key: keyOf(it), keyId: keyIdOf(it), cnt: Number(it.cnt) || 0, imp: Number(it.impression) || 0,
    })));
  }
  return out;
}
