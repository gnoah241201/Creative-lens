# Changelog

## 2026-09-18 — Nút chuyển chỉ số cnt ⇄ imp + sửa cách tô màu heatmap geo

Thiết kế đầy đủ: `docs/superpowers/specs/2026-09-18-metric-toggle-design.md`

### Vấn đề

Một ảnh chụp tab Geo lộ ra **hai lỗi tách biệt**.

**1. Dùng sai chỉ số.** Mọi phân bố trong panel đang tính trên `cnt` (Times Detected). `cnt` là
**số đếm mẫu** — nó tăng theo tiền đối thủ chi, nhưng cũng tăng theo số máy insightrackr đặt ở
nước đó. Panel của họ dày ở Nhật, nên JP luôn đứng đầu mọi bảng geo bất kể tiền thật chảy đi đâu.

Đo trên một creative thật:

| Geo | cnt | imp | imp/cnt |
|---|---|---|---|
| FR | 37 | 321.155 | 8.680 |
| IT | 77 | 184.338 | 2.394 |
| DE | 100 | 136.071 | 1.361 |
| JP | 13 | 16.784 | 1.291 |

Xếp hạng **đảo ngược hoàn toàn** giữa hai chỉ số. Hệ số imp/cnt chênh 6,7 lần và thấp nhất đúng ở
nơi panel dày nhất (JP) — tức `imp` chính là hiệu chỉnh cho độ lệch đó.

**2. Tô màu thổi phồng network nhỏ.** Ô được tô theo % **trong cột**, mà mỗi cột tự chuẩn hoá về
100%. Moloco (tổng 631 cnt) đạt 91% ở US và thành ô **đậm nhất bảng**, trong khi Google Ads ở US
(~6.271 cnt, gấp 11 lần) gần như trắng. Đổi chỉ số **không** tự sửa lỗi này — nó là lỗi chuẩn hoá.

### Thay đổi

**Chỉ số** — `lib/aggregate.js` thêm `CNT`, `IMP`, `valueIn()`. `geoMatrix` / `networkSummary` /
`specs` / `topGeos` nhận thêm tham số `metric` (mặc định `CNT` nên caller cũ không ảnh hưởng).

Ba nguyên tắc:
- **Xếp hạng luôn theo `cnt`** — trong cùng một network, điều kiện lấy mẫu như nhau nên số đếm
  thật là so sánh công bằng hơn, và danh sách không nhảy chỗ khi gạt nút. Chỉ số đang chọn chỉ
  quyết định số nào in đậm; số kia vẫn nằm ngay dòng dưới.
- **Điều kiện "có chạy ở network này" vẫn theo `cnt > 0`** — đây là câu hỏi có/không, `cnt` là
  bằng chứng trực tiếp.
- **`active` / `fresh` / `survival` đếm creative** nên giống nhau ở cả hai chỉ số.

Đổi tên (vì field giờ có thể chứa imp): `networkSummary` `cnt`→`value`, `cntShare`→`share`;
`specs` `cntShare`→`share`.

**Tô màu** — tách đôi vai trò của ô: **chữ** vẫn là % trong cột, **màu nền** theo
`sqrt(value / max)` với `max` là ô lớn nhất đang hiển thị. `geoMatrix` trả thêm `value` và `max`.
Dùng căn bậc hai vì imp trải nhiều bậc độ lớn, tô tuyến tính thì chỉ ô lớn nhất có màu.
Kết quả: Moloco/US tụt xuống ~5% độ đậm, Google/US lên ~20%.

**UI** — nút 2 lựa chọn phía trên thanh tab, **luôn hiển thị** kể cả ở tab Geo (nơi chip network bị
ẩn và cũng là nơi chỉ số quan trọng nhất). Mặc định **imp**, lưu vào `chrome.storage.local`.
Chú thích dưới mỗi bảng đổi theo chỉ số — riêng tab Geo giờ chỉ đường "muốn so geo với geo hãy
chuyển sang imp" thay vì chỉ cảnh báo đừng so.

**Excel** — file xuất ra **không phụ thuộc nút toggle**, vì người nhận file không thấy bạn đang
chọn gì. Mọi sheet mang cả hai: `Creatives` có `cnt {net}` + `imp {net}`; `Networks` có `cnt`,
`cnt_share`, `imp_estimate`, `imp_share`; `Geo` đổi sang **giá trị tuyệt đối** cả hai chỉ số
(muốn ra % thì tự tính trong Excel); `Specs` có `cnt_share` + `imp_share`.

### Kiểm chứng

`npm test` → **42/42 pass** (thêm 6 test). Trong đó có fixture 1000-vs-10 khẳng định ô 100% share
của network tí hon phải tô nhạt dưới 0,15.

Chạy thật trên fixture `country.json`: thứ tự geo `DE > IT > FR` (cnt) đổi thành `FR > IT > DE`
(imp), độ đậm của FR lên 61% → 100%, JP xuống 36% → 23%.

### Không làm

- Không gọi lại API khi gạt nút — cả hai số đã lưu sẵn theo từng creative/network/geo.
- Không cho mỗi tab một chỉ số riêng — dễ vô tình so hai tab bằng hai thước đo khác nhau.

---

## 2026-09-18 — Sửa theo kết quả probe API thật (Task 2) + dọn scaffold

Bản code trước đó được sinh ra bám đúng từng chữ theo
`docs/superpowers/plans/2026-09-18-creative-lens.md`, **nhưng Task 2 (probe API thật) chưa bao giờ được chạy**.
`docs/api-notes.md` chỉ copy lại cột "ASSUMED" của plan, và 3 file trong `test/fixtures/` là dữ liệu bịa
(id `1001`/`1002`/`1003`, domain `sample.oss-accelerate...`). Hệ quả: test `real fixtures normalize without
losing ids` tự kiểm tra chính nó — fixture được chế cho khớp code, nên suite xanh 35/35 mà **không nói lên gì
về API thật**.

Lần này Task 2 đã được chạy thật trên phiên đăng nhập `data.insightrackr.com`
(package `com.ig.screwdom`, cửa sổ `2026-08-20 → 2026-09-18`). Chi tiết đầy đủ ở `docs/api-notes.md`.

### 🔴 Sửa lỗi khiến extension không chạy được

**1. Sai endpoint search — `lib/api.js`**

Plan giả định `/v3/imagevideo/product/search`. Endpoint thật UI gọi là **`/v2/imagevideo/search`**
(chỉ các endpoint `distribute/*` mới là v3). Path cũ không tồn tại → mọi lần Phân tích đều lỗi ngay bước đầu.

Đã tách thành hằng số `SEARCH_PATH` để lần sau đổi chỉ sửa một chỗ, và thêm test khoá lại đường dẫn này.

**2. Sai shape response của `distribute/*` — `lib/api.js`**

Plan giả định mảng `[{ id, list: [...] }]`. Thực tế API trả **object keyed theo creative id**:

```jsonc
{ "ff530ac7d53f9ef98fed904812597538": [ { "id": "104", "name": "Facebook Ads", "cnt": 0, "impression": 0, ... } ] }
```

`extractList()` gặp object này → trả `[]` → `parseDistribute` nhận Map rỗng → `byNetwork` rỗng →
`ds.networks` rỗng → **toàn bộ tab Top/Nhịp mới/Geo/Thông số trống trơn mà không báo một lỗi nào**.
Đây là loại hỏng nguy hiểm nhất: im lặng.

Thêm `distributeEntries(data)` để quy đổi shape thật về shape `[{ id, list }]` ngay tại biên client,
nên `parseDistribute` và `lib/pipeline.js` giữ nguyên không phải sửa.

> Lưu ý cho dev sau: network id trong response là **string** (`"104"`), không phải number.
> `baseOption.adfactionIds` nhận cả string lẫn number nên hiện không cần ép kiểu.

**3. Thumbnail rỗng toàn bộ — `lib/normalize.js`**

Hai lỗi chồng nhau:

- Field cover thật tên là **`converUrl`** (insightrackr viết sai chính tả), **`coverUrl` không tồn tại**.
- `imageUrl` và `thumbnailImageUrl` trả về **`[""]` — array, không phải string**.

`firstOf()` cũ lọc bằng `v != null && v !== ''`, mà `[""]` thoả cả hai → nó chọn `[""]`,
`stripQuery([""])` ra chuỗi rỗng `""`, rồi `"" ?? keyframe` **không** rơi về fallback keyframe
(vì `??` chỉ bắt `null`/`undefined`, không bắt chuỗi rỗng). Kết quả: `thumbUrl = ""` cho **mọi** creative.

Đã sửa: `F.thumb` ưu tiên `converUrl` → `thumbnailConverUrl`, và `firstOf()` chỉ nhận
`typeof v === 'string' && v !== ''`. Cũng thêm `describe` vào `F.copy` làm dự phòng.

### ✅ Những giả định của plan đã được xác nhận là ĐÚNG

Không phải sửa gì:

- `SUCCESS_CODES` — API trả `code: 200`.
- `pageSize: 40`, `sortField: '3'`, `sortRule: 'desc'`, `dayMode: 'DD'`, ngày `YYYY-MM-DD`.
- Paging dừng khi gặp trang rỗng (page 400 → `code 200`, `list: []`); trang ngắn **không** phải là hết.
- `DISTRIBUTE_BATCH = 100` an toàn (thử tới 240 id vẫn trả đủ 1 entry/id).
- `baseOption.adfactionIds` **thật sự lọc** được `distribute/country` theo network
  (lọc đúng network → trùng số liệu không lọc: 12 geo / 259 cnt; lọc network khác → 0).
  Không cần chuyển sang `mediaIds`.
- Bỏ query string chữ ký của OSS vẫn tải được (video 206, cover 200, keyframe suy diễn 200) →
  URL lưu vào cache không bao giờ hết hạn.
- Join key là `id` của search row, khớp 100% với key của `distribute/*`.
- `showCnt` / `impression` / `videoTimeSpan` / `creativeCnt` / `globalFirstTime` / `globalLastTime` đúng tên.
- Body tối giản của `buildBody()` được API chấp nhận — không cần copy nguyên body đồ sộ mà UI gửi.

### 📦 Fixtures & tests

- `test/fixtures/{search,adfaction,country}.json` — thay bằng **response thật** (3 entry đầu, giữ đủ field),
  chỉ bỏ query string chữ ký OSS. Đã verify hash byte-for-byte khi chuyển từ trình duyệt về, và grep sạch
  email/token/auth header.
- `test/api.test.js` — mock `distribute/*` đổi sang shape object thật; thêm test khoá `SEARCH_PATH` là v2.
- `test/normalize.test.js` — fixture nạp qua `distributeEntries()` đúng như client thật làm.
- Theo đúng quy tắc của plan: chỉ sửa **input** của test (shape API thật), **giữ nguyên expected output**.
- `npm test` → **36/36 pass**, lần này chạy trên dữ liệu thật.

### 🧹 Dọn scaffold AI Studio

Repo lẫn nguyên một template React/Vite không có trong plan. Đã xoá (-1.324 dòng):

`src/` (App.tsx 923 dòng, demoData.ts, main.tsx, index.css) · `index.html` · `vite.config.ts` ·
`tsconfig.json` · `metadata.json` · `.env.example`

- `src/App.tsx` là một web app demo song song, chạy trên data hardcode, không gọi API — dễ gây hiểu nhầm
  là extension đang hoạt động. Nó còn in cứng badge `35/35 Tests Passing`.
- `metadata.json` khai báo `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` và `.env.example` đòi `GEMINI_API_KEY`,
  trong khi dự án không có thành phần AI nào.
- `package.json` là template `react-example` với 11 runtime dependency (react, vite, express, @google/genai…),
  vi phạm ràng buộc *no build step, no npm runtime dependencies*. Đã thay bằng bản tối giản trong plan.
- `.gitignore` đưa về đúng nội dung plan (`node_modules/`, `*.xlsx`).

Danh sách file còn lại giờ khớp chính xác mục **File Structure** của plan.

### ✅ Chạy thật toàn bộ `lib/` trên API thật (e2e tầng dữ liệu)

Sau khi sửa, toàn bộ `lib/` được bundle thành 1 ES module, nạp vào trang insightrackr đã đăng nhập và
gọi `runAnalysis()` thật với `fetch` thật — tức là đúng code trong repo, đúng API, đúng quy mô thật.
Không phải mock, không phải fixture.

`com.ig.screwdom`, `2026-08-20 → 2026-09-18`, **xong sau 94 giây**, không lỗi:

| Hạng mục | Kết quả | Đối chiếu |
|---|---|---|
| Số creative | **2577** | `count.totalSize` = 2577 → **lệch 0%** (yêu cầu ±2%) |
| Creative mới | **1497** | `count.newNum` = 1497 → khớp tuyệt đối |
| Network phát hiện | 11 | Google Ads 39,1% · Applovin 34,9% · TikTok 21,6% … |
| Có dữ liệu network | 2214 / 2577 | |
| Có dữ liệu geo | 1943 / 2577 | Top geo: JP, DE, BR, KR, US, MX |
| Có thumbnail | 2573 / 2577 | |
| Cadence | 30 bucket ngày, tổng 1497 | khớp `newNum` |
| `buildSheets` | Creatives 2578×24 · Networks 13×7 · NewCreatives 31×13 · Geo 44×12 · Specs 20×4 | đúng 5 sheet, đúng số dòng |

Paging (65 trang), batch 100 id, và vòng lặp geo theo từng network đều chạy đúng ở quy mô thật.
Cũng xác nhận luôn cảnh báo trong README: dữ liệu **lệch mạnh về Nhật** (JP là geo số 1).

4/2577 creative (0,16%) không có thumbnail — đó là banner ảnh 1200×628 không có cả `videoUrl` lẫn
`converUrl`, nên `thumbUrl: null` là kết quả đúng. UI hiện đang render `<img src="">` cho các row này
(icon ảnh vỡ). Cosmetic, chưa sửa.

### ⏭️ Việc còn lại

**Task 8 Step 7 chưa chạy** — phần trên đã chứng minh tầng dữ liệu (`lib/`) chạy thông trên API thật,
nhưng **chưa kiểm thử tầng extension**: `background.js` bắt header, `chrome.storage.session`,
side panel UI, cache IndexedDB, phát video inline, nút tải mp4, xuất file .xlsx bằng SheetJS.
Việc này cần Load unpacked vào Chrome (`chrome://extensions` → Developer mode → Load unpacked).

Chưa kiểm chứng (cần dataset lớn hơn mới chạm tới):
- `CAP_SPLIT = 6900` / ngưỡng truncate 7.000 row của server — game này mới 2577 creative/30 ngày.
- `MAX_PAGES = 200` — mới dùng tới 65.
- Nhánh `EXPIRED_CODES = [-3106]` khi phiên hết hạn.
