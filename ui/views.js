import { ALL, CNT, IMP } from '../lib/aggregate.js';
import { esc, fmtDur, fmtNum, fmtPct } from './format.js';
import { barChart } from './chart.js';

const empty = (msg) => `<p class="empty">${esc(msg)}</p>`;

// Rows stay ranked by cnt (see topCreatives); the selected index is only what gets shown first.
export function renderTop(rows, limit, metric = CNT) {
  if (!rows.length) return empty('Không có creative nào ở network này.');
  const items = rows.slice(0, limit).map(({ c, cnt, imp, geos }, i) => `
    <li class="row">
      <span class="rank">${i + 1}</span>
      <button class="thumb" data-play="${esc(c.id)}" title="Xem video"><img loading="lazy" src="${esc(c.thumbUrl)}" alt=""></button>
      <div class="meta">
        <div class="line1"><b>${fmtNum(metric === IMP ? imp : cnt)}</b> <span class="muted">${metric === IMP ? 'imp' : 'cnt'}</span> · ${fmtDur(c.duration)} · ${esc(c.ratio)} · ×${c.creativeCnt ?? '–'}</div>
        <div class="line2 muted">${geos.map(esc).join(' ') || '–'} · từ ${esc(c.firstSeen ?? '–')} · ${metric === IMP ? 'cnt' : 'imp'} ${fmtNum(metric === IMP ? cnt : imp)}</div>
        <div class="copy">${esc(c.copy) || '<span class="muted">(không có copy)</span>'}</div>
      </div>
      <button class="icon" data-download="${esc(c.id)}" title="Tải video">⤓</button>
    </li>`).join('');
  const more = rows.length > limit ? `<button class="more" data-more>Xem thêm (${rows.length - limit} còn lại)</button>` : '';
  return `<ol class="list">${items}</ol>${more}`;
}

export function renderCadence(cad, summary, net, metric = CNT) {
  const total = cad.buckets.reduce((s, b) => s + b.count, 0);
  const rows = summary.map((r) => `
    <tr class="${r.net === net ? 'sel' : ''}">
      <td>${r.net === ALL ? 'Tất cả' : esc(r.net)}</td><td>${r.active}</td><td>${r.fresh}</td>
      <td>${fmtPct(r.active ? r.fresh / r.active : null)}</td><td>${r.net === ALL ? '' : fmtPct(r.share)}</td>
      <td>${fmtPct(r.survival.rate)}</td>
    </tr>`).join('');
  return `<p class="kpi"><b>${total}</b> creative mới · theo ${cad.unit === 'day' ? 'ngày' : 'tuần'}</p>${barChart(cad.buckets)}
    <table class="tbl"><thead><tr><th>Network</th><th>Đang chạy</th><th>Mới</th><th>% mới</th><th>% ${metric === IMP ? 'imp' : 'cnt'}</th><th>Sống ≥7d</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="note">"Mới" = lần đầu thấy nằm trong khoảng ngày. "Sống ≥7d" chỉ tính creative mới đã đủ 7 ngày tuổi.</p>`;
}

export function renderGeo(m, metric = CNT) {
  if (!m.geos.length) return empty('Chưa có dữ liệu geo.');
  const head = m.networks.map((n) => `<th>${esc(n)}<div class="muted">${fmtNum(m.totals[n])}</div></th>`).join('');
  // Square root keeps mid-sized cells visible: imp spans several orders of magnitude, so a linear
  // ramp would leave everything but the single largest cell white.
  const body = m.geos.map((g) => `<tr><td>${esc(g)}</td>${m.networks.map((n) => {
    const v = m.share[g][n];
    const heat = m.max ? Math.sqrt((m.value[g][n] ?? 0) / m.max) : 0;
    return `<td class="heat" style="--v:${heat.toFixed(3)}">${v ? fmtPct(v) : ''}</td>`;
  }).join('')}</tr>`).join('');
  const note = metric === IMP
    ? 'Số trong ô = % imp của network đó rơi vào geo · đậm nhạt = quy mô tuyệt đối so với ô lớn nhất bảng. Imp là ước lượng của insightrackr, đã bù độ phủ panel — dùng nó để so geo với geo.'
    : 'Số trong ô = % cnt của network đó rơi vào geo · đậm nhạt = quy mô tuyệt đối so với ô lớn nhất bảng. Panel crawler lệch về Nhật → ở chỉ số cnt chỉ so một geo qua thời gian, đừng so geo với geo. Muốn so geo với geo hãy chuyển sang imp.';
  return `<div class="scroll-x"><table class="tbl geo"><thead><tr><th>Geo</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="note">${note}</p>`;
}

const specBlock = (title, rows) => `<h3>${title}</h3><table class="tbl bars">${rows.map((r) => `
  <tr><td>${esc(r.label)}</td><td>${r.count}</td><td class="bar"><span style="width:${(r.share * 100).toFixed(1)}%"></span></td><td class="muted">${fmtPct(r.share)}</td></tr>`).join('')}</table>`;

export const renderSpecs = (sp, metric = CNT) => specBlock('Tỉ lệ khung', sp.ratio) + specBlock('Thời lượng', sp.duration)
  + specBlock('Mức nhân bản (creativeCnt)', sp.dup)
  + `<p class="note">Số = số creative · thanh = % ${metric === IMP ? 'imp' : 'cnt'}. Trường size của insightrackr sai ~13%.</p>`;
