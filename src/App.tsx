import React, { useState, useMemo } from 'react';
import {
  Play,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  Chrome,
  Terminal,
  ExternalLink,
  RefreshCw,
  Clock,
  Globe2,
  Sliders,
  ChevronRight,
  Code2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { sampleDataset, DemoDataset, DemoCreative } from './demoData';
import { ALL, topCreatives, networkSummary, cadence, geoMatrix, specs } from '../lib/aggregate.js';
import { fmtNum, fmtPct, fmtDur } from '../ui/format.js';
import { buildSheets } from '../lib/export.js';

type TabType = 'top' | 'cadence' | 'geo' | 'specs';
type MainView = 'simulator' | 'guide' | 'code' | 'tests';

export default function App() {
  const [mainView, setMainView] = useState<MainView>('simulator');
  const [dataset, setDataset] = useState<DemoDataset>(sampleDataset);
  const [activeNet, setActiveNet] = useState<string>(ALL);
  const [activeTab, setActiveTab] = useState<TabType>('top');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pkgInput, setPkgInput] = useState<string>('com.ig.screwdom');
  const [dateRange, setDateRange] = useState<string>('30');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('manifest.json');

  // Aggregated data using pure lib functions
  const topList = useMemo(() => topCreatives(dataset as any, activeNet), [dataset, activeNet]);
  const netSum = useMemo(() => networkSummary(dataset as any), [dataset]);
  const cad = useMemo(() => cadence(dataset as any, activeNet), [dataset, activeNet]);
  const geoMat = useMemo(() => geoMatrix(dataset as any, 15), [dataset]);
  const specData = useMemo(() => specs(dataset as any, activeNet), [dataset, activeNet]);

  const handleSimulateAnalysis = () => {
    setIsLoading(true);
    setTimeout(() => {
      setDataset({
        ...sampleDataset,
        pkg: pkgInput || 'com.ig.screwdom',
        fetchedAt: Date.now(),
      });
      setIsLoading(false);
    }, 600);
  };

  const handleExportExcel = () => {
    // Dynamic import of xlsx via window or vendored object
    const sheets = buildSheets(dataset as any);
    const XLSX = (window as any).XLSX;
    if (XLSX) {
      const wb = XLSX.utils.book_new();
      for (const [name, aoa] of Object.entries(sheets)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
      }
      XLSX.writeFile(wb, `${dataset.pkg}_${dataset.start}_${dataset.end}.xlsx`);
    } else {
      // Fallback CSV download for first sheet if XLSX script tag isn't yet ready
      const csv = sheets.Creatives.map((r: any[]) => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset.pkg}_creatives.csv`;
      a.click();
    }
  };

  const extensionFiles: Record<string, string> = {
    'manifest.json': `{
  "manifest_version": 3,
  "name": "Creative Lens",
  "version": "0.1.0",
  "description": "Insight creative đối thủ từ Insightrackr",
  "action": { "default_title": "Creative Lens" },
  "side_panel": { "default_path": "sidepanel.html" },
  "background": { "service_worker": "background.js", "type": "module" },
  "permissions": ["sidePanel", "webRequest", "storage", "downloads"],
  "host_permissions": ["https://data.insightrackr.com/*"]
}`,
    'background.js': `import { pickAuthHeaders } from './lib/auth.js';

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.initiator !== 'https://data.insightrackr.com') return;
    const headers = pickAuthHeaders(details.requestHeaders);
    if (Object.keys(headers).length === 0) return;
    chrome.storage.session.set({ auth: { headers, capturedAt: Date.now() } });
  },
  { urls: ['https://data.insightrackr.com/cas/api/*'] },
  ['requestHeaders', 'extraHeaders'],
);`,
    'sidepanel.html': `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Creative Lens</title>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <header>
    <div class="title">Creative Lens <span id="auth" class="auth"></span></div>
    <form id="form" class="form">
      <input id="pkg" placeholder="Package, vd com.ig.screwdom">
      <div class="row2">
        <select id="range">
          <option value="30" selected>30 ngày</option>
        </select>
        <button id="go" type="submit">Phân tích</button>
      </div>
    </form>
  </header>
  ...
</body>
</html>`,
    'lib/auth.js': `export function pickAuthHeaders(requestHeaders) {
  const out = {};
  for (const { name, value } of requestHeaders ?? []) {
    const n = name.toLowerCase();
    if (value == null || STANDARD.has(n) || n.startsWith('sec-')) continue;
    out[name] = value;
  }
  const meaningful = Object.keys(out).some((k) => k.toLowerCase() !== 'language');
  return meaningful ? out : {};
}`,
    'lib/api.js': `// Handles authentication, 40-item pagination, cap splitting (6,900 items), and concurrent batching
export function createClient({ fetchFn, getHeaders }) {
  // ...
}`,
    'lib/aggregate.js': `// Computes topCreatives, 7-day survival, cadence buckets, geo shares, and production specs
export function topCreatives(ds, net) { ... }
export function survival7(newList, end) { ... }
export function geoMatrix(ds, topN = 15) { ... }`,
  };

  const copyCode = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              CL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900">Creative Lens</h1>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  MV3 Side Panel
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 35/35 Tests Passing
                </span>
              </div>
              <p className="text-xs text-slate-500">Phân tích creative đối thủ từ data.insightrackr.com</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setMainView('simulator')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mainView === 'simulator'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trình giả lập Side Panel
            </button>
            <button
              onClick={() => setMainView('guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mainView === 'guide'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cài đặt Chrome
            </button>
            <button
              onClick={() => setMainView('code')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mainView === 'code'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mã nguồn Extension
            </button>
            <button
              onClick={() => setMainView('tests')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mainView === 'tests'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Test Suite
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mainView === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Context & Highlights */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 mb-2">Giới thiệu Creative Lens</h2>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Tiện ích mở rộng Chrome Side Panel trích xuất toàn bộ video creative của game từ Insightrackr,
                  cho phép xem top creative, nhịp ra creative mới, ma trận phân bổ quốc gia và thông số sản xuất theo từng ad network.
                </p>

                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-800">Không cần login thủ công:</strong> Tự động bắt auth headers mà trang Insightrackr đang gửi.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-800">Phân rã theo Network & Geo:</strong> Gọi batch API phân bổ để tách đúng số lần xuất hiện (cnt) theo mạng và quốc gia.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-800">Tỉ lệ sống sót 7 ngày (Survival):</strong> Đếm số creative mới tiếp tục chạy sau 7 ngày mà không bị thiên vị right-censoring.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div>
                      <strong className="text-slate-800">Xuất Excel đa sheet:</strong> Tạo sẵn 5 sheet phân tích (Creatives, Networks, NewCreatives, Geo, Specs).
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Package Quick-loader */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                  <span>Mẫu phân tích có sẵn</span>
                  <span className="text-xs text-blue-600 font-normal">Click để nạp</span>
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => { setPkgInput('com.ig.screwdom'); handleSimulateAnalysis(); }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">com.ig.screwdom</div>
                      <div className="text-xs text-slate-500">Screwdom Puzzle · 6 video top · 5 networks</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => { setPkgInput('com.block.puzzle.wood'); handleSimulateAnalysis(); }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">com.block.puzzle.wood</div>
                      <div className="text-xs text-slate-500">Wood Block Game · Casual category</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Data disclaimer card */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Nguyên tắc đọc số:</strong> <span className="font-semibold">cnt</span> (Times Detected) là số lần crawler bắt gặp thực tế. <span className="font-semibold">imp</span> là số ước lượng thuật toán của Insightrackr. Hệ thống crawler của Insightrackr có mật độ cao tại Nhật Bản, do đó nên so sánh một geo qua các thời kỳ hơn là so sánh tương đối giữa các geo khác nhau.
                </div>
              </div>
            </div>

            {/* Right Column: Chrome Side Panel Mockup Frame */}
            <div className="lg:col-span-8 flex justify-center">
              <div className="w-full max-w-[500px] bg-white rounded-3xl border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[720px]">
                {/* Browser Side Panel Header bar */}
                <div className="bg-slate-800 px-4 py-2 flex items-center justify-between text-white text-xs font-medium select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                    <span className="ml-2 font-mono text-[11px] text-slate-300">Chrome Side Panel</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Creative Lens v0.1.0</span>
                </div>

                {/* Side Panel Actual Container */}
                <div className="flex-1 flex flex-col bg-white text-slate-900 overflow-y-auto">
                  {/* Top Bar of the Extension */}
                  <header className="sticky top-0 z-10 bg-white px-4 py-3 border-b border-slate-200">
                    <div className="flex justify-between items-baseline mb-2">
                      <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>Creative Lens</span>
                      </div>
                      <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        <span>Đã kết nối</span>
                      </div>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSimulateAnalysis(); }} className="space-y-2">
                      <input
                        value={pkgInput}
                        onChange={(e) => setPkgInput(e.target.value)}
                        placeholder="Package, vd com.ig.screwdom"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-600 transition-colors"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={dateRange}
                          onChange={(e) => setDateRange(e.target.value)}
                          className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-hidden focus:border-blue-600 text-slate-700"
                        >
                          <option value="7">7 ngày</option>
                          <option value="14">14 ngày</option>
                          <option value="30">30 ngày</option>
                          <option value="90">90 ngày</option>
                        </select>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tải...</span>
                            </>
                          ) : (
                            <span>Phân tích</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </header>

                  {/* Summary row */}
                  <div className="px-4 py-2 text-[11px] text-slate-500 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span>
                      <strong>{dataset.creatives.length}</strong> creative · {dataset.start} → {dataset.end}
                    </span>
                    <button
                      onClick={handleSimulateAnalysis}
                      className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Tải lại
                    </button>
                  </div>

                  {/* Network Chips filter */}
                  {activeTab !== 'geo' && (
                    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-slate-100 bg-white">
                      <button
                        onClick={() => setActiveNet(ALL)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          activeNet === ALL
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả
                      </button>
                      {dataset.networks.map((net) => (
                        <button
                          key={net}
                          onClick={() => setActiveNet(net)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            activeNet === net
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {net}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tab bar */}
                  <nav className="flex gap-4 px-4 border-b border-slate-200 bg-white">
                    {[
                      { id: 'top', label: 'Top' },
                      { id: 'cadence', label: 'Nhịp mới' },
                      { id: 'geo', label: 'Geo' },
                      { id: 'specs', label: 'Thông số' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                          activeTab === tab.id
                            ? 'text-slate-900 border-slate-900'
                            : 'text-slate-500 border-transparent hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>

                  {/* Tab Body View */}
                  <div className="flex-1 p-4 pb-20">
                    {/* TOP TAB */}
                    {activeTab === 'top' && (
                      <div className="space-y-3">
                        {topList.length === 0 ? (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            Không có creative nào ở network này.
                          </div>
                        ) : (
                          topList.map(({ c, cnt, imp, geos }: { c: any; cnt: number; imp: number; geos: string[] }, idx: number) => {
                            const isPlaying = playingId === c.id;
                            return (
                              <div
                                key={c.id}
                                className="grid grid-cols-[20px_64px_1fr_auto] gap-2.5 items-start py-3 border-b border-slate-100 text-xs last:border-b-0"
                              >
                                <span className="pt-0.5 text-slate-400 font-mono text-[11px]">{idx + 1}</span>

                                {/* Thumbnail / Video Preview Toggle */}
                                <button
                                  onClick={() => setPlayingId(isPlaying ? null : c.id)}
                                  className="w-16 h-22 rounded-md overflow-hidden bg-slate-100 border border-slate-200 relative group cursor-pointer shadow-2xs"
                                  title="Xem video"
                                >
                                  <img
                                    src={c.thumbUrl}
                                    alt=""
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                                    <Play className="w-5 h-5 text-white fill-white" />
                                  </div>
                                </button>

                                {/* Meta details */}
                                <div className="min-w-0 pr-1">
                                  <div className="font-semibold text-slate-900 truncate">
                                    <span>{fmtNum(cnt)}</span>{' '}
                                    <span className="text-[10px] text-slate-500 font-normal">cnt</span>
                                    <span className="text-slate-300 font-normal mx-1">·</span>
                                    <span className="font-normal text-slate-600">{fmtDur(c.duration)}</span>
                                    <span className="text-slate-300 font-normal mx-1">·</span>
                                    <span className="font-normal text-slate-600">{c.ratio}</span>
                                    <span className="text-slate-300 font-normal mx-1">·</span>
                                    <span className="font-normal text-slate-600">×{c.creativeCnt}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    <span className="font-medium text-slate-700">{geos.join(' ') || '–'}</span>
                                    <span className="text-slate-300 mx-1">·</span>
                                    <span>từ {c.firstSeen || '–'}</span>
                                    <span className="text-slate-300 mx-1">·</span>
                                    <span>imp {fmtNum(imp)}</span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-700 line-clamp-2 leading-relaxed">
                                    {c.copy || <span className="text-slate-400 italic">(không có copy)</span>}
                                  </p>
                                </div>

                                {/* Download video button */}
                                <a
                                  href={c.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                  title="Tải video"
                                >
                                  <Download className="w-4 h-4" />
                                </a>

                                {/* Inline player if expanded */}
                                {isPlaying && (
                                  <div className="col-span-4 mt-2 p-2 bg-slate-900 rounded-xl overflow-hidden shadow-md">
                                    <div className="flex items-center justify-between text-white text-[11px] pb-1.5 px-1">
                                      <span>Video Player ({c.ratio})</span>
                                      <button
                                        onClick={() => setPlayingId(null)}
                                        className="text-slate-400 hover:text-white"
                                      >
                                        Đóng
                                      </button>
                                    </div>
                                    <video
                                      src={c.videoUrl}
                                      controls
                                      autoPlay
                                      playsInline
                                      className="w-full max-h-64 rounded bg-black object-contain"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* CADENCE TAB */}
                    {activeTab === 'cadence' && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-700">
                          <strong className="text-slate-900 font-bold">{cad.buckets.reduce((s, b) => s + b.count, 0)}</strong> creative mới · theo {cad.unit === 'day' ? 'ngày' : 'tuần'}
                        </p>

                        {/* Bar Chart SVG */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="text-[10px] text-slate-400 font-medium mb-1">Số lượng creative phát hiện lần đầu</div>
                          <div className="h-28 flex items-end gap-1.5 pt-2">
                            {cad.buckets.map((b) => {
                              const maxCount = Math.max(1, ...cad.buckets.map((x) => x.count));
                              const heightPct = (b.count / maxCount) * 100;
                              return (
                                <div key={b.key} className="flex-1 flex flex-col items-center group relative">
                                  <div
                                    className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-xs transition-all cursor-pointer"
                                    style={{ height: `${Math.max(4, heightPct)}%` }}
                                  />
                                  <div className="absolute -top-7 hidden group-hover:flex bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-10">
                                    {b.key}: {b.count}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                            <span>{cad.buckets[0]?.key?.slice(5)}</span>
                            <span>{cad.buckets[cad.buckets.length - 1]?.key?.slice(5)}</span>
                          </div>
                        </div>

                        {/* Network Summary Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-right border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 font-medium text-[11px]">
                                <th className="text-left py-2">Network</th>
                                <th className="py-2">Đang chạy</th>
                                <th className="py-2">Mới</th>
                                <th className="py-2">% mới</th>
                                <th className="py-2">% cnt</th>
                                <th className="py-2">Sống ≥7d</th>
                              </tr>
                            </thead>
                            <tbody>
                              {netSum.map((r) => {
                                const isSelected = r.net === activeNet;
                                return (
                                  <tr
                                    key={r.net}
                                    onClick={() => setActiveNet(r.net)}
                                    className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                                      isSelected ? 'font-bold bg-blue-50/50' : ''
                                    }`}
                                  >
                                    <td className="text-left py-2 font-medium">
                                      {r.net === ALL ? 'Tất cả' : r.net}
                                    </td>
                                    <td className="py-2 text-slate-700">{r.active}</td>
                                    <td className="py-2 text-slate-700">{r.fresh}</td>
                                    <td className="py-2 text-slate-600">{fmtPct(r.active ? r.fresh / r.active : null)}</td>
                                    <td className="py-2 text-slate-600">{r.net === ALL ? '–' : fmtPct(r.cntShare)}</td>
                                    <td className="py-2 text-emerald-600 font-semibold">{fmtPct(r.survival.rate)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          "Mới" = ngày phát hiện lần đầu nằm trong khung thời gian. "Sống ≥7d" chỉ tính creative mới đã đủ 7 ngày tuổi để tránh sai lệch right-censoring.
                        </p>
                      </div>
                    )}

                    {/* GEO TAB */}
                    {activeTab === 'geo' && (
                      <div className="space-y-3">
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-xs border-collapse text-right">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                <th className="text-left p-2 font-semibold">Geo</th>
                                {geoMat.networks.map((net: string) => (
                                  <th key={net} className="p-2 whitespace-nowrap">
                                    <div>{net}</div>
                                    <div className="text-[10px] text-slate-400 font-normal">{fmtNum((geoMat.totals as Record<string, number>)[net])}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {geoMat.geos.map((geo: string) => (
                                <tr key={geo} className="border-b border-slate-100 last:border-b-0">
                                  <td className="text-left p-2 font-bold text-slate-900">{geo}</td>
                                  {geoMat.networks.map((net: string) => {
                                    const share = ((geoMat.share as Record<string, Record<string, number>>)[geo])?.[net] ?? 0;
                                    const opacity = Math.min(0.8, share * 1.5);
                                    return (
                                      <td
                                        key={net}
                                        className="p-2 font-mono text-[11px]"
                                        style={{
                                          backgroundColor: share > 0 ? `rgba(47, 111, 235, ${opacity})` : 'transparent',
                                          color: share > 0.4 ? '#ffffff' : '#1e293b',
                                        }}
                                      >
                                        {share > 0 ? fmtPct(share) : ''}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Mỗi ô biểu thị % cnt của network đó phân bổ vào quốc gia. Hệ thống crawler của Insightrackr tập trung nhiều tại Nhật Bản, khuyến nghị theo dõi xu hướng một thị trường qua các tuần.
                        </p>
                      </div>
                    )}

                    {/* SPECS TAB */}
                    {activeTab === 'specs' && (
                      <div className="space-y-5">
                        {/* Aspect Ratio */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                            Tỉ lệ khung hình (Aspect Ratio)
                          </h4>
                          <div className="space-y-2">
                            {specData.ratio.map((r: any) => (
                              <div key={r.label} className="grid grid-cols-[60px_40px_1fr_48px] gap-2 items-center text-xs">
                                <span className="font-semibold text-slate-800">{r.label}</span>
                                <span className="text-slate-500 font-mono">{r.count}</span>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${(r.cntShare * 100).toFixed(1)}%` }}
                                  />
                                </div>
                                <span className="text-right text-slate-500 font-mono">{fmtPct(r.cntShare)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="pt-3 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                            Thời lượng video (Duration)
                          </h4>
                          <div className="space-y-2">
                            {specData.duration.map((r: any) => (
                              <div key={r.label} className="grid grid-cols-[60px_40px_1fr_48px] gap-2 items-center text-xs">
                                <span className="font-semibold text-slate-800">{r.label}</span>
                                <span className="text-slate-500 font-mono">{r.count}</span>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${(r.cntShare * 100).toFixed(1)}%` }}
                                  />
                                </div>
                                <span className="text-right text-slate-500 font-mono">{fmtPct(r.cntShare)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Duplication level */}
                        <div className="pt-3 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                            Mức độ nhân bản (creativeCnt)
                          </h4>
                          <div className="space-y-2">
                            {specData.dup.map((r: any) => (
                              <div key={r.label} className="grid grid-cols-[60px_40px_1fr_48px] gap-2 items-center text-xs">
                                <span className="font-semibold text-slate-800">{r.label}</span>
                                <span className="text-slate-500 font-mono">{r.count}</span>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${(r.cntShare * 100).toFixed(1)}%` }}
                                  />
                                </div>
                                <span className="text-right text-slate-500 font-mono">{fmtPct(r.cntShare)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Số lượng = số creative · Thanh màu = % tổng số lần xuất hiện (cnt).
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Fixed footer in Side Panel */}
                  <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
                    <button
                      onClick={handleExportExcel}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Xuất Excel</span>
                    </button>
                    <span className="text-[10px] text-slate-400">
                      cnt: Times Detected · imp: ước lượng
                    </span>
                  </footer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CÀI ĐẶT CHROME EXTENSION VIEW */}
        {mainView === 'guide' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Chrome className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Hướng dẫn cài đặt Creative Lens vào Chrome</h2>
                  <p className="text-sm text-slate-500">Chỉ cần thực hiện 1 lần, không cần build step, cài trực tiếp qua Developer mode</p>
                </div>
              </div>

              <div className="space-y-6 text-sm">
                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">Bật Chế độ nhà phát triển (Developer mode)</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Mở Google Chrome, truy cập địa chỉ <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs">chrome://extensions</code> và bật công tắc <strong>Developer mode</strong> ở góc trên bên phải.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">Nạp thư mục extension (Load unpacked)</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Bấm nút <strong>Load unpacked</strong> (Tải tiện ích đã giải nén) ở góc trái trên, sau đó chọn thư mục gốc chứa extension (thư mục chứa tệp <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-xs">manifest.json</code>).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">Ghim icon lên thanh công cụ Chrome</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Bấm vào biểu tượng mảnh ghép (Extensions) trên thanh công cụ và ghim <strong>Creative Lens</strong> để mở nhanh Side Panel bất cứ lúc nào.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900">Đăng nhập Insightrackr và sử dụng</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Mở trang <a href="https://data.insightrackr.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">data.insightrackr.com <ExternalLink className="w-3 h-3" /></a> và đăng nhập. Sau đó bấm icon Creative Lens trên thanh công cụ để mở Side Panel và bắt đầu phân tích!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOURCE CODE EXPLORER VIEW */}
        {mainView === 'code' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* File List */}
            <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                Tệp nguồn Extension
              </h3>
              <div className="space-y-1">
                {Object.keys(extensionFiles).map((file) => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                      selectedFile === file
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{file}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Code Content */}
            <div className="md:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="text-slate-200 font-medium">{selectedFile}</span>
                <button
                  onClick={() => copyCode(extensionFiles[selectedFile], selectedFile)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  {copiedPath === selectedFile ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
                <code>{extensionFiles[selectedFile]}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TEST SUITE STATUS VIEW */}
        {mainView === 'tests' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Bộ kiểm thử tự động (Unit Tests)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Chạy qua lệnh tiêu chuẩn: <code>npm test</code> (Node v22 test runner)</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                    35 Passed / 0 Failed
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-xs">
                {[
                  { file: 'test/auth.test.js', tests: 3, desc: 'Lọc auth headers đặc thù, loại bỏ headers chuẩn, xử lý dữ liệu rỗng' },
                  { file: 'test/dates.test.js', tests: 4, desc: 'Tính chênh lệch ngày, chuyển đổi tháng, tìm thứ 2 đầu tuần (mondayOf)' },
                  { file: 'test/api.test.js', tests: 11, desc: 'Xây dựng body, NO_AUTH, EXPIRED -3106, retry 5xx, paging qua trang ngắn, chia nhỏ window khi chạm ngưỡng 7000, batching' },
                  { file: 'test/normalize.test.js', tests: 5, desc: 'Phân loại tỉ lệ khung hình (ratioLabel), Beijing epoch to ISO date, map row search & distribute' },
                  { file: 'test/aggregate.test.js', tests: 6, desc: 'Xếp hạng top creative, tính nhịp ra mới, ma trận phân bổ geo, thông số sản xuất, tỉ lệ sống sót 7 ngày (survival7)' },
                  { file: 'test/pipeline.test.js', tests: 1, desc: 'Quy trình kết hợp search + network distribute + geo distribute theo từng network' },
                  { file: 'test/ui.test.js & export.test.js', tests: 5, desc: 'Định dạng số, phần trăm, thời lượng, vẽ SVG bar chart, xuất 5 sheet Excel' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between">
                    <div>
                      <div className="font-mono font-bold text-slate-800 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{item.file}</span>
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {item.tests} tests
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1 text-[11px]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
