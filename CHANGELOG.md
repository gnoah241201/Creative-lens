# Changelog

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

### ⏭️ Việc còn lại

**Task 8 Step 7 (kiểm thử end-to-end) vẫn chưa chạy** — cần load extension vào Chrome.
Mọi thứ trên đây mới chứng minh *shape dữ liệu* đúng; chưa chứng minh toàn bộ luồng chạy thông trong extension.

Mốc đối chiếu khi test: `/v3/imagevideo/count` cho `com.ig.screwdom` (2026-08-20 → 2026-09-18) trả
**`totalSize: 2577`**, `newNum: 1497`. Số creative extension lấy về phải nằm trong ±2% của 2577.

Chưa kiểm chứng (cần dataset lớn hơn mới chạm tới):
- `CAP_SPLIT = 6900` / ngưỡng truncate 7.000 row của server.
- `MAX_PAGES = 200`.
- Nhánh `EXPIRED_CODES = [-3106]` khi phiên hết hạn.
