import { createClient } from './lib/api.js';
import { runAnalysis } from './lib/pipeline.js';
import { ALL, cadence, geoMatrix, networkSummary, specs, topCreatives } from './lib/aggregate.js';
import { cacheKey, loadDataset, saveDataset } from './lib/cache.js';
import { addDays, localToday } from './lib/dates.js';
import { buildSheets } from './lib/export.js';
import { renderCadence, renderGeo, renderSpecs, renderTop } from './ui/views.js';
import { esc } from './ui/format.js';

const $ = (sel) => document.querySelector(sel);
const PAGE = 50;
const state = { ds: null, net: ALL, tab: 'top', limit: PAGE };

const client = createClient({
  fetchFn: (url, init) => fetch(url, init),
  getHeaders: async () => (await chrome.storage.session.get('auth')).auth?.headers,
});

// ---------- auth status ----------
async function showAuth() {
  const { auth } = await chrome.storage.session.get('auth');
  const el = $('#auth');
  if (auth) {
    const t = new Date(auth.capturedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    el.className = 'auth ok';
    el.textContent = `Đã kết nối · ${t}`;
  } else {
    el.className = 'auth';
    el.innerHTML = 'Chưa kết nối — <a href="https://data.insightrackr.com" target="_blank">mở insightrackr</a>';
  }
}
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'session' && changes.auth) showAuth(); });

async function reloadInsightTab() {
  const [tab] = await chrome.tabs.query({ url: 'https://data.insightrackr.com/*' });
  if (tab) await chrome.tabs.reload(tab.id);
  else await chrome.tabs.create({ url: 'https://data.insightrackr.com' });
}

// ---------- messages ----------
function showMsg(text, { error = false, reload = false } = {}) {
  const el = $('#msg');
  el.hidden = false;
  el.className = error ? 'msg err' : 'msg';
  el.innerHTML = esc(text) + (reload ? '<button type="button" data-reload>Tải lại tab insightrackr</button>' : '');
}
const hideMsg = () => { $('#msg').hidden = true; };

function showError(e) {
  if (e.kind === 'NO_AUTH') return showMsg('Chưa kết nối. Mở data.insightrackr.com, đăng nhập, rồi bấm Phân tích lại.', { error: true, reload: true });
  if (e.kind === 'EXPIRED') return showMsg('Phiên đăng nhập đã hết hạn. Tải lại tab insightrackr rồi bấm Phân tích lại.', { error: true, reload: true });
  showMsg(`Lỗi: ${e.message}`, { error: true });
}

function showProgress(p) {
  if (p.stage === 'search') showMsg(`Đang lấy danh sách creative… ${p.done} video`);
  if (p.stage === 'network') showMsg(`Đang lấy network… ${p.done}/${p.total}`);
  if (p.stage === 'geo') showMsg(`Đang lấy geo ${p.net} (${p.netIndex}/${p.netCount})… ${p.done}/${p.total}`);
}

// ---------- analyze ----------
function range() {
  const preset = $('#range').value;
  if (preset === 'custom') return { start: $('#start').value, end: $('#end').value };
  const end = localToday();
  return { start: addDays(end, -(Number(preset) - 1)), end };
}

async function analyze(force = false) {
  const pkg = $('#pkg').value.trim();
  const { start, end } = range();
  if (!pkg || !start || !end || start > end) return showMsg('Nhập package và khoảng ngày hợp lệ.', { error: true });
  chrome.storage.local.set({ lastPkg: pkg });
  const key = cacheKey(pkg, start, end);
  if (!force) {
    const cached = await loadDataset(key).catch(() => null);
    if (cached) return setDataset(cached);
  }
  $('#go').disabled = true;
  try {
    const ds = await runAnalysis({ client, pkg, start, end, onProgress: showProgress });
    await saveDataset(key, ds).catch(() => {});
    setDataset(ds);
  } catch (e) {
    showError(e);
  } finally {
    $('#go').disabled = false;
  }
}

function setDataset(ds) {
  hideMsg();
  state.ds = ds;
  state.net = ALL;
  state.limit = PAGE;
  const t = new Date(ds.fetchedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  $('#summary').innerHTML = `${ds.creatives.length} creative · ${esc(ds.start)} → ${esc(ds.end)} · dữ liệu lúc ${t} · <button type="button" data-refresh>Tải lại</button>`;
  $('#result').hidden = false;
  render();
}

// ---------- render ----------
function render() {
  const { ds, net, tab } = state;
  $('#chips').innerHTML = [ALL, ...ds.networks]
    .map((n) => `<button type="button" data-net="${esc(n)}" class="${n === net ? 'on' : ''}">${n === ALL ? 'Tất cả' : esc(n)}</button>`).join('');
  $('#chips').hidden = tab === 'geo';
  for (const b of document.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
  const view = {
    top: () => renderTop(topCreatives(ds, net), state.limit),
    cadence: () => renderCadence(cadence(ds, net), networkSummary(ds), net),
    geo: () => renderGeo(geoMatrix(ds)),
    specs: () => renderSpecs(specs(ds, net)),
  }[tab];
  $('#view').innerHTML = view();
}

function exportXlsx() {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(buildSheets(state.ds))) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  XLSX.writeFile(wb, `${state.ds.pkg}_${state.ds.start}_${state.ds.end}.xlsx`);
}

const creativeById = (id) => state.ds.creatives.find((c) => c.id === id);

// ---------- events ----------
$('#form').addEventListener('submit', (e) => { e.preventDefault(); analyze(); });
$('#range').addEventListener('change', () => { $('#custom').hidden = $('#range').value !== 'custom'; });
$('#export').addEventListener('click', exportXlsx);

document.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.tab) { state.tab = t.dataset.tab; render(); }
  else if (t.dataset.net) { state.net = t.dataset.net; state.limit = PAGE; render(); }
  else if ('more' in t.dataset) { state.limit += PAGE; render(); }
  else if ('reload' in t.dataset) reloadInsightTab();
  else if ('refresh' in t.dataset) analyze(true);
  else if (t.dataset.play) {
    const li = t.closest('li');
    const existing = li.querySelector('video');
    if (existing) existing.remove();
    else li.insertAdjacentHTML('beforeend', `<video src="${esc(creativeById(t.dataset.play).videoUrl)}" controls autoplay playsinline></video>`);
  } else if (t.dataset.download) {
    const c = creativeById(t.dataset.download);
    chrome.downloads.download({ url: c.videoUrl, filename: `creative-lens/${state.ds.pkg}/${c.id}.mp4` });
  }
});

// ---------- init ----------
showAuth();
chrome.storage.local.get('lastPkg').then(({ lastPkg }) => { if (lastPkg) $('#pkg').value = lastPkg; });
$('#end').value = localToday();
$('#start').value = addDays(localToday(), -29);
