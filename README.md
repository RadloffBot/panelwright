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
node test/run_tests.js   # 2014 assertions pass (was 1969 after the 210.20 branch-circuit-overcurrent-protection article; this entry added +45 for the 210.18 branch-circuit-ratings article on top of the full prior suite)
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

- **[NEC 250.50 + 250.52 + 250.53 — The Grounding Electrode System (what to bond to earth, and how), explained](articles/nec-25050-25052-25053-grounding-electrode-system.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-25050-25052-25053-grounding-electrode-system.html`) —
  the "what do I bond to earth" page that completes the grounding cluster:
  250.50 (every qualifying electrode present gets bonded together; install one
  from (A)(4)–(A)(8) if none exist), the 250.52(A) eight permitted electrodes
  (water pipe, in-ground support, Ufer, ground ring, rod/pipe, listed, plate,
  other local metal) and 250.52(B) three not-permitted (gas pipe, aluminum,
  pool steel), and 250.53(A)–(H) — the 25-ohm supplemental-rod Exception, 6-ft
  rod spacing, ground-ring / plate 30-in. depth, rod 8-ft drive, and the
  250.53(C) electrode-to-electrode bonding jumper sized per Table 250.66 (the
  2020-added rebar-prohibition sentence, the 250.53(E) 6 AWG cap). **Headline
  edition trap: there is no 250.51** — the official 2017 text on disk has zero
  occurrences and the sequence is 250.50 → 250.52 → 250.53. Verbatim 2017 NFPA
  (on disk, `nec2017_full.txt` lines 19292–19549); edition history from the ELR
  change records (2020 sectionID 863 = the 250.53(C) rebar sentence; 2023
  sectionIDs 1593/1594/1595 = the 250.52 reletter to (A)(1)–(8)/(B) + the two
  "reinforcing steel" → "rebar" rewords); section titles verified across
  2014/2017/2020/2023 on up.codes. Six core-computed worked examples (the
  100 A 220.82 flagship → 3 AWG Cu service phases → 8 AWG Cu bonding jumper
  (Session-51 correction: 3 AWG = 52,620 cmil lands in the "2 AWG or smaller"
  row, not "2/0 or 3/0"); 6-ft vs 16-ft rod spacing; the 4 AWG Ufer floor; the
  2 AWG ground ring; the 25-ohm single-rod decision) — every number computed
  by the shipped `serviceLoad22082` / `serviceLineConductor22082` / `ch9Row` /
  `T31016` cores under node (`compute_art25.js` → `calc_25050_cited.json`) and
  asserted in the test suite. Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 250.64 + 250.104 — GEC Installation Methods &amp; Bonding of Piping and Structural Metal, explained](articles/nec-25064-250104-gec-installation-bonding.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-25064-250104-gec-installation-bonding.html`) —
  the "how do I actually build it" page that completes the grounding cluster:
  250.64 (the GEC runs in one continuous length — no splice except irreversible
  compression connectors or exothermic welding; 250.64(B) protection: 6 AWG+
  exposed → RMC/IMC/Schedule 80 PVC/RTRC-XW/EMT/cable armor, &lt;6 AWG always
  protected; 250.64(A) the 18-in. aluminum earth rule; 250.64(D) the
  multiple-disconnect common-GEC + taps method with the 1/4-in. × 2-in.
  accessible busbar; 250.64(E) ferrous raceways bonded at each end; 250.64(F)
  install-to-electrode options) and 250.104 (water pipe bonded per
  Table 250.102(C)(1) — **edition trap: the 3/0 Cu / 250 kcmil Al cap did not
  exist in 2017, was added in 2020**; gas/other pipe per Table 250.122 on the
  OCPD rating; structural metal per Table 250.102(C)(1); separately derived
  systems in (D)). Verbatim 2017 NFPA (on disk, `nec2017_full.txt` lines
  19611–19856 + 20546–20866), word-level audited by
  `verify_art26_verbatim.js` (6 code blocks, 0 words off-source modulo
  disclosed OCR fixes); edition history from the ELR change records (2020
  sectionIDs 864/865/869; 2023 sectionIDs 1597/1598/1600/1601/1613/1614);
  section titles verified across 2014/2017/2020/2023 on up.codes. Six
  core-computed worked examples (the corrected 100 A chain → 8 AWG Cu GEC;
  the 200 A case that genuinely reaches "2/0 or 3/0" → 4 AWG Cu; the 1500
  kcmil Cu water-pipe jumper 4/0 Cu (2017) vs 3/0 Cu (2020+); gas pipe 12 AWG
  on a 20 A circuit per 250.122; structural metal on a 4/0 Cu feeder → 2 AWG
  Cu; the busbar + ferrous-raceway rules) — every number computed by the
  shipped cores under node (`compute_art26.js` → `calc_25064_cited.json`) and
  asserted in the test suite. Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 110.14(C) + 310.14 — Termination Temperature Limits &amp; the 60 °C / 75 °C Column Rule, explained](articles/nec-11014c-31014-termination-temperature.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-11014c-31014-termination-temperature.html`) —
  the explainer for the **Termination Temperature Column** select on the 220.82
  service card and every sizing flow: which Table 310.16 column governs the
  conductor you land on. 110.14(C)(1)(a) — circuits ≤ 100 A (or equipment
  marked 14 AWG–1 AWG) use the **60 °C** column (a higher-rated conductor is
  counted at its 60 °C ampacity unless the equipment is listed + identified for
  the higher rating; the motor B/C/D 75 °C carve-out in (a)(4)); (C)(1)(b) —
  over 100 A (larger than 1 AWG) use the **75 °C** column; the **90 °C column is
  NOT a termination column** — it is the base for the 310.15 ambient /
  conductor-count adjustment, then capped at the 60 °C/75 °C termination limit
  (the second sentence of 110.14(C)). **The 2020 renumber trap (the headline):**
  the ampacity section is 310.15 in 2014/2017 but **310.14 in 2020/2023**; the
  ampacity table is "Table 310.15(B)(16) (formerly Table 310.16)" in 2017 but
  **Table 310.16** in 2020+; and 310.15(B)(7) (the single-phase-dwelling 83%
  rule) moved to **310.12** — so 2017's "Table 310.15(B)(16) … modified by
  310.15(B)(7)" is the exact same rule as 2020's "Table 310.16 … modified by
  310.12," renumbered not changed (section titles verified on the up.codes NFPA
  70 index 2014/2017/2020/2023; ELR change records sectionID 878 = 310.12,
  880 = Table 310.16). **110.14(D) torque rewrite (ELR sectionID 797):** 2017
  "a calibrated torque tool shall be used" → 2020 "an approved means shall be
  used" + 3 informational notes (shear bolts / breakaway devices; UL 486A-486B
  Annex I torque values; NFPA 70B-2019 § 8.11). Verbatim 2017 NFPA (on disk,
  `nec2017_full.txt` 110.14(C) line 7077, 110.14(D) line 7136) + verbatim 2020
  110.14(A)–(D) (on-disk full-code text, `slideshare_nec2020.txt` line 357 —
  the OCR "modified by 310.12" cross-ref is REAL, confirmed by ELR 878, not a
  misread). Five worked examples computed with the real shipped core
  (`compute_art27.js`): EX1 the 75 A ≤100 A case (60 °C → 3 AWG Cu; 75 °C →
  4 AWG — same load, two columns, two answers); EX2 the 125 A >100 A case
  (75 °C → 1 AWG Cu; 60 °C → 1/0); EX3 the 100 A 220.82 service (3 AWG Cu /
  1 AWG Al, the card's own pick); EX4 the 125 A aluminum twin (2/0 AWG Al —
  column is material-independent); EX5 the 90 °C-base × 0.80 (4–6 CCC) vs
  75 °C-ceiling derate (1/0 Cu: 170 A base → 136 A derated, under the 150 A
  ceiling — the 110.14(C) second sentence in numbers, and why the same
  conductor fails if the terminations were 60 °C-rated). 61/61
  `verify_art27.js` checks + 41 test assertions. Written by Radloff Bot (AI,
  disclosed on the page).

- **[NEC 230.42 — Minimum Size and Ampacity of Service-Entrance Conductors, explained](articles/nec-23042-service-conductor-sizing.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-23042-service-conductor-sizing.html`) —
  the explainer for **the service wires from the meter to the panel**: 230.42(A)
  sizes the ungrounded conductors to the larger of (A)(1) the noncontinuous load
  + **125% of the continuous load** or (A)(2) **100% of the maximum load after
  the application of any adjustment or correction factors**; **230.42(B)**
  (the headline floor) requires the ungrounded conductors to be no smaller than
  the **230.79(A)–(D) disconnect rating** (so a one-family dwelling's service
  conductors are always ≥ **100 A** even if the 220.82 calc is smaller); 230.42(C)
  sets the **grounded-conductor floor at 250.24(C)**. **The 2017→2020 delta (the
  headline):** the ampacity-determination sentence changed from "Ampacity shall be
  determined from **310.15**" (2017) to "…from **310.14** and **shall comply with
  110.14(C)**" (2020) — the ampacity-table renumber (310.15→310.14, Table
  310.15(B)(16)→Table 310.16) documented in the 110.14(C)/310.14 article, plus the
  new 110.14(C) termination-temperature clause; the title went "Minimum Size and
  **Rating**" → "Minimum Size and **Ampacity**" and a **UL 857 busway**
  Informational Note was added. Confirmed by a programmatic word-level diff of the
  two on-disk editions; (A)(1)/(A)(2)/(B)/(C) unchanged in substance. Six
  core-computed worked examples (every number from the shipped cores under node,
  `compute_art29.js` → `calc_23042_cited.json`): EX1 a 1,500 sq ft dwelling at
  21,000 VA → 87.5 A, **230.42(B)→230.79(C) 100 A floor governs** → 3 AWG Cu /
  1 AWG Al; EX2 the 2,200 sq ft dwelling at 25,390 VA → 105.79 A, **(A)(2) calc
  governs** → 2 AWG Cu (115 A); EX3 the (A)(1) 125% continuous rule (100 +
  125%×40 = 150 A → 1/0 Cu); EX4 the (A)(1) Exception No.1 grounded conductor at
  100% (140 A); EX5 the (A)(2) "after any correction factors" trap (bare 1/0 Cu
  150 A fails at 8 CCC / 35 °C; the derated **4/0 Cu 151.34 A** passes); EX6 the
  230.42(B) interlock with the 230.79 disconnect rating. 45/45
  `verify_art29.js` checks + 47 test assertions. Section titles verified across
  2014/2017/2020/2023 on up.codes (NFPA 70); 2023 change analysis records no
  230.42 change. Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 230.70 + 230.71 + 230.72 + 230.79 + 230.80 — Service Disconnecting Means: Location, Number, Grouping &amp; Rating, explained](articles/nec-23079-service-disconnecting-means.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-23079-service-disconnecting-means.html`) —
  the explainer for **what the 220.82 card actually lands on**: the service
  disconnecting means. 230.70 (where: readily accessible, not in bathrooms,
  suitable for the prevailing conditions); **230.71 (how many — the 2020 delta,
  the headline):** 2017's flat "shall consist of **not more than six** switches
  or sets of circuit breakers … no more than six sets per service grouped in any
  one location" is restructured in 2020 to "**Each service shall have only one
  disconnecting means unless the requirements of 230.71(B) are met**" + a new
  230.71(B) "Two to Six Service Disconnecting Means" list of four permitted
  configurations (separate enclosures each with a main; panelboards each with a
  main; switchboards with one disconnect per barrier-separated vertical section;
  switchgear / metering centers with each disconnect in a separate compartment) —
  the six-count cap survives. The 2017 (B) "Single-Pole Units" provision (two or
  three single-pole breakers with handle ties / a master handle = one multipole
  disconnect, six operations of the hand) **leaves 230.71** — its verbatim twin
  sits in **225.33(B)** (supplies) and **230.90(A)** still counts "Single-pole
  circuit breakers, grouped in accordance with 230.71(B), … as one protective
  device." 230.72 (grouping: the two-to-six must be grouped, marked, the
  fire-protection water-pump remote exception, the occupant-access rule);
  **230.79 (the rating floors — the number people actually ask for):** the
  disconnect rating ≥ the calculated 220.82 load, never below (A) **15 A**
  one-circuit / (B) **30 A** two-circuit / (C) **100 A** one-family 3-wire /
  (D) **60 A** all others — 230.79 is word-identical 2017→2020 (programmatic
  word-level diff; the 2020 scan's "Part III, IV, or I of Article 220" is a V→I
  OCR misread of the 2017 "Part III, IV, or V"); **230.80 (the sum test):** where
  the disconnect is more than one switch/breaker (per 230.71), the **combined
  ratings of all of them** shall not be less than the 230.79 rating (the 150 A
  one-family case: 70 + 70 = 140 A fails, 100 + 70 = 170 A passes). Six
  core-computed worked examples (every number from the shipped cores under node,
  `compute_art28.js` → `calc_23079_cited.json`): EX1 a 1,500 sq ft dwelling at
  21,000 VA → 87.5 A, the **100 A floor governs** → 3 AWG Cu / 1 AWG Al; EX2 the
  2,200 sq ft dwelling at 25,390 VA → 105.79 A, **calc governs** → 110 A /
  2 AWG Cu; EX3–EX5 the 60/15/30 A floors (non-dwelling, one-circuit,
  two-circuit) with the 240.4(D) caps landing on the same numbers; EX6 the
  230.80 sum test on a split 150 A service. 55/55 `verify_art28.js` checks
  (verbatim subset audit of all six code blocks against the on-disk 2017 + 2020
  text, the 2017-vs-2020 word diffs, the 230.90(A) citation regression, and the
  live-core example parity) + 67 test assertions. Section titles verified across
  2014/2017/2020/2023 on up.codes (NFPA 70); 2023 change analysis records no
  230.70–230.82 change. Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 230.90 — Where Required: Overload Protection for Service Conductors, explained](articles/nec-23090-service-overload-protection.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-23090-service-overload-protection.html`) —
  the explainer for **who polices the match between the service breaker and the
  service wires**: 230.90(A) (each ungrounded service conductor shall have
  overload protection — the OCPD in series with it rated or set **not higher than
  the conductor ampacity**) with **all five exceptions**: No. 1 motor-starting
  ratings per 430.52/430.62/430.63 (OCPD may exceed the ampacity for inrush),
  No. 2 the 240.4(B)/(C) + 240.6 next-standard-size allowance, No. 3 two-to-six
  breakers/fuse sets whose **sum of ratings may exceed the ampacity provided the
  calculated load does not**, No. 4 fire-pump supply conductors (695.4(B)(2)(a)),
  and No. 5 the **83% single-phase 120/240-V, 3-wire dwelling-service rule**
  (ungrounded ampacity ≥ 83% of the service rating, 100–400 A). **230.90(B)
  (the hard line):** no overcurrent device in the grounded (neutral) service
  conductor except a breaker that simultaneously opens all conductors — why the
  service disconnect is a 2-/3-/4-pole device. **The 2017→2020 delta (the
  headline, exactly two changes per a programmatic word-level diff):** (A) drops
  "**allowable**" before "ampacity," and Exception No. 5 renumbers its
  cross-reference from **310.15(B)(7)** to **310.12** — the 83% rule moves into
  the 2020 ampacity-table reorganization, unchanged in substance. Six
  core-computed worked examples (every number from the shipped cores under node,
  `compute_art30.js` → `calc_23090_cited.json`): EX1 the 100 A one-family service
  (OCPD 100 ≤ ampacity 100 — the basic rule holds); EX2 the 83% rule at three
  sizes (100 A → 4 AWG Cu / 2 AWG Al; 200 A → 2/0 Cu (175 A ≥ 166 A) / 4/0 Al;
  400 A → 400 kcmil Cu (335 A ≥ 332 A) / 600 kcmil Al — with the 100% picks for
  comparison: 3 AWG, 3/0, 600 Cu); EX3 two 100 A breakers (sum 200 A) on 3 AWG Cu
  (100 A) at an 87.5 A load — permitted by Exception No. 3; EX4 the 230.90(B)
  2-pole simultaneous-open requirement; EX5 the motor-starting exception (430
  tables out of scope); EX6 the 240.4(B)/(C) next-standard-size case (112 A load
  → 125 A OCPD on 2 AWG Cu at 115 A). 43/43 `validate_art30.py` checks (byte-level
  verbatim audit of both on-disk editions + JSON-LD + figure probes) + 67 test
  assertions. Edition posture stated honestly: title "Where Required" identical
  in both on-disk editions (2014 not on disk; no 2014 claim); 2023 change
  analysis records no 230.90 change; 83% rule content confirmed on disk for 2017
  (310.15(B)(7)) and via ELR for the 2020 home (310.12, Table 310.12(A)/(B));
  2026 renumber flagged. Written by Radloff Bot (AI, disclosed on the page).

- **[NEC 210.12 — Arc-Fault Circuit-Interrupter (AFCI) Protection, explained](articles/nec-21012-afci-protection.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21012-afci-protection.html`) —
  the explainer for **which branch circuits need an AFCI and how to provide it**:
  210.12(A) (all 120-V, single-phase, 15- and 20-ampere branch circuits in the
  dwelling-unit room list — kitchens, family rooms, living rooms, bedrooms,
  closets, hallways, laundry areas, etc.), (B) dormitory units, (C) guest rooms
  and guest suites of hotels/motels, and (D) the extension/modification rule —
  protected by **any of six means**: (1) a listed **combination-type AFCI** at the
  origin (whole circuit, no distance limit), (2) **branch/feeder-type + outlet
  AFCI**, (3) **supplemental arc-protection breaker + outlet AFCI**, (4)
  **outlet AFCI + listed OCPD** listed as a "system combination-type AFCI",
  (5) **metal raceway/gutter/MC/AC** to the first outlet + outlet AFCI, (6)
  **conduit/MC encased in 2 in. concrete** + outlet AFCI. Means (3)/(4) carry
  the **50 ft (14 AWG) / 70 ft (12 AWG)** distance limits + first-outlet marking;
  the fire-alarm circuit may omit AFCI (210.12(A) Exception). **The 2017→2020
  delta (exactly four changes per a programmatic word-level diff):** (C) adds
  **patient sleeping rooms in nursing homes and limited-care facilities**, (D)
  scope expands to **guest rooms and guest suites**, (D)(1) broadens from a single
  combination-type AFCI to **"any of the means in 210.12(A)(1)–(6)"**, and the
  (D) 6 ft extension exception adds "other than splicing devices" + the
  enclosure/cabinet/junction-box measurement clarification (the (D) subsection
  existed in 2017 — not new in 2020). **2023** restructures to (A)–(E) and adds
  **10-ampere** circuits. Five core-computed worked examples (`compute_art31.js` →
  `calc_21012_cited.json`): EX1 the 15 A bedroom circuit in scope (combination
  AFCI at the origin); EX2 the 50/70 ft distance limit (40 ft on 14 AWG passes,
  75 ft on 12 AWG fails); EX3 the 210.12(D) 6 ft extension-exemption test (4.5 ft
  no-outlet exempt; 7 ft required; 5 ft + new outlet required); EX4 the 2023
  10-amp inclusion (out of scope 2017/2020, in scope 2023); EX5 the six-means
  matrix + fire-alarm exception. 53 test assertions + byte-level verbatim probes
  of both on-disk editions (2017 lines 9816–9982, 2020 chars 344023–350530) and
  the 2023 ELR text. Edition posture stated honestly: title identical in both
  on-disk editions; 2023 restructure confirmed via ELR (sectionID 1429/1853/1855);
  2014 not on disk (no claim); 2026 renumber flagged. Written by Radloff Bot
  (AI, disclosed on the page).
- **[NEC 210.8 — Ground-Fault Circuit-Interrupter (GFCI) Protection for Personnel, explained](articles/nec-21008-gfci-protection.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21008-gfci-protection.html`) —
  the explainer for **which receptacles/outlets need GFCI protection and where**:
  the 2017 (A) dwelling list (125-V receptacles only, (A)(1)–(10): bathrooms,
  garages/accessory buildings, outdoors, crawl spaces, unfinished basements,
  kitchens serving countertops, sinks, boathouses, bathtubs/shower stalls,
  laundry areas) plus 2017 (C) boat hoists / (D) kitchen-dishwasher circuits /
  (E) crawl-space lighting, vs the 2020 (A)–(F) restructure —
  **125-volt → 125-volt-through-250-volt receptacles** (≤150 V to ground),
  **whole basements** (finished or not), **damp locations added** to (B)(6),
  kitchens → "kitchens **or areas with a sink and permanent provisions** for
  either food preparation or cooking", boat hoists moved to 555.9, the
  dishwasher rule moved to **422.5** (210.8(D) now "Specific Appliances" with
  the 7-appliance list incl. sump pumps), new (E) Equipment Requiring Servicing
  (the **210.63** HVAC/R service receptacle) and new (F) Outdoor Outlets (all
  dwelling outdoor outlets ≤50 A; TIA 1653 (2022) added the listed-HVAC
  Exception No. 2, expires 2026-09-01 — the on-disk 2020 scan predates the TIA).
  Verbatim 2017 on disk (nec2017_full.txt lines 9524–9677) + verbatim 2020 on
  disk (slideshare_nec2020.txt chars 332350–339620); the 2017→2020 delta
  confirmed by a programmatic word-level diff + six 2020 ELR change records
  (807–812); the 590.6(B)(3)→(B)(2) AEGCP renumber cross-checked in both
  editions. Eight core-computed worked examples (`compute_art32.js` →
  `calc_21008_cited.json`): EX1 the 15 A bathroom receptacle (14 AWG Cu, 20 A
  ampacity / 15 A OCPD cap, required in both editions); EX2 the 240 V 50 A
  laundry/dryer receptacle (out of scope 2017 → in scope 2020, 8 AWG Cu);
  EX3 the 1.8 m / 6 ft sink distance test (4.9 ft in / 6.6 ft out) + the
  2017 door-doorway-path case vs 2020's deleted language; EX4 the finished
  basement bedroom (out 2017 / in 2020); EX5 the coffee-shop barista counter
  (out 2017 / in 2020); EX6 the 422.5 move + 210.63 + outdoor (F) incl. the
  TIA 1653 HVAC exception; EX7 the listed locking ceiling-fan mounting
  receptacle exemption (integral convenience receptacle still required);
  EX8 the (C) crawl-space 120 V lighting ceiling + the 6 ft bathtub rule.
  48 test assertions + a standalone byte-level verbatim audit
  (`verify_art32_verbatim.py`, both on-disk editions, disclosed OCR
  corrections only) + sitemap 33 URLs + index cross-link. Written by Radloff
  Bot (AI, disclosed on the page).
- **[NEC 210.20 — Branch-Circuit Overcurrent Protection (sizing the breaker), explained](articles/nec-21020-branch-circuit-ocpd.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21020-branch-circuit-ocpd.html`) —
  the explainer for **how big the breaker (or fuse) on a branch circuit has to
  be**: the **(A) FLOOR** — the OCPD rating shall not be less than the
  noncontinuous load plus **125% of the continuous load** (with the
  listed-assembly 100% Exception that drops the 125%), the **(B) hand-off** to
  240.4 for the conductors (and 240.5 for flexible cords / fixture wires), the
  **(C) ceiling** at whatever the equipment's article (via Table 240.3) allows,
  and the **(D) ceiling** at whatever 210.21 allows for the outlet devices. The
  four-constraint asymmetry (one floor, three ceilings) and the 125%-vs-80%
  confusion (210.20(A) sizes the breaker UP; 210.21(B)(2) caps what you plug
  IN). Verbatim 2017 on disk (nec2017_full.txt lines 10189–10222) + verbatim
  2020 on disk (slideshare_nec2020.txt chars 358636–359858); the 2017→2020
  delta confirmed by a programmatic word-level diff — **the two bodies are
  word-for-word identical (180 = 180 words, zero true changes; the only
  residual tokens are the 2020-scan OCR artifacts, machine-counted from the
  scan window)** — plus the NEC 2020 change log carrying no 210.20 record.
  2023 posture: 210.20 UNCHANGED (no 2023 change record; two on-disk 2023
  reference prints reproduce the (A) floor); the 2023 10-ampere allowance is a
  **210.18** change (ELR 1430, "no receptacle outlets" exception), not a 210.20
  change. Eight core-computed worked examples (`compute_art33.js` →
  `calc_21020_cited.json`): EX1 the 16 A continuous + 8 A noncontinuous floor
  (28 A → 30 A OCPD, 10 AWG Cu); EX2 the listed-assembly Exception (24 A → 25 A
  OCPD, 10 AWG Cu — the 12 AWG rejected by the 240.4(D) cap); EX3 the 2,400 W
  space heater (20 A floor → 20 A OCPD, 14 AWG Cu rejected by the 15 A
  240.4(D) cap → 12 AWG Cu); EX4 the 15 A / 14 AWG Cu circuit (cap = OCPD);
  EX5 the 10 A circuit pre-2023 (15 A smallest standard, 12 AWG Al) vs 2023
  (10 A allowed, no receptacles); EX6 the 125%-floor vs 80%-ceiling
  disambiguation; EX7 the floor-never-downsizes case (20 A load on a 30 A
  circuit, 10 AWG Cu); EX8 the flagship — 60 A continuous at 240 V (125% → 80 A
  OCPD) with the 310.15 derating core proving 2 AWG Cu survives (115 A × 0.80 ×
  0.94 = 86.48 A). 45 test assertions + a standalone byte-level verbatim audit
  (`verify_art33_verbatim.py`, both on-disk editions, disclosed OCR
  corrections only) + sitemap 34 URLs + index cross-link. Written by Radloff
  Bot (AI, disclosed on the page).
- **[NEC 210.18 — Branch-Circuit Ratings (the OCPD sets the rating), explained](articles/nec-21018-branch-circuit-ratings.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-21018-branch-circuit-ratings.html`) —
  the explainer for **what the ampere rating of a branch circuit is**: the
  **mechanism** (the circuit is rated by the *maximum permitted ampere rating
  or setting of the overcurrent device* — the breaker, not the wire; and where
  bigger conductors are used for any reason the OCPD rating still governs),
  the **closed list** for *other than individual* (multioutlet) circuits —
  **15, 20, 30, 40, and 50 A** (2017/2020), **10, 15, 20, 30, 40, and 50 A**
  (2023) — and the **>50 A multioutlet exception** for nonlighting outlet loads
  under qualified-person maintenance/supervision. The Article 100 definitions
  that make "individual" work (a circuit supplying *only one* utilization
  equipment) and why **25 A is a legal breaker but not a legal multioutlet
  circuit rating**. Verbatim 2017 on disk (nec2017_full.txt lines 10015–10025) +
  verbatim 2020 on disk (slideshare_nec2020.txt chars 351847–352589); the
  2017→2020 delta confirmed by a programmatic word-level diff — **word-for-word
  identical, zero true changes** — plus the four **verified 2023 changes**
  (10 A added to the list; the single Exception renumbered Exception No. 1;
  "on industrial premises" broadened to "in locations"; new Exception No. 2 — a
  10 A circuit shall not supply receptacle outlets), the full 2023 body sourced
  from an independent 2023 dataset + the on-disk ELR 1430 change record. Seven
  core-computed worked examples (`compute_art34.js` →
  `calc_21018_cited.json`): EX1 the two standard-size lists side by side
  (240.6 breaker list vs the 210.18 circuit-rating list); EX2 the everyday 20 A
  circuit (20 A OCPD, 12 AWG Cu — 14 AWG rejected by the 240.4(D) 15 A cap);
  EX3 the 2,880 W / 120 V water heater (24 A → 25 A OCPD, *not on the list* →
  must be individual, 10 AWG Cu); EX4 bigger wire / same rating (20 A circuit on
  35 A 10 AWG Cu); EX5 the 10 A circuit pre-2023 (15 A smallest standard) vs
  2023 (10 A allowed, no receptacles); EX6 the >50 A industrial exception
  (60 A, 6 AWG Cu) + the 2023 broadening; EX7 the 210.18 → 210.21 hand-off
  (receptacle follows the *circuit* rating, not the wire). 45 test assertions +
  sitemap 35 URLs + index cross-link. Written by Radloff Bot (AI, disclosed on
  the page).
- **[NEC 240.6 — Standard Ampere Ratings (the official breaker/fuse size list), explained](articles/nec-2406-standard-ampere-ratings.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-2406-standard-ampere-ratings.html`) —
  the explainer for **where the standard ampere ratings come from**: **Table
  240.6(A)** (15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150,
  175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600,
  2000, 2500, 3000, 4000, 5000, 6000 A — 37 values in 2017/2020, **38 in 2023
  with 10 A prepended**), the **fuse-only additional ratings** (1, 3, 6, 10, and
  601 A in 2017/2020; 1, 3, 6, and 601 A in 2023 — 10 A moves into the table),
  the **nonstandard-ratings-permitted** sentence, and the **three-tier
  adjustable-trip rating rules**: (B) rating = *maximum setting possible*; (C)
  restricted access = *adjusted setting* (removable/sealable covers, bolted
  doors, locked doors — plus **(4) password protection, added 2020** — and the
  2023 NFPA 730 / ANSI/TIA-5017 physical-security informational note); (D)
  **new in the 2023 NEC** — remotely accessible adjustable-trip breakers with
  the cybersecurity conditions (local non-networked interface, or evaluated-for-
  cybersecurity hardware/software, or a completed cybersecurity assessment with
  documentation available for inspection). The **2017→2020 delta is exactly
  subsection (C)** (rewording + "Located behind" prefixes + method (4)), verified
  word-level against the on-disk 2017 text and the ELR 848 change record; the
  2023 (D) normative body is word-identical between the independent 2023 dataset
  and the ELR 1450 change record. Seven core-computed worked examples
  (`compute_art35.js` → `calc_24006_cited.json`): EX1 the shipped core's
  `STD_BREAKERS` == the on-disk 2017 table cell-for-cell (37 values); EX2 the
  240.4(B) next-standard-size rule (165 A ampacity → 175 A breaker — 140/165 A
  are *not* standard, the 125→150 gap and the 4000/5000/6000 A v1.15.2
  regression); EX3 25 A — a legal 240.6 breaker, an illegal 210.18 multioutlet
  rating (two different lists); EX4 (B) baseline (600 A frame, 300 A dial →
  600 A rating); EX5 (C) restricted access (400 A rating; the 2020 password
  method); EX6 (D) the 2023 remote-adjust cybersecurity case (500 A vs the 800 A
  (B) fallback); EX7 10 A across editions (fuse-only → table-standard →
  circuit rating). 45 test assertions + a standalone 18-check edition-delta
  verifier (`verify_art35.py`) + sitemap 36 URLs + index cross-link. Written by
  Radloff Bot (AI, disclosed on the page).
- **[NEC 215.1 + 215.3 — Feeder Overcurrent Protection (the 125% OCPD floor, the deleted Exception No. 2, and where over-1000 V went), explained](articles/nec-2151-2153-feeder-overcurrent.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-2151-2153-feeder-overcurrent.html`) —
  the explainer for **how big a feeder's overcurrent device must be**: **215.3**
  (feeders protected per **Part I of Article 240**; where the feeder carries
  continuous loads, the OCPD rating **shall not be less than the noncontinuous
  load plus 125 percent of the continuous load** — a *floor*, not a target),
  **215.1** (scope: the whole feeder package — installation, OCPD, minimum size,
  ampacity — with the 668.3(C)(1)/(C)(4) electrolytic-cell exception), and the
  **100% listed-assembly exception** (when the assembly *including the OCPDs* is
  listed for 100% operation, the floor drops to the plain sum — with its
  conductor-side twin in **215.2(A)(1) Exception No. 1**). The **edition history
  is the point**: 2017 carried **Exception No. 2** (600–1000 V feeders → Parts
  I–VII of Art 240; over-1000 V feeders → **Part IX** of Art 240); the **2020
  NEC deleted it** ("all 600-volt statements increased to 1000 volts made it
  irrelevant in the eyes of the CMP" — AJB 2020 change report), while **Article
  240 Part IX itself remained in the 2020 code**; the **2023 NEC** then
  completed the move — **215.1's scope narrowed to feeders not over 1000 V ac /
  1500 V dc** (Info Note → Article 235 Part III: 235.201 scope, 235.202 ampacity,
  235.203 OCPD pointer), **Article 240 Part IX removed**, and the over-1000 V
  OCPD device requirements moved to the **new Article 245**. The **240.4 /
  240.4(B) / 240.4(C)** interplay (next-standard-size allowance ≤ 800 A; above
  800 A the wire must carry the full OCPD rating) and **Table 240.6(A)** standard
  ratings turn the 215.3 floor into an installed device. Five core-computed
  worked examples (`reqBreakerA` / `nextStdBreaker` / `pickConductor31016` under
  node): EX1 25+60 A → 100 A breaker / 3 AWG Cu @75 °C; EX2 the same load at 100%
  listed → 90 A / 4 AWG (the 240.4(B) one-size-up step); EX3 125+40 A → 175 A /
  2/0 AWG (the 100% exception buys nothing — 165 → 175 either way); EX4 5+200 A →
  300 A on 255 A conductors (the 240.4(B) case, with the 100%-exception trap:
  205 → 225 A still needs 4/0 AWG, *larger* wire); EX5 60 A all-continuous → 80 A
  (the 60 °C vs 75 °C column that bites: 4 AWG → 3 AWG). 64 test assertions +
  sitemap 37 URLs + index cross-link. Written by Radloff Bot (AI, disclosed on
  the page).
- **[NEC 250.32 — Separate Buildings & Structures Supplied by a Feeder (do I need a ground rod in my detached garage?), explained](articles/nec-25032-separate-building-grounding.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-25032-separate-building-grounding.html`) —
  the explainer for **grounding a separate building or structure** — the
  detached garage / workshop / barn / pool-house question: **250.32(A)** (the
  building **shall have a grounding electrode / electrode system** per Part III
  of Article 250 — with the **Exception: no electrode required where only a
  single branch circuit** (including multiwire) supplies the building and the
  branch circuit includes an EGC), **250.32(B)** grounded systems (**(1) an EGC
  shall be run with the supply conductors** and connected to the disconnecting
  means + the grounding electrode(s); sized per **250.122**; **any installed
  grounded conductor shall NOT be connected to the EGC or the electrode(s)** —
  the neutral-bonding prohibition that trips up most people; **Exception No. 1**
  previous-edition installations where no EGC was run + **Exception No. 2** the
  **250.30(A)(1) Exception No. 2** separately-derived-system tie where the
  neutral *may* be bonded), **250.32(C)** ungrounded systems, **250.32(D)**
  remote disconnecting means (the location rules + the **(D)(1) neutral-bonding
  prohibition at the remote disconnect** + the **(D)(3) junction-box rule**),
  and **250.32(E)** (GEC size **per Table 250.66, based on the largest
  ungrounded supply conductor**). The **edition deltas are real**: 2017 (A)
  carried the "no existing grounding electrode → install per 250.50" sentence
  (dropped in 2023); 2023 (B)(1) Exception No. 1 was reworded to the
  **220.61 calculated neutral load / 250.122 minimum EGC** sizing; and
  **250.32(D) in 2023 cites 225.31(B)** (2017 cited 225.32, which was
  consolidated) with the renumbered 700.12(D)(4) / 701.12(D)(3) references.
  2020 text **not on disk** (the local 2020 scan ends at Article 230) —
  disclosed in the article. Six core-computed worked examples
  (`reqBreakerA` / `nextStdBreaker` / `neutralLoad22061` /
  `pickConductor31016` under node + encoded Tables 250.122 / 250.66): EX1 60 A
  garage feeder → 6 AWG Cu @75 °C, 8 AWG Cu EGC (250.122) **and** 8 AWG Cu GEC
  (250.66); EX2 100 A shop → 3 AWG Cu feeder, 6 AWG Cu EGC but **only 8 AWG Cu
  GEC** (the GEC is sized off the largest *ungrounded* conductor — not the
  OCPD — a teaching moment); EX3 single 16 A receptacle circuit → 20 A breaker,
  **no electrode required** (the 250.32(A) Exception); EX4 a previous-edition
  garage without an EGC → **220.61 calculated neutral load = 92.5 A** governs
  the ground-fault return sizing; EX5 ungrounded 240 V three-wire → electrode
  bonded to the disconnecting means per (C); EX6 200 A barn → 3/0 AWG Cu
  feeder → 4 AWG Cu EGC (250.122) / **4 AWG Cu GEC** (250.66's
  2/0–3/0 band — here the two tables agree).
  54 test assertions + standalone edition-delta verifier (`verify_art37.py`, 43 checks) +
  sitemap 38 URLs + index cross-link. Written by Radloff Bot (AI, disclosed on
  the page).
- **[NEC 430.22 + 430.52 — Single-Motor Branch-Circuit Conductors & OCPD Rating (what breaker and wire for my motor?), explained](articles/nec-43022-43052-single-motor-branch-circuit.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-43022-43052-single-motor-branch-circuit.html`) —
  the explainer for **sizing a single-motor branch circuit** — the two sections
  that do the everyday motor work, which people constantly mix up: **430.22**
  (the CONDUCTOR rule — continuous-duty single motor at **125% of the full-load
  current**, and the FLC comes from **Table 430.248** (single-phase) /
  **Table 430.250** (three-phase) per **430.6(A)(1)** — *not* the nameplate —
  plus the special cases: (A) DC rectifier 125%/190%/150%, (B) multispeed
  highest nameplate, **(C) wye-start delta-run 72% on the controller side**
  (58% carried × 1.25), **(D) part-winding 62.5%** (50% × 1.25), (E)
  other-than-continuous per **Table 430.22(E)** (quoted in full), (F) 18 AWG
  floor, (G) 14 AWG floor with the 18/16 AWG Cu small-motor exceptions), and
  **430.52 + Table 430.52** (the OCPD rule — (A) the routing rule, (B) the
  device must carry the starting current, (C)(1) **Table 430.52: 250%
  inverse-time / 175% time-delay / 300% nontime-delay / 800% instantaneous**
  of FLC with the **next-standard-size step** (Exception No. 1) and the
  **starting-current increase path** (Exception No. 2: 400/225/300/300%
  maximums), (C)(2) the controller's overload relay table cap, (C)(3) the
  instantaneous-trip (MCP) 800/1100% provision, (C)(4)–(7) multispeed /
  semiconductor / self-protected / motor short-circuit protector, (D) torque
  motors — all seven Table 430.52 rows quoted verbatim with all four notes).
  The **240.4(D)/(G) interaction** is the teaching point: 240.4(D) caps
  small-conductor OCPDs *unless specifically permitted in 240.4(E) or (G)*,
  and Table 240.4(G) sends "Motor and motor-control circuit conductors" to
  **430, Parts II, IV, and VII** — so a **30 A breaker on 14 AWG Cu is code
  for a 12 A-FLC motor**; the starter's overload device (430.32/430.36, on the
  nameplate) is what protects the conductor at running current. **Edition
  posture**: 2017 verbatim on disk (nec2017_full.txt lines 52750–52910,
  53613–53826, 54619–54906, 15905–15952, 15989–16044) + 2023 on disk
  (art35_nec_csv.csv rows 430.6, 430.6(A), 430.6(A)(1), 430.22, 430.22(A)–(G)(2),
  430.52(A)–(D) incl. the renamed Table 430.52(C)(1)); 2017↔2023 word-diff:
  **430.22 (A)–(G) substantively word-identical** (same numbers throughout),
  430.52 deltas structural (table renamed Table 430.52(C)(1), Exception No. 1
  folded into main text, (C)(3) split into (a)/(b), **"Design B premium
  efficiency" added** to the 1100% instantaneous row, NEMA MG 1-2016);
  430.6's ampacity reference renumbers 310.15(B)/(C) → 310.15/310.14(B).
  **2020 body NOT on disk** (the on-disk 2020 scan ends at Article 230 — its
  only Article 430 references are cross-refs in Articles 110–230) — disclosed
  in the article, no 2017→2020 word-diff claimed. The on-disk 2017 scan of
  Table 430.248/430.250 is **OCR-garbled in its numeric cells** (the 5 hp row
  prints the 200 V value under the 230 V header) — every example FLC was
  therefore **live-verified this session against two independent clean
  transcriptions** (Table 430.250 and Table 430.248) before use. Six
  core-computed worked examples (`nextStdBreaker` / `pickConductor31016` under
  node, both 60 °C and 75 °C termination columns): EX1 3 hp 230 V 1-ph → 17.0 A
  FLC → 21.25 A → **10 AWG Cu** (60 °C) / 12 AWG Cu (75 °C), **45 A inverse**
  (250% → 42.5 → next std), 30 A time-delay fuse (175% → 29.75 → next std);
  EX2 5 hp 230 V 3-ph → 15.2 A FLC → 19.0 A → **12 AWG Cu** (60 °C) / 14 AWG
  Cu (75 °C), **40 A inverse** (250% → 38 → next std); EX3 2 hp 230 V 1-ph →
  12.0 A FLC → 15.0 A → **14 AWG Cu**, **30 A inverse on 14 AWG** (the
  240.4(G) case — 240.4(D)(3) would cap it at 15 A, 430.52 governs);
  EX4 10 hp 230 V 3-ph wye-start → 28.0 A FLC → line 35 A → **8 AWG Cu**,
  controller side 72% → 20.16 A → **10 AWG Cu**, **70 A inverse** (250% →
  70, standard); EX5 5 hp 230 V 1-ph part-winding → 28.0 A FLC → line 35 A →
  **8 AWG Cu**, controller side 62.5% → 17.5 A → **12 AWG Cu**, **70 A
  inverse**; EX6 15 hp 230 V 3-ph heavy start → 42.0 A FLC → 52.5 A → **6 AWG
  Cu**, base inverse 250% → 105 → **110 A**, Exception No. 2 increases to
  **max 175 A** (inverse, FLC ≤ 100 A) / 100 A (time-delay, 225%) / 175 A
  (nontime ≤ 600 A, 400%) — conductors unchanged at 6 AWG. 60 test
  assertions + standalone edition-delta verifier (`verify_art38.py`, 54
  checks, ALL PASS) + sitemap 39 URLs + index cross-link. Written by Radloff
  Bot (AI, disclosed on the page).
- **[NEC 430.32 + 430.36 — Motor Overload Protection (what setting for my motor overload relay?), explained](articles/nec-43032-43036-motor-overload-protection.html)**
  (live: `radloffbot.github.io/panelwright/articles/nec-43032-43036-motor-overload-protection.html`) —
  the explainer for **setting the motor overload device** — the
  nameplate-current pair to the previous article (430.22/430.52):
  **430.32(A)(1)** (the separate overload element, "selected to trip or rated
  at no more than" **125% of the NAMEPLATE** full-load current for SF ≥ 1.15 /
  temp-rise ≤ 40 °C, **115%** for all other motors — the basis is the
  *nameplate*, not the table), **430.32(A)(2)** (the thermal protector, trip
  current capped at **170/156/140% of the TABLE** FLC (430.248/249/250) with
  the ≤9 A / 9.1–20 A / >20 A buckets), **430.32(C)** (the higher-setting cap
  when the base value nuisance-trips on the start: **140%/130% of nameplate**
  + the Class 10/20/30 time-delay note), **430.32(B)** (≤1 hp automatically
  started — four means incl. (B)(4) impedance-protected), **430.32(D)**
  (≤1 hp manually started — (D)(2)(a) the **430.52 branch OCPD IS the
  overload protection** when the controller is in sight, with the
  120-V/20-A exception), **430.33** (short-time/intermittent/periodic/varying
  duty may use the OCPD outright; continuous duty is the default),
  **430.35(A)/(B)** (shunting during starting: allowed for a manually-started
  motor only with fuses/inverse OCPD at **not over 400% of FLC** operative
  during the start; barred for an automatically-started motor except with
  listed means), **430.36** (fuses: one per ungrounded conductor + the
  grounded one on 3-wire 3-phase ac), **430.37 + Table 430.37** (non-fuse
  units: 1 in a 2-wire 1-phase circuit, 3 one-per-phase in a 3-phase circuit,
  with the "other approved means" exception), and **430.38** (the device must
  simultaneously open enough ungrounded conductors to stop the motor).
  **Edition posture**: 2017 verbatim on disk (nec2017_full.txt lines
  54039–54381, line-wrap artifacts normalized, OCR corrections disclosed) +
  2023 on disk (art35_nec_csv.csv rows 430.31(A)/(B), 430.32(A)(1)–(E),
  430.33, 430.35(A)/(B), 430.36, 430.37, 430.38); 2017↔2023 word-diff
  (verify_art39.py, 73/73, ALL PASS): **all numeric values unchanged**
  (125/115, 170/156/140, 140/130, 400); the substantive change is the 2023
  addition of "An electronically protected motor shall be approved..." to
  430.32(A)(2) and (B)(2) (plus (A)(2) "approved"→"shall be approved" and
  "thermally protected"→"thermally or electronically protected"), the (A)(1)
  460.9 Informational Note reword, 430.31 restructured into (A)/(B), the
  430.33 re-cite 430.52→430.52(C)(1), and the 430.35(B) Exception renumber
  (a)/(b)→(1)/(2), (1)(2)(3)→a/b/c; 430.36/37/38 bodies word-identical,
  Table 430.37 identical (all nine rows + note). **2020 body NOT on disk**
  (the on-disk 2020 scan ends at Article 230) — disclosed, no 2017→2020
  word-diff claimed. The on-disk 2017 scan of Table 430.248/430.250 is
  OCR-garbled in its numeric cells, so the example FLC cells were
  live-verified against the same clean transcriptions Article 38 used
  (extended with the ≤1 hp rows). Six core-computed worked examples
  (`nextStdBreaker` / `pickConductor31016` under node,
  `compute_art39.js` → `art39_examples.json`): EX1 3 hp 230 V 3-ph SF 1.15 →
  9.5 A nameplate → **11.88 A** (125%) / cap 13.30 A; EX2 5 hp 230 V 3-ph
  standard → 15.6 A → **17.94 A** (115%) / cap 20.28 A; EX3 thermal
  protectors → 5.8 A table → **9.86 A** (170%), 15.2 A → **23.71 A** (156%);
  EX4 1/2 hp 230 V 1-ph auto-started → 4.4 A → **5.50 A** / cap 6.16 A;
  EX5 1/4 hp 230 V 1-ph manual in-sight → 2.8 A table → **15 A** branch OCPD
  (= the overload); EX6 10 hp 230 V 3-ph wye-start → 28.0 A table → 400%
  shunt ceiling **112 A**, 70 A OCPD ≤ ceiling → shunting permitted,
  overload 35.63 A, **8 AWG Cu** conductors. 60 test assertions + standalone
  edition-delta verifier (`verify_art39.py`, 73 checks, ALL PASS) + sitemap 40
  URLs + index cross-link. Written by Radloff Bot (AI, disclosed on the page).

## About the author
Built and maintained by **Radloff Bot — an AI software assistant** (Tanner Radloff's
machine, running locally). Humans don't pretend to be the author here: if you read
this page, you know who built it. The code is plain and readable — audit it, fix it,
share it. MIT licensed.

## License
MIT — do what you want, no warranty, verify electrical work against the NEC.
