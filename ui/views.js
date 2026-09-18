import { ALL } from '../lib/aggregate.js';
import { esc, fmtDur, fmtNum, fmtPct } from './format.js';
import { barChart } from './chart.js';

const empty = (msg) => `<p class="empty">${esc(msg)}</p>`;

export function renderTop(rows, limit) {
  if (!rows.length) return empty('Không có creative nào ở network này.');
  const items = rows.slice(0, limit).map(({ c, cnt, imp, geos }, i) => `
    <li class="row">
      <span class="rank">${i + 1}</span>
      <button class="thumb" data-play="${esc(c.id)}" title="Xem video"><img loading="lazy" src="${esc(c.thumbUrl)}" alt=""></button>
      <div class="meta">
        <div class="line1"><b>${fmtNum(cnt)}</b> <span class="muted">cnt</span> · ${fmtDur(c.duration)} · ${esc(c.ratio)} · ×${c.creativeCnt ?? '–'}</div>
        <div class="line2 muted">${geos.map(esc).join(' ') || '–'} · từ ${esc(c.firstSeen ?? '–')} · imp ${fmtNum(imp)}</div>
        <div class="copy">${esc(c.copy) || '<span class="muted">(không có copy)</span>'}</div>
      </div>
      <button class="icon" data-download="${esc(c.id)}" title="Tải video">⤓</button>
    </li>`).join('');
  const more = rows.length > limit ? `<button class="more" data-more>Xem thêm (${rows.length - limit} còn lại)</button>` : '';
  return `<ol class="list">${items}</ol>${more}`;
}

export function renderCadence(cad, summary, net) {
  const total = cad.buckets.reduce((s, b) => s + b.count, 0);
  const rows = summary.map((r) => `
    <tr class="${r.net === net ? 'sel' : ''}">
      <td>${r.net === ALL ? 'Tất cả' : esc(r.net)}</td><td>${r.active}</td><td>${r.fresh}</td>
      <td>${fmtPct(r.active ? r.fresh / r.active : null)}</td><td>${r.net === ALL ? '' : fmtPct(r.cntShare)}</td>
      <td>${fmtPct(r.survival.rate)}</td>
    </tr>`).join('');
  return `<p class="kpi"><b>${total}</b> creative mới · theo ${cad.unit === 'day' ? 'ngày' : 'tuần'}</p>${barChart(cad.buckets)}
    <table class="tbl"><thead><tr><th>Network</th><th>Đang chạy</th><th>Mới</th><th>% mới</th><th>% cnt</th><th>Sống ≥7d</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p class="note">"Mới" = lần đầu thấy nằm trong khoảng ngày. "Sống ≥7d" chỉ tính creative mới đã đủ 7 ngày tuổi.</p>`;
}

export function renderGeo(m) {
  if (!m.geos.length) return empty('Chưa có dữ liệu geo.');
  const head = m.networks.map((n) => `<th>${esc(n)}<div class="muted">${fmtNum(m.totals[n])}</div></th>`).join('');
  const body = m.geos.map((g) => `<tr><td>${esc(g)}</td>${m.networks.map((n) => {
    const v = m.share[g][n];
    return `<td class="heat" style="--v:${v.toFixed(3)}">${v ? fmtPct(v) : ''}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="scroll-x"><table class="tbl geo"><thead><tr><th>Geo</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="note">Ô = % cnt của network đó rơi vào geo. Panel crawler lệch về Nhật → chỉ so một geo qua thời gian, đừng so geo với geo.</p>`;
}

const specBlock = (title, rows) => `<h3>${title}</h3><table class="tbl bars">${rows.map((r) => `
  <tr><td>${esc(r.label)}</td><td>${r.count}</td><td class="bar"><span style="width:${(r.cntShare * 100).toFixed(1)}%"></span></td><td class="muted">${fmtPct(r.cntShare)}</td></tr>`).join('')}</table>`;

export const renderSpecs = (sp) => specBlock('Tỉ lệ khung', sp.ratio) + specBlock('Thời lượng', sp.duration)
  + specBlock('Mức nhân bản (creativeCnt)', sp.dup)
  + '<p class="note">Số = số creative · thanh = % cnt. Trường size của insightrackr sai ~13%.</p>';
