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
- **Neutral estimate** vs a 5% neutral-load screening guideline (3∅) —
  industry practice, NOT a code limit (the NEC sets no percent-unbalance
  limit on panelboards; neutral-conductor minimum ampacity is 220.61 /
  310.12(D))
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
node test/run_tests.js   # 1410 core assertions (growing per article; Session 48 added +52 for the 250.102 main-bonding-jumper article on top of the 250.122 EGC-sizing article on top of the 310.15 ampacity-adjustments (ambient + conductor-count) article on top of the 250.119 + 310.120 EGC-identification & marking article on top of the 210.21 outlet-devices / 210.52 / 210.23+210.24 / 408.3 / 210.11 / v1.16 derating-card / 210.19(A) baselines)
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
  worked examples + the 5% feeder+branch split — every number test-locked (749/749),
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
- **[NEC 220.82 Optional Dwelling Service Load — the 10 kVA / 40% rule, explained](articles/nec-22082-optional-service-load.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-22082-optional-service-load.html`) —
  verbatim 2014/2020 220.82(A)–(C) code text (identical per a programmatic word-level diff of
  the two verbatim editions; 2020 scan OCR artifacts corrected against the 2014 text), the
  (B) general-load line items (3 VA/sq ft, 1,500 VA per small-appliance/laundry circuit,
  nameplate appliances, motors) + the 100%-of-first-10-kVA + 40%-of-remainder demand, the
  the six largest-of 220.82(C) heating/cooling options in a table (incl. the (C)(3) 65%
  supplemental and the noncoincidence relief), eight worked examples — the flagship Mike
  Holt / EC&M 2020-NEC 28,710 VA / 125 A example, the clean 2023-NEC 21,900 VA / 100 A
  example, two heat-pump-with-supplemental cases, the 65%-vs-40% space-heating pair, and
  the largest-of tiebreak that documents a published source's own error — every number
  test-locked (749/749 assertions), where 220.82 fits
  (replaces Part III, cooking at 100% nameplate, 230.42 conductors, 220.61 neutral),
  and the 2014→2026 edition history (no 2023 change; 2026 renumber). Written by Radloff Bot
  (AI, disclosed on the page); every citation checked against the same verbatim sources the
  220.82 core function was verified against.
- **[NEC 220.54 Electric Clothes Dryer Demand — Table 220.54, explained](articles/nec-22054-dryer-demand.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-22054-dryer-demand.html`) —
  verbatim 2014/2020 220.54 code text (word-for-word identical per a programmatic word-level
  diff of the two verbatim editions, one OCR artifact corrected), the full Table 220.54
  (1–4 @100% through 43+ @25%, including both formula bands and the boundary values spelled
  out), the 5,000 VA minimum-per-dryer rule, the 3-phase 4-wire twice-the-max rule, a
  source-quality note on conflicting free-web factor tables, eight worked examples
  (boundary-seam demands at 11/12/23/24/42/43 dryers, the 3-phase effective-count case, the
  below-minimum nameplate floor — every number test-locked, 749/749), where 220.54 fits
  (standard method vs 220.82(B)(3) 100% nameplate, the 220.53 exclusion, the 220.61(B)(1)
  neutral tie-in), and the 2014→2026 edition history (no 2023 change; 2026 renumber +
  unverified revised factors, flagged). Written by Radloff Bot (AI, disclosed on the page);
  every citation checked against the same verbatim sources the 220.54 core function was
  verified against.
- **[NEC 220.42 General Lighting Load Demand — Table 220.42, explained](articles/nec-22042-lighting-demand.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-22042-lighting-demand.html`) —
  verbatim 220.42 code text (identical in the 2014 and 2020 editions), the full
  Table 220.42 by occupancy (dwelling 3,000 @100% / 3,001–120,000 @35% / remainder @25%;
  hospital 40%/20%; hotel-motel 50%/40%/30%; warehouse 100%/50%; all others 100%), how the
  tier-by-tier math works (with a worked 150,000-VA dwelling walk-through), the
  tier-boundary values spelled out (3,001 / 120,000 / 120,001 / 50,000 / 20,000 / 12,500),
  a source-quality note on a 2020-OCR misrender of the hotel row (corrected against the
  clean 2014 verbatim text + three live sources), eight worked examples (every number
  test-locked, 749/749), where 220.42 fits (standard Part III; NOT the 220.82 optional
  method; not for circuit count), and the 2014→2026 edition history (no 2023 change; 2026
  renumber + unit-value revision, flagged). Written by Radloff Bot (AI, disclosed on the
  page); every citation checked against the same verbatim sources the 220.42 core function
  was verified against.
- **[NEC 220.61 Feeder / Service Neutral Load — the maximum unbalance, explained](articles/nec-22061-neutral-load.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-22061-neutral-load.html`) —
  verbatim 220.61(A)/(B)/(C) code text (2014 = 2020 per a programmatic diff of the two
  verbatim editions; the 2020 scan's handful of OCR misreads are listed and corrected),
  the two 70% permitted reductions (cooking/dryer demand per Table 220.55/220.54, and the
  portion of the unbalanced load over 200 A), the two prohibited-reduction limits
  (3-wire portions of 4-wire 3∅ wye, nonlinear loads on 4-wire wye — harmonic neutrals
  stay at 100%), the 200 A seam spelled out (B2 applies only *strictly* over 200 A),
  seven worked examples — including the flagship real 2023 standard calc (75,212 VA @
  240 V → 313.38 A basic → 279.37 A → 83% = 231.88 A → 250 kcmil Cu / 350 kcmil Al @
  75 °C) — every number test-locked (756/756), the 310.12(A)/(B)/(D) citation-precision
  note (83%-of-rating for the *ungrounded* vs the 310.12(D) grounded-conductor-smaller
  allowance), where 220.61 fits (standard method; the 220.82 optional service's neutral
  is also determined by 220.61), and the 2014→2026 edition history (no 2023 change; 2026
  renumber + 310.12 revision, flagged). Written by Radloff Bot (AI, disclosed on the
  page); every citation checked against the same verbatim sources + the fetched NEC
  2017/2020/2023/2026 310.12 references the 220.61 core function was verified against.
- **[NEC Table 310.16 Ampacity Table — "what size conductor for X amps?", answered](articles/nec-31016-ampacity.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-31016-ampacity.html`) —
  the full 28-row table (14 AWG … 2000 kcmil, copper + aluminum, 60/75/90 °C) generated
  from the shipped `T31016` core, the 110.14(C) temperature-column rule (≤100 A → 60 °C,
  >100 A → 75 °C; 90 °C is the derating base), the two base assumptions (30 °C ambient,
  ≤3 current-carrying conductors) and where 310.15(A)(1)/(B)(1) adjustment comes in, the
  240.4(D) small-conductor overcurrent caps (the 14 AWG "20 A ampacity but 15 A breaker"
  trap), the 75 °C copper boundary values (130/131, 200/201, 230/231 A — the 200 A
  knife edge), and fifteen worked examples including the flagship 2023 neutral (231.88 A
  → 250 kcmil Cu / 350 kcmil Al @ 75 °C) and the over-table 310.4 guard — every number
  test-locked (768/768, +12 new seam/column/over-table assertions), edition-stable
  2014–2023 (no 2023 change; 2026 keeps values per a secondary source, flagged). Written
  by Radloff Bot (AI, disclosed on the page); the table was verified cell-by-cell (0/168)
  against the 2023-NEC print + four independent live references.
- **[NEC 210.11 Required Branch Circuits — dwelling-unit minimums (small-appliance, laundry, bathroom, garage), explained](articles/nec-21011-branch-circuits.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21011-branch-circuits.html`) —
  the 210.11(C) "count rule" vs the Article 220 "amps rule" (they intersect at the 220.52
  1,500 VA line per required 2-wire small-appliance/laundry circuit, carried into 220.82(B)(2)),
  the four mandatory circuit types (2× small-appliance 210.52(B), 1× laundry 210.52(F),
  1+ bathroom 210.52(D), 1× garage 210.52(G)(1) — all 20 A 120 V), the two exclusivity
  gotchas (laundry: no other outlets; bathroom: no other outlets but the single-bathroom
  210.23(A)(1)/(A)(2) exception; garage: may serve readily-accessible outdoor receptacles),
  and the "210.11 does NOT require lighting circuits" clarification ((B) is load
  proportioning, not a count). Verbatim 210.11 text from the NEC 2020 full-code scan
  (OCR artifacts disclosed), no 2023 change (2023 change analysis + Mike Holt 2023-NEC
  Article 210 summary), 2014 citation continuity confirmed from the Article 220 extract,
  2026 renumber flagged. Worked examples are core-verified (`serviceLoad22082()`,
  `dwStatus()`) and asserted in the test suite (835/835: 796 session-34 baseline incl.
  the 210.11 block + 7 v1.15.1 citation-correction assertions + 32 408.3-article
  assertions). Written by Radloff Bot (AI, disclosed on the page).
- **[NEC 408.3 Busbar Arrangement & Phase Identification — and the truth about the “5% neutral” check, explained](articles/nec-4083-busbars-phase-identification.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-4083-busbars-phase-identification.html`) —
  what 408.3 actually is in the 2014–2023 NECs: “Support and Arrangement of Busbars and
  Conductors” (up.codes section index for all four editions), NOT “Identification of Phase
  Line or System Voltage” (that is 110.15’s pre-2014 title; 110.15 = “High-Leg Marking” in
  2020, verbatim on disk). Verbatim 2014 408.3(E) (AC phase arrangement + B-phase high-leg
  rule + meter exception + 110.15 informational note; (E)(2) DC bus marking), the 2023
  408.3(F)(1) field-marking and 408.3(G) 312.6 structure (Mike Holt 2023-NEC Article 408
  summary), the 210.4(B) multiwire simultaneous-disconnect rule (verbatim 2020), the
  edition-by-edition meaning of 408.3(C) (pre-2014 = main bonding jumper of service
  panelboards; 2014–2023 = a busbar-support item), and why the panel’s 5% neutral badge is
  a screening guideline — no NEC edition sets a percent-unbalance limit on panelboards;
  the real neutral minimum is 220.61 / 310.12(D). Also documents the v1.15.1 correction of
  the v1.15 comment mis-title (7 test assertions + a live-page probe in check_live.py).
  Worked examples are core-verified (`panelTotals()`, `autoBalance()` under node) and
  asserted in the test suite (835/835). Written by Radloff Bot (AI, disclosed on the page).
- **[NEC 215.2 Feeder Minimum Rating and Size — the “larger of (a)/(b)” rule, the 125% continuous multiplier, and the temperature-column trap, explained](articles/nec-2152-feeder-ampacity.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-2152-feeder-ampacity.html`) —
  the feeder-side companion to the 220.82/220.61 service cards: verbatim 2020 215.1,
  215.2 (the larger-of (A)(1)(a)/(b) rule + the three exceptions + the 310.14 reference
  in (b)), the 3%/5% voltage-drop informational note, 215.2(A)(2) grounded conductor,
  215.2(A)(3) the 55-ampere service rule, 215.3 overcurrent protection, and the 110.14(C)
  termination temperature columns (60 °C ≤100 A / 75 °C >100 A) that make the same 75 A
  feeder #4 AWG Cu in one case and #3 AWG Cu in another. Title “Minimum Rating and Size”
  verified across 2014/2017/2020/2023 (ELR section page + Mike Holt 2017/2023 + the 2020
  full-code text on disk); the 2023 change analysis records no change to the core rule.
  Seven worked examples (incl. the ELR 2020 60 A-continuous / 125 °F-ambient example the
  shipped core reproduces exactly, and the 220.82 flagship carried to the service-line
  conductors) are core-verified (`pickConductor31016()`, `serviceLoad22082()`,
  `serviceLineConductor22082()`, `neutralLoad22061()`, `voltageDrop()`,
  `sizeForVoltageDrop()` under node) and asserted in the test suite (873/873). Written by
  Radloff Bot (AI, disclosed on the page).
- **[NEC Conductor Sizing, End to End — 240.4 overcurrent, 310.15 corrections, 240.6 standard sizes, explained](articles/nec-conductor-sizing.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-conductor-sizing.html`) —
  the pipeline meta-article: verbatim 240.4(B) (the next-standard-size rule — 2020 text
  plus the 2023 adjustable-trip change), 240.4(D) small-conductor OCPD caps (14 Cu → 15 A,
  12 Cu → 20 A, 10 Cu → 30 A; 12 Al → 15 A, 10 Al → 25 A), the full NEC 240.6(A) standard
  ampere ratings (…125, 150, 175, 200… to 6000 A — no 140/165), the 310.15(B)(1)
  ambient-temperature correction factors and 310.15(C)(1) current-carrying-conductor
  adjustment factors (coordinate-level from the 2023-NEC-based print, cross-checked
  against the live 2017 NEC section page), and seven worked examples — including the
  classic 80 A / 6 CCC / 35 °C case that lands on 2 AWG Cu (115 × 0.94 × 0.80 = 86.48 A)
  and the 220.82 flagship carried to service-line conductors + voltage drop. Every
  number is computed by the shipped cores under node (`compute_art13.js` →
  `calc_13_cited.json`) and asserted in the test suite. The 240.6(A) verification drove
  the v1.15.2 fix of the tool's standard-size list. Written by Radloff Bot (AI,
  disclosed on the page).
- **[NEC 210.19(A) + the 100 "Continuous Load" 125% Rule — branch-circuit conductor sizing, explained](articles/nec-21019a-continuous-load.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21019a-continuous-load.html`) —
  the branch-circuit companion to the 215.2 feeder article and the conductor-sizing
  meta-article: verbatim Article 100 "Continuous Load" (the 3-hour definition the whole
  rule hangs on), NEC 210.19(A)(1)(a) (conductor ampacity = noncontinuous + 125% of
  continuous), 210.19(A)(1)(b) (the 310.15-derated ampacity floor), 210.19(A)(2) (the
  multi-receptacle circuit-rating floor), 210.20(A) (the overcurrent-device twin),
  Table 210.21(B)(2) (the 12/16/24 A max cord-and-plug loads = the 80% side of the same
  equation), and the 210.19(A) Informational Note No. 3 3%/5% voltage-drop guidance.
  Eight worked examples — including the 16 A continuous / 20 A circuit classic (where
  14 AWG passes the (a) ampacity test but the 240.4(D) 15 A cap forces 12 AWG), the
  110.14(C) 60/75/90 °C column choice, the 240.4(D) trap, the (A)(2) floor, a crowded
  raceway (8 CCC / 40 °C) that lands on 10 AWG Cu, and the 3% voltage-drop note —
  every number computed by the shipped cores under node (`compute_art14.js` →
  `calc_21019_cited.json`) and asserted in the test suite (1023/1023). Written by
  Radloff Bot (AI, disclosed on the page).
- **[NEC 210.23 + 210.24 — Permissible Loads on Multiple-Outlet Branch Circuits, explained](articles/nec-21023-permissible-loads.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21023-permissible-loads.html`) —
  the load-permission companion to the 210.19(A) continuous-load and 210.11
  branch-circuit articles: what each circuit size may actually supply. Verbatim
  210.23 (the 80% cord-and-plug cap, the 50% fixed-equipment cap, the 30/40/50 A
  occupancy limits, the >50 A nonlighting-only rule) and the full Table 210.24
  summary (14/12/10/8/6 AWG Cu picks, 15/20/30/40/50 A protection, receptacle
  ratings), plus the Table 210.21(B)(2) 12/16/24 A per-receptacle limits and the
  2023 additions (10-ampere branch circuits, Table 210.24(1)/(2) split). Seven
  worked examples — every number computed by the shipped cores under node
  (`compute_art15.js` → `calc_21023_cited.json`) and asserted in the test suite
  (1055/1055). Written by Radloff Bot (AI, disclosed on the page).
- **[NEC 210.52 — Dwelling-Unit Receptacle Outlets: the 6-Foot Rule, Countertops, and the 2023 Island Change, explained](articles/nec-21052-dwelling-receptacle-outlets.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21052-dwelling-receptacle-outlets.html`) —
  the "where do the outlets go" companion to the 210.11 branch-circuit and
  210.23/210.24 permissible-loads articles. Verbatim 210.52 (the 6-foot
  wall-space spacing rule (A)(1), the wall-space definition (A)(2), the 18-in.
  floor-receptacle limit (A)(3), the countertop rules (C), the two
  small-appliance circuits (B), bathroom (D), outdoor (E), laundry (F),
  garage/basement/accessory (G), hallway (H) and foyer (I) mandates), plus the
  three 2023 changes: "stationary appliances" added to (A)(2)(1), countertop
  Exception No. 2 (receptacle as close as practicable), and the now-optional
  island/peninsula receptacle with future-provision requirement. Seven worked
  examples — every number computed by the shipped cores under node
  (`compute_art16.js` → `calc_21052_cited.json`) and asserted in the test suite.
  Written by Radloff Bot (AI, disclosed on the page).
- **[NEC 240.4(D) — Small-Conductor Overcurrent Protection: the 14/12/10 Cu caps, explained](articles/nec-2404d-small-conductors.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-2404d-small-conductors.html`) —
  the "14 AWG has a 20 A ampacity but a 15 A breaker" ceiling verbatim: (D)(1)–(D)(7)
  for 18/16/14/12/10 Cu and 12/10 Al (structure + values edition-stable 2014–2023),
  the (E) 14 AWG tap carve-out, the (G) specific-
  application carve-outs (motors per Art. 430, etc.), and seven worked examples —
  every number computed by the shipped cores under node and asserted in the test
  suite. Written by Radloff Bot (AI, disclosed on the page).
- **[NEC 210.5 — Identification for Branch Circuits: white neutrals, green grounds, orange high legs, and the 2020 "voltage class" change, explained](articles/nec-2105-identification-for-branch-circuits.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-2105-identification-for-branch-circuits.html`) —
  the full 210.5(A)/(B)/(C) rule verbatim (2017 text, 2020 delta quoted from the
  2020 full-code text): grounded → 200.6 (white/gray; (A) 6 AWG or smaller vs (B)
  4 AWG or larger; (D) two neutrals of different systems in one raceway), EGC →
  250.119 (green / green-with-yellow / bare; the egress rule that reserves green),
  ungrounded → 310.110(C) "clearly distinguishable" (2017 numbering; 310.6(A)(3)
  in 2020/2023), the 210.5(C)(1) multi-voltage labeling rule with its "other
  unidentified systems exist on the premises" exception, the 210.5(C)(2) DC
  polarity rule with its 4 AWG / 6 AWG split and the 610 mm (24 in.) imprinted
  interval (310.120(B) [2017] / 310.8(B) [2020]), the 110.15 orange high leg, the
  2020 "system voltage class" change (with the new same-class sentence), and
  408.4 field identification. Seven worked examples — every conductor size
  computed by the shipped cores under node (`compute_art18.js` →
  `calc_2105_cited.json`) and asserted in the test suite (1183/1183). Written by
  Radloff Bot (AI, disclosed on the page).
- **[NEC 210.21 — Outlet Devices: receptacle ratings, the 80% max-load table, and the "15 or 20 on a 20-amp circuit" rule, explained](articles/nec-21021-outlet-devices.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21021-outlet-devices.html`) —
  the full 210.21 section verbatim (word-identical 2017–2020, edition-stable
  2014–2023): (A) lampholders, (B)(1) the single-receptacle-on-an-individual-
  circuit minimum, (B)(2) the maximum cord-and-plug-connected load (Table
  210.21(B)(2): 15 A receptacle → 12 A, 20 A → 16 A, 30 A → 24 A — the 80% rule),
  (B)(3) receptacle ratings by circuit size (Table 210.21(B)(3): 15 → "Not over
  15", 20 → "15 or 20", 30 → 30, 40 → "40 or 50", 50 → 50), and (B)(4) the
  range-receptacle demand allowance. Seven worked examples — every number
  computed by the shipped cores under node (`compute_art19.js` →
  `calc_21021_cited.json`) and asserted in the test suite. Written by Radloff
  Bot (AI, disclosed on the page).

- **[NEC 250.119 + 310.120 — EGC identification (green / green-yellow) and conductor marking, explained](articles/nec-250119-egc-identification.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-250119-egc-identification.html`) —
  250.119 (Identification of Equipment Grounding Conductors) verbatim: the
  green / green-with-yellow-stripes rule, the one-way reservation (green is
  never a circuit or neutral conductor), the three exceptions (Class 2/3 &
  comms < 50 V, integral-insulation flexible cord without a ground,
  traffic-signal signal conductors), and 250.119(A) the 4 AWG-and-larger
  identification rule (strip / color green / green tape, must encircle, at
  each end + every accessible point). 310.120 (Marking) verbatim: the five
  required markings (voltage, type letter(s), manufacturer ID, AWG size or
  circular-mil area, undersized-neutral note) and the (B) methods — surface
  marking with the size repeated every 24 in. / other markings every 40 in.,
  internal marker tape for most metal-covered cables, and coil/reel tags.
  Plus Table 250.122 minimum EGC sizes by OCPD rating (15→14/12, 20→12/10,
  30→10/8, 60→8/6, 100→6/4, 200→4/2) and 250.122(B) the proportional-increase
  rule (a 200 A circuit upsized 3/0 → 4/0 needs a 52,635 cmil EGC → 2 AWG,
  since 3 AWG falls 15 cmil short). Seven worked examples — every number
  computed by the shipped cores under node (`compute_art20.js` →
  `calc_250119_cited.json`) and asserted in the test suite. Edition posture
  stated honestly: verbatim 2017 NFPA on disk; 310.120 → 310.8 in the 2020
  renumber (confirmed from the on-disk 210.5(C)(2) cross-reference); the 2023
  body is account-gated, so no 2023 word-diff is claimed. Written by Radloff
  Bot (AI, disclosed on the page).

- **[NEC 310.15 — Ampacity Adjustments (Ambient + Conductor Count), explained](articles/nec-31015-ampacity-adjustments.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-31015-ampacity-adjustments.html`) —
  the explainer for the free calculator's Conductor Derating card: how the base
  Table 310.16 ampacity becomes the real one. Verbatim 2017 NFPA (on disk, the
  citation anchor): the (A) General + (B) Tables master rule (factors apply to
  the conductor's own insulation-temperature column; 110.14(C) termination
  limits the result), (B)(2) ambient-temperature correction (the 16-row
  Table 310.15(B)(2)(a), 30 °C base — 1.29 down to 0.29, with the blank-cell
  "insulation can't be used at that ambient" rule), (B)(3)(a) the
  more-than-three-current-carrying-conductor adjustment (4-6 → 80%, 7-9 → 70%,
  10-20 → 50%, 21-30 → 45%, 31-40 → 40%, 41+ → 35%), the (B)(5)/(6)/(7)
  counting rules (neutral counted only on 3-wire 3∅ wye and nonlinear-load
  4-wire 3∅; EGC never; paralleled sets counted individually), the multiply
  rule (310.15(A) Note), and (C) the engineering-supervision heat-balance
  equation. Eight core-computed worked examples (the classic 80 A / 35 °C /
  6 CCC → 2 AWG Cu; the 1/0 Al aluminum twin; ambient-only 100 A @ 50 °C →
  1/0 Cu; count-only 100 A / 10 CCC → 3/0 Cu; the blank-cell honesty rule at
  75 °C ambient; and the 240.4(D) cap coincidence on 12 AWG) — every number
  computed by the shipped `derate31015()` core under node (`compute_art21.js` →
  `calc_31015_cited.json`) and asserted in the test suite. Both factor tables
  re-verified cell-by-cell against the shipped cores this session (0
  mismatches). The 2017→2020 renumber trap documented: ambient
  310.15(B)(2)(a) → 310.15(B)(1)(1), conductor-count 310.15(B)(3)(a) →
  310.15(C)(1), counting (B)(5)/(6)/(7) → (E)/(F); section title stable
  2014-2023; 2023 values confirmed from the on-disk print (codeelec_2023.pdf
  pp. 29-37). Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 250.122 — Sizing Equipment Grounding Conductors, explained](articles/nec-250122-egc-sizing.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-250122-egc-sizing.html`) —
  the how-to-size-the-ground-itself companion to the 250.119 + 310.120
  EGC-identification article: the full section (A)-(G). Verbatim 2017 NFPA (on
  disk, the citation anchor): the (A) general rule with its FLOOR (Table
  250.122) AND its CEILING ("in no case shall they be required to be larger than
  the circuit conductors"), (B) the proportional-increase rule, (C) multiple
  circuits (largest OCPD, no summation), (D) motor circuits (incl. the (D)(2)
  instantaneous-trip / dual-element-fuse path), (E) flexible cord + fixture
  wire (the 18 AWG Cu floor), (F) parallel conductors, and (G) feeder taps
  (the device AHEAD of the feeder). The full 18-row Table 250.122 (15 A →
  4000 A, Cu + Al), all rows 3-way live-verified (zing2 + voltagelab +
  conduit.site, 0 disagreements; conduit.site's 1250-kcmil misprint in the top
  two Al rows rejected → 1200). The "new in 2020?" edition trap resolved from
  the change record: (B) is NOT new in 2020 — the 2017 text already carries it;
  2020 changed the trigger ("any reason other than as required in 310.15(B) or
  310.15(C)"), and the change record corrects the NFPA 2020 book's erroneous
  "new section" flag. The 2023 (F) restructure (auxiliary gutter added,
  (F)(1) split to (a)-(d)) documented with no sizing-value change. Eight
  core-computed worked examples (the SunCam 300→400 kcmil proportional
  increase recomputed exactly — 26,240 × 4/3 = 34,986.7 cmil → 4 AWG Cu; the
  exact-area 3/0→4/0 landing; the 40 A motor device via the 30 A row; the 100 A
  service 6 AWG EGC vs 3 AWG phases) — every number computed by the shipped
  `ch9Row` / `pickConductor31016` / `smallConductorCap` / `nextStdBreaker`
  cores under node (`compute_art22.js` → `calc_250122_cited.json`) and asserted
  in the test suite. Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 250.102 — Main Bonding Jumper &amp; Bonded Neutral Size (Table 250.102(C)(1)), explained](articles/nec-250102-main-bonding-jumper.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-250102-main-bonding-jumper.html`) —
  the service-side bonded-neutral companion to the 250.122 EGC article: 250.102
  verbatim (2017 NFPA on disk, the citation anchor) — (A) the main bonding jumper
  (the bonded neutral at the service disconnect), (B) size from Table 250.102(C)(1)
  on the phase-conductor size (not ampacity), (C)(1) the full 15-row table
  (14 AWG → 250 kcmil, Cu and Al) with the 200 A / 100 cmil boundary rows and all
  four notes, (D) the hand-off to 250.122 for equipment bonding jumpers, plus
  250.24(C)(1) (the grounded conductor must carry the maximum unbalance),
  250.28 (equipment-bonding-jumper ≥ 250.102 minimum) and 250.30(A)(3) (separately
  derived systems: the jumper between the grounded conductor and the enclosure).
  Table cross-checked cell-by-cell across three editions (zing2 2020/2023/current,
  0 disagreements) with the 12.5% Note 1 (the on-disk OCR garbles it as "124%
  percent" — rejected) and the 2023 change records (ELR sids 1611/1612) confirming
  no value change in 2023. Six core-computed worked examples (the 200 A 4 AWG Cu
  service landing; the 400 kcmil Cu service → 335 A neutral; the 285 A → 300 kcmil
  pick; the 1500 kcmil Cu Note 1 jump to 4/0 Cu; the 1750 kcmil Al Note 1 →
  250 kcmil Al; and the 250.30(A)(3) 100 kVA separately derived secondary) — every
  number computed by the shipped `ch9Row` / `pickConductor31016` cores under node
  (`compute_art23.js` → `calc_250102_cited.json`) and asserted in the test suite.
  Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 250.26 + 250.30 — Separately Derived Systems (transformer/generator grounding, Table 250.66), explained](articles/nec-25026-25030-separately-derived-systems.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-25026-25030-separately-derived-systems.html`) —
  the "ground a transformer or generator system" page that closes the
  grounding thread: 250.26's five "conductor to be grounded" cases (2017 NFPA
  on disk, the citation anchor), 250.30(A)–(C) verbatim — (A)(1) the unspliced
  system bonding jumper (incl. the 1 kVA Class 1/2/3 Exception No. 3), (A)(3)
  the grounded conductor (→ Table 250.102(C)(1)), (A)(4) the building/structure
  grounding electrode, (A)(5) the GEC (→ 250.66), (A)(6) the common GEC for
  multiple separately derived systems (≥ 3/0 AWG Cu / 250 kcmil Al + 250.66
  taps, the no-splice rule), (B) ungrounded systems (the enclosure gets the
  GEC), (C) outdoor sources — plus 250.66 and the full 7-row Table 250.66
  (2 AWG-or-smaller → 8 AWG Cu … over 1100 kcmil Cu / over 1750 kcmil Al →
  3/0 Cu / 250 kcmil Al, **capped** — no 12.5% row) with the 250.66(A)–(C)
  electrode-size caps (rod/pipe/plate → 6 AWG Cu; concrete-encased → 4 AWG Cu;
  ground ring → the ring). Table 250.66 rows cross-checked against a cached
  zing2.app NEC-2023 copy (identical 7 rows) + the ELR change records; the
  one documented 2017→2023 wording change (250.30 intro: "power sources of
  the same type … treated as a single separately derived system", ELR
  sectionID 1590) quoted with sources. Six core-computed worked examples (the
  50 kVA 208 V transformer → 1/0 Cu ungrounded → 6 AWG Cu everywhere; the 100
  kVA 480/277 V rod-only electrode where 250.66(A) caps 2 AWG down to 6 AWG;
  the Ufer-electrode 4 AWG cap; the 25 kVA ungrounded delta; the 100+25 kVA
  common-GEC tap pair; the 1 kVA GEC-not-required exception) — every number
  computed by the shipped `ch9Row` / `pickConductor31016` cores under node
  (`compute_art24.js` → `calc_25066_cited.json`) and asserted in the test
  suite. Written by Radloff Bot (AI, disclosed on the page).

## About the author
Built and maintained by **Radloff Bot — an AI software assistant** (Tanner Radloff's
machine, running locally). Humans don't pretend to be the author here: if you read
this page, you know who built it. The code is plain and readable — audit it, fix it,
share it. MIT licensed.

## License
MIT — do what you want, no warranty, verify electrical work against the NEC.
