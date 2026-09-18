# Metric toggle (cnt ⇄ imp) + heatmap shading — design

**Date:** 2026-09-18
**Status:** approved, implemented

## Problem

Two separate defects surfaced from the same screenshot of the Geo tab.

**1. The wrong index.** Every distribution in the panel is computed on `cnt` (Times Detected).
`cnt` is a *sample count*: it rises with the advertiser's spend, but also with how many panel
devices insightrackr runs in that country. Their panel is JP-heavy, so JP tops every geo table
regardless of where the money actually goes. The original plan made `cnt` primary because it is
the honestly measured number — correct in general, wrong for the one question the Geo tab exists
to answer ("which market is bigger").

Measured on a real creative (Task 2 probe):

| Geo | cnt | imp | imp/cnt |
|---|---|---|---|
| FR | 37 | 321,155 | 8,680 |
| IT | 77 | 184,338 | 2,394 |
| DE | 100 | 136,071 | 1,361 |
| JP | 13 | 16,784 | 1,291 |

Ranking flips completely between the two indices. The per-geo ratio spans 6.7×, and is lowest
exactly where the panel is densest (JP) — i.e. `imp` is insightrackr's correction for that bias.

**2. Shading exaggerates small networks.** Cells were shaded by share *within their own column*,
and every column normalises to 100%. Moloco (631 cnt total) showed 91% in US and rendered as the
darkest cell on the table, while Google Ads in US — ~6,271 cnt, eleven times larger — rendered
almost white. Switching index alone does not fix this; it is a normalisation bug.

## Design

### Index selector

`lib/aggregate.js` exports `CNT` and `IMP` and a `valueIn(c, net, metric)` selector alongside the
existing `cntIn`/`impIn`. `geoMatrix`, `networkSummary`, `specs` and `topGeos` take a `metric`
argument (default `CNT`, so library callers are unaffected).

Three rules hold across the change:

- **Ranking stays on `cnt`.** `topCreatives` always sorts by cnt. Inside one network the sampling
  conditions are identical, so the measured count is the fairer comparison, and rows do not
  reshuffle when the user flips the toggle. The selected index only decides which number is shown
  first; the other stays alongside it in the second line.
- **Membership stays on `cnt`.** `creativesIn` filters `cntIn > 0`. "Did this creative run on this
  network" is a yes/no question and cnt is the direct evidence.
- **Creative counts are index-independent.** `active`, `fresh` and `survival` count creatives, so
  they are identical under either index.

Renames, because the fields can now hold either index: `networkSummary`'s `cnt` → `value` and
`cntShare` → `share`; `specs`' `cntShare` → `share`.

### Shading

The cell's two jobs are separated:

- **Text** — still share within the column. Answers "how is this network's delivery split".
- **Colour** — `sqrt(value / max)` where `max` is the largest cell currently displayed. Answers
  "how big is this in absolute terms".

`geoMatrix` therefore also returns `value` (absolute per cell) and `max`.

Square root rather than linear because `imp` spans several orders of magnitude; a linear ramp
leaves everything but the single largest cell white. Not log, because log keeps small cells
visible, which is the behaviour being removed.

Effect on the reported case: Moloco/US falls from the darkest cell to ~5% intensity, Google Ads/US
rises to ~20%, and the JP column stops being the only thing the eye lands on.

### UI

A two-button segmented control above the tab bar, always visible — including on the Geo tab, where
the network chips are hidden and where the index matters most. Default is **imp**; the choice
persists in `chrome.storage.local` under `metric`.

Each view's footnote changes with the index, and the Geo footnote tells a `cnt` user to switch to
`imp` for geo-to-geo comparison instead of only warning them off it.

### Export

The workbook never depends on the toggle — it is a shared artefact, and a colleague opening it
cannot see which index was selected. Every sheet carries both:

- `Creatives` — `cnt {net}` and `imp {net}` per network.
- `Networks` — `cnt`, `cnt_share`, `imp_estimate`, `imp_share`.
- `Geo` — absolute `cnt {net}` and `imp {net}`; any share is derivable in the spreadsheet. Replaces
  the previous share-only layout.
- `Specs` — `cnt_share` and `imp_share`.

## Testing

Unit tests in `test/aggregate.test.js`, `test/ui.test.js`, `test/export.test.js`:

- `networkSummary`/`specs` produce the right totals under each index, and creative counts stay equal.
- `topCreatives` order is unchanged by the index; top geos follow it.
- `geoMatrix` exposes `value`/`max`; a 1000-vs-10 fixture asserts a 100%-share cell of a tiny
  network shades below 0.15.
- `geoMatrix` geo ordering flips between indices.
- `renderTop` swaps primary/secondary; `renderGeo` shades by absolute value while still printing
  column share.

Verified against the real `country.json` fixture: geo order goes `DE > IT > FR` on cnt and
`FR > IT > DE` on imp, with FR's shading rising 61% → 100% and JP's falling 36% → 23%.

## Not doing

- No re-fetch on toggle. Both numbers are already stored per creative per network per geo, so
  switching is instant and costs no requests.
- No per-tab index. One selection applies panel-wide; a per-tab setting would be a way to compare
  two tabs on different indices without noticing.
