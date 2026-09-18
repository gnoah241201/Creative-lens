const trim = (x) => x.toFixed(1).replace(/\.0$/, '');

export function fmtNum(n) {
  if (n == null) return '–';
  const a = Math.abs(n);
  if (a >= 1e9) return `${trim(n / 1e9)}B`;
  if (a >= 1e6) return `${trim(n / 1e6)}M`;
  if (a >= 1e3) return `${trim(n / 1e3)}k`;
  return String(Math.round(n));
}

export const fmtPct = (x) => (x == null ? '–' : `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`);

export function fmtDur(s) {
  if (s == null) return '–';
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
