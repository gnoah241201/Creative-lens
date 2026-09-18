const DAY = 86400000;
const toMs = (iso) => Date.parse(`${iso}T00:00:00Z`);

export const addDays = (iso, n) => new Date(toMs(iso) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY);
export function mondayOf(iso) {
  const dow = new Date(toMs(iso)).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7));
}
export function localToday(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
