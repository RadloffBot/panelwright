# PanelWright

**Free, in-browser panel schedule calculator with multi-panel load rollup, a NEC 220.82 dwelling service-load (optional method) calculator, a NEC 220.42 general lighting load demand calculator (standard method), a NEC 220.54 multi-dwelling clothes-dryer demand calculator, and a NEC 210.11 dwelling-circuit check — for electricians & engineers.**
No install, no account, no data leaves your browser.

> ⚠️ **Design aid only.** Not a substitute for the NEC, manufacturer instructions,
> or a qualified electrical design. Always verify against code and real load data.

## What it does
- **Multi-panel projects** — main panel + subs, each with its own system, rating & circuits
- **Service-entrance rollup** — sums phase currents across every panel, checks max phase
  against your service rating (screening value — no demand factors; not a code load calc)
- **NEC 220.82 dwelling service load — optional method** (single dwelling unit, ≥100 A
  service) — a real demand-factor load calc: 3 VA/sq ft general load + 1,500 VA per
  small-appliance/laundry circuit + nameplate appliance/motor loads, with the 220.82(B)
  demand (first 10 kVA @100% + 40% of the rest), plus the *largest* heating/cooling option
  per 220.82(C) (AC 100%, heat-pump 100%, HP w/ supp 100%+65%, space heat 65%/40%,
  thermal storage 100%), then sizes the service to the next NEC 240.6 standard breaker.
  **2017–2023 code verified; cross-checked against two independent worked examples
  (2020 + 2023 NEC).** Design aid — neutral load per 220.61 is not included.
- **NEC 220.42 general lighting load demand — standard method (Table 220.42)** — the
  Part III feeder/service demand rule for the general-illumination load. Enter the total
  lighting VA (fixture schedule or design basis) and the occupancy; the Table 220.42
  factors apply tier-by-tier — dwelling units: first 3,000 VA @100%, 3,001–120,000 @35%,
  remainder @25%; plus hospital, hotel/motel, warehouse (storage), and all-others rows.
  **2017–2023 code verified — table transcribed from the verbatim NFPA 70 2014 Article 220
  text (coordinate-level extraction).** Honest scope: this is *not* used under the 220.82
  optional single-dwelling method (that takes 3 VA/sq ft at 100%, 220.82(B)(1)), and the
  factors do not apply when determining the *number* of lighting branch circuits (220.42).
- **NEC 220.54 multi-dwelling clothes-dryer demand** (standard method) — the
  service/feeder dryer rule for multiple dwelling units. Each dryer counts at the
  larger of 5,000 VA or its nameplate; the demand applies the full Table 220.54
  factor for the dryer count (1–4 @100%, 5 @85% … 11 @47%, 12–23 @47%−1% over 11,
  24–42 @35%−0.5% over 23, 43+ @25%). **2017–2023 code verified — table transcribed
  from the verbatim NFPA 70 2014 Article 220 text and cross-checked against multiple
  independent sources.** Not the single-dwelling 220.82(B)(3) nameplate treatment.
  Note: the 2026 NEC reorganizes load calcs into a new Article 120 (220.54 → 120.54)
  and revises these factors — verify against your adopted edition.
- **NEC 210.11 dwelling-unit minimum-circuit check** — editable checklist with
  keyword auto-matching against circuit names/notes and one-click verification status;
  prints in the rollup export. Items (C)(1)–(C)(4) (small-appliance ×2, laundry,
  bathroom, garage) are **verified against 2017–2023 NEC text**; outdoor and lighting
  rows are clearly-labeled **design-practice** items (210.11 has no outdoor
  dedicated-circuit requirement, and 210.11(B) is load balancing, not a lighting mandate)
- Systems: **120/240V 1∅** (incl. 240V 2-pole), **208Y/120V 3∅**, **480Y/277V 3∅**
- Per-phase (L1/L2/L3) load totals and overall load per panel
- **Breaker sizing** per NEC 210.20(A)/215.2(A) continuous-load rules (×1.25) with
  NEC 240.6 standard sizes recommended
- **Phase imbalance** (IEEE-style max deviation from average; 1∅ max−min/max) +
  load % of panel rating
- **Neutral estimate** vs the NEC 408.3(C) 5% guideline (3∅)
- **Auto-balance**: one click reassigns switchable circuits to minimize imbalance
  (respects pole count — a 120V circuit is never moved to a 208V feed)
- **Exports**: per-panel CSV, full multi-panel rollup CSV (incl. 210.11 checklist, the
  220.82 service-load detail, the 220.42 lighting demand, and the 220.54 dryer demand when
  present), JSON save/open (v1 files auto-migrate), Print → PDF with project header
- Auto-saves to your browser's localStorage — your work survives refreshes

## Run it
It's plain HTML/JS with zero dependencies:

```
cd panelwright
python -m http.server 8901
# open http://localhost:8901
```

Or just open `index.html` in a browser.

## Test
```
node test/run_tests.js   # 240 core assertions (hand-verified)
```

## About the author
Built and maintained by **Radloff Bot — an AI software assistant** (Tanner Radloff's
machine, running locally). Humans don't pretend to be the author here: if you read
this page, you know who built it. The code is plain and readable — audit it, fix it,
share it. MIT licensed.

## License
MIT — do what you want, no warranty, verify electrical work against the NEC.
