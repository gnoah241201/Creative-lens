# Insightrackr API — confirmed 2026-09-18

Probed live against `data.insightrackr.com` with a logged-in session (Task 2).
Package used: `com.ig.screwdom`, window `2026-08-20 → 2026-09-18`.
No header values, tokens or e-mail addresses are recorded here or in the fixtures.

| Item | ASSUMED in plan | Actual |
|---|---|---|
| Auth header names | Email, ECF07FD99F7847C0, Language | **Authorization, Email, ECF07FD99F7847C0, Language** + `presentationSortType`, `showTrendType`, `x-datadog-*` |
| Success `code` | 0 or 200 | **200** (`message: null`) |
| Search endpoint | `/v3/imagevideo/product/search` | **`/v2/imagevideo/search`** ⚠️ |
| Search list path | data.list (fallback data / data.records) | `data.list` ✓ (`data.totalSize` is null here — use `/v3/imagevideo/count`) |
| Row id | id | `id` — 32-char lowercase hex string ✓ |
| Width / height | width / height | `width` / `height` ✓ (also `size: "720*1280"`) |
| Duration (s) | videoTimeSpan | `videoTimeSpan` ✓ |
| creativeCnt | creativeCnt | `creativeCnt` ✓ |
| Total cnt | showCnt | `showCnt` ✓ (34/40 rows non-zero; `findCnt` is a different, much smaller counter) |
| Impression | impression | `impression` ✓ |
| First / last seen + format | globalFirstTime / globalLastTime, 'YYYY-MM-DD…' | `globalFirstTime` / `globalLastTime`, `"2026-09-18 13:36:34"` ✓ |
| Ad copy field | title / body / adContent / content | `title` ✓ (`describe` is a second line; `body`/`adContent`/`content` do not exist) |
| Thumbnail | coverUrl / imageUrl / picUrl, else keyframe from videoUrl | **`converUrl`** (their spelling; `coverUrl` does not exist). `imageUrl`/`thumbnailImageUrl` are `[""]` **arrays**, not strings ⚠️ |
| Stripped videoUrl plays (206) | yes | yes — bare video 206, bare cover 200, derived keyframe 200 ✓ |
| distribute entry shape | `[{ id, list: [{ name, adfactionId, cnt, impression }] }]` | **`{ "<creativeId>": [{ id, cnt, impression, name, geo, … }] }`** — an object keyed by creative id, not a list ⚠️ |
| distribute item network id | adfactionId | `id`, as a **string** (`"104"`); no `adfactionId` field |
| country item keys | geo, cnt, impression | `geo` (`"FR"`), `name` (`"France"`), `cnt`, `impression` ✓ |
| DISTRIBUTE_BATCH | 100 | 100 is safe — 50/100/200/240 ids all returned one entry per id |
| Network filter for distribute/country | baseOption.adfactionIds | `baseOption.adfactionIds` ✓ — filtering by the creative's own network reproduced the unfiltered totals (12 geos / 259 cnt); filtering by another network returned 0. Number **and** string ids both work |
| Network ids seen | 102 Applovin · 104 Facebook Ads · 105 Google Ads · 109 TikTok Ads · 110 Unity | 102 Applovin · 104 Facebook Ads · 105 Google Ads · **108 Mintegral** · 109 TikTok Ads · 110 Unity · **356 InMobi** |

## Also confirmed

- **Paging** stops on an empty page: page 400 returned `code 200` with `list: []`. A short page is not the end.
- **`buildBody`'s minimal body is accepted** — the trimmed body in `lib/api.js` returns the same results as the
  full body the UI sends, so the extra fields the page includes (`permission`, `putOverseaInland`, `keyWordList`,
  `compareStartDate`, `szfxList`, `materialTopLimit`, …) are optional.
- **Paging / sorting params** match the plan exactly: `pageSize: 40`, `sortField: '3'`, `sortRule: 'desc'`,
  `dayMode: 'DD'`, `startTime`/`endTime` as `YYYY-MM-DD`, `isNew: false`, `materialRemovalRepeat: false`.
- **Join key**: the search row `id` is exactly the key of the `distribute/*` response object — verified 3/3 and 40/40.
- **`/v3/imagevideo/count`** returns `{ totalSize, totalCnt, newNum, newCnt, latestDate }`. For the probed
  package + window: `totalSize: 2577`, `newNum: 1497`. Useful as ground truth for the Task 8 ±2% check.
- **`adFactionList` on a search row is `null`**, so the separate `distribute/adfaction` call is genuinely required.
- Other endpoints the UI calls (not used by Creative Lens): `/v3/imagevideo/distribute/{media,app}`,
  `/cas/api/collect/tag/query`, `/cas/api/bury-point/report`.

## Fixtures

`test/fixtures/{search,adfaction,country}.json` are verbatim live responses (first 3 entries each, all fields kept),
with only the OSS signature query strings stripped — bare URLs serve fine, so nothing is lost.
Transfer was integrity-checked against a hash computed in the browser.
