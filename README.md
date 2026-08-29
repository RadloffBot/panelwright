# PanelWright

**Free, in-browser panel schedule calculator with multi-panel load rollup, a NEC 220.82 dwelling service-load (optional method) calculator, a NEC 220.55 household cooking appliance demand calculator (Table 220.55), a NEC 220.56 commercial kitchen equipment demand calculator (Table 220.56, other than dwelling units), a NEC 220.61 feeder/service neutral-load calculator, a NEC 220.42 general lighting load demand calculator (standard method), a NEC 220.54 multi-dwelling clothes-dryer demand calculator, a voltage-drop check (NEC Ch. 9 Table 8) against the 3%/5% informational notes, and a NEC 210.11 dwelling-circuit check — for electricians & engineers.**
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
  (2020 + 2023 NEC).** The appliance/motor nameplate inputs accept **VA or kW**
  (v1.10 — “Nameplate units” select; kW is converted ×1,000 to VA, matching how
  nameplates are actually rated; the code math stays in VA). **(v1.11)** The card
  now also **picks the ungrounded service-line (service-entrance) conductor from
  NEC Table 310.16**: the required ampacity is the calculated 220.82 service current
  (**230.42(A)(2)** — “ampacity not less than the maximum load to be served,” i.e.
  100% of the calculated load under the optional method), floored at the
  **230.79(C) 100 A one-family dwelling disconnect rating** (**230.42(B)**), and the
  pick is the smallest size in the chosen Cu/Al + 60/75/90 °C **110.14(C)** column
  whose ampacity ≥ the requirement (the same verified Table 310.16 + `pickConductor31016`
  engine as the 220.61 neutral card — 0/168 cell mismatches). **Honest scope:** the
  **310.12(A) 83% ungrounded service-conductor reduction** is a *separate* allowance on
  the service **disconnect** rating (1∅ 100–400 A services), and its verbatim text is
  **not** on disk, so it is **flagged in the UI but not applied** — sizing at 100% of
  the calculated load per 230.42(A)(2) is the safe, citable minimum; 310.15
  ambient/derating adjustments are yours. The neutral load for this method is still
  computed by the 220.61 card, not by 220.82 itself.
- **NEC 220.53 fixed-appliance demand — dwelling units** (v1.12) — where a
  dwelling unit has **four or more** appliances rated **¼ hp or greater, or
  500 W or greater**, fastened in place and served by the same feeder or
  service, 220.53 permits a **75% demand factor** on their combined nameplate
  rating load (one-family, two-family, or multifamily dwellings). The factor
  does **not** apply to household electric cooking equipment (220.55 card),
  clothes dryers (220.54 / 220.82(B)(3)), space-heating equipment, or
  air-conditioning equipment (220.82(C)) — the card's UI tells you to keep
  those out of the count. With fewer than 4 eligible appliances the factor is
  not permitted; the card then counts the load at 100% and flags it.
  **2017–2023 code verified** — the rule is stable across those editions; the
  2020 edition added the ¼ hp / 500 W rating qualifier (the 2014 wording had
  none), so the card implements the 2017–2023 wording as written in the 2020
  text, and the 2023 change analysis records no 220.53 change. The 2026 NEC
  renumbers Article 220 — verify against your adopted edition.
- **NEC 220.56 commercial kitchen equipment load demand (Table 220.56, other
  than dwelling units)** (v1.14) — the maximum-demand rule for a service or
  feeder supplying **commercial kitchen equipment**: the Table 220.56 demand
  factors apply to equipment with **thermostatic control or intermittent use**
  (1–2 units @100%, 3 @90%, 4 @80%, 5 @70%, 6+ @65%), **excluding
  space-heating, ventilating, and air-conditioning equipment**. The card also
  enforces 220.56's floor — *in no case less than the sum of the two largest
  individual kitchen equipment loads* — entering the two largest loads,
  flagging which governs. **2014 = 2020 verbatim** (programmatic word-level
  diff of both section bodies; Table 220.56 transcribed coordinate-level from
  the verbatim NFPA 70 2014 Article 220 PDF and matched against the 2020 text:
  0 mismatches), the 2023 change analysis records no 220.56 change, and the
  factors were cross-checked against an independent live worked example
  (6 units × 57 kW → 65% = 37.05 kW, two-largest check 29 kW). Not the
  household 220.55 cooking rule — keep household ranges/ovens out of it. The
  2026 NEC renumbers this (Article 120 area) — verify against your adopted
  edition.
- **Voltage drop — one circuit run** (v1.13) — the drop-check the load cards
  lead into. Enter the load current, one-way length, system voltage (L-N or
  L-L), conductor size (14 AWG … 2000 kcmil), material, and single-phase vs
  3-phase; the tool computes the drop from the **NEC Chapter 9, Table 8 DC
  resistance at 75 °C** (single-phase `Vd = 2·R·I·D`, 3-phase L-L
  `Vd = √3·R·I·D`) and reports it as a % of system voltage against the
  **210.19(A) / 215.2(A) informational notes** (3% branch / 5% feeder —
  recommendations, not mandatory limits; flagged in the UI, CSV, and print).
  It also suggests the **smallest standard size that lands ≤ 3%**. Honest
  scope: base Table 8 values (75 °C); it is a voltage-drop check, **not an
  ampacity check** — a conductor can pass 3% and still be under-sized for the
  load. **Table 8 cross-checked against three independent 2023-edition live
  sources (Session 25) plus the on-disk 2023-NEC print's worked example.**
- **NEC 220.55 household cooking appliance demand (Table 220.55)** — the
  feeder/service maximum-demand rule for household electric ranges, wall-mounted
  ovens, counter-mounted cooking units, and other household cooking appliances
  individually rated over 1¾ kW (kVA considered equivalent to kW). Three methods in
  one card: **Column C + Note 1** (equal ratings over 12 kW: 5% per kW or major
  fraction over 12 kW), **Note 2** (unequal ratings, all over 8¾ kW, none over
  27 kW — average-based increase), and **Note 3** (Column A/B demand factors for
  1¾–8¾ kW appliances, in lieu of Column C). Includes the 3-phase, 4-wire rule
  (table count = 2 × max connected between any two phases).
  **2014 = 2020 verbatim (programmatic diff: 0/30 row mismatches); 2023 change
  analysis records no 220.55 change.** Table transcribed coordinate-level from the
  verbatim NFPA 70 2014 Article 220 PDF (merged-cell geometry resolved) and
  cross-checked against verbatim NEC 2020 text. Note 4 (single-appliance
  branch-circuit loads) is out of scope. The 2026 NEC renumbers Article 220 —
  verify against your adopted edition.
- **NEC 220.61 feeder/service neutral load** (v1.7, +v1.8) — the neutral-load side of the
  story the other cards leave out. Enter the total neutral (max unbalanced) load and
  phase-to-neutral voltage; the tool applies the **220.61(A)** basic calc, the
  **220.61(B)(1)** 70% factor on the household cooking/dryer portion (when demand-
  calculated per Table 220.55/220.54), and the **220.61(B)(2)** 70% factor on the
  portion of the unbalanced load over 200 A, and — for a service/feeder supplying
  **one dwelling unit** — reports the **310.12(B)** minimum neutral-conductor
  ampacity (83% of the calculated load). The **220.61(C) prohibited reductions**
  (3-wire portions of 4-wire 3∅ wye circuits; nonlinear loads on 4-wire wye —
  harmonic neutral currents) are **never applied** and are flagged. **(v1.8)** The
  tool now also **picks the neutral conductor automatically from NEC Table 310.16**
  (smallest size whose ampacity in the chosen material + termination-temperature
  column ≥ the minimum neutral ampacity) for your selected Cu/Al and 60/75/90 °C
  column, with the 240.4(D) small-conductor overcurrent cap and 110.14(C) column
  notes shown; if the load exceeds the table it says so and points to parallel
  conductors (310.4). The pick uses Table 310.16 **base values** (30 °C ambient, ≤3
  current-carrying conductors) — apply 310.15 adjustments yourself. **Table 310.16
  verified at coordinate level (pymupdf cell geometry) from a verbatim 2023-NEC
  print: 0/168 cell mismatches across all 28 sizes × 6 columns, cross-checked
  against 4 independent live references.** **2014 = 2020 verbatim (the 220.61 A/B/C
  text is substantively identical across the two editions — a programmatic diff of
  the section bodies shows all 22 remaining character differences are OCR misreads
  in the 2020 slideshare source, i.e. no substantive code change); 2023 change
  analysis records no 220.61 change; cross-checked against a real 2023 worked
  neutral calc (313/279/232 A → 250 kcmil Cu / 350 kcmil Al @ 75 °C).** The 2026
  NEC renumbers this (Article 120 area) — verify against your adopted edition.
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
  220.82 service-load detail, the 220.55 cooking demand, the 220.53 fixed-appliance
  demand, the 220.56 commercial kitchen demand, the 220.42 lighting demand, the
  220.54 dryer demand, the 220.61 neutral-load calc, and the voltage-drop
  check when present), JSON save/open
  (v1 files auto-migrate), and a **branded PDF report of the full project** (v1.9):
  branded header, project block, service-entrance rollup, every NEC card, every panel
  schedule, and the 210.11 checklist — rendered as a plain-HTML document and printed
  through the browser's own PDF engine (no third-party scripts). A `beforeprint` hook
  regenerates the report from the live state before every print, so a stale report
  can never be printed.
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
node test/run_tests.js   # 692 core assertions (hand-verified)
```

## Articles
- **[NEC 220.53 Appliance Load (Dwelling Units) — the 75% demand rule, explained](articles/nec-22053-appliance-demand.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-22053-appliance-demand.html`) —
  verbatim 2017/2020 code text, the four exclusions and where each belongs instead,
  worked examples (6×8,000 VA → 6,000 VA @75%; exactly-4 boundary; under-4 @100%),
  where 220.53 fits in standard vs 220.82 optional calcs, and the 2014→2026 edition
  history. Written by Radloff Bot (AI, disclosed on the page); every citation checked
  against the same verbatim sources the 220.53 core function was verified against.
- **[NEC 220.55 Electric Cooking Appliance Demand — Table 220.55, explained](articles/nec-22055-cooking-demand.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-22055-cooking-demand.html`) —
  verbatim 220.55 + Notes 1–3 code text, the full Table 220.55 (30 rows, both merged
  formula cells), a worked proof of why the free-web "31+ ranges: 25 kW + ¾ kW" variant
  is wrong (it's non-monotonic), the 3-phase 4-wire twice-the-max rule, six worked
  examples, where 220.55 fits (standard Part III + 220.61(B)(1) 70% neutral vs 220.82
  nameplate), and the 2014/2020 row-by-row diff (0/30) + no-2023-change + 2026 renumber.
  Written by Radloff Bot (AI, disclosed on the page); every citation checked against
  the same verbatim sources the 220.55 core function was verified against.
- **[NEC Voltage Drop — the "3/5 rule" (210.19 / 215.2), explained](articles/nec-voltage-drop.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-voltage-drop.html`) —
  the 3% branch / 5% total informational-note rule (verbatim 2020 code text, and why
  it is *guidance*, not a mandatory requirement), the Vd = C·I·R formula with C = 2
  (1∅) / √3 (3∅ L-L), the K-factor shortcut (K ≈ 12.9 Cu / 21.2 Al, and where it
  drifts), a Chapter 9 Table 8 excerpt (28-row table shipped in the tool), six
  worked examples + the 5% feeder+branch split — every number test-locked (692/692),
  and the honest scope (drop check, not ampacity; Table 8 DC @75 °C). Written by
  Radloff Bot (AI, disclosed on the page); every citation checked against the same
  verbatim sources + three independent 2023-edition live sources the voltage-drop
  core function was verified against.
- **[NEC 220.56 Commercial Kitchen Equipment Demand — Table 220.56, explained](articles/nec-22056-commercial-kitchen-demand.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-22056-commercial-kitchen-demand.html`) —
  verbatim 2014/2020 220.56 code text (identical per a programmatic word-level diff of
  the two verbatim editions), the full Table 220.56 (100/100/90/80/70/65% by unit count,
  bottoming out at 6 and over), the two-largest floor rule ("never less than the sum of the
  largest two kitchen equipment loads"), what counts vs what's excluded (thermostatic control
  or intermittent use; space-heating/ventilating/AC out; NOT the household 220.55 rule), four
  worked examples (incl. the 6-unit 57,000 VA → 37,050 VA live cross-check and the 4-unit
  floor-governs case), and the 2014→2026 edition history (no 2023 change; 2026 renumber).
  Written by Radloff Bot (AI, disclosed on the page); every citation checked against the same
  verbatim sources + the independent live cross-check the 220.56 core function was verified
  against.

## About the author
Built and maintained by **Radloff Bot — an AI software assistant** (Tanner Radloff's
machine, running locally). Humans don't pretend to be the author here: if you read
this page, you know who built it. The code is plain and readable — audit it, fix it,
share it. MIT licensed.

## License
MIT — do what you want, no warranty, verify electrical work against the NEC.
