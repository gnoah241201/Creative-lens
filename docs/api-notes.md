# Insightrackr API — confirmed 2026-09-18

| Item | ASSUMED in plan | Actual |
|---|---|---|
| Auth header names | Email, ECF07FD99F7847C0, Language | Email, ECF07FD99F7847C0, Language |
| Success `code` | 0 or 200 | 0, 200 |
| Search list path | data.list (fallback data / data.records) | data.list |
| Row id | id | id |
| Width / height | width / height | width / height |
| Duration (s) | videoTimeSpan | videoTimeSpan |
| creativeCnt | creativeCnt | creativeCnt |
| Total cnt | showCnt | showCnt |
| Impression | impression | impression |
| First / last seen + format | globalFirstTime / globalLastTime, 'YYYY-MM-DD…' | globalFirstTime / globalLastTime, 'YYYY-MM-DD HH:mm:ss' |
| Ad copy field | title / body / adContent / content | title |
| Thumbnail | coverUrl / imageUrl / picUrl, else keyframe from videoUrl | coverUrl, fallback keyframe |
| Stripped videoUrl plays (206) | yes | yes |
| distribute entry shape | [{ id, list: [{ name, adfactionId, cnt, impression }] }] | [{ id, list: [{ name, adfactionId, cnt, impression }] }] |
| country item keys | geo, cnt, impression | geo, cnt, impression |
| DISTRIBUTE_BATCH | 100 | 100 |
| Network filter for distribute/country | baseOption.adfactionIds | baseOption.adfactionIds |
| Network ids seen | 102 Applovin · 104 Facebook Ads · 105 Google Ads · 109 TikTok Ads · 110 Unity | 102 Applovin · 104 Facebook Ads · 105 Google Ads · 109 TikTok Ads · 110 Unity |
