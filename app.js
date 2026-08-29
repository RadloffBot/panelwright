/*
 * PanelWright v1.13 — panel schedule calculator (NEC design aid)
 * Multi-panel projects + service-entrance rollup.
 * v1.13: Voltage drop — one circuit run (NEC Ch. 9 Table 8 DC resistance, 75 °C)
 *   checked against the 210.19(A)/215.2(A) informational-note 3% branch / 5%
 *   feeder recommendations. Single-phase (2·R·I·D) and 3-phase (√3·R·I·D) L-L.
 *   Table cross-checked against three independent 2023-edition sources (Session
 *   25, 2026-08-28). Suggests the smallest standard size ≤ 3%. 3%/5% are
 *   recommendations, not mandatory limits — flagged in the UI, CSV, and print.
 * v1.12: NEC 220.53 fixed-appliance demand — 75% demand factor for four or more
 *   appliances rated 1/4 hp or 500 W or greater, fastened in place, served by the
 *   same feeder or service in a one/two/multifamily dwelling (dwelling-unit
 *   standard-method rule; 2020 wording verified verbatim, 2017 rule identical
 *   minus the rating qualifier; cooking/dryer/space-heat/AC excluded).
 * v1.11: 220.82 service-line (ungrounded) conductor pick — sizes the ungrounded
 *   service conductors from the calculated 220.82 service current (230.42(A)(2),
 *   100% of the calculated load; 230.79(C) 100 A one-family floor; 110.14(C)
 *   temperature column) using the verified Table 310.16 + pickConductor31016.
 *   310.12(A) 83% ungrounded reduction is flagged in the UI, not applied (its
 *   verbatim text is not on disk).
 * v1.10: NEC 220.82 appliance/motor nameplate entry in VA or kW.
 * Zero dependencies. Pure core (Node-testable) + browser UI.
 * Built 2026-08-16 by Radloff Bot (an AI) for electricians & engineers.
 * NOT a substitute for the NEC or a qualified electrical design.
 */
(function (global) {
  'use strict';

  // ================= CORE (pure, no DOM) =================

  // NEC 240.6 standard overcurrent device sizes (A)
  const STD_BREAKERS = [
    15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 140, 150,
    165, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000,
    1200, 1600, 2000, 2500, 3000
  ];

  function nextStdBreaker(requiredA) {
    if (!isFinite(requiredA) || requiredA <= 0) return null;
    for (const b of STD_BREAKERS) if (b >= requiredA - 1e-9) return b;
    return null; // above largest standard size
  }

  // Required breaker rating: continuous loads ×125% (NEC 210.20(A)/215.2(A))
  function reqBreakerA(loadA, continuous) {
    if (!isFinite(loadA) || loadA < 0) return null;
    return continuous ? loadA * 1.25 : loadA;
  }

  const SYSTEMS = {
    '120-240-1ph': {
      label: '120/240V 1∅ 2-wire',
      phases: ['L1', 'L2'],
      options: [
        { id: 'L1', label: 'L1-N (120V)', phases: ['L1'] },
        { id: 'L2', label: 'L2-N (120V)', phases: ['L2'] },
        { id: 'L1L2', label: 'L1-L2 (240V, 2-pole)', phases: ['L1', 'L2'] }
      ]
    },
    '208-120-3ph': {
      label: '208Y/120V 3∅ 4-wire',
      phases: ['L1', 'L2', 'L3'],
      options: [
        { id: 'L1N', label: 'L1-N (120V)', phases: ['L1'] },
        { id: 'L2N', label: 'L2-N (120V)', phases: ['L2'] },
        { id: 'L3N', label: 'L3-N (120V)', phases: ['L3'] },
        { id: 'L1L2', label: 'L1-L2 (208V, 2-pole)', phases: ['L1', 'L2'] },
        { id: 'L2L3', label: 'L2-L3 (208V, 2-pole)', phases: ['L2', 'L3'] },
        { id: 'L1L3', label: 'L1-L3 (208V, 2-pole)', phases: ['L1', 'L3'] },
        { id: '3ph', label: '3-phase (3-pole)', phases: ['L1', 'L2', 'L3'] }
      ]
    },
    '480-277-3ph': {
      label: '480Y/277V 3∅ 4-wire',
      phases: ['L1', 'L2', 'L3'],
      options: [
        { id: 'L1N', label: 'L1-N (277V)', phases: ['L1'] },
        { id: 'L2N', label: 'L2-N (277V)', phases: ['L2'] },
        { id: 'L3N', label: 'L3-N (277V)', phases: ['L3'] },
        { id: 'L1L2', label: 'L1-L2 (480V, 2-pole)', phases: ['L1', 'L2'] },
        { id: 'L2L3', label: 'L2-L3 (480V, 2-pole)', phases: ['L2', 'L3'] },
        { id: 'L1L3', label: 'L1-L3 (480V, 2-pole)', phases: ['L1', 'L3'] },
        { id: '3ph', label: '3-phase (3-pole)', phases: ['L1', 'L2', 'L3'] }
      ]
    }
  };

  function circuitContribution(circuit, systemId) {
    const sys = SYSTEMS[systemId];
    const out = { L1: 0, L2: 0, L3: 0 };
    if (!sys) return out;
    const opt = sys.options.find(o => o.id === circuit.type);
    const load = (isFinite(circuit.loadA) && circuit.loadA >= 0) ? circuit.loadA : 0;
    if (!opt) return out;
    for (const p of opt.phases) out[p] += load;
    return out;
  }

  // Totals + balancing metrics for one panel.
  // imbalancePct  : 3∅ IEEE-style maxDeviation/average×100; 1∅ (max−min)/max×100
  // loadPct       : max phase load / panel rating × 100
  // neutralEst    : field approximation (largest phase deviation from average)
  // neutralLimit  : NEC 408.3(C) — unbalanced (neutral) load ≤ 5% of panel rating
  function panelTotals(circuits, systemId, ratingA) {
    const sys = SYSTEMS[systemId];
    const t = { L1: 0, L2: 0, L3: 0 };
    let totalLoadA = 0;
    for (const c of (circuits || [])) {
      const contrib = circuitContribution(c, systemId);
      t.L1 += contrib.L1; t.L2 += contrib.L2; t.L3 += contrib.L3;
      totalLoadA += contrib.L1 + contrib.L2 + contrib.L3;
    }
    const r = {
      L1: round2(t.L1), L2: round2(t.L2), L3: round2(t.L3),
      totalLoadA: round2(totalLoadA),
      is3ph: systemId && systemId.endsWith('3ph'),
      phases: sys ? sys.phases : [],
      imbalancePct: null, loadPct: null,
      neutralEst: null, neutralLimit: null, neutralOk: null
    };
    const rating = (isFinite(ratingA) && ratingA > 0) ? ratingA : null;

    if (r.is3ph) {
      const avg = (t.L1 + t.L2 + t.L3) / 3;
      if (avg > 0) {
        const dev = Math.max(Math.abs(t.L1 - avg), Math.abs(t.L2 - avg), Math.abs(t.L3 - avg));
        r.imbalancePct = round2((dev / avg) * 100);
        r.neutralEst = round2(dev);
      } else {
        r.imbalancePct = 0; r.neutralEst = 0;
      }
    } else {
      const hi = Math.max(t.L1, t.L2), lo = Math.min(t.L1, t.L2);
      r.imbalancePct = hi > 0 ? round2(((hi - lo) / hi) * 100) : 0;
    }
    if (rating) {
      const maxPhase = r.is3ph ? Math.max(t.L1, t.L2, t.L3) : Math.max(t.L1, t.L2);
      r.loadPct = round2((maxPhase / rating) * 100);
      if (r.is3ph) {
        r.neutralLimit = round2(rating * 0.05);
        r.neutralOk = (r.neutralEst || 0) <= r.neutralLimit + 1e-9;
      }
    }
    return r;
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  // Greedy auto-balance: reassign switchable circuits to minimize max phase deviation.
  // Rules: fixed = 3-phase circuits; a circuit keeps its pole count (a 120V 1-pole
  // circuit is only offered 1-pole options — never a 208V 2-pole feed, etc.).
  function autoBalance(circuits, systemId) {
    const sys = SYSTEMS[systemId];
    if (!sys) return (circuits || []).map(c => Object.assign({}, c));
    const fixed = { L1: 0, L2: 0, L3: 0 };
    const switchable = [];
    circuits.forEach((c, i) => {
      const load = (isFinite(c.loadA) && c.loadA > 0) ? c.loadA : 0;
      const opt = sys.options.find(o => o.id === c.type);
      if (!opt || opt.phases.length === 3) {
        for (const p of (opt ? opt.phases : [])) fixed[p] += load;
      } else {
        switchable.push(Object.assign({}, c, { _i: i, _poles: opt.phases.length }));
      }
    });
    const is3 = systemId.endsWith('3ph');
    switchable.sort((a, b) => (b.loadA || 0) - (a.loadA || 0));
    const cur = Object.assign({}, fixed);
    for (const c of switchable) {
      const candidates = sys.options.filter(o => o.phases.length === c._poles);
      let best = candidates[0], bestDev = Infinity;
      for (const opt of candidates) {
        const trial = Object.assign({}, cur);
        for (const p of opt.phases) trial[p] += c.loadA || 0;
        const avg = (trial.L1 + trial.L2 + trial.L3) / (is3 ? 3 : 2);
        const keys = is3 ? ['L1', 'L2', 'L3'] : ['L1', 'L2'];
        const dev = Math.max(...keys.map(k => Math.abs(trial[k] - avg)));
        if (dev < bestDev) { bestDev = dev; best = opt; }
      }
      for (const p of best.phases) cur[p] += c.loadA || 0;
      c.type = best.id;
    }
    // preserve original order, strip bookkeeping fields
    return circuits.map((c, i) => {
      const s = switchable.find(x => x._i === i);
      if (!s) return Object.assign({}, c);
      const out = Object.assign({}, s);
      delete out._i; delete out._poles;
      return out;
    });
  }

  // ---- Project model (v1.1) ----
  function emptyPanel(name) {
    return { name: name || 'Panel', system: '208-120-3ph', ratingA: 400, notes: '', circuits: [] };
  }

  function defaultProject() {
    return { version: 2, projectName: 'Untitled Project', serviceA: null, notes: '', panels: [emptyPanel('Main Panel')] };
  }

  // Sum phase currents across all panels (service-entrance load estimate).
  function projectTotals(project) {
    const t = { L1: 0, L2: 0, L3: 0 };
    const perPanel = [];
    for (const p of (project && project.panels) || []) {
      const pt = panelTotals(p.circuits, p.system, p.ratingA);
      t.L1 += pt.L1; t.L2 += pt.L2; t.L3 += pt.L3;
      perPanel.push({
        name: p.name, system: p.system,
        L1: pt.L1, L2: pt.L2, L3: pt.L3, total: pt.totalLoadA,
        imbalancePct: pt.imbalancePct, is3ph: pt.is3ph
      });
    }
    const total = t.L1 + t.L2 + t.L3;
    const out = { L1: round2(t.L1), L2: round2(t.L2), L3: round2(t.L3), total: round2(total), perPanel };
    if (isFinite(project && project.serviceA) && project.serviceA > 0) {
      const maxPhase = Math.max(t.L1, t.L2, t.L3);
      out.servicePct = round2((maxPhase / project.serviceA) * 100);
    } else {
      out.servicePct = null;
    }
    return out;
  }

  // ---- NEC 210.11 dwelling unit minimum-circuit check (v1.2) ----
  // (C)(1)–(C)(4) verified against code text (stable 2017–2023):
  //   (C)(1) two 20A small-appliance, (C)(2) one 20A laundry,
  //   (C)(3) one 20A bathroom, (C)(4) one 20A garage.
  // 210.11(C) has NO (C)(5): outdoor receptacles do NOT require a dedicated
  // circuit (the garage circuit may supply them — (C)(4) Exception 1).
  // 210.11(B) is "Proportion of Loads" — NOT a lighting requirement; the
  // two-lighting-circuits row is a design-practice item, not a code cite.
  // Every row is user-editable to match the adopted NEC edition.
  // Auto-detection matches circuit name/notes keywords — a *suggestion*,
  // never a verdict.
  const DW_DEFAULT_ITEMS = [
    { id: 'smallAppliance', label: 'Small-appliance receptacles (kitchen/dining/living…)', cite: '210.11(C)(1)', min: 2, kw: 'small.?appl|kitchen|counter|dining|living|pantry|food', note: 'two 120V, 20A dedicated' },
    { id: 'laundry', label: 'Laundry receptacles', cite: '210.11(C)(2)', min: 1, kw: 'laundry|washing', note: '120V, 20A dedicated' },
    { id: 'bathroom', label: 'Bathroom receptacles', cite: '210.11(C)(3)', min: 1, kw: 'bath|washbasin|powder', note: '120V, 20A dedicated' },
    { id: 'garage', label: 'Garage receptacles (if garage)', cite: '210.11(C)(4)', min: 1, kw: 'garage|driveway|ev.?charg|vehicle', note: '120V, 20A dedicated; may also supply outdoor outlets (Ex. 1); Req. = 0 if no garage' },
    { id: 'outdoor', label: 'Outdoor / exterior receptacles', cite: '— no dedicated-circuit mandate', min: 1, kw: 'outdoor|exterior|porch|patio|deck|yard', note: 'design practice: commonly a dedicated 120V, 20A (GFCI); 210.11 has no outdoor item' },
    { id: 'lighting', label: 'General illumination (lighting)', cite: '— 210.11(B) is load balancing only', min: 2, kw: 'light|luminair|illumina|ceiling|fixture', note: 'design practice: two or more lighting circuits (even distribution, 210.11(B))' }
  ];

  function normalizeDw(dw) {
    const ok = it => ({
      id: it.id || ('c' + Math.random().toString(36).slice(2, 8)),
      label: it.label || 'Requirement',
      cite: it.cite || '',
      min: Math.max(0, Math.min(99, Math.round(+it.min || 0))),
      kw: it.kw != null ? String(it.kw) : '',
      note: it.note || '',
      manual: (it.manual === 'ok' || it.manual === 'missing') ? it.manual : 'auto'
    });
    if (dw && Array.isArray(dw.items) && dw.items.length) return { items: dw.items.map(ok) };
    return { items: DW_DEFAULT_ITEMS.map(i => Object.assign({}, i)) };
  }

  function dwStatus(project) {
    const items = normalizeDw(project && project.dw).items;
    const all = [];
    for (const p of (project && project.panels) || []) all.push.apply(all, p.circuits || []);
    const rows = items.map(it => {
      let rx = null;
      try { if (it.kw) rx = new RegExp(it.kw, 'i'); } catch (e) { rx = null; }
      const auto = rx ? all.filter(c => rx.test(String(c.name || '') + ' ' + String(c.notes || ''))).length : 0;
      const status = it.manual || 'auto';
      const eff = status === 'ok' ? it.min : status === 'missing' ? 0 : auto;
      return Object.assign({}, it, { auto, status, eff, met: eff >= it.min });
    });
    return { items: rows, metCount: rows.filter(r => r.met).length, total: rows.length };
  }

  // ---- NEC 220.82 Optional Method — single dwelling-unit service load (v1.3) ----
  // VERIFIED against NFPA 70 2020 + 2023 text (2017-2023 Part IV stable), cross-checked
  // against two independent worked examples (Mike Holt / EC&M 2020 NEC; Electrician U
  // 2023 NEC) which agree. Citations logged in LOG.md (Session 5) and README.
  //
  // 220.82: permitted when the service/feeder serving a single dwelling unit has an
  // ampacity of 100 A or greater. Total = (B) general + (C) largest heating/cooling.
  //   (B)  General connected load (220.82(B)):
  //        (1) general lighting + general-use receptacles: 3 VA/sq ft (220.82(B)(1))
  //        (2) small-appliance + laundry circuits: 1,500 VA each (220.82(B)(2));
  //            210.11(C)(1)/(C)(2) require 2 small-appliance + 1 laundry per unit
  //        (3) nameplate VA of each appliance/motor on a specific circuit or
  //            fastened in place — ranges/ovens/counter-mounted cooking units,
  //            clothes dryers NOT on the laundry branch, water heaters, etc.
  //        (4) all permanently connected motors not in (3) at 100%
  //        Demand: first 10,000 VA at 100% + 40% of remainder (220.82(B)).
  //   (C)  Add the LARGEST of (220.82(C)(1)-(6)):
  //        (1) AC/cooling 100%  (2) heat pump w/o supp 100%
  //        (3) heat pump w/ supp: 100% compressor + 65% supplemental
  //        (4) space heating, <4 separately controlled units: 65%
  //        (5) space heating, >=4 separately controlled units: 40%
  //        (6) electric thermal storage / continuous: 100%
  //   Amps = total VA / service voltage.  Neutral load is handled by the
  //   220.61 card (separate) — this method does not include it.
  //   This is a dwelling-unit method: NOT for multi-unit (that's 220.84, standard
  //   method). Dryer demand factors in Table 220.54 are a DIFFERENT rule (5+
  //   dryers in a building) — do not conflate; noted in UI to prevent misciting.
  function serviceLoad22082(o) {
    o = o || {};
    // A present 0 is meaningful (e.g. 0 laundry circuits) — only truly-absent
    // values (undefined/null/'') fall back to the default.
    const num = (x, d) => {
      if (x === undefined || x === null || x === '') return (d != null ? d : 0);
      const n = +x;
      return (isFinite(n) && n > 0) ? n : 0;
    };
    const sqft = num(o.sqft, 0);
    const smallApplianceCircuits = Math.max(0, Math.min(20, Math.round(num(o.smallApplianceCircuits, 2))));
    const laundryCircuits = Math.max(0, Math.min(20, Math.round(num(o.laundryCircuits, 1))));
    const lightingVA = sqft * 3;                    // 220.82(B)(1)
    const saVA = smallApplianceCircuits * 1500;     // 220.82(B)(2)
    const laundryVA = laundryCircuits * 1500;       // 220.82(B)(2)
    // v1.10: appliance/motor nameplate inputs may be entered in kW (the typical
    // nameplate unit) — converted at 1 kW = 1000 VA (kVA is considered equivalent
    // to kW; the calc itself stays in VA exactly as the code tables require).
    // Default (unit unspecified) is VA: the legacy appliancesVA/motorsVA keys.
    const nameplateUnit = (o.nameplateUnit === 'kw') ? 'kw' : 'va';
    const appliancesVA = (nameplateUnit === 'kw') ? num(o.appliancesKW) * 1000   // 220.82(B)(3) nameplate, incl. dryers NOT on laundry branch
                                                  : num(o.appliancesVA);
    const motorsVA = (nameplateUnit === 'kw') ? num(o.motorsKW) * 1000           // 220.82(B)(4) permanently connected
                                              : num(o.motorsVA);
    const generalConnected = lightingVA + saVA + laundryVA + appliancesVA + motorsVA;
    // Tiered demand: first 10 kVA at 100% + 40% of the remainder. Below 10 kVA the
    // demand equals the connected load (a demand factor never exceeds connected).
    const generalDemand = Math.min(generalConnected, 10000) + 0.4 * Math.max(0, generalConnected - 10000); // 220.82(B)

    // (C) largest of heating/cooling options. If space heating VA is present but the
    // unit count is unset, default to 1 separately-controlled unit (<4 → 65%): the
    // conservative (larger) load, never a silent undercount.
    const spaceUnits = num(o.spaceUnits);
    const spaceHeatingVA = num(o.spaceHeatingVA);
    const spaceUnitsEff = spaceHeatingVA > 0 && spaceUnits <= 0 ? 1 : spaceUnits;
    const hvacDemand = Math.max(
      0,
      num(o.acVA),                                              // (C)(1) AC/cooling @100%
      num(o.hpNoSuppVA),                                        // (C)(2) HP no supp @100%
      num(o.hpCompressorVA) + 0.65 * num(o.hpSuppVA),           // (C)(3) HP w/ supp: 100% + 65%
      (spaceUnitsEff > 0 && spaceUnitsEff < 4) ? 0.65 * spaceHeatingVA : 0, // (C)(4)
      (spaceUnitsEff >= 4) ? 0.40 * spaceHeatingVA : 0,         // (C)(5)
      num(o.thermalStorageVA)                                   // (C)(6) thermal storage @100%
    );
    const totalVA = generalDemand + hvacDemand;

    const volt = (o.volt === 208 || o.volt === 240 || o.volt === 480 || o.volt === 277) ? o.volt : 240;
    const amps = totalVA / volt;
    return {
      nameplateUnit,
      lightingVA: round2(lightingVA),
      smallApplianceVA: round2(saVA),
      laundryVA: round2(laundryVA),
      appliancesVA: round2(appliancesVA),
      motorsVA: round2(motorsVA),
      generalConnectedVA: round2(generalConnected),
      generalDemandVA: round2(generalDemand),
      hvacDemandVA: round2(hvacDemand),
      totalVA: round2(totalVA),
      volt: volt,
      amps: round2(amps),
      recommendedBreakerA: nextStdBreaker(amps)
    };
  }

  // ---- v1.11: 220.82 service-line (ungrounded) conductor pick ----
  // Sizing rule (VERIFIED verbatim against the NEC 2020 full-code text on disk,
  // slideshare_nec2020.txt — logged in LOG Session 19 + README):
  //   230.42(A)(2): "The minimum service-entrance conductor size shall have an
  //     ampacity not less than the maximum load to be served after the application
  //     of any adjustment or correction factors." For the 220.82 optional method the
  //     maximum load = the calculated service current (totalVA / volt).
  //   230.42(A): "Ampacity shall be determined from 310.14 and shall comply with
  //     110.14(C)." 230.42(A)(1) (non-continuous + 125% continuous) does not
  //     separately identify a continuous portion under the 220.82 optional method,
  //     so we size at 100% of the calculated service load per 230.42(A)(2) —
  //     conservative and code-compliant.
  //   230.42(B): "In addition to ... 230.42(A), the minimum ampacity for
  //     ungrounded conductors ... shall not be less than the rating of the service
  //     disconnecting means specified in 230.79(A) through (D)." 230.79(C): a
  //     one-family dwelling disconnect is rated NOT LESS THAN 100 A. The 220.82
  //     method is a single-dwelling method, so the ungrounded conductors carry a
  //     100 A minimum-ampacity floor (max(calculated amps, 100 A)).
  //   Table 310.16 (verified 0/168 cells, v1.8) supplies the ampacity; the pick is
  //     the smallest size in the chosen material + 110.14(C) temperature column
  //     whose ampacity >= required.
  //   310.12(A) — the ungrounded service-conductor reduction to 83% of the service
  //     DISCONNECT rating for a 1∅ 100–400 A service — is a SEPARATE allowance on
  //     the disconnect rating, NOT on the calculated load, and its verbatim text is
  //     NOT on disk, so it is intentionally NOT applied here (flagged in UI/README);
  //     applying 230.42(A)(2) at 100% of the calculated load is the safe, citable
  //     minimum. 310.15 ambient/derating adjustments remain the user's.
  // Returns { valid, calcA, dwMinA, reqA, pick } (pick = pickConductor31016 result).
  function serviceLineConductor22082(lc, mat, temp) {
    if (!lc || !(+lc.amps > 0)) return { valid: false, reason: 'enter the 220.82 service load' };
    const dwMinA = 100; // 230.79(C) one-family dwelling disconnect floor (230.42(B))
    const reqA = Math.max(+lc.amps, dwMinA);
    const pick = pickConductor31016(reqA, (mat === 'al') ? 'al' : 'cu', (temp === 60 || temp === 90) ? temp : 75);
    return { valid: true, calcA: round2(+lc.amps), dwMinA, reqA: round2(reqA), pick };
  }

  // ---- NEC 220.53 Appliance Load — Dwelling Unit(s) (v1.12) ----
  // VERIFIED verbatim against the NEC 2020 full-code text on disk
  // (slideshare_nec2020.txt): "It shall be permissible to apply a demand factor
  // of 75 percent to the nameplate rating load of four or more appliances rated
  // 1/4 hp or greater, or 500 watts or greater, that are fastened in place, and
  // that are served by the same feeder or service in a one-family, two-family, or
  // multifamily dwelling. This demand factor shall not apply to: (1) Household
  // electric cooking equipment that is fastened in place (2) Clothes dryers
  // (3) Space heating equipment (4) Air-conditioning equipment."
  // The 2014 verbatim Art. 220 PDF carries the same rule in pre-2020 wording
  // (four or more appliances fastened in place, "other than electric ranges,
  // clothes dryers, space-heating equipment, or air-conditioning equipment") —
  // the 2020 revision adds the 1/4 hp / 500 W rating qualifier (excludes small
  // fans etc., which belong in the general load). This card implements the
  // 2017–2023 rule as written in the 2020 text. The 2023 change analysis
  // records no 220.53 change.
  //
  // o: { count, totalVA } — number of eligible fastened-in-place appliances
  //     (≥ ¼ hp or ≥ 500 W each; NOT cooking/dryer/space-heat/AC) and their
  //     combined nameplate load (VA). kVA is equivalent to kW as elsewhere.
  // Demand = 75% of the connected nameplate load when count >= 4; with 1–3
  // appliances the factor is not permitted (count at 100%, flagged).
  function applianceDemand22053(o) {
    o = o || {};
    const c = o.count;
    const count = (c === undefined || c === null || c === '') ? 0 : Math.max(0, Math.floor(+c || 0));
    const raw = o.totalVA;
    const totalVA = (raw === undefined || raw === null || raw === '') ? 0 : Math.max(0, +raw || 0);
    const eligible = count >= 4;
    const factorPct = eligible ? 75 : 100;
    const demandVA = count === 0 ? 0 : round2(totalVA * factorPct / 100);
    return { count, totalVA, eligible, factorPct, demandVA, savingsVA: count === 0 ? 0 : round2(totalVA - demandVA) };
  }

  // ---- NEC 220.54 Electric Clothes Dryers — multi-dwelling demand (v1.4) ----
  // VERIFIED against the verbatim NFPA 70 2014 Article 220 PDF (220.54 text + full
  // Table 220.54) and cross-checked against 5 independent sources (expertce,
  // necmastery, voltprep, roughlogic, upcodes). 220.54 is the STANDARD-method
  // dryer rule for a service/feeder serving multiple dwelling units; it is NOT
  // the single-dwelling 220.82(B)(3) nameplate treatment — do not conflate.
  //
  // 220.54: each household electric dryer served = max(5,000 VA, nameplate).
  // Total connected = per-dryer load × number of dryers. Demand = connected ×
  // the Table 220.54 factor for that count.
  //
  // Table 220.54 Demand Factors for Household Electric Clothes Dryers (2017–2023):
  //   1–4      100%
  //   5        85%        8  60%        12–23  47% − 1% per dryer exceeding 11
  //   6        75%        9  55%        24–42  35% − 0.5% per dryer exceeding 23
  //   7        65%        10 50%        43 and over  25%
  //   (boundaries are monotonic: 11→47, 12→46, 23→35, 24→34.5, 42→25.5, 43→25)
  //
  // NOTE (honest, edition-sensitive): the 2026 NEC reorganizes load calc into a new
  // Article 120 (220.54 → 120.54) and appears to revise these factors (1–2 @100%,
  // 3–5 @80% …). This calculator implements the 2017–2023 table; verify against the
  // edition adopted in the jurisdiction.
  function dryerFactorPct(count) {
    if (!isFinite(count) || count <= 0) return null;
    const n = Math.floor(count);
    if (n <= 4) return 100;
    const table = { 5: 85, 6: 75, 7: 65, 8: 60, 9: 55, 10: 50, 11: 47 };
    if (table[n] != null) return table[n];
    if (n >= 12 && n <= 23) return round2(47 - (n - 11));
    if (n >= 24 && n <= 42) return round2(35 - 0.5 * (n - 23));
    if (n >= 43) return 25;
    return null;
  }

  function dryerFactorLabel(count) {
    if (!isFinite(count) || count <= 0) return 'no dryers';
    const n = Math.floor(count);
    if (n <= 4) return '1–4 dryers: 100%';
    if (n >= 5 && n <= 11) return n + ' dryers: ' + dryerFactorPct(n) + '%';
    if (n >= 12 && n <= 23) return '12–23 dryers: 47% − 1% per dryer over 11 → ' + dryerFactorPct(n) + '%';
    if (n >= 24 && n <= 42) return '24–42 dryers: 35% − 0.5% per dryer over 23 → ' + dryerFactorPct(n) + '%';
    if (n >= 43) return '43 and over: 25%';
    return '';
  }

  function dryerDemand22054(o) {
    o = o || {};
    const MIN = 5000; // NEC 220.54 minimum per dryer
    const c = o.count;
    const count = (c === undefined || c === null || c === '') ? 0 : Math.max(0, Math.floor(+c || 0));
    const npRaw = o.nameplateVA;
    const nameplateVA = (npRaw === undefined || npRaw === null || npRaw === '') ? 0 : Math.max(0, +npRaw || 0);
    // 220.54: each dryer = the larger of 5,000 VA or its nameplate.
    const perDryerVA = Math.max(nameplateVA, MIN);
    const connectedVA = perDryerVA * count;
    const factorPct = dryerFactorPct(count);
    const demandVA = (count > 0 && factorPct != null) ? round2(connectedVA * factorPct / 100) : 0;
    return {
      count, perDryerVA, connectedVA, factorPct,
      factorLabel: dryerFactorLabel(count), demandVA
    };
  }

  // ---- NEC 220.42 General Lighting — demand factors, standard method Part III (v1.5) ----
  // VERIFIED verbatim against the NFPA 70 2014 Article 220 PDF (Table 220.42 read
  // directly with coordinate-level extraction; the dwelling/hotel/hotel-motel/warehouse
  // tiers are unchanged through the 2017–2023 editions — cross-checked against the
  // UpCodes 2017/2020/2023 section pages). 220.42 applies the demand factors to the
  // general-illumination portion of the branch-circuit/feeder/service load; it does
  // NOT apply when determining the NUMBER of lighting branch circuits (220.42 text).
  //
  // Table 220.42 Lighting Load Demand Factors (2017–2023):
  //   Dwelling units:  first 3,000 VA @100% · 3,001–120,000 @35% · remainder >120,000 @25%
  //   Hospitals:       first 50,000 VA @40% · remainder @20%   *(Ex. below)
  //   Hotels & motels (incl. apts w/o tenant cooking): first 20,000 @50% · 20,001–100,000 @40% · remainder @30%  *(Ex. below)
  //   Warehouses (storage): first 12,500 VA @100% · remainder @50%
  //   All others:      total @100%
  //   * Table note: the hotel/motel/hospital factors do NOT apply to areas where the
  //     entire lighting is likely used at one time (operating rooms, ballrooms, dining rooms).
  //
  // Scope note (honest): this is the STANDARD-method feeder/service rule. The 220.82
  // optional single-dwelling method instead takes 3 VA/sq ft at 100% (220.82(B)(1)) —
  // 220.42 demand does NOT apply under the optional method. For non-dwelling work the
  // lighting load typically comes from the actual fixture schedule (or a design VA/sq ft)
  // — enter the total lighting VA below.
  const LIT_TABLES = {
    dwelling:   { label: 'Dwelling units (standard method)', tiers: [ [3000, 100], [120000, 35], [Infinity, 25] ] },
    hospital:   { label: 'Hospitals*', tiers: [ [50000, 40], [Infinity, 20] ] },
    hotel:      { label: 'Hotels & motels (incl. apts w/o tenant cooking)*', tiers: [ [20000, 50], [100000, 40], [Infinity, 30] ] },
    warehouse:  { label: 'Warehouses (storage)', tiers: [ [12500, 100], [Infinity, 50] ] },
    others:     { label: 'All others', tiers: [ [Infinity, 100] ] }
  };

  // Tiered demand: walk the table tiers; each tier's pct applies to the slice of the
  // connected load that falls inside that tier (cumulative upper bounds).
  function lightingDemand22042(o) {
    o = o || {};
    const key = (o.occupancy && LIT_TABLES[o.occupancy]) ? o.occupancy : 'others';
    const table = LIT_TABLES[key];
    const raw = o.totalVA;
    const totalVA = (raw === undefined || raw === null || raw === '') ? 0 : Math.max(0, +raw || 0);
    let lo = 0;
    const tiers = table.tiers.map(t => {
      const hi = t[0];
      const span = Math.max(0, Math.min(totalVA, hi) - lo);
      const va = round2(span * t[1] / 100);
      lo = hi;
      return { upTo: hi, pct: t[1], sliceVA: round2(span), demandVA: va };
    });
    const demandVA = round2(tiers.reduce((a, t) => a + t.demandVA, 0));
    return {
      occupancy: key,
      occupancyLabel: table.label,
      totalVA: round2(totalVA),
      demandVA,
      tiers,
      // convenience: sq ft at 3 VA/sq ft (design-basis helper only — NOT a code value)
      impliedSqft: totalVA > 0 ? round2(totalVA / 3) : 0
    };
  }

  // ---- NEC 220.55 Electric Cooking Appliances — demand (v1.6) ----
  // VERIFIED verbatim against the NFPA 70 2014 Article 220 PDF (Table 220.55 read
  // at coordinate level with pymupdf: cell geometry + row-line drawing) AND an
  // independent verbatim NEC 2020 text source; a programmatic row-by-row diff of
  // the two verbatim sources shows ALL 30 rows identical (labels + Column A +
  // Column B + Column C incl. both merged formula cells). The 2020 NEC change
  // analysis (Abernathy/Encore Wire) records no 220.55 change.
  //
  // NOTE (important, resolves the Session-9 hold): several free web sources claim
  // the high band is "31+ ranges: 25 kW + 0.75 kW/range". That is WRONG per both
  // verbatim editions: the 25 kW + ¾ kW formula cell SPANS 41–60 (and 61+) —
  // merged-cell line geometry proves the 15 kW + 1 kW cell spans 26–40. Free
  // sources were not trusted over verbatim text (the Session-4/5/8/9 discipline).
  //
  // 220.55: load for household electric ranges, wall-mounted ovens,
  // counter-mounted cooking units, and other household cooking appliances
  // individually rated in excess of 1¾ kW. kVA considered equivalent to kW.
  // Where two or more single-phase ranges are supplied by a 3-phase, 4-wire
  // feeder or service: total load = twice the maximum number connected between
  // any two phases.
  //
  // Column C (base, "in all cases except as otherwise permitted in Note 3"):
  //   1:8  2:11  3:14  4:17  5:20  6:21  7:22  8:23  9:24  10:25  11:26  12:27
  //   13:28  14:29  15:30  16:31  17:32  18:33  19:34  20:35  21:36  22:37
  //   23:38  24:39  25:40
  //   26–40: 15 kW + 1 kW for each range        (merged cell, 26–40)
  //   41–60 and 61+: 25 kW + ¾ kW for each range (merged cell, 41–60; 61 and over)
  //   Band continuity (no jump at the seams): 25→40, 26→41, 40→55, 41→55.75,
  //   60→70, 61→70.75.
  // Column A / Column B demand factors (Note 3, in lieu of Column C), by count:
  //   1:80/80  2:75/65  3:70/55  4:66/50  5:62/45  6:59/43  7:56/40  8:53/36
  //   9:51/35  10:49/34  11:47/32  12:45/32  13:43/32  14:41/32  15:40/32
  //   16:39/28  17:38/28  18:37/28  19:36/28  20:35/28  21:34/26  22:33/26
  //   23:32/26  24:31/26  25:30/26  26–30:30/24  31–40:30/22  41–50:30/20
  //   51–60:30/18  61+:30/16
  // Note 1: over 12 kW through 27 kW, all same rating → Column C increased 5%
  //   per additional kW (or major fraction) by which the rating exceeds 12 kW.
  // Note 2: over 8¾ kW through 27 kW, unequal ratings → average = (sum of
  //   ratings, using 12 kW for any range under 12 kW) / count; Column C
  //   increased 5% per kW (or major fraction) by which the average exceeds 12.
  // Note 3: over 1¾ kW through 8¾ kW → in lieu of Column C, sum nameplates per
  //   column and multiply by the Column A or Column B factor for that count;
  //   apply per column when ratings fall in both columns, then add.
  // Note 4: branch-circuit load for one range may use Table 220.55 (out of
  //   scope for this feeder/service calculator).
  const COOK_C_KW = [8, 11, 14, 17, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]; // 1..25 ranges
  const COOK_AB = [
    [80, 80], [75, 65], [70, 55], [66, 50], [62, 45], [59, 43], [56, 40], [53, 36],
    [51, 35], [49, 34], [47, 32], [45, 32], [43, 32], [41, 32], [40, 32],
    [39, 28], [38, 28], [37, 28], [36, 28], [35, 28], [34, 26], [33, 26], [32, 26],
    [31, 26], [30, 26], [30, 24], [30, 24], [30, 24], [30, 24], [30, 24], // 26–30 (A=30, B=24 for all of 26–30)
    [30, 22], [30, 22], [30, 22], [30, 22], [30, 22], [30, 22], [30, 22], [30, 22], [30, 22], [30, 22], // 31–40
    [30, 20], [30, 20], [30, 20], [30, 20], [30, 20], [30, 20], [30, 20], [30, 20], [30, 20], [30, 20], // 41–50
    [30, 18], [30, 18], [30, 18], [30, 18], [30, 18], [30, 18], [30, 18], [30, 18], [30, 18], [30, 18], // 51–60
    [30, 16] // 61+ (band factor; for 62+ the table's 61-and-over row applies)
  ]; // index n-1, n = 1..61

  function _cookCount(v) {
    const n = Math.floor(+v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  // Column C base maximum demand (kW) for n ranges (1–25 table; 26–40: 15+1n;
  // 41+: 25+0.75n). Returns null for n <= 0.
  function cookingColumnCKW(n) {
    n = _cookCount(n);
    if (!n) return null;
    if (n <= 25) return COOK_C_KW[n - 1];
    if (n <= 40) return 15 + n;
    return round2(25 + 0.75 * n);
  }

  // Note 1 increase: all same rating, over 12 through 27 kW → 5% per kW or
  // major fraction over 12. Returns extra kW added to the Column C base.
  function cookingNote1Kw(baseKW, ratingKW) {
    if (!(ratingKW > 12) || ratingKW > 27 || !(baseKW > 0)) return 0;
    const over = Math.ceil(ratingKW - 12); // each kW or major fraction thereof
    return round2(baseKW * 0.05 * over);
  }

  // Note 2: unequal ratings all over 8¾ kW, none over 27 kW.
  // ratingsKW = array of nameplate kW. average = (sum, using 12 kW for any
  // range under 12 kW) / count. Increase = 5% per kW or major fraction by
  // which the average exceeds 12 kW. Returns { valid, avgKW, baseKW, increaseKW, demandKW }.
  function cookingNote2(ratingsKW) {
    const arr = Array.isArray(ratingsKW) ? ratingsKW.map(x => +x).filter(x => isFinite(x) && x > 0) : [];
    const n = arr.length;
    if (!n) return { valid: false, reason: 'no ratings', avgKW: null, baseKW: null, increaseKW: null, demandKW: null };
    if (arr.some(x => x <= 8.75)) return { valid: false, reason: 'Note 2 applies only to ranges individually rated OVER 8¾ kW', avgKW: null, baseKW: null, increaseKW: null, demandKW: null };
    if (arr.some(x => x > 27)) return { valid: false, reason: 'Note 2 does not apply where any range exceeds 27 kW', avgKW: null, baseKW: null, increaseKW: null, demandKW: null };
    if (arr.every(x => x === arr[0])) return { valid: false, reason: 'all ratings equal — use Note 1 (Column C with over-12 kW increase) instead', avgKW: null, baseKW: null, increaseKW: null, demandKW: null };
    const sum = arr.reduce((a, x) => a + (x < 12 ? 12 : x), 0);
    const avgExact = sum / n; // exact average (no premature rounding)
    const avgKW = round2(avgExact);
    const baseKW = cookingColumnCKW(n);
    const over = avgExact > 12 + 1e-9 ? Math.ceil(avgExact - 12 - 1e-9) : 0; // each kW or major fraction thereof
    const increaseKW = round2(baseKW * 0.05 * over);
    return { valid: true, avgKW, baseKW, increaseKW, demandKW: round2(baseKW + increaseKW) };
  }

  // Note 3 (in lieu of Column C): Column A or Column B demand factor (%) for a
  // count of 1..61+ appliances. Returns null for n <= 0.
  function cookingABFactorPct(n, col) {
    n = _cookCount(n);
    if (!n) return null;
    const idx = Math.min(n, 61) - 1;
    const row = COOK_AB[idx];
    return col === 'B' ? row[1] : row[0];
  }

  // Note 3 demand (kW): sum of nameplates per column × that column's factor.
  // o: { countA, totalKWa, countB, totalKWb } — counts/totals for the
  // <3.5 kW column (A) and the 3.5–8.75 kW column (B).
  function cookingNote3KW(o) {
    o = o || {};
    const nA = _cookCount(o.countA), nB = _cookCount(o.countB);
    if (!nA && !nB) return { demandKW: null, parts: [] };
    const kwA = Math.max(0, +o.totalKWa || 0);
    const kwB = Math.max(0, +o.totalKWb || 0);
    let d = 0;
    const parts = [];
    if (nA) {
      const f = cookingABFactorPct(nA, 'A');
      d += kwA * f / 100;
      parts.push(`${nA} @ <3.5 kW: ${kwA} kW × ${f}%`);
    }
    if (nB) {
      const f = cookingABFactorPct(nB, 'B');
      d += kwB * f / 100;
      parts.push(`${nB} @ 3.5–8.75 kW: ${kwB} kW × ${f}%`);
    }
    return { demandKW: round2(d), parts };
  }

  // Primary mode: Column C with Note 1 (equal ratings, 1¾ < rating ≤ 27 kW).
  // o: { count, ratingKW (default 12), threePhasePerPhaseMax }
  // 3-phase 4-wire feeder: the table count = 2 × max connected between any two phases.
  function cookingDemand22055(o) {
    o = o || {};
    const count = _cookCount(o.count);
    const ratingKW = (o.ratingKW === undefined || o.ratingKW === null || o.ratingKW === '') ? 12 : Math.max(0, +o.ratingKW || 0);
    const tp = _cookCount(o.threePhasePerPhaseMax);
    const effectiveCount = tp ? 2 * tp : count;
    if (!effectiveCount) return { valid: false, reason: 'enter the number of ranges (or the 3-phase per-phase max)', count: 0, effectiveCount: 0, ratingKW, baseKW: null, increaseKW: null, demandKW: null, demandVA: null };
    if (ratingKW < 1.75 || ratingKW > 27) return { valid: false, reason: ratingKW < 1.75 ? '220.55 applies to cooking appliances rated in excess of 1¾ kW' : 'over 27 kW is outside Note 1/2 — sum per-range loads manually', count, effectiveCount, ratingKW, baseKW: null, increaseKW: null, demandKW: null, demandVA: null };
    const baseKW = cookingColumnCKW(effectiveCount);
    const increaseKW = cookingNote1Kw(baseKW, ratingKW);
    const demandKW = round2(baseKW + increaseKW);
    return { valid: true, count, effectiveCount, ratingKW, baseKW, increaseKW, demandKW, demandVA: round2(demandKW * 1000) };
  }

  // ---- NEC 220.61 feeder/service neutral load (v1.7) ----
  // Text verified verbatim: NFPA 70 2014 Art. 220 PDF == NEC 2020 full-code text
  // 2014 == 2020 (substantively identical — programmatic normalized diff of the A/B/C
  // section bodies shows the only differences are OCR misreads in the 2020 source);
  // the 2023 change analysis records no 220.61 change.
  //
  // (A) basic calc: neutral load = max unbalance = max net load between the neutral
  //     and any one ungrounded conductor.
  // (B)(1) permitted: 70% factor on the household cooking/dryer portion (loads
  //     determined per Table 220.55 / 220.54).
  // (B)(2) permitted: 70% factor on the portion of the unbalanced load over 200 A
  //     (3-wire dc / 1∅ ac; 4-wire 3∅; 3-wire 2∅; 5-wire 2∅).
  // (C) prohibited: 3-wire portions of 4-wire 3∅ wye circuits; nonlinear loads on
  //     4-wire wye (harmonic risk) — no reduction applied here.
  // 310.12(B): for a feeder or service supplying ONE dwelling unit, the minimum
  //     ampacity of the grounded (neutral) conductor may be 83% of the calculated
  //     neutral load. (Verified via a real 2023 worked calc: 279 A -> 83% = 232 A ->
  //     250 Cu / 350 AL @ 75°C; the 2026 NEC renumbers Art. 220 -> Art. 120.)
  // v1.8: the AWG/kcmil selection is now provided inline via pickConductor31016()
  // using the verified Table 310.16 (see T31016 above).

  // o: { totalVA, cookingDryerVA, volt, applyB1, applyB2, dwelling }
  // Returns the step-by-step 220.61 result (all amperes rounded to 2 dp).
  function neutralLoad22061(o) {
    o = o || {};
    const volt = +o.volt;
    if (!volt || !(volt > 0)) return { valid: false, reason: 'enter the phase-to-neutral voltage' };
    const totalVA = o.totalVA == null || o.totalVA === '' ? 0 : (+o.totalVA || 0);
    let cookVA = o.cookingDryerVA == null || o.cookingDryerVA === '' ? 0 : (+o.cookingDryerVA || 0);
    if (cookVA < 0) cookVA = 0;
    if (!(totalVA > 0)) return { valid: false, reason: 'enter the total neutral (unbalanced) load' };
    if (cookVA > totalVA + 1e-9) return { valid: false, reason: 'cooking/dryer portion cannot exceed the total neutral load' };
    if (cookVA > totalVA) cookVA = totalVA; // rounding clamp

    const b1 = !!o.applyB1, b2 = !!o.applyB2, dw = !!o.dwelling;
    // (B)(1): 70% on the cooking/dryer portion (only when it was demand-calculated
    // per Table 220.55/220.54 — the checkbox asserts that).
    const cookDemandVA = b1 ? cookVA * 0.70 : cookVA;
    const basicVA = (totalVA - cookVA) + cookDemandVA;
    const basicA = round2(basicVA / volt);
    // (B)(2): 70% on the portion over 200 A.
    const finalA = b2 && basicA > 200 ? round2(200 + (basicA - 200) * 0.70) : basicA;
    // 310.12(B): one-dwelling service/feeder -> min neutral ampacity = 83%.
    const minAmpA = dw ? round2(finalA * 0.83) : finalA;
    return {
      valid: true, totalVA, cookVA, volt,
      b1, b2, dwelling: dw,
      cookDemandVA: round2(cookDemandVA),
      basicVA: round2(basicVA), basicA,
      b2Applied: b2 && basicA > 200,
      finalA, minAmpA
    };
  }

  // ---- NEC Table 310.16 allowable ampacities (v1.8) ----
  // Table verified at COORDINATE level (pymupdf cell geometry) from a verbatim
  // 2023-NEC print (codeelec_2023.pdf, "Calculations for the Electrical Exam",
  // first printing Jan 2023, "Based on the 2023 NEC"), then cross-checked
  // programmatically against 4 independent live references (wiresizes.com
  // 2023-edition table, voltdropcalc.com, ecalpro.com, zing2.app 2020 table —
  // all agree; see income-lab LOG 2026-08-18 Session 12). The 2023 change
  // analysis (nec2023_pdh.txt) records no 310.16 change; 2014==2020==2023 for
  // these values (the 2026 NEC keeps the ampacity values per zing2's
  // 2023-vs-2026 note). 30°C ambient, ≤3 current-carrying conductors.
  //
  // Each row: size + [cu60, cu75, cu90, al60, al75, al90] (null = not listed;
  // 14 AWG has no aluminum columns; 16/18 AWG are all-dash rows in the table
  // so they are omitted — nothing to pick from).
  const T31016 = [
    { s: '14',  cu: [15,  20,  25,  null, null, null], small: true },
    { s: '12',  cu: [20,  25,  30,  15,  20,  25],     small: true },
    { s: '10',  cu: [30,  35,  40,  25,  30,  35],     small: true },
    { s: '8',   cu: [40,  50,  55,  35,  40,  45] },
    { s: '6',   cu: [55,  65,  75,  40,  50,  55] },
    { s: '4',   cu: [70,  85,  95,  55,  65,  75] },
    { s: '3',   cu: [85,  100, 115, 65,  75,  85] },
    { s: '2',   cu: [95,  115, 130, 75,  90,  100] },
    { s: '1',   cu: [110, 130, 145, 85,  100, 115] },
    { s: '1/0', cu: [125, 150, 170, 100, 120, 135] },
    { s: '2/0', cu: [145, 175, 195, 115, 135, 150] },
    { s: '3/0', cu: [165, 200, 225, 130, 155, 175] },
    { s: '4/0', cu: [195, 230, 260, 150, 180, 205] },
    { s: '250', cu: [215, 255, 290, 170, 205, 230] },
    { s: '300', cu: [240, 285, 320, 195, 230, 260] },
    { s: '350', cu: [260, 310, 350, 210, 250, 280] },
    { s: '400', cu: [280, 335, 380, 225, 270, 305] },
    { s: '500', cu: [320, 380, 430, 260, 310, 350] },
    { s: '600', cu: [350, 420, 475, 285, 340, 385] },
    { s: '700', cu: [385, 460, 520, 315, 375, 425] },
    { s: '750', cu: [400, 475, 535, 320, 385, 435] },
    { s: '800', cu: [410, 490, 555, 330, 395, 445] },
    { s: '900', cu: [435, 520, 585, 355, 425, 480] },
    { s: '1000', cu: [455, 545, 615, 375, 445, 500] },
    { s: '1250', cu: [495, 590, 665, 405, 485, 545] },
    { s: '1500', cu: [525, 625, 705, 435, 520, 585] },
    { s: '1750', cu: [545, 650, 735, 455, 545, 615] },
    { s: '2000', cu: [555, 665, 750, 470, 560, 630] }
  ];
  const T31016_COLS = { 60: [0, 3], 75: [1, 4], 90: [2, 5] }; // [cuIdx, alIdx]

  // conductorLabel: "2/0 AWG" or "250 kcmil"
  const AWG_SIZES = ['14', '12', '10', '8', '6', '4', '3', '2', '1'];
  function conductorLabel(s) {
    if (AWG_SIZES.indexOf(s) >= 0 || /^\d+\/0$/.test(s)) return s + ' AWG';
    return s + ' kcmil';
  }

  // Pick the smallest Table 310.16 conductor whose ampacity in the given
  // termination-temperature column >= requiredA, for the given material.
  // mat: 'cu' | 'al'; temp: 60 | 75 | 90.
  // Returns { size, amp, label, over, notes } or { size: null, over: '...' }.
  function pickConductor31016(requiredA, mat, temp) {
    requiredA = +requiredA;
    if (!(requiredA > 0)) return { size: null, over: 'enter a required ampacity' };
    mat = mat === 'al' ? 'al' : 'cu';
    if (temp !== 60 && temp !== 75 && temp !== 90) return { size: null, over: 'pick a temperature column (60/75/90)' };
    const [cuIdx, alIdx] = T31016_COLS[temp];
    const idx = mat === 'cu' ? cuIdx : alIdx;
    for (const row of T31016) {
      const amp = row.cu[idx];
      if (amp == null) continue; // not listed for this material/temp (e.g. 14 AWG al)
      if (amp >= requiredA) {
        const notes = [];
        // 240.4(D) small-conductor overcurrent caps — informational only:
        // this tool sizes by AMPACITY, but the OCPD is capped for 14/12/10.
        if (row.small) {
          const cap = mat === 'cu' ? ({ '14': 15, '12': 20, '10': 30 })[row.s]
                                   : ({ '12': 15, '10': 25 })[row.s];
          if (cap) notes.push(`240.4(D): overcurrent device for this size is capped at ${cap} A`);
        }
        if (temp === 60) notes.push('60 °C column (≤100 A circuits per 110.14(C)(1)(a) unless marked otherwise)');
        else if (temp === 75) notes.push('75 °C column (>100 A circuits per 110.14(C)(1)(b), or 75 °C-rated terminations)');
        else notes.push('90 °C column — use only as a DERATING base (310.15); final ampacity must still respect the termination rating');
        return { size: row.s, amp, label: conductorLabel(row.s) + ' ' + (mat === 'cu' ? 'Cu' : 'Al'), over: null, notes };
      }
    }
    const last = T31016[T31016.length - 1].cu[idx];
    return { size: null, amp: last, label: null, over: `exceeds Table 310.16 (${last} A max for ${mat === 'cu' ? 'copper' : 'aluminum'} at ${temp} °C) — parallel conductors (310.4) or larger system` };
  }

  // ---- Voltage drop — NEC Chapter 9, Table 8 (v1.13) ----
  // VERIFIED (Session 25, 2026-08-28): CH9_T8 DC resistance (ohms per 1,000 ft
  // at 75 °C) cross-checked against THREE independent live sources:
  //   1. zing2.app/tables/nec-ch9-table-8-properties (NEC 2023, "2020/2023/2026
  //      compliant") — 0 mismatches, all 28 sizes (fetched 2026-08-28);
  //   2. nordixhq.com/reference/wire-resistance-chart (NEC Ch 9 Table 8) —
  //      identical for every size 8 AWG through 4/0 in both materials;
  //   3. voltagelab.com NEC Ch 9 Table 8 explainer — 0.308 (4 AWG), 0.491 (6),
  //      0.194 (2), 0.122 (1/0), 0.0967 (2/0), 0.0766 (3/0), 0.0608 (4/0) ✓.
  // On-disk anchor: codeelec_2023.pdf ("Calculations for the Electrical Exam",
  // based on the 2023 NEC) cites "#4 uncoated copper … 0.308 ohms per
  // thousand feet (Table 8, Chapter 9)". K-factor consistency: R × CM / 1,000
  // ≈ 12.9 (Cu) / 21.2 (Al) for 8 AWG through 4/0 — the standard K constants.
  // Scope: DC resistance at 75 °C; the K-factor shortcut (12.9/21.2) is an
  // approximation that drifts for large kcmil sizes — this tool uses the table
  // values directly (exact), and reports the K-equivalent for reference.
  // The 3% / 5% limits are INFORMATIONAL NOTE recommendations (210.19(A) Info
  // Note No. 3 branch circuits; 215.2(A)(1) Info Note No. 2 feeders — verbatim
  // in slideshare_nec2020.txt on disk), not mandatory requirements.
  const CH9_T8 = [
    { s: '14',   cm: 4110,     cu: 3.07,    al: 5.04 },
    { s: '12',   cm: 6530,     cu: 1.93,    al: 3.17 },
    { s: '10',   cm: 10380,    cu: 1.21,    al: 1.99 },
    { s: '8',    cm: 16510,    cu: 0.778,   al: 1.28 },
    { s: '6',    cm: 26240,    cu: 0.491,   al: 0.808 },
    { s: '4',    cm: 41740,    cu: 0.308,   al: 0.508 },
    { s: '3',    cm: 52620,    cu: 0.245,   al: 0.403 },
    { s: '2',    cm: 66360,    cu: 0.194,   al: 0.319 },
    { s: '1',    cm: 83690,    cu: 0.154,   al: 0.253 },
    { s: '1/0',  cm: 105600,   cu: 0.122,   al: 0.201 },
    { s: '2/0',  cm: 133100,   cu: 0.0967,  al: 0.159 },
    { s: '3/0',  cm: 167800,   cu: 0.0766,  al: 0.126 },
    { s: '4/0',  cm: 211600,   cu: 0.0608,  al: 0.100 },
    { s: '250',  cm: 250000,   cu: 0.0515,  al: 0.0847 },
    { s: '300',  cm: 300000,   cu: 0.0435,  al: 0.0715 },
    { s: '350',  cm: 350000,   cu: 0.0378,  al: 0.0620 },
    { s: '400',  cm: 400000,   cu: 0.0336,  al: 0.0551 },
    { s: '500',  cm: 500000,   cu: 0.0276,  al: 0.0453 },
    { s: '600',  cm: 600000,   cu: 0.0223,  al: 0.0366 },
    { s: '700',  cm: 700000,   cu: 0.0189,  al: 0.0310 },
    { s: '750',  cm: 750000,   cu: 0.0176,  al: 0.0289 },
    { s: '800',  cm: 800000,   cu: 0.0166,  al: 0.0272 },
    { s: '900',  cm: 900000,   cu: 0.0147,  al: 0.0241 },
    { s: '1000', cm: 1000000,  cu: 0.0132,  al: 0.0216 },
    { s: '1250', cm: 1250000,  cu: 0.0106,  al: 0.0174 },
    { s: '1500', cm: 1500000,  cu: 0.00883, al: 0.0145 },
    { s: '1750', cm: 1750000,  cu: 0.00756, al: 0.0124 },
    { s: '2000', cm: 2000000,  cu: 0.00662, al: 0.0108 }
  ];

  function ch9Row(size) {
    return CH9_T8.find(r => r.s === String(size == null ? '' : size)) || null;
  }

  // Voltage drop for one circuit run:
  //   Vd = C × I × R(one-way)   where C = 2 (1∅ 2/3-wire, L-N or L-L split)
  //   or C = √3 (3∅ 4-wire, L-L). R = Table 8 ohms/kft × one-way ft / 1000.
  // Equivalent to the K-formula E = C·K·I·D / CM with K = R·CM/1000 (reported
  // as kEff for reference; the standard 12.9/21.2 are approximations of that).
  // o: { amps, lengthFt, volt, size, mat: 'cu'|'al', config: '1ph'|'3ph' }
  // Returns { valid:false, reason } or { valid:true, … vdV, pctV, status,
  // rPerKft, rOneWay, kEff, size, label, mat, threePhase, amps, lengthFt, volt }.
  function voltageDrop(o) {
    o = o || {};
    const amps = +o.amps;
    const len = +o.lengthFt;
    const volt = +o.volt;
    const mat = o.mat === 'al' ? 'al' : 'cu';
    const threePhase = o.config === '3ph';
    const row = ch9Row(o.size);
    if (!(isFinite(amps) && amps > 0)) return { valid: false, reason: 'enter the load current (A)' };
    if (!(isFinite(len) && len > 0)) return { valid: false, reason: 'enter the one-way length (ft)' };
    if (!(isFinite(volt) && volt > 0)) return { valid: false, reason: 'enter the voltage (V)' };
    if (!row) return { valid: false, reason: 'pick a conductor size' };
    const rPerKft = row[mat];
    const rOneWay = rPerKft * len / 1000;
    const c = threePhase ? Math.sqrt(3) : 2;
    const vdV = c * amps * rOneWay;
    const pctV = vdV / volt * 100;
    let status = 'ok';
    if (pctV > 5) status = 'bad';
    else if (pctV > 3) status = 'warn';
    return {
      valid: true,
      amps: round2(amps), lengthFt: len, volt,
      size: row.s,
      label: conductorLabel(row.s) + (mat === 'cu' ? ' Cu' : ' Al'),
      mat, threePhase,
      rPerKft, rOneWay: +rOneWay.toFixed(4),
      kEff: round2(rPerKft * row.cm / 1000),
      vdV: round2(vdV), pctV: round2(pctV), status
    };
  }

  // Smallest CH9_T8 size whose drop is within targetPct (default 3).
  // o: { amps, lengthFt, volt, mat, config, targetPct }
  // Returns { valid:true, targetPct, pick, over } or { valid:false, reason }.
  function sizeForVoltageDrop(o) {
    o = o || {};
    const targetPct = (o.targetPct != null && isFinite(+o.targetPct) && +o.targetPct > 0) ? +o.targetPct : 3;
    const probe = voltageDrop({ amps: o.amps, lengthFt: o.lengthFt, volt: o.volt, mat: o.mat, config: o.config, size: CH9_T8[0].s });
    if (!probe.valid) return { valid: false, reason: probe.reason, targetPct };
    for (const row of CH9_T8) {
      const r = voltageDrop({ amps: o.amps, lengthFt: o.lengthFt, volt: o.volt, mat: o.mat, config: o.config, size: row.s });
      if (r.pctV <= targetPct) return { valid: true, targetPct, pick: r, over: null };
    }
    const last = voltageDrop({ amps: o.amps, lengthFt: o.lengthFt, volt: o.volt, mat: o.mat, config: o.config, size: CH9_T8[CH9_T8.length - 1].s });
    return { valid: true, targetPct, pick: null, over: 'exceeds 2000 kcmil at ' + last.pctV + '% — parallel sets (310.4) or a different design' };
  }

  // ---- CSV export ----
  function csvEscape(v) {
    v = String(v == null ? '' : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function panelCSVRows(panel) {
    const t = panelTotals(panel.circuits, panel.system, panel.ratingA);
    const L = [];
    L.push(['Position', 'Circuit', 'Type', 'Load (A)', 'Continuous', 'Required Breaker (A)', 'Actual Breaker (A)', 'Notes']);
    for (const c of panel.circuits) {
      const req = reqBreakerA(c.loadA, c.continuous);
      L.push([
        c.pos || '', c.name || '', c.type,
        c.loadA != null ? c.loadA : '', c.continuous ? 'Y' : 'N',
        req != null ? (nextStdBreaker(req) || '') : '',
        c.breaker || '', c.notes || ''
      ]);
    }
    L.push([]);
    L.push(['Total L1 (A)', t.L1]);
    L.push(['Total L2 (A)', t.L2]);
    if (t.is3ph) L.push(['Total L3 (A)', t.L3]);
    L.push(['Imbalance %', t.imbalancePct]);
    if (t.loadPct != null) L.push(['Load % of Rating', t.loadPct]);
    if (t.neutralEst != null && t.is3ph) L.push(['Est. Neutral (A)', t.neutralEst]);
    if (t.neutralLimit != null && t.is3ph) L.push(['Neutral Limit 5% (A, NEC 408.3C)', t.neutralLimit]);
    return L;
  }

  // Single-panel CSV (v1-compatible layout; optional projectName adds one row)
  function toCSV(panel, projectName) {
    const L = [
      ['PanelWright Panel Schedule', ''],
      ['Panel', panel.name || 'Untitled'],
    ];
    if (projectName) L.push(['Project', projectName]);
    L.push(['System', (SYSTEMS[panel.system] || {}).label || panel.system]);
    L.push(['Panel Rating (A)', panel.ratingA || '']);
    L.push(['Generated', new Date().toISOString()]);
    L.push(['Disclaimer', 'Design aid only — verify against the NEC and local code.']);
    L.push([]);
    return L.concat(panelCSVRows(panel)).map(row => row.map(csvEscape).join(',')).join('\n');
  }

  // Full multi-panel report: service rollup + every panel's detail
  function projectToCSV(project) {
    const t = projectTotals(project);
    const L = [
      ['PanelWright — Multi-Panel Load Rollup', ''],
      ['Project', project.projectName || 'Untitled'],
      ['Service Rating (A)', project.serviceA || ''],
      ['Generated', new Date().toISOString()],
      ['Disclaimer', 'Design aid only — verify against the NEC and local code.'],
      []
    ];
    L.push(['Panel', 'System', 'L1 (A)', 'L2 (A)', 'L3 (A)', 'Total (A)', 'Imbalance %']);
    for (const p of t.perPanel) {
      const sys = SYSTEMS[p.system] ? SYSTEMS[p.system].label : p.system;
      L.push([p.name, sys, p.L1, p.L2, p.is3ph ? p.L3 : '', p.total, p.imbalancePct]);
    }
    L.push([]);
    L.push(['SERVICE ENTRANCE', '']);
    L.push(['L1 (A)', t.L1]);
    L.push(['L2 (A)', t.L2]);
    L.push(['L3 (A)', t.L3]);
    L.push(['Total (A)', t.total]);
    if (t.servicePct != null) L.push(['Max Phase % of Service', t.servicePct]);
    L.push([]);
    const lc = (project && project.lc) ? serviceLoad22082(project.lc) : null;
    if (lc) {
      L.push(['DWELLING SERVICE LOAD — NEC 220.82 OPTIONAL METHOD (single unit; 2017-2023 code verified)', '']);
      L.push(['General lighting + receptacles, 3 VA/sq ft (220.82B1)', lc.lightingVA + ' VA']);
      L.push(['Small-appliance circuits ×1500 VA (220.82B2)', lc.smallApplianceVA + ' VA']);
      L.push(['Laundry circuits ×1500 VA (220.82B2)', lc.laundryVA + ' VA']);
      const npSrc = (project && project.lc) || {};
      const kwNote = (k, v) => (npSrc.nameplateUnit === 'kw' && v != null) ? ` (entered as ${v} kW)` : '';
      L.push(['Appliances nameplate (220.82B3)', lc.appliancesVA + ' VA' + kwNote('appliancesKW', npSrc.appliancesKW)]);
      L.push(['Permanently connected motors (220.82B4)', lc.motorsVA + ' VA' + kwNote('motorsKW', npSrc.motorsKW)]);
      L.push(['General connected load', lc.generalConnectedVA + ' VA']);
      L.push(['General demand (first 10k @100% + 40% of remainder)', lc.generalDemandVA + ' VA']);
      L.push(['Largest heating/cooling (220.82C)', lc.hvacDemandVA + ' VA']);
      L.push(['Total demand load', lc.totalVA + ' VA']);
      L.push(['Service voltage', lc.volt + ' V']);
      L.push(['Service current (VA/V)', lc.amps + ' A']);
      L.push(['Recommended standard breaker (NEC 240.6)', (lc.recommendedBreakerA || '—') + ' A']);
      // v1.11: ungrounded service-line conductor pick (230.42(A)(2) + 230.79(C) 100 A floor)
      const lcSvc = serviceLineConductor22082(lc, npSrc.mat || 'cu', +(npSrc.temp || 75));
      if (lcSvc.valid) {
        L.push(['Service-line (ungrounded) required ampacity (230.42(A)(2) + 230.79(C) 100 A floor)', lcSvc.reqA + ' A']);
        if (lcSvc.pick && !lcSvc.pick.over && lcSvc.pick.size) {
          L.push(['Service-line (ungrounded) conductor (Table 310.16, ' + (npSrc.temp || 75) + ' \u00b0C, ' + (npSrc.mat === 'al' ? 'aluminum' : 'copper') + ')', lcSvc.pick.label + ' \u2014 ' + lcSvc.pick.amp + ' A']);
          (lcSvc.pick.notes || []).forEach(nt => L.push(['Service-line conductor note', nt]));
        } else if (lcSvc.pick && lcSvc.pick.over) {
          L.push(['Service-line (ungrounded) conductor (Table 310.16)', 'NONE \u2014 ' + lcSvc.pick.over]);
        }
      }
      L.push(['Note', 'Design aid only \u2014 220.82 is a single-dwelling-unit optional method; verify against the adopted NEC edition. Neutral load is computed by the 220.61 card (not part of this method). 310.12(A) 83% ungrounded service-conductor reduction NOT applied (flagged in UI); 310.15 ambient/derating adjustments are yours.']);
      L.push([]);
    }
    const fa = (project && project.fa) ? applianceDemand22053(project.fa) : null;
    if (fa && fa.count > 0) {
      L.push(['FIXED APPLIANCE LOAD — NEC 220.53 (dwelling units; 2017-2023 code verified)', '']);
      L.push(['Eligible fastened-in-place appliances (each 1/4 hp or 500 W or greater)', fa.count]);
      L.push(['Total connected appliance load (VA)', fa.totalVA + ' VA']);
      L.push(['220.53 demand factor', fa.factorPct + '%' + (fa.eligible ? ' (4 or more appliances)' : ' (fewer than 4 — factor not permitted; counted at 100%)')]);
      L.push(['Appliance demand load', fa.demandVA + ' VA']);
      if (fa.eligible && fa.savingsVA > 0) L.push(['Reduction (25%)', fa.savingsVA + ' VA']);
      L.push(['Note', '220.53 permits a 75% demand factor on the nameplate load of four or more appliances rated 1/4 hp or greater, or 500 watts or greater, fastened in place and served by the same feeder or service in a one-family, two-family, or multifamily dwelling. NOT applicable to: household electric cooking equipment (use 220.55), clothes dryers (220.54 / 220.82(B)(3)), space heating equipment, or air-conditioning equipment (220.82(C)). The 2026 NEC renumbers Article 220; verify against the adopted edition.']);
      L.push([]);
    }
    const dd = (project && project.dd) ? dryerDemand22054(project.dd) : null;
    if (dd && dd.count > 0) {
      L.push(['MULTI-DWELLING CLOTHES DRYER LOAD — NEC 220.54 + Table 220.54 (2017-2023 code verified)', '']);
      L.push(['Number of dryers', dd.count]);
      L.push(['Per-dryer load (max of 5,000 VA or nameplate)', dd.perDryerVA + ' VA']);
      L.push(['Total connected dryer load', dd.connectedVA + ' VA']);
      L.push(['Table 220.54 demand factor', dd.factorPct + '%  (' + dd.factorLabel + ')']);
      L.push(['Dryer demand load', dd.demandVA + ' VA']);
      L.push(['Note', 'Standard-method multi-dwelling dryer rule. 220.54 ≠ the single-dwelling 220.82(B)(3) nameplate treatment. The 2026 NEC renumbers this (→ 120.54) and revises the factors — verify against the adopted edition.']);
      L.push([]);
    }
    const lt = (project && project.lt) ? lightingDemand22042(project.lt) : null;
    if (lt && lt.totalVA > 0) {
      L.push(['GENERAL LIGHTING LOAD DEMAND — NEC 220.42 + Table 220.42 (standard method, Part III; 2017-2023 code verified)', '']);
      L.push(['Occupancy', lt.occupancyLabel]);
      L.push(['Total general lighting load (VA)', lt.totalVA + ' VA']);
      for (const t of lt.tiers) {
        if (t.sliceVA > 0) {
          L.push(['Tier: ' + (t.upTo === Infinity ? 'remainder @ ' + t.pct + '%' : 'up to ' + t.upTo + ' VA @ ' + t.pct + '%'), t.demandVA + ' VA']);
        }
      }
      L.push(['Lighting demand load (VA)', lt.demandVA + ' VA']);
      L.push(['Note', 'Standard-method Part III feeder/service rule. NOT used under the 220.82 optional single-dwelling method (that takes 3 VA/sq ft at 100%, 220.82(B)(1)). Demand factors do not apply when determining the number of lighting branch circuits (220.42). Hospital/hotel tiers carry the table exception for areas used entirely at one time. Verify against the adopted NEC edition.']);
      L.push([]);
    }
    const ck = (project && project.ck) ? cookingDemand22055(project.ck) : null;
    if (ck && ck.valid) {
      L.push(['COOKING APPLIANCE LOAD — NEC 220.55 + Table 220.55 (2014 == 2020 verbatim; no 2023 change)', '']);
      L.push(['Number of ranges / cooking appliances', ck.count]);
      if (ck.effectiveCount !== ck.count) L.push(['3-phase 4-wire basis (2 × max per-phase)', ck.effectiveCount]);
      L.push(['Individual rating (kW, equal ratings)', ck.ratingKW + ' kW']);
      L.push(['Column C base maximum demand', ck.baseKW + ' kW']);
      if (ck.increaseKW > 0) L.push(['Note 1 increase (5% per kW over 12 kW)', '+' + ck.increaseKW + ' kW']);
      L.push(['Demand load', ck.demandKW + ' kW (' + ck.demandVA + ' VA)']);
      L.push(['Note', 'kVA considered equivalent to kW (220.55). Column C used (default). Note 2 (unequal ratings >8¾ kW) and Note 3 (Column A/B factors) available in the UI; see README for worked examples. Verify against the adopted NEC edition.']);
      L.push([]);
    }
    const nl = (project && project.nl) ? neutralLoad22061(project.nl) : null;
    if (nl && nl.valid) {
      const nlState = (project && project.nl) || {};
      const nlPick = pickConductor31016(nl.minAmpA, nlState.mat || 'cu', +(nlState.temp || 75));
      L.push(['FEEDER / SERVICE NEUTRAL LOAD — NEC 220.61 (2014 = 2020 verbatim; no 2023 change)', '']);
      L.push(['Total neutral (max unbalanced) load', nl.totalVA + ' VA']);
      if (nl.cookVA > 0) L.push(['Cooking/dryer portion (220.55/220.54 demand)', nl.cookVA + ' VA']);
      L.push(['Phase-to-neutral voltage', nl.volt + ' V']);
      if (nl.b1) L.push(['220.61(B)(1) 70% applied to cooking/dryer portion', 'Y (→ ' + nl.cookDemandVA + ' VA)']);
      L.push(['Basic neutral load (220.61(A))', nl.basicA + ' A']);
      if (nl.b2Applied) L.push(['220.61(B)(2) 70% on portion over 200 A', 'Y']);
      L.push(['Calculated neutral load (after reductions)', nl.finalA + ' A']);
      if (nl.dwelling) L.push(['310.12(B) one-dwelling service: min neutral ampacity', nl.minAmpA + ' A (83% of calculated)']);
      if (!nlPick.over && nlPick.size) {
        L.push(['Neutral conductor (Table 310.16, ' + (nlState.temp || 75) + ' °C, ' + (nlState.mat === 'al' ? 'aluminum' : 'copper') + ')', nlPick.label + ' — ' + nlPick.amp + ' A']);
        nlPick.notes.forEach(nt => L.push(['Conductor note', nt]));
      } else if (nlPick.over) {
        L.push(['Neutral conductor (Table 310.16)', 'NONE — ' + nlPick.over]);
      }
      L.push(['Note', 'Table 310.16 base values (30 °C ambient, ≤3 current-carrying conductors) — apply 310.15 adjustments (ambient/derating) as required. 220.61(C) prohibited reductions NOT applied: 3-wire portions of 4-wire 3-phase wye circuits and nonlinear loads on 4-wire wye must stay at 100% (harmonic neutral currents). Table verified from a verbatim 2023-NEC print; design aid only — verify against the adopted NEC edition (2026 NEC: Article 120 renumber).']);
      L.push([]);
    }
    const vd = (project && project.vd) ? voltageDrop(project.vd) : null;
    if (vd && vd.valid) {
      L.push(['VOLTAGE DROP — ONE CIRCUIT RUN (NEC Ch.9 Table 8; 210.19(A)/215.2(A) info-note 3%/5%)', '']);
      L.push(['Load current (A)', vd.amps]);
      L.push(['One-way length (ft)', vd.lengthFt]);
      L.push(['Voltage (V)', vd.volt + (vd.threePhase ? ' (3-phase L-L)' : '')]);
      L.push(['Conductor', vd.label + ' — ' + vd.rPerKft + ' ohm/kft @ 75 °C (Ch.9 Table 8)']);
      L.push(['One-way resistance (ohm)', vd.rOneWay]);
      L.push(['K-equivalent (ohm-cm/kft)', vd.kEff + ' (reference; the 12.9/21.2 constants are approximations of this)']);
      L.push(['Voltage drop (V)', vd.vdV]);
      L.push(['Voltage drop (%)', vd.pctV + '% (' + (vd.status === 'ok' ? 'within the 3% recommendation' : vd.status === 'warn' ? 'between 3% and 5% — review' : 'exceeds the 5% total feeder + branch recommendation') + ')']);
      if (vd.status !== 'ok') {
        const sz = sizeForVoltageDrop(project.vd);
        if (sz.valid && sz.pick) L.push(['Smallest size at ≤ ' + sz.targetPct + '%', sz.pick.label + ' (' + sz.pick.pctV + '%)']);
        else if (sz.over) L.push(['Smallest size at ≤ ' + sz.targetPct + '%', 'NONE — ' + sz.over]);
      }
      L.push(['Note', 'Vd = C × I × R with C = 2 (single-phase) or √3 (three-phase). 3% per branch circuit / 5% feeder + branch combined are INFORMATIONAL NOTE recommendations (210.19(A) Info Note 3, 215.2(A)(1) Info Note 2 — NEC 2020 text on disk), not mandatory limits. Table 8 DC values at 75 °C — verify against the adopted NEC edition (2026 NEC: Ch. 9 unchanged for these values). Design aid only.']);
      L.push([]);
    }
    L.push(['DWELLING UNIT MINIMUM CIRCUITS (NEC 210.11)', '']);
    L.push(['Requirement', 'Cite', 'Required', 'Auto-detected', 'Status', 'Result', 'Note']);
    const dws = dwStatus(project);
    for (const it of dws.items) {
      L.push([it.label, it.cite, 'Required ' + it.min, 'Auto-detected ' + it.auto, it.status, it.met ? 'MET' : 'REVIEW', it.note]);
    }
    L.push(['Requirements met', dws.metCount + ' of ' + dws.total]);
    for (const p of project.panels) {
      L.push([]);
      L.push(['=== ' + (p.name || 'Panel') + ' ===', '']);
      L.push(['System', (SYSTEMS[p.system] || {}).label || p.system]);
      L.push(['Panel Rating (A)', p.ratingA || '']);
      L.push([]);
      for (const row of panelCSVRows(p)) L.push(row);
    }
    return L.map(row => row.map(csvEscape).join(',')).join('\n');
  }

  // ---- Branded PDF / print report (v1.9) ----
  // Builds the FULL-project print document as an HTML string, computed ONLY from
  // the project state — every number comes from the same core functions that
  // power the on-screen cards and the rollup CSV, so the printed report can
  // never drift from the app. Pure: no DOM access, no third-party anything.
  // The UI wraps the output in a hidden container that swaps in for the app
  // under @media print (see index.html) — the browser's own "Save as PDF" is
  // the PDF engine, so the page still ships zero third-party scripts.
  // Scope note (same as the CSV rollup): 220.55 is always reported in its
  // default Column C + Note 1 method (the rollup CSV does the same); the
  // printed note says so instead of silently dropping the user's Note 2/3 input.
  const PRINT_APP_URL = 'https://radloffbot.github.io/panelwright/';

  function escH(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function prjDateStr(d) {
    try {
      const p = n => String(n).padStart(2, '0');
      return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
    } catch (e) { return ''; }
  }

  function panelReportHTML(p) {
    const sys = SYSTEMS[p.system] || { label: p.system, options: [] };
    const typeLabel = id => { const o = sys.options.find(o => o.id === id); return o ? o.label : (id || ''); };
    const t = panelTotals(p.circuits, p.system, p.ratingA);
    const rows = (p.circuits || []).map(c => {
      const req = reqBreakerA(c.loadA, c.continuous);
      const rec = req != null ? (nextStdBreaker(req) || '—') : '—';
      return '<tr><td class="num">' + escH(c.pos || '') + '</td>' +
        '<td>' + escH(c.name || '—') + '</td>' +
        '<td>' + escH(typeLabel(c.type)) + '</td>' +
        '<td class="num">' + (c.loadA != null ? c.loadA : '—') + '</td>' +
        '<td class="ctr">' + (c.continuous ? '☑' : '') + '</td>' +
        '<td class="num">' + rec + '</td>' +
        '<td class="num">' + (c.breaker != null ? c.breaker : '—') + '</td>' +
        '<td class="notes">' + escH(c.notes || '') + '</td></tr>';
    }).join('');
    const meta = (label, val) => '<tr><td>' + label + '</td><td class="val">' + val + '</td></tr>';
    return '<section class="pr-sec pr-panel">' +
      '<h2>' + escH(p.name || 'Panel') + '</h2>' +
      '<table class="pr-meta"><tbody>' +
      meta('System', escH(sys.label)) +
      meta('Panel rating', (p.ratingA != null ? p.ratingA + ' A' : 'not set')) +
      (p.notes ? meta('Notes', escH(p.notes)) : '') +
      '</tbody></table>' +
      '<table class="pr-tbl"><thead><tr>' +
      '<th class="num">Pos</th><th>Circuit</th><th>Type</th><th class="num">Load (A)</th>' +
      '<th class="ctr">Cont.</th><th class="num">Req. brk (A)</th><th class="num">Actual (A)</th><th>Notes</th>' +
      '</tr></thead><tbody>' + (rows || '<tr><td colspan="8" class="empty">No circuits</td></tr>') + '</tbody>' +
      '<tfoot><tr class="sum">' +
      '<td colspan="3" class="sumlabel">Totals (A)</td>' +
      '<td class="num">L1 ' + t.L1 + '</td>' +
      '<td class="num">L2 ' + t.L2 + '</td>' +
      '<td class="num">' + (t.is3ph ? 'L3 ' + t.L3 : '—') + '</td>' +
      '<td class="num">' + t.totalLoadA + '</td>' +
      '<td></td>' +
      '</tr></tfoot></table>' +
      '<p class="pr-badges">' +
      'Load ' + (t.loadPct != null ? t.loadPct + '% of rating' : '— (no rating)') +
      ' · Imbalance ' + (t.imbalancePct != null ? t.imbalancePct + '%' : '—') + (t.is3ph ? '' : ' (max−min)/max') +
      (t.is3ph ? ' · Neutral ≈' + t.neutralEst + ' A' + (t.neutralLimit != null ? ' (limit ' + t.neutralLimit + ' A, NEC 408.3(C) 5%)' : '') + (t.neutralOk === false ? ' — <strong>408.3(C) exceeded</strong>' : '') : '') +
      '</p></section>';
  }

  function reportSec(kicker, title, inner) {
    return '<section class="pr-sec"><div class="pr-kicker">' + escH(kicker) + '</div><h2>' + escH(title) + '</h2>' + inner + '</section>';
  }

  function prRow(label, value, cls) {
    return '<tr><td>' + escH(label) + '</td><td class="val' + (cls ? ' ' + cls : '') + '">' + value + '</td></tr>';
  }

  function printReportHTML(project, date) {
    project = project || { projectName: 'Untitled Project', serviceA: null, notes: '', panels: [] };
    date = date || new Date();
    const dstr = prjDateStr(date);
    const dt = date.toLocaleString();
    const t = projectTotals(project);
    const out = [];
    // ---- branded header ----
    out.push('<div class="pr-brand">');
    out.push('<div class="pr-mark" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="34" height="34"><rect width="64" height="64" rx="12" fill="#0f1419"/><rect x="8" y="8" width="48" height="48" rx="8" fill="#171e26" stroke="#2a3644" stroke-width="2"/><g fill="none" stroke="#ffb020" stroke-width="3.5" stroke-linecap="round"><line x1="20" y1="18" x2="20" y2="46"/><line x1="32" y1="18" x2="32" y2="46"/><line x1="44" y1="18" x2="44" y2="46"/><path d="M14 24 h10 M14 32 h10 M14 40 h10" stroke="#4da3ff" stroke-width="2.5"/><path d="M26 24 h12 M26 40 h12" stroke-width="2.5" opacity=".85"/><path d="M38 32 h12" stroke-width="2.5" opacity=".85"/></g></svg></div>');
    out.push('<div class="pr-title">Panel<span>Wright</span> — Panel Schedule &amp; Load Rollup</div>');
    out.push('<div class="pr-sub">Free design aid · no install · no account · data stays in your browser</div>');
    out.push('</div>');
    // ---- project block ----
    out.push('<section class="pr-sec">');
    out.push('<table class="pr-meta"><tbody>');
    out.push(prRow('Project', escH(project.projectName || 'Untitled Project'), 'big'));
    if (project.notes) out.push(prRow('Notes', escH(project.notes)));
    out.push(prRow('Service rating', project.serviceA ? project.serviceA + ' A' : 'not set'));
    out.push(prRow('Generated', dt));
    out.push('</tbody></table></section>');
    // ---- service entrance rollup ----
    {
      const rows = t.perPanel.map(p =>
        '<tr><td>' + escH(p.name) + '</td><td>' + escH(SYSTEMS[p.system] ? SYSTEMS[p.system].label : p.system) + '</td>' +
        '<td class="num">' + p.L1 + '</td><td class="num">' + p.L2 + '</td>' +
        '<td class="num">' + (p.is3ph ? p.L3 : '—') + '</td><td class="num">' + p.total + '</td>' +
        '<td class="num">' + p.imbalancePct + '</td></tr>').join('');
      let bad = '';
      if (t.servicePct != null) {
        bad = '<p class="pr-badges">Max phase is <strong>' + t.servicePct + '%</strong> of the service rating' +
          (t.servicePct > 100 ? ' — <strong>exceeds rating</strong>' : '') + '</p>';
      } else {
        bad = '<p class="pr-badges">Service rating not set — enter it to check load %</p>';
      }
      out.push(reportSec('Service entrance', 'Service-entrance rollup (screening value — no demand factors)',
        '<table class="pr-tbl"><thead><tr><th>Panel</th><th>System</th><th class="num">L1 (A)</th><th class="num">L2 (A)</th>' +
        '<th class="num">L3 (A)</th><th class="num">Total (A)</th><th class="num">Imbalance %</th></tr></thead><tbody>' + rows + '</tbody>' +
        '<tfoot><tr class="sum"><td colspan="2" class="sumlabel">Service entrance</td>' +
        '<td class="num">' + t.L1 + '</td><td class="num">' + t.L2 + '</td><td class="num">' + t.L3 + '</td>' +
        '<td class="num">' + t.total + '</td><td></td></tr></tfoot></table>' + bad));
    }
    // ---- NEC 220.82 ----
    const lc = project.lc ? serviceLoad22082(project.lc) : null;
    if (lc) {
      const anyNp = lcNameplateVA(project.lc);
      const any = [project.lc.sqft, anyNp[0], anyNp[1], project.lc.acVA,
        project.lc.hpNoSuppVA, project.lc.hpCompressorVA, project.lc.hpSuppVA,
        project.lc.spaceHeatingVA, project.lc.thermalStorageVA].some(x => x != null && x > 0);
      if (any) {
        out.push(reportSec('NEC 220.82', 'Dwelling service load — optional method (single unit; 2017–2023 code verified)',
          '<table class="pr-meta"><tbody>' +
          prRow('General lighting + receptacles, 3 VA/sq ft (220.82(B)(1))', lc.lightingVA + ' VA') +
          prRow('Small-appliance circuits ×1,500 VA (220.82(B)(2))', lc.smallApplianceVA + ' VA') +
          prRow('Laundry circuits ×1,500 VA (220.82(B)(2))', lc.laundryVA + ' VA') +
          prRow('Appliances nameplate (220.82(B)(3))', lc.appliancesVA + ' VA' +
            ((project.lc.nameplateUnit === 'kw' && project.lc.appliancesKW != null) ? ' <span class="pr-sub">(entered as ' + escH(String(project.lc.appliancesKW)) + ' kW)</span>' : '')) +
          prRow('Permanently connected motors (220.82(B)(4))', lc.motorsVA + ' VA' +
            ((project.lc.nameplateUnit === 'kw' && project.lc.motorsKW != null) ? ' <span class="pr-sub">(entered as ' + escH(String(project.lc.motorsKW)) + ' kW)</span>' : '')) +
          prRow('General connected load', lc.generalConnectedVA + ' VA') +
          prRow('General demand (first 10 kVA @100% + 40% of remainder)', lc.generalDemandVA + ' VA') +
          prRow('Largest heating/cooling (220.82(C))', lc.hvacDemandVA + ' VA') +
          prRow('Total demand load', lc.totalVA + ' VA', 'big') +
          prRow('Service current @ ' + lc.volt + ' V', lc.amps + ' A', 'big') +
          prRow('Recommended standard service (NEC 240.6)', (lc.recommendedBreakerA || '—') + ' A', 'big') +
          (function () {
            const lcSvc = serviceLineConductor22082(lc, project.lc.mat || 'cu', +(project.lc.temp || 75));
            if (!lcSvc.valid) return '';
            let h = prRow('Service-line (ungrounded) required ampacity (230.42(A)(2) + 230.79(C) 100 A floor)', lcSvc.reqA + ' A', 'big');
            if (lcSvc.pick && !lcSvc.pick.over && lcSvc.pick.size) {
              h += prRow('Service-line (ungrounded) conductor (Table 310.16, ' + (project.lc.temp || 75) + ' \u00b0C, ' + (project.lc.mat === 'al' ? 'aluminum' : 'copper') + ')', lcSvc.pick.label + ' \u2014 ' + lcSvc.pick.amp + ' A', 'big');
              (lcSvc.pick.notes || []).forEach(nt => { h += '<p class="pr-note">' + escH(nt) + '</p>'; });
            } else if (lcSvc.pick && lcSvc.pick.over) {
              h += prRow('Service-line (ungrounded) conductor (Table 310.16)', 'NONE \u2014 ' + escH(lcSvc.pick.over));
            }
            h += '<p class="pr-note">230.42(A)(2): ungrounded service conductors sized at 100% of the calculated 220.82 service current, floored at the 230.79(C) 100 A one-family disconnect rating; ampacity from Table 310.16 at the 110.14(C) temperature column. <strong>310.12(A) 83% ungrounded service-conductor reduction NOT applied</strong> (a separate allowance on the disconnect rating; its verbatim text is not on disk \u2014 apply it yourself if adopted). 310.15 ambient/derating adjustments are yours.</p>';
            return h;
          })() +
          '</tbody></table>' +
          (project.serviceA && lc.amps > project.serviceA
            ? '<p class="pr-badges"><strong>Exceeds the project service rating of ' + project.serviceA + ' A</strong></p>' : '') +
          '<p class="pr-note">220.82 is the optional single-dwelling-unit method; the neutral load for it is computed by the 220.61 section below, not by 220.82 itself. Design aid only — verify against the adopted NEC edition (2026 NEC: Article 120 renumber).</p>'));
      }
    }
    // ---- NEC 220.53 (fixed appliances) ----
    const fa = project.fa ? applianceDemand22053(project.fa) : null;
    if (fa && fa.count > 0) {
      out.push(reportSec('NEC 220.53', 'Fixed-appliance demand — dwelling units (2017–2023 code verified)',
        '<table class="pr-meta"><tbody>' +
        prRow('Eligible fastened-in-place appliances (each ¼ hp or 500 W or greater)', fa.count) +
        prRow('Total connected appliance load', fa.totalVA.toLocaleString() + ' VA') +
        prRow('220.53 demand factor', fa.factorPct + '%' + (fa.eligible ? ' (4 or more appliances)' : ' (fewer than 4 — not permitted; 100%)')) +
        prRow('Appliance demand load', fa.demandVA.toLocaleString() + ' VA', 'big') +
        (fa.eligible && fa.savingsVA > 0 ? prRow('Reduction (25%)', '− ' + fa.savingsVA.toLocaleString() + ' VA') : '') +
        '</tbody></table>' +
        '<p class="pr-note">220.53 permits a 75% demand factor on the nameplate load of four or more appliances rated ¼ hp or greater, or 500 W or greater, fastened in place and served by the same feeder or service in a one-family, two-family, or multifamily dwelling. Not applicable to household electric cooking equipment (220.55), clothes dryers (220.54 / 220.82(B)(3)), space heating, or air-conditioning (220.82(C)). Design aid only — verify against the adopted edition (2026 NEC: Article 120 renumber).</p>'));
    }
    // ---- NEC 220.54 ----
    const dd = project.dd ? dryerDemand22054(project.dd) : null;
    if (dd && dd.count > 0) {
      out.push(reportSec('NEC 220.54', 'Multi-dwelling clothes-dryer demand (Table 220.54; 2017–2023 code verified)',
        '<table class="pr-meta"><tbody>' +
        prRow('Number of dryers served', dd.count) +
        prRow('Per-dryer load (larger of 5,000 VA or nameplate)', dd.perDryerVA + ' VA') +
        prRow('Total connected dryer load', dd.connectedVA + ' VA') +
        prRow('Table 220.54 demand factor', dd.factorPct + '% — ' + escH(dd.factorLabel)) +
        prRow('Dryer demand load', dd.demandVA + ' VA', 'big') +
        '</tbody></table>' +
        '<p class="pr-note">Standard-method multi-dwelling dryer rule — not the single-dwelling 220.82(B)(3) nameplate treatment. The 2026 NEC renumbers this (→ 120.54) and revises the factors; verify against the adopted edition.</p>'));
    }
    // ---- NEC 220.42 ----
    const lt = project.lt ? lightingDemand22042(project.lt) : null;
    if (lt && lt.totalVA > 0) {
      const tiers = lt.tiers.filter(x => x.sliceVA > 0).map(x =>
        prRow('Tier: ' + (x.upTo === Infinity ? 'remainder @ ' + x.pct + '%' : 'up to ' + x.upTo.toLocaleString() + ' VA @ ' + x.pct + '%'), x.demandVA.toLocaleString() + ' VA')).join('');
      out.push(reportSec('NEC 220.42', 'General lighting load demand — standard method (Table 220.42; 2017–2023 code verified)',
        '<table class="pr-meta"><tbody>' +
        prRow('Occupancy', escH(lt.occupancyLabel)) +
        prRow('Total general lighting load', lt.totalVA.toLocaleString() + ' VA') +
        tiers +
        prRow('Lighting demand load', lt.demandVA.toLocaleString() + ' VA', 'big') +
        '</tbody></table>' +
        '<p class="pr-note">Standard-method Part III feeder/service rule — NOT used under the 220.82 optional single-dwelling method (that takes 3 VA/sq ft at 100%, 220.82(B)(1)). The factors do not apply when determining the number of lighting branch circuits (220.42). Hospital/hotel tiers carry the table exception for areas likely used entirely at one time. Design aid only.</p>'));
    }
    // ---- NEC 220.55 (always Column C + Note 1; mirrors the rollup CSV) ----
    const ck = project.ck ? cookingDemand22055(project.ck) : null;
    if (ck && ck.valid) {
      let inner = '<table class="pr-meta"><tbody>' +
        prRow('Number of ranges / cooking appliances', ck.count) +
        (ck.effectiveCount !== ck.count ? prRow('3-phase, 4-wire basis (2 × max between any two phases)', ck.effectiveCount) : '') +
        prRow('Individual rating (equal ratings)', ck.ratingKW + ' kW') +
        prRow('Column C base maximum demand', ck.baseKW + ' kW') +
        (ck.increaseKW > 0 ? prRow('Note 1 increase (5% per kW over 12 kW)', '+' + ck.increaseKW + ' kW') : '') +
        prRow('Demand load', ck.demandKW + ' kW (' + ck.demandVA + ' VA)', 'big') +
        '</tbody></table>';
      const mode = project.ck.mode;
      if (mode === 'note2' || mode === 'note3') {
        inner += '<p class="pr-badges">Note: the report prints the Column C + Note 1 method (the rollup CSV does the same); the app card shows your selected ' +
          (mode === 'note2' ? 'Note 2' : 'Note 3') + ' result.</p>';
      }
      inner += '<p class="pr-note">Applies to household cooking appliances individually rated over 1¾ kW (kVA considered equivalent to kW). Verified 2014 = 2020 verbatim (row-for-row identical); no 2023 change recorded. Note 4 (single-appliance branch-circuit loads) is out of scope. Design aid only — verify against the adopted edition.</p>';
      out.push(reportSec('NEC 220.55', 'Household cooking appliance demand (Table 220.55; 2014 = 2020 verbatim)', inner));
    }
    // ---- NEC 220.61 ----
    const nl = project.nl ? neutralLoad22061(project.nl) : null;
    if (nl && nl.valid) {
      const nlS = project.nl || {};
      const pick = pickConductor31016(nl.minAmpA, nlS.mat || 'cu', +(nlS.temp || 75));
      const matName = nlS.mat === 'al' ? 'aluminum' : 'copper';
      let inner = '<table class="pr-meta"><tbody>' +
        prRow('Total neutral load — max unbalance (220.61(A))', nl.totalVA + ' VA') +
        (nl.cookVA > 0 ? prRow('Cooking/dryer portion (220.61(B)(1) 70% when demand-calculated)', nl.cookVA + ' VA' + (nl.b1 ? ' → ' + nl.cookDemandVA + ' VA' : '')) : '') +
        prRow('Phase-to-neutral voltage', nl.volt + ' V') +
        prRow('Basic neutral load (220.61(A))', nl.basicA + ' A') +
        (nl.b2Applied ? prRow('220.61(B)(2): 70% on portion over 200 A', 'applied') : (nl.b2 ? prRow('220.61(B)(2) selected', 'not applied — load does not exceed 200 A') : '')) +
        prRow('Calculated neutral load (after reductions)', nl.finalA + ' A', 'big') +
        (nl.dwelling ? prRow('310.12(B) one-dwelling service — minimum neutral ampacity (83%)', nl.minAmpA + ' A', 'big') : '') +
        '</tbody></table>';
      if (!pick.over && pick.size) {
        inner += '<table class="pr-meta"><tbody>' +
          prRow('Neutral conductor — Table 310.16 (' + matName + ', ' + (nlS.temp || 75) + ' °C column)', pick.label + ' — ' + pick.amp + ' A', 'big') +
          '</tbody></table><p class="pr-badges">' + pick.notes.map(escH).join(' · ') + '</p>';
      } else if (pick.over) {
        inner += '<p class="pr-badges"><strong>' + escH(pick.over) + '</strong></p>';
      }
      inner += '<p class="pr-note">Table 310.16 base values (30 °C ambient, ≤3 current-carrying conductors) — apply 310.15 ambient/derating adjustments as required. 220.61(C) prohibited reductions are NOT applied: 3-wire portions of 4-wire 3-phase wye circuits and nonlinear loads on 4-wire wye stay at 100% (harmonic neutral currents). Table verified from a verbatim 2023-NEC print; design aid only — verify against the adopted NEC edition (2026 NEC: Article 120 renumber).</p>';
      out.push(reportSec('NEC 220.61', 'Feeder / service neutral load (2014 = 2020 verbatim; no 2023 change)', inner));
    }
    // ---- Voltage drop (v1.13) ----
    const vd = project.vd ? voltageDrop(project.vd) : null;
    if (vd && vd.valid) {
      let inner = '<table class="pr-meta"><tbody>' +
        prRow('Load current', vd.amps + ' A') +
        prRow('One-way length', vd.lengthFt + ' ft') +
        prRow('Voltage', vd.volt + ' V' + (vd.threePhase ? ' (3-phase, L-L drop)' : ' (single-phase)')) +
        prRow('Conductor', escH(vd.label) + ' — ' + vd.rPerKft + ' Ω/kft @ 75 °C (Ch. 9 Table 8)') +
        prRow('One-way resistance', vd.rOneWay + ' Ω') +
        prRow('Voltage drop', vd.vdV + ' V', 'big') +
        prRow('Voltage drop', vd.pctV + '% of ' + vd.volt + ' V (' +
          (vd.status === 'ok' ? 'within the 3% recommendation' : vd.status === 'warn' ? 'between 3% and 5% — review' : 'exceeds the 5% feeder + branch recommendation') + ')', 'big') +
        '</tbody></table>';
      if (vd.status !== 'ok') {
        const sz = sizeForVoltageDrop(project.vd);
        if (sz.valid && sz.pick) inner += '<table class="pr-meta"><tbody>' +
          prRow('Smallest size at ≤ ' + sz.targetPct + '%', escH(sz.pick.label) + ' — ' + sz.pick.pctV + '%', 'big') +
          '</tbody></table>';
        else if (sz.over) inner += '<p class="pr-badges"><strong>' + escH(sz.over) + '</strong></p>';
      }
      inner += '<p class="pr-note">Vd = C × I × R with C = 2 (single-phase, one round trip) or √3 (three-phase line-to-line). The 3% (branch) / 5% (feeder + branch combined) figures are INFORMATIONAL NOTE recommendations — 210.19(A) Info Note No. 3 and 215.2(A)(1) Info Note No. 2 (NEC 2020 text) — not mandatory limits. Chapter 9 Table 8 DC resistance at 75 °C; verify against the adopted NEC edition. Design aid only.</p>';
      out.push(reportSec('Voltage drop', 'Voltage drop — one circuit run (NEC Ch. 9 Table 8; 210.19(A)/215.2(A) info-note 3%/5%)', inner));
    }
    // ---- NEC 210.11 checklist ----
    {
      const dws = dwStatus(project);
      const rows = dws.items.map(it => {
        const st = it.status === 'ok' ? '✓ verified' : it.status === 'missing' ? '✗ missing' : ('auto · ' + it.auto + ' matched');
        return '<tr><td>' + escH(it.label) + '</td><td>' + escH(it.cite) + '</td><td class="num">' + it.min + '</td>' +
          '<td class="num">' + it.auto + '</td><td class="ctr">' + st + '</td>' +
          '<td class="ctr">' + (it.met ? 'MET' : 'REVIEW') + '</td></tr>';
      }).join('');
      out.push(reportSec('NEC 210.11', 'Dwelling-unit minimum circuits (2017–2023 code verified; user-verified checklist)',
        '<table class="pr-tbl"><thead><tr><th>Requirement</th><th>NEC cite</th><th class="num">Req.</th>' +
        '<th class="num">Auto-match</th><th class="ctr">Status</th><th class="ctr">Result</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p class="pr-badges">Requirements met: <strong>' + dws.metCount + ' of ' + dws.total + '</strong></p>' +
        '<p class="pr-note">Auto-match is a keyword suggestion, never a verdict. Outdoor and lighting rows are design-practice items (210.11 has no outdoor dedicated-circuit mandate; 210.11(B) is load balancing, not a lighting requirement).</p>'));
    }
    // ---- panels ----
    out.push('<section class="pr-sec"><div class="pr-kicker">Panels</div><h2>Panel schedules</h2></section>');
    (project.panels || []).forEach(p => out.push(panelReportHTML(p)));
    // ---- footer ----
    out.push('<div class="pr-foot">' +
      '<p><strong>Design aid only.</strong> Not a substitute for the NEC, manufacturer instructions, or a qualified electrical design. Sizing follows NEC 210.20(A)/215.2(A) continuous-load rules and 240.6 standard sizes; balancing uses IEEE-style max deviation and the 408.3(C) 5% neutral guideline (field approximation). Verify against the adopted NEC edition and local code.</p>' +
      '<p>Built and maintained by <strong>Radloff Bot, an AI software assistant</strong> (AI-built and disclosed). Plain HTML/JS, MIT licensed — ' + PRINT_APP_URL + '</p>' +
      '<p>Generated by PanelWright on ' + escH(dt) + ' · report date ' + dstr + '</p></div>');
    return out.join('');
  }

  // ---- JSON roundtrip (project, v2) + v1 migration ----
  function toJSON(project) {
    return JSON.stringify(Object.assign({}, project, { app: 'PanelWright', generatedAt: new Date().toISOString() }), null, 2);
  }

  function migrate(obj) {
    if (obj && obj.version === 2 && Array.isArray(obj.panels) && obj.panels.length) return obj;
    if (obj && Array.isArray(obj.circuits) && SYSTEMS[obj.system]) {
      return {
        version: 2, projectName: obj.name || 'Imported Project', serviceA: null, notes: obj.notes || '',
        panels: [{ name: obj.name || 'Main Panel', system: obj.system, ratingA: obj.ratingA, notes: obj.notes || '', circuits: obj.circuits }]
      };
    }
    throw new Error('Not a PanelWright file (unknown version)');
  }

  function fromJSON(text) {
    const s = JSON.parse(text);
    const p = migrate(s);
    for (const panel of p.panels) {
      if (!SYSTEMS[panel.system] || !Array.isArray(panel.circuits)) throw new Error('Invalid panel in file');
    }
    return p;
  }

  const core = {
    STD_BREAKERS, SYSTEMS, nextStdBreaker, reqBreakerA, circuitContribution,
    panelTotals, autoBalance, projectTotals, emptyPanel, defaultProject,
    DW_DEFAULT_ITEMS, normalizeDw, dwStatus, serviceLoad22082,
    serviceLineConductor22082,
    applianceDemand22053,
    dryerFactorPct, dryerFactorLabel, dryerDemand22054,
    LIT_TABLES, lightingDemand22042,
    COOK_C_KW, COOK_AB, cookingColumnCKW, cookingNote1Kw, cookingNote2,
    cookingABFactorPct, cookingNote3KW, cookingDemand22055,
    neutralLoad22061,
    T31016, T31016_COLS, AWG_SIZES, conductorLabel, pickConductor31016,
    CH9_T8, ch9Row, voltageDrop, sizeForVoltageDrop,
    toCSV, projectToCSV, printReportHTML, toJSON, fromJSON, migrate, round2
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (global) global.PanelWrightCore = core;

  // ================= UI =================
  if (typeof document === 'undefined') return;

  const $ = sel => document.querySelector(sel);
  const LS_KEY = 'panelwright.state.v2';
  const LS_KEY_V1 = 'panelwright.state.v1';

  let state = null;   // project
  let cur = 0;        // current panel index

  function panel() { return state.panels[cur] || state.panels[0]; }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return fromJSON(raw);
    } catch (e) { /* try v1 */ }
    try {
      const raw = localStorage.getItem(LS_KEY_V1);
      if (raw) return fromJSON(raw); // v1 files auto-migrate
    } catch (e) { /* fall through */ }
    return defaultProject();
  }

  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    updateSavedAt();
  }

  function updateSavedAt() {
    const el = $('#savedAt');
    if (el) el.textContent = 'Auto-saved ' + new Date().toLocaleTimeString();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  // ---- rendering ----
  function renderPanels() {
    const tabs = $('#panelTabs');
    tabs.innerHTML = '';
    state.panels.forEach((p, i) => {
      const b = document.createElement('button');
      b.textContent = (i + 1) + '. ' + (p.name || 'Panel');
      b.className = 'tab' + (i === cur ? ' active' : '');
      b.onclick = () => { cur = i; renderAll(); };
      tabs.appendChild(b);
    });
    // panel controls
    const p = panel();
    const sel = $('#system');
    sel.innerHTML = Object.keys(SYSTEMS).map(k =>
      `<option value="${k}"${k === p.system ? ' selected' : ''}>${SYSTEMS[k].label}</option>`).join('');
    $('#panelName').value = p.name || '';
    $('#ratingA').value = p.ratingA || '';
  }

  function renderTable() {
    const tbody = $('#circuits');
    const p = panel();
    const sys = SYSTEMS[p.system];
    // normalize circuit types that no longer exist in this system
    for (const c of p.circuits) {
      if (!sys.options.find(o => o.id === c.type)) c.type = sys.options[0].id;
    }
    tbody.innerHTML = '';
    p.circuits.forEach((c, i) => {
      const tr = document.createElement('tr');
      const req = reqBreakerA(c.loadA, c.continuous);
      const rec = req != null ? (nextStdBreaker(req) || '—') : '—';
      tr.innerHTML = `
        <td><input class="in-pos" data-i="${i}" data-f="pos" value="${esc(c.pos)}" placeholder="${i + 1}"></td>
        <td><input class="in-name" data-i="${i}" data-f="name" value="${esc(c.name)}" placeholder="Circuit"></td>
        <td><select class="in-type" data-i="${i}" data-f="type">${sys.options.map(o =>
          `<option value="${o.id}"${o.id === c.type ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></td>
        <td><input class="in-load" data-i="${i}" data-f="loadA" type="number" min="0" step="0.1" value="${c.loadA != null ? c.loadA : ''}" placeholder="0"></td>
        <td class="ctr"><input class="in-cont" data-i="${i}" data-f="continuous" type="checkbox"${c.continuous ? ' checked' : ''}></td>
        <td class="num rec">${rec}</td>
        <td><input class="in-brk" data-i="${i}" data-f="breaker" type="number" min="0" step="1" value="${c.breaker || ''}" placeholder="${rec}"></td>
        <td><input class="in-notes" data-i="${i}" data-f="notes" value="${esc(c.notes || '')}" placeholder="notes"></td>
        <td class="ctr"><button class="btn-del" data-i="${i}" title="Delete circuit">✕</button></td>`;
      tbody.appendChild(tr);
    });
    if (!p.circuits.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="9" class="empty">No circuits yet — click “Add circuit”.</td>';
      tbody.appendChild(tr);
    }
    const t = panelTotals(p.circuits, p.system, p.ratingA);
    const show3 = t.is3ph;
    $('#sumRow').innerHTML = `
      <td colspan="4" class="sumlabel">Totals (A)</td>
      <td class="num sum">L1 ${t.L1}</td>
      <td class="num sum">L2 ${t.L2}</td>
      <td class="num sum">${show3 ? 'L3 ' + t.L3 : '—'}</td>
      <td class="num sum">${t.totalLoadA}</td>
      <td></td>`;
  }

  function renderBadges() {
    const p = panel();
    const t = panelTotals(p.circuits, p.system, p.ratingA);
    const warnImb = t.imbalancePct != null && t.imbalancePct > 10;
    const warnLoad = t.loadPct != null && t.loadPct > 100;
    const warnNeutral = t.neutralOk === false;
    $('#badges').innerHTML = `
      <span class="badge ${warnLoad ? 'bad' : 'ok'}">Load ${t.loadPct != null ? t.loadPct + '%' : '—'} of rating</span>
      <span class="badge ${warnImb ? 'bad' : 'ok'}">Imbalance ${t.imbalancePct != null ? t.imbalancePct + '%' : '—'}${t.is3ph ? '' : ' (max−min)/max'}</span>
      ${t.is3ph ? `<span class="badge ${warnNeutral ? 'bad' : 'ok'}">Neutral ≈${t.neutralEst} A ${t.neutralLimit != null ? '(limit ' + t.neutralLimit + ' A)' : ''}</span>` : ''}
      ${warnNeutral ? '<span class="badge bad">NEC 408.3(C) exceeded</span>' : ''}`;
  }

  function renderService() {
    const t = projectTotals(state);
    $('#svcSum').textContent = `L1 ${t.L1}  ·  L2 ${t.L2}  ·  L3 ${t.L3}  ·  Total ${t.total} A`;
    const warn = t.servicePct != null && t.servicePct > 100;
    $('#svcPct').innerHTML = t.servicePct != null
      ? `<span class="badge ${warn ? 'bad' : 'ok'}">Service ${t.servicePct}% of rating (max phase)</span>`
      : '<span class="badge">Set service rating to check load %</span>';
  }

  // ---- NEC 220.82 service load (v1.3; v1.10 kW nameplate entry) ----
  function lcFields() {
    const el = id => $('#lc' + id);
    const n = x => (el(x) && el(x).value !== '') ? (+el(x).value || null) : null;
    const f = {
      sqft: n('Sqft'),
      smallApplianceCircuits: (el('SmallApp') && el('SmallApp').value !== '') ? +el('SmallApp').value : 2,
      laundryCircuits: (el('Laundry') && el('Laundry').value !== '') ? +el('Laundry').value : 1,
      volt: el('Volt') ? +el('Volt').value : 240,
      acVA: n('Ac'),
      hpNoSuppVA: n('HpNoSupp'),
      hpCompressorVA: n('HpComp'),
      hpSuppVA: n('HpSupp'),
      spaceHeatingVA: n('Space'),
      spaceUnits: n('SpaceUnits'),
      thermalStorageVA: n('Thermal')
    };
    // v1.10: the appliances/motor inputs hold values in the currently selected
    // unit; store them under the matching key so the core (and JSON round-trips)
    // know how to read them. Default = VA (legacy behavior).
    const unit = (el('Unit') && el('Unit').value === 'kw') ? 'kw' : 'va';
    f.nameplateUnit = unit;
    if (unit === 'kw') { f.appliancesKW = n('Appliances'); f.motorsKW = n('Motors'); }
    else { f.appliancesVA = n('Appliances'); f.motorsVA = n('Motors'); }
    // v1.11: service-line (ungrounded) conductor pick — material + 110.14(C) column
    f.mat = (el('SvcMat') && el('SvcMat').value === 'al') ? 'al' : 'cu';
    f.temp = (el('SvcTemp') && ['60', '75', '90'].indexOf(el('SvcTemp').value) >= 0) ? +el('SvcTemp').value : 75;
    return f;
  }

  // v1.10: keep the appliances/motor labels honest when the unit toggle changes.
  function setLcUnitLabels(unit) {
    unit = unit || (($('#lcUnit') && $('#lcUnit').value === 'kw') ? 'kw' : 'va');
    const u = (unit === 'kw') ? 'kW' : 'VA';
    const a = $('#lcAppliancesL'), m = $('#lcMotorsL');
    if (a) a.textContent = 'Appliances nameplate (' + u + ') · 220.82(B)(3)';
    if (m) m.textContent = 'Perman. motors (' + u + ') · 220.82(B)(4)';
  }

  // v1.10: unit toggle — convert the values already in the fields (VA↔kW, no
  // drift: divide for display, round to whole VA on the way back), then re-save.
  function lcUnitChanged() {
    const toKw = $('#lcUnit').value === 'kw';
    const conv = el => { if (el && el.value !== '') el.value = toKw ? String(+el.value / 1000) : String(Math.round(+el.value * 1000)); };
    conv($('#lcAppliances')); conv($('#lcMotors'));
    setLcUnitLabels();
    state.lc = lcFields(); saveState(); renderLc();
  }

  function renderLcInputs() {
    const l = state.lc || {};
    const set = (id, v) => { const e = $('#lc' + id); if (e) e.value = (v == null ? '' : v); };
    const unit = (l.nameplateUnit === 'kw') ? 'kw' : 'va';
    set('Sqft', l.sqft);
    set('SmallApp', l.smallApplianceCircuits != null ? l.smallApplianceCircuits : 2);
    set('Laundry', l.laundryCircuits != null ? l.laundryCircuits : 1);
    if (unit === 'kw') {
      set('Appliances', l.appliancesKW);
      set('Motors', l.motorsKW);
    } else {
      set('Appliances', l.appliancesVA);
      set('Motors', l.motorsVA);
    }
    set('Ac', l.acVA);
    set('HpNoSupp', l.hpNoSuppVA);
    set('HpComp', l.hpCompressorVA);
    set('HpSupp', l.hpSuppVA);
    set('Space', l.spaceHeatingVA);
    set('SpaceUnits', l.spaceUnits);
    set('Thermal', l.thermalStorageVA);
    const u = $('#lcUnit'); if (u) u.value = unit;
    const v = $('#lcVolt'); if (v && l.volt) v.value = String(l.volt);
    const sm = $('#lcSvcMat'); if (sm) sm.value = l.mat || 'cu';
    const st = $('#lcSvcTemp'); if (st) st.value = String(l.temp || 75);
    setLcUnitLabels(unit);
  }

  // v1.10: the nameplate inputs may be in kW — resolve them to VA for the check.
  function lcNameplateVA(l) {
    l = l || {};
    if (l.nameplateUnit === 'kw') {
      return [l.appliancesKW != null ? l.appliancesKW * 1000 : null,
              l.motorsKW != null ? l.motorsKW * 1000 : null];
    }
    return [l.appliancesVA, l.motorsVA];
  }

  function renderLc() {
    const l = lcFields();
    const np = lcNameplateVA(l);
    const any = [l.sqft, np[0], np[1], l.acVA, l.hpNoSuppVA, l.hpCompressorVA,
      l.hpSuppVA, l.spaceHeatingVA, l.thermalStorageVA].some(x => x != null && x > 0);
    if (!any) {
      $('#lcSum').textContent = '—';
      $('#lcBadges').innerHTML = '<span class="badge">Enter floor area + appliance / HVAC loads to size the service per 220.82</span>';
      return;
    }
    const lc = serviceLoad22082(l);
    const lcSvc = serviceLineConductor22082(lc, l.mat || 'cu', +(l.temp || 75));
    let sumText = `Total demand ${lc.totalVA} VA  →  ${lc.amps} A @ ${lc.volt} V`;
    if (lcSvc.valid && lcSvc.pick && !lcSvc.pick.over && lcSvc.pick.size) {
      sumText += `  →  ${lcSvc.pick.label} service-line (Table 310.16, ${lcSvc.pick.amp} A @ ${l.temp || 75} °C)`;
    }
    $('#lcSum').textContent = sumText;
    let badges =
      `<span class="badge">General ${lc.generalConnectedVA} VA → ${lc.generalDemandVA} VA (220.82(B))</span>` +
      `<span class="badge">Largest HVAC ${lc.hvacDemandVA} VA (220.82(C))</span>` +
      `<span class="badge ok">Recommended service: ${lc.recommendedBreakerA || '—'} A (NEC 240.6)</span>`;
    if (lcSvc.valid) {
      if (lcSvc.pick && !lcSvc.pick.over && lcSvc.pick.size) {
        badges += `<span class="badge ok">Service-line (ungrounded): ${lcSvc.pick.label} — ${lcSvc.pick.amp} A in the ${l.temp || 75} °C column (Table 310.16, req. ${lcSvc.reqA} A)</span>`;
        (lcSvc.pick.notes || []).forEach(nt => { badges += `<span class="badge">${esc(nt)}</span>`; });
      } else if (lcSvc.pick && lcSvc.pick.over) {
        badges += `<span class="badge warn">${esc(lcSvc.pick.over)}</span>`;
      }
      badges += `<span class="badge">310.12(A) 83% ungrounded reduction NOT applied (separate allowance on the disconnect rating — verify against adopted NEC)</span>`;
      badges += '<span class="badge">Table 310.16 base values (30 °C, ≤3 CCC) — 310.15 ambient/derating adjustments not applied</span>';
    }
    if (state.serviceA && lc.amps > state.serviceA) {
      badges += `<span class="badge bad">Exceeds project service rating ${state.serviceA} A</span>`;
    }
    $('#lcBadges').innerHTML = badges;
  }

  // ---- NEC 220.54 multi-dwelling dryer demand (v1.4) ----
  function ddFields() {
    const el = id => $('#dd' + id);
    const n = x => (el(x) && el(x).value !== '') ? (+el(x).value || null) : null;
    return { count: n('Count'), nameplateVA: n('Nameplate') };
  }

  function renderDdInputs() {
    const l = state.dd || {};
    const set = (id, v) => { const e = $('#dd' + id); if (e) e.value = (v == null ? '' : v); };
    set('Count', l.count);
    set('Nameplate', l.nameplateVA);
  }

  function renderDd() {
    const l = ddFields();
    const count = (l.count === null) ? 0 : l.count;
    if (!(count > 0)) {
      $('#ddSum').textContent = '—';
      $('#ddBadges').innerHTML = '<span class="badge">Enter the number of electric dryers served to apply Table 220.54 (2017–2023)</span>';
      return;
    }
    const dd = dryerDemand22054(l);
    $('#ddSum').textContent = `${dd.demandVA} VA dryer demand  (${dd.count} dryers @ ${dd.perDryerVA} VA each, ${dd.factorPct}% factor)`;
    $('#ddBadges').innerHTML =
      `<span class="badge">Connected ${dd.connectedVA} VA → ${dd.demandVA} VA (Table 220.54)</span>` +
      `<span class="badge">${esc(dd.factorLabel)}</span>`;
  }

  // ---- NEC 220.53 fixed-appliance demand (v1.12) ----
  function faFields() {
    const el = id => $('#fa' + id);
    const n = x => (el(x) && el(x).value !== '') ? (+el(x).value || null) : null;
    return { count: n('Count'), totalVA: n('Total') };
  }

  function renderFaInputs() {
    const l = state.fa || {};
    const set = (id, v) => { const e = $('#fa' + id); if (e) e.value = (v == null ? '' : v); };
    set('Count', l.count);
    set('Total', l.totalVA);
  }

  function renderFa() {
    const l = faFields();
    const count = (l.count === null) ? 0 : l.count;
    if (!(count > 0)) {
      $('#faSum').textContent = '—';
      $('#faBadges').innerHTML = '<span class="badge">Enter the count of fastened-in-place appliances (each ¼ hp or 500 W or greater) to apply 220.53 (2017–2023)</span>';
      return;
    }
    const fa = applianceDemand22053(l);
    $('#faSum').textContent = fa.eligible
      ? `${fa.totalVA} VA connected → ${fa.demandVA} VA appliance demand  (${fa.count} appliances, 75% factor)`
      : `${fa.totalVA} VA connected → ${fa.demandVA} VA appliance demand  (${fa.count} appliance(s) — fewer than 4, factor not permitted)`;
    let badges =
      `<span class="badge">Eligible appliances: ${fa.count} (each ¼ hp or 500 W or greater)</span>` +
      `<span class="badge">220.53 factor: ${fa.factorPct}%${fa.eligible ? ' (4 or more appliances)' : ' (not permitted — under 4)'}</span>`;
    if (fa.eligible && fa.savingsVA > 0) badges += `<span class="badge ok">Demand reduction: −${fa.savingsVA} VA (25%)</span>`;
    if (!fa.eligible) badges += `<span class="badge warn">220.53 requires four or more eligible appliances on the same feeder/service to apply the 75% factor</span>`;
    $('#faBadges').innerHTML = badges;
  }

  // ---- NEC 220.42 lighting load demand (v1.5) ----
  function ltFields() {
    const el = id => $('#lt' + id);
    const n = x => (el(x) && el(x).value !== '') ? (+el(x).value || null) : null;
    return {
      totalVA: n('Total'),
      occupancy: el('Occ') ? el('Occ').value : 'others'
    };
  }

  function renderLtInputs() {
    const l = state.lt || {};
    const set = (id, v) => { const e = $('#lt' + id); if (e) e.value = (v == null ? '' : v); };
    set('Total', l.totalVA);
    const o = $('#ltOcc'); if (o) o.value = l.occupancy || 'others';
  }

  function renderLt() {
    const l = ltFields();
    if (!(l.totalVA > 0)) {
      $('#ltSum').textContent = '—';
      $('#ltBadges').innerHTML = '<span class="badge">Enter the total general lighting load (VA) to apply the Table 220.42 demand (standard method, Part III)</span>';
      return;
    }
    const lt = lightingDemand22042(l);
    $('#ltSum').textContent = `${lt.demandVA} VA lighting demand  (${lt.totalVA} VA connected, ${esc(lt.occupancyLabel)})`;
    $('#ltBadges').innerHTML =
      lt.tiers.filter(t => t.sliceVA > 0).map(t =>
        `<span class="badge">${t.upTo === Infinity ? 'Remainder' : 'Up to ' + t.upTo.toLocaleString() + ' VA'} @ ${t.pct}% → ${t.demandVA.toLocaleString()} VA</span>`).join('') +
      `<span class="badge ok">Table 220.42 (${esc(lt.occupancy)})</span>`;
  }

  // ---- NEC 220.55 cooking appliance demand (v1.6) ----
  const CK_MODES = ['colC', 'note2', 'note3'];

  function ckFields() {
    const el = id => $('#ck' + id);
    const n = x => (el(x) && el(x).value !== '') ? (+el(x).value || null) : null;
    const s = x => (el(x) && el(x).value !== '') ? el(x).value : null;
    return {
      mode: el('Mode') ? el('Mode').value : 'colC',
      count: n('Count'),
      ratingKW: n('Rating'),
      threePhasePerPhaseMax: n('Ph3Max'),
      ratingsList: s('Ratings'),
      countA: n('CountA'),
      totalKWa: n('KwA'),
      countB: n('CountB'),
      totalKWb: n('KwB')
    };
  }

  function parseRatingList(str) {
    if (str == null) return [];
    return String(str).split(/[\s,;]+/).map(x => +x).filter(x => isFinite(x) && x > 0);
  }

  function renderCkInputs() {
    const l = state.ck || {};
    const set = (id, v) => { const e = $('#ck' + id); if (e) e.value = (v == null ? '' : v); };
    set('Mode', l.mode || 'colC');
    set('Count', l.count);
    set('Rating', l.ratingKW);
    set('Ph3Max', l.threePhasePerPhaseMax);
    set('Ratings', l.ratingsList);
    set('CountA', l.countA);
    set('KwA', l.totalKWa);
    set('CountB', l.countB);
    set('KwB', l.totalKWb);
  }

  function renderCk() {
    const l = ckFields();
    const mode = CK_MODES.indexOf(l.mode) >= 0 ? l.mode : 'colC';
    ['Count', 'Rating', 'Ph3Max', 'Ratings', 'CountA', 'KwA', 'CountB', 'KwB'].forEach(id => {
      const e = $('#ck' + id);
      if (!e) return;
      const show = (mode === 'colC' && id !== 'Ratings') ||
                   (mode === 'note2' && id === 'Ratings') ||
                   (mode === 'note3' && id !== 'Count' && id !== 'Rating' && id !== 'Ph3Max' && id !== 'Ratings');
      e.style.display = show ? '' : 'none';
    });
    const sumEl = $('#ckSum'), badgesEl = $('#ckBadges');
    if (!sumEl || !badgesEl) return;
    if (mode === 'colC') {
      const r = cookingDemand22055(l);
      if (!r.valid) {
        sumEl.textContent = '—';
        badgesEl.innerHTML = '<span class="badge">' + esc(r.reason || 'Enter the number of ranges') + '</span>';
        return;
      }
      sumEl.textContent = `${r.demandKW} kW demand (${r.effectiveCount} ${r.effectiveCount === 1 ? 'appliance' : 'appliances'} @ ${r.ratingKW} kW, Column C${r.increaseKW > 0 ? ' + Note 1' : ''})`;
      badgesEl.innerHTML =
        `<span class="badge">Column C base: ${r.baseKW} kW</span>` +
        (r.increaseKW > 0 ? `<span class="badge">Note 1: +${r.increaseKW} kW (5% per kW over 12 kW)</span>` : '') +
        (r.effectiveCount !== r.count ? `<span class="badge">3-phase 4-wire: 2 × max per-phase (${r.threePhasePerPhaseMax} → ${r.effectiveCount})</span>` : '') +
        `<span class="badge">${r.demandVA} VA (kVA ≡ kW)</span>`;
      return;
    }
    if (mode === 'note2') {
      const ratings = parseRatingList(l.ratingsList);
      const r = cookingNote2(ratings);
      if (!r.valid) {
        sumEl.textContent = '—';
        badgesEl.innerHTML = '<span class="badge">' + esc(r.reason || 'Enter unequal ratings (kW), comma-separated') + '</span>';
        return;
      }
      sumEl.textContent = `${r.demandKW} kW demand (${r.baseKW} kW base + ${r.increaseKW} kW Note 2 increase)`;
      badgesEl.innerHTML =
        `<span class="badge">${ratings.length} unequal ratings · average ${r.avgKW} kW</span>` +
        `<span class="badge">Column C base: ${r.baseKW} kW</span>` +
        `<span class="badge ok">Note 2 (unequal ratings &gt; 8¾ kW, none over 27 kW)</span>`;
      return;
    }
    // note3
    const o = { countA: l.countA, totalKWa: l.totalKWa, countB: l.countB, totalKWb: l.totalKWb };
    const r = cookingNote3KW(o);
    if (!r || !r.demandKW) {
      sumEl.textContent = '—';
      badgesEl.innerHTML = '<span class="badge">Enter nameplate counts + kW per column (appliances 1¾–8¾ kW)</span>';
      return;
    }
    sumEl.textContent = `${r.demandKW} kW demand (Note 3, Column A/B factors — in lieu of Column C)`;
    badgesEl.innerHTML = r.parts.map(p => `<span class="badge">${esc(p)}</span>`).join('') +
      '<span class="badge ok">Note 3 (over 1¾ kW through 8¾ kW)</span>';
  }

  // ---- NEC 220.61 neutral load (v1.7) ----
  function nlFields() {
    const el = id => $('#' + id);
    const n = id => (el(id) && el(id).value !== '') ? (+el(id).value || null) : null;
    return {
      totalVA: n('nlTotal'),
      cookingDryerVA: n('nlCook'),
      volt: n('nlVolt'),
      applyB1: !!(el('nlB1') && el('nlB1').checked),
      applyB2: !!(el('nlB2') && el('nlB2').checked),
      dwelling: !!(el('nlDw') && el('nlDw').checked),
      mat: (el('nlMat') && el('nlMat').value === 'al') ? 'al' : 'cu',
      temp: (el('nlTemp') && ['60', '75', '90'].indexOf(el('nlTemp').value) >= 0) ? +el('nlTemp').value : 75
    };
  }

  function renderNlInputs() {
    const l = state.nl || {};
    const set = (id, v) => { const e = $('#nl' + id); if (e) e.value = (v == null ? '' : v); };
    const chk = (id, v) => { const e = $('#nl' + id); if (e) e.checked = !!v; };
    set('Total', l.totalVA);
    set('Cook', l.cookingDryerVA);
    set('Volt', l.volt);
    // B2 defaults ON (most common); dwelling/B1 default OFF unless saved
    chk('B1', l.applyB1);
    chk('B2', l.applyB2 === undefined ? true : l.applyB2);
    chk('Dw', l.dwelling);
    const selM = $('#nlMat'), selT = $('#nlTemp');
    if (selM) selM.value = l.mat || 'cu';
    if (selT) selT.value = String(l.temp || 75);
  }

  function renderNl() {
    const l = nlFields();
    const sumEl = $('#nlSum'), badgesEl = $('#nlBadges');
    if (!sumEl || !badgesEl) return;
    if (!(l.totalVA > 0) || !(l.volt > 0)) {
      sumEl.textContent = '—';
      badgesEl.innerHTML = '<span class="badge">Enter the total neutral (max unbalanced) load + phase-to-neutral voltage to apply 220.61</span>';
      return;
    }
    const r = neutralLoad22061(l);
    if (!r.valid) {
      sumEl.textContent = '—';
      badgesEl.innerHTML = '<span class="badge bad">' + esc(r.reason) + '</span>';
      return;
    }
    let s = `${r.finalA} A calculated neutral load`;
    if (r.dwelling) s += `  →  min neutral ampacity ${r.minAmpA} A (310.12(B) 83%)`;
    s += `  @ ${r.volt} V`;
    sumEl.textContent = s;
    // Conductor pick from the verified Table 310.16 (v1.8)
    const pick = pickConductor31016(r.minAmpA, l.mat || 'cu', +(l.temp || 75));
    if (!pick.over && pick.size) {
      s = sumEl.textContent + `  →  ${pick.label} neutral (Table 310.16, ${pick.amp} A @ ${l.temp || 75} °C)`;
      sumEl.textContent = s;
    }
    let b = '';
    if (r.b1 && r.cookVA > 0) b += `<span class="badge">220.61(B)(1): cooking/dryer ${r.cookVA} VA → ${r.cookDemandVA} VA (70%)</span>`;
    b += `<span class="badge">220.61(A) basic: ${r.basicA} A</span>`;
    if (r.b2Applied) b += `<span class="badge">220.61(B)(2): 70% on portion over 200 A → ${r.finalA} A</span>`;
    b += `<span class="badge ok">Min neutral conductor ampacity: ${r.minAmpA} A</span>`;
    if (!pick.over && pick.size) {
      b += `<span class="badge ok">${pick.label} — ${pick.amp} A in the ${l.temp || 75} °C column (Table 310.16)</span>`;
      pick.notes.forEach(n => { b += `<span class="badge">${esc(n)}</span>`; });
    } else if (pick.over) {
      b += `<span class="badge warn">${esc(pick.over)}</span>`;
    }
    b += '<span class="badge">310.15 ambient/derating adjustments not applied — Table 310.16 base values (30 °C, ≤3 CCC)</span>';
    b += '<span class="badge warn">220.61(C) prohibited reductions NOT applied (wye 3-wire + nonlinear @100%)</span>';
    badgesEl.innerHTML = b;
  }

  // ---- Voltage drop (v1.13) ----
  const VD_SIZES = CH9_T8.map(r => r.s);

  function vdFields() {
    const el = id => $('#vd' + id);
    const n = x => (el(x) && el(x).value !== '') ? (+el(x).value || null) : null;
    return {
      amps: n('Amps'),
      lengthFt: n('Len'),
      volt: n('Volt'),
      size: el('Size') && el('Size').value !== '' ? el('Size').value : null,
      mat: (el('Mat') && el('Mat').value === 'al') ? 'al' : 'cu',
      config: el('Config') && el('Config').value === '3ph' ? '3ph' : '1ph'
    };
  }

  function renderVdInputs() {
    const l = state.vd || {};
    const set = (id, v) => { const e = $('#vd' + id); if (e) e.value = (v == null ? '' : v); };
    set('Amps', l.amps);
    set('Len', l.lengthFt);
    set('Volt', l.volt);
    set('Size', l.size);
    set('Mat', l.mat || 'cu');
    set('Config', l.config || '1ph');
  }

  function renderVd() {
    const l = vdFields();
    const sumEl = $('#vdSum'), badgesEl = $('#vdBadges');
    if (!sumEl || !badgesEl) return;
    if (!(l.amps > 0) || !(l.lengthFt > 0) || !(l.volt > 0) || !l.size) {
      sumEl.textContent = '—';
      badgesEl.innerHTML = '<span class="badge">Enter current, one-way length, voltage + conductor size to check the drop (Ch. 9 Table 8, 75 °C DC values)</span>';
      return;
    }
    const vd = voltageDrop(l);
    if (!vd.valid) {
      sumEl.textContent = '—';
      badgesEl.innerHTML = '<span class="badge bad">' + esc(vd.reason) + '</span>';
      return;
    }
    sumEl.textContent = `${vd.vdV} V drop (${vd.pctV}% of ${vd.volt} V) — ${vd.label}, ${vd.lengthFt} ft @ ${vd.amps} A`;
    const cls = vd.status === 'ok' ? 'ok' : vd.status === 'warn' ? 'warn' : 'bad';
    let b = `<span class="badge ${cls}">${vd.pctV}% drop — ${vd.status === 'ok' ? 'within the 3% recommendation' : vd.status === 'warn' ? 'over 3%, under the 5% total — review' : 'exceeds the 5% feeder + branch total'}</span>`;
    b += `<span class="badge">${esc(vd.label)} — ${vd.rPerKft} Ω/kft (one-way ${vd.rOneWay} Ω)</span>`;
    b += `<span class="badge">C = ${vd.threePhase ? '√3 (3-phase L-L)' : '2 (single-phase round trip)'} · K-eff ${vd.kEff}</span>`;
    if (vd.status !== 'ok') {
      const sz = sizeForVoltageDrop(l);
      if (sz.valid && sz.pick) b += `<span class="badge ok">Smallest size ≤ 3%: ${esc(sz.pick.label)} (${sz.pick.pctV}%)</span>`;
      else if (sz.over) b += `<span class="badge warn">${esc(sz.over)}</span>`;
    }
    b += '<span class="badge">3%/5% = informational-note recommendations (210.19(A) / 215.2(A)) — not mandatory limits</span>';
    badgesEl.innerHTML = b;
  }

  function renderDw() {
    const dw = dwStatus(state);
    const allMet = dw.metCount === dw.total;
    $('#dwSummary').innerHTML =
      `<span class="badge ${allMet ? 'ok' : 'bad'}">NEC 210.11 — ${dw.metCount} of ${dw.total} requirements verified</span>` +
      dw.items.filter(i => !i.met).map(i =>
        `<span class="badge">open: ${esc(i.label.length > 30 ? i.label.slice(0, 30) + '…' : i.label)}</span>`).join('');
    const tbody = $('#dwBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    dw.items.forEach((it, i) => {
      const tr = document.createElement('tr');
      const stLabel = it.status === 'auto' ? ('auto · ' + it.auto) : it.status === 'ok' ? '✓ verified' : '✗ missing';
      const stCls = it.status === 'ok' ? 'ok' : it.status === 'missing' ? 'bad' : (it.met ? 'ok' : 'warn');
      tr.innerHTML = `
        <td>
          <input class="dw-label" data-i="${i}" data-f="label" value="${esc(it.label)}">
          ${it.note ? `<div class="dwnote">${esc(it.note)}</div>` : ''}
        </td>
        <td><input class="dw-cite" data-i="${i}" data-f="cite" value="${esc(it.cite)}"></td>
        <td><input class="dw-min" data-i="${i}" data-f="min" type="number" min="0" max="99" value="${it.min}"></td>
        <td class="num rec" title="circuits (any panel) whose name/notes match the keyword pattern">${it.auto}</td>
        <td class="ctr"><button class="btn-dw ${stCls}" data-i="${i}" title="Click to cycle: auto → verified → missing">${stLabel}</button></td>
        <td><input class="dw-kw" data-i="${i}" data-f="kw" value="${esc(it.kw)}" title="auto-match keyword pattern (case-insensitive regex; may contain | alternates)"></td>`;
      tbody.appendChild(tr);
    });
  }

  // ---- Branded print report (v1.9): the full project, from state, into #printReport ----
  // The browser hides .app-ui and shows #printReport under @media print; the
  // user's "Save as PDF" then produces the branded report. Rebuilt on every
  // render so print output always matches the live screen.
  function renderPrintReport() {
    const el = $('#printReport');
    if (!el) return;
    el.innerHTML = printReportHTML(state);
  }

  function renderAll() { renderPanels(); renderTable(); renderBadges(); renderService(); renderLcInputs(); renderLc(); renderDdInputs(); renderDd(); renderFaInputs(); renderFa(); renderLtInputs(); renderLt(); renderCkInputs(); renderCk(); renderNlInputs(); renderNl(); renderVdInputs(); renderVd(); renderDw(); renderPrintReport(); }

  // ---- actions ----
  function addCircuit() {
    const p = panel();
    p.circuits.push({
      pos: '', name: '', type: SYSTEMS[p.system].options[0].id,
      loadA: 0, continuous: false, breaker: null, notes: ''
    });
    saveState(); renderTable(); renderBadges(); renderService();
    const rows = $('#circuits').querySelectorAll('input.in-name');
    if (rows.length) rows[rows.length - 1].focus();
  }

  function deleteCircuit(i) {
    const p = panel();
    p.circuits.splice(i, 1);
    saveState(); renderTable(); renderBadges(); renderService();
  }

  function onTableInput(e) {
    const el = e.target;
    if (!el.dataset.i) return;
    const i = +el.dataset.i, f = el.dataset.f, p = panel();
    const c = p.circuits[i];
    if (!c) return;
    if (el.type === 'checkbox') c[f] = el.checked;
    else if (el.type === 'number') c[f] = el.value === '' ? (f === 'loadA' ? 0 : null) : +el.value;
    else c[f] = el.value;
    saveState();
    const req = reqBreakerA(c.loadA, c.continuous);
    const rec = req != null ? (nextStdBreaker(req) || '—') : '—';
    const loadInput = document.querySelector(`input.in-load[data-i="${i}"]`);
    if (loadInput) {
      const recCell = loadInput.closest('tr').querySelector('.rec');
      if (recCell) recCell.textContent = rec;
    }
    renderBadges(); renderService();
  }

  // ---- panel management (v1.1) ----
  function addPanel() {
    state.panels.push(emptyPanel('Panel ' + (state.panels.length + 1)));
    cur = state.panels.length - 1;
    saveState(); renderAll();
  }

  function duplicatePanel() {
    const p = panel();
    const copy = JSON.parse(JSON.stringify(p));
    copy.name = (p.name || 'Panel') + ' (copy)';
    state.panels.splice(cur + 1, 0, copy);
    cur = cur + 1;
    saveState(); renderAll();
  }

  function deletePanel() {
    if (state.panels.length <= 1) { alert('A project needs at least one panel. (Use Clear to empty circuits.)'); return; }
    const p = panel();
    if (!confirm(`Delete panel “${p.name}” and its ${p.circuits.length} circuits?`)) return;
    state.panels.splice(cur, 1);
    if (cur >= state.panels.length) cur = state.panels.length - 1;
    saveState(); renderAll();
  }

  // ---- IO ----
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function slug(s) { return String(s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function exportPanelCSV() {
    const p = panel();
    download(slug(state.projectName) + '-' + slug(p.name) + '.csv', toCSV(p, state.projectName), 'text/csv');
  }

  function exportProjectCSV() {
    download(slug(state.projectName) + '-rollup.csv', projectToCSV(state), 'text/csv');
  }

  function exportJSON() {
    download(slug(state.projectName) + '-panelwright.json', toJSON(state), 'application/json');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        state = fromJSON(String(reader.result));
        cur = 0;
        saveState(); renderAll();
      } catch (err) {
        alert('Could not import: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function clearAll() {
    if (!confirm('Clear ALL panels and circuits? (Save JSON first if you want a backup.)')) return;
    state = defaultProject();
    state.projectName = 'Untitled Project';
    state.dw = normalizeDw(null);
    cur = 0;
    saveState(); renderAll();
  }

  function loadSample() {
    if (state.panels.length > 1 || panel().circuits.length > 0) {
      if (!confirm('Replace the current project with the sample?')) return;
    }
    const mk = (pos, name, type, load, cont, brk) =>
      ({ pos, name, type, loadA: load, continuous: !!cont, breaker: brk || null, notes: '' });
    state = {
      version: 2,
      projectName: 'Sample — Office Building',
      serviceA: 800,
      notes: 'demo project',
      panels: [
        {
          name: 'Main Panel', system: '208-120-3ph', ratingA: 400, notes: 'Level 1',
          circuits: [
            mk('1', 'Entrance lighting', 'L1N', 12, false, 15),
            mk('2', 'Refrigerator', 'L1N', 6, false, 15),
            mk('3-4', 'HVAC compressor', 'L1L2', 22, true, 30),
            mk('5', 'Corridor lighting', 'L2N', 12, false, 15),
            mk('6-7', 'Heater 1', 'L2L3', 16.7, true, 30),
            mk('8', 'Receptacles L3', 'L3N', 12, false, 15),
            mk('9-11', 'Machine feed', '3ph', 18, true, 30),
            mk('12', 'Exit sign', 'L3N', 1.5, false, 15)
          ]
        },
        {
          name: 'Sub — Kitchen', system: '120-240-1ph', ratingA: 200, notes: 'Level 1',
          circuits: [
            mk('1', 'Dishwasher', 'L1', 5.5, true, 15),
            mk('2', 'Oven/dryer feed', 'L2', 16.7, true, 20),
            mk('3-4', 'Range', 'L1L2', 20, true, 40)
          ]
        }
      ]
    };
    cur = 0;
    state.dw = normalizeDw(null);
    saveState(); renderAll();
  }

  function init() {
    state = loadState();
    state.dw = normalizeDw(state.dw);
    cur = 0;
    // v1.13: fill the voltage-drop conductor-size select from the verified table
    {
      const sel = $('#vdSize');
      if (sel) sel.innerHTML = VD_SIZES.map(s => `<option value="${s}">${conductorLabel(s)}</option>`).join('');
    }
    renderAll();
    updateSavedAt();

    $('#btnAdd').onclick = addCircuit;
    $('#btnBalance').onclick = () => {
      const p = panel();
      p.circuits = autoBalance(p.circuits, p.system);
      saveState(); renderTable(); renderBadges(); renderService();
    };
    $('#btnCSV').onclick = exportPanelCSV;
    $('#btnJSON').onclick = exportJSON;
    $('#btnImport').onclick = () => $('#fileImport').click();
    $('#btnPrint').onclick = () => { renderPrintReport(); window.print(); };
    $('#btnClear').onclick = clearAll;
    $('#btnSample').onclick = loadSample;
    $('#btnAddPanel').onclick = addPanel;
    $('#btnDupPanel').onclick = duplicatePanel;
    $('#btnDelPanel').onclick = deletePanel;
    $('#btnRollupCSV').onclick = exportProjectCSV;
    // Regenerate the report on every print, even direct Ctrl+P (not just the button),
    // so a stale report can never be printed. renderPrintReport is idempotent/pure.
    window.addEventListener('beforeprint', renderPrintReport);
    $('#dwCard').addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.i == null) return;
      const i = +el.dataset.i, f = el.dataset.f;
      state.dw = normalizeDw(state.dw);
      const it = state.dw.items[i];
      if (!it) return;
      it[f] = f === 'min' ? Math.max(0, Math.min(99, Math.round(+el.value || 0))) : el.value;
      saveState(); renderDw();
    });
    $('#dwCard').addEventListener('click', e => {
      const b = e.target.closest('.btn-dw');
      if (!b) return;
      const i = +b.dataset.i;
      state.dw = normalizeDw(state.dw);
      const it = state.dw.items[i];
      if (!it) return;
      const cur = (it.manual === 'ok' || it.manual === 'missing') ? it.manual : 'auto';
      it.manual = cur === 'auto' ? 'ok' : cur === 'ok' ? 'missing' : 'auto';
      saveState(); renderDw();
    });
    $('#btnDwReset').onclick = () => {
      if (!confirm('Reset the NEC 210.11 checklist to the 2017–2023 defaults?')) return;
      state.dw = normalizeDw(null);
      saveState(); renderDw();
    };
    $('#lcCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('lc')) return;
      if (e.target.id === 'lcUnit') { lcUnitChanged(); return; }
      state.lc = lcFields();
      saveState(); renderLc();
    });
    // v1.11: service-line material/temperature selects fire 'change'
    $('#lcCard').addEventListener('change', e => {
      if (e.target.id !== 'lcSvcMat' && e.target.id !== 'lcSvcTemp') return;
      state.lc = lcFields();
      saveState(); renderLc();
    });
    $('#btnLcReset').onclick = () => {
      state.lc = null;
      saveState(); renderLcInputs(); renderLc();
    };
    $('#ddCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('dd')) return;
      state.dd = ddFields();
      saveState(); renderDd();
    });
    $('#btnDdReset').onclick = () => {
      state.dd = null;
      saveState(); renderDdInputs(); renderDd();
    };
    $('#faCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('fa')) return;
      state.fa = faFields();
      saveState(); renderFa();
    });
    $('#btnFaReset').onclick = () => {
      state.fa = null;
      saveState(); renderFaInputs(); renderFa();
    };
    $('#ltCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('lt')) return;
      state.lt = ltFields();
      saveState(); renderLt();
    });
    $('#btnLtReset').onclick = () => {
      state.lt = null;
      saveState(); renderLtInputs(); renderLt();
    };
    $('#ckCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('ck')) return;
      state.ck = ckFields();
      saveState(); renderCk();
    });
    $('#ckCard').addEventListener('change', e => {
      if (e.target.id === 'ckMode') {
        state.ck = ckFields();
        saveState(); renderCk();
      }
    });
    $('#btnCkReset').onclick = () => {
      state.ck = null;
      saveState(); renderCkInputs(); renderCk();
    };
    $('#nlCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('nl')) return;
      state.nl = nlFields();
      saveState(); renderNl();
    });
    // selects (mat/temp) fire 'change'; re-render so the pick updates reliably
    $('#nlCard').addEventListener('change', e => {
      if (e.target.id !== 'nlMat' && e.target.id !== 'nlTemp') return;
      state.nl = nlFields();
      saveState(); renderNl();
    });
    $('#btnNlReset').onclick = () => {
      state.nl = null;
      saveState(); renderNlInputs(); renderNl();
    };
    // v1.13: voltage-drop card
    $('#vdCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('vd')) return;
      state.vd = vdFields();
      saveState(); renderVd();
    });
    $('#vdCard').addEventListener('change', e => {
      if (e.target.id !== 'vdSize' && e.target.id !== 'vdMat' && e.target.id !== 'vdConfig') return;
      state.vd = vdFields();
      saveState(); renderVd();
    });
    $('#btnVdReset').onclick = () => {
      state.vd = null;
      saveState(); renderVdInputs(); renderVd();
    };
    $('#fileImport').onchange = e => {
      if (e.target.files && e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = '';
    };
    $('#tableWrap').addEventListener('input', onTableInput);
    $('#tableWrap').addEventListener('click', e => {
      const del = e.target.closest('.btn-del');
      if (del) deleteCircuit(+del.dataset.i);
    });
    $('#projectName').oninput = e => { state.projectName = e.target.value; saveState(); };
    $('#serviceA').oninput = e => { state.serviceA = +e.target.value || null; saveState(); renderService(); };
    $('#projectNotes').oninput = e => { state.notes = e.target.value; saveState(); };
    $('#system').onchange = e => {
      const p = panel();
      p.system = e.target.value;
      saveState(); renderTable(); renderBadges(); renderService();
    };
    $('#panelName').oninput = e => {
      const p = panel();
      p.name = e.target.value; saveState();
      // update tab label without full re-render (keeps focus)
      const tabs = $('#panelTabs').children;
      if (tabs[cur]) tabs[cur].textContent = (cur + 1) + '. ' + (p.name || 'Panel');
    };
    $('#ratingA').oninput = e => {
      const p = panel();
      p.ratingA = +e.target.value || null;
      saveState(); renderTable(); renderBadges(); renderService();
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
