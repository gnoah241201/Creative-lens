export function barChart(buckets, { width = 340, height = 120 } = {}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const n = buckets.length || 1;
  const gap = 2;
  const bw = Math.max(1, (width - gap * (n - 1)) / n);
  const plotH = height - 16;
  const bars = buckets.map((b, i) => {
    const h = Math.round((b.count / max) * plotH);
    return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${plotH - h}" width="${bw.toFixed(1)}" height="${h}" rx="1"><title>${b.key}: ${b.count}</title></rect>`;
  }).join('');
  const first = buckets[0]?.key ?? '';
  const last = buckets.at(-1)?.key ?? '';
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img">${bars}`
    + `<text x="0" y="${height - 2}">${first.slice(5)}</text>`
    + `<text x="${width}" y="${height - 2}" text-anchor="end">${last.slice(5)}</text></svg>`;
}
