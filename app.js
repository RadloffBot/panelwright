/*
 * PanelWright v1.5 — panel schedule calculator (NEC design aid)
 * Multi-panel projects + service-entrance rollup.
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
  //   Amps = total VA / service voltage.  Neutral per 220.61 (out of scope here).
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
    const appliancesVA = num(o.appliancesVA);       // 220.82(B)(3) nameplate, incl. dryers NOT on laundry branch
    const motorsVA = num(o.motorsVA);               // 220.82(B)(4) permanently connected
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
      L.push(['Appliances nameplate (220.82B3)', lc.appliancesVA + ' VA']);
      L.push(['Permanently connected motors (220.82B4)', lc.motorsVA + ' VA']);
      L.push(['General connected load', lc.generalConnectedVA + ' VA']);
      L.push(['General demand (first 10k @100% + 40% of remainder)', lc.generalDemandVA + ' VA']);
      L.push(['Largest heating/cooling (220.82C)', lc.hvacDemandVA + ' VA']);
      L.push(['Total demand load', lc.totalVA + ' VA']);
      L.push(['Service voltage', lc.volt + ' V']);
      L.push(['Service current (VA/V)', lc.amps + ' A']);
      L.push(['Recommended standard breaker (NEC 240.6)', (lc.recommendedBreakerA || '—') + ' A']);
      L.push(['Note', 'Design aid only — 220.82 is a single-dwelling-unit optional method; verify against the adopted NEC edition. Neutral load per 220.61 not included.']);
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
    dryerFactorPct, dryerFactorLabel, dryerDemand22054,
    LIT_TABLES, lightingDemand22042,
    toCSV, projectToCSV, toJSON, fromJSON, migrate, round2
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

  // ---- NEC 220.82 service load (v1.3) ----
  function lcFields() {
    const el = id => $('#lc' + id);
    const n = x => (el(x) && el(x).value !== '') ? (+el(x).value || null) : null;
    return {
      sqft: n('Sqft'),
      smallApplianceCircuits: (el('SmallApp') && el('SmallApp').value !== '') ? +el('SmallApp').value : 2,
      laundryCircuits: (el('Laundry') && el('Laundry').value !== '') ? +el('Laundry').value : 1,
      appliancesVA: n('Appliances'),
      motorsVA: n('Motors'),
      volt: el('Volt') ? +el('Volt').value : 240,
      acVA: n('Ac'),
      hpNoSuppVA: n('HpNoSupp'),
      hpCompressorVA: n('HpComp'),
      hpSuppVA: n('HpSupp'),
      spaceHeatingVA: n('Space'),
      spaceUnits: n('SpaceUnits'),
      thermalStorageVA: n('Thermal')
    };
  }

  function renderLcInputs() {
    const l = state.lc || {};
    const set = (id, v) => { const e = $('#lc' + id); if (e) e.value = (v == null ? '' : v); };
    set('Sqft', l.sqft);
    set('SmallApp', l.smallApplianceCircuits != null ? l.smallApplianceCircuits : 2);
    set('Laundry', l.laundryCircuits != null ? l.laundryCircuits : 1);
    set('Appliances', l.appliancesVA);
    set('Motors', l.motorsVA);
    set('Ac', l.acVA);
    set('HpNoSupp', l.hpNoSuppVA);
    set('HpComp', l.hpCompressorVA);
    set('HpSupp', l.hpSuppVA);
    set('Space', l.spaceHeatingVA);
    set('SpaceUnits', l.spaceUnits);
    set('Thermal', l.thermalStorageVA);
    const v = $('#lcVolt'); if (v && l.volt) v.value = String(l.volt);
  }

  function renderLc() {
    const l = lcFields();
    const any = [l.sqft, l.appliancesVA, l.motorsVA, l.acVA, l.hpNoSuppVA, l.hpCompressorVA,
      l.hpSuppVA, l.spaceHeatingVA, l.thermalStorageVA].some(x => x != null && x > 0);
    if (!any) {
      $('#lcSum').textContent = '—';
      $('#lcBadges').innerHTML = '<span class="badge">Enter floor area + appliance / HVAC loads to size the service per 220.82</span>';
      return;
    }
    const lc = serviceLoad22082(l);
    $('#lcSum').textContent = `Total demand ${lc.totalVA} VA  →  ${lc.amps} A @ ${lc.volt} V`;
    $('#lcBadges').innerHTML =
      `<span class="badge">General ${lc.generalConnectedVA} VA → ${lc.generalDemandVA} VA (220.82(B))</span>` +
      `<span class="badge">Largest HVAC ${lc.hvacDemandVA} VA (220.82(C))</span>` +
      `<span class="badge ok">Recommended service: ${lc.recommendedBreakerA || '—'} A (NEC 240.6)</span>` +
      ((state.serviceA && lc.amps > state.serviceA)
        ? `<span class="badge bad">Exceeds project service rating ${state.serviceA} A</span>` : '');
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

  function renderPrintHdr() {
    const a = $('#prjNamePrint'), b = $('#svcAPrint'), c = $('#printDate');
    if (a) a.textContent = state.projectName || 'Untitled Project';
    if (b) b.textContent = state.serviceA ? state.serviceA + ' A' : 'not set';
    if (c) c.textContent = new Date().toLocaleDateString();
  }

  function renderAll() { renderPanels(); renderTable(); renderBadges(); renderService(); renderLcInputs(); renderLc(); renderDdInputs(); renderDd(); renderLtInputs(); renderLt(); renderDw(); renderPrintHdr(); }

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
    $('#btnPrint').onclick = () => window.print();
    $('#btnClear').onclick = clearAll;
    $('#btnSample').onclick = loadSample;
    $('#btnAddPanel').onclick = addPanel;
    $('#btnDupPanel').onclick = duplicatePanel;
    $('#btnDelPanel').onclick = deletePanel;
    $('#btnRollupCSV').onclick = exportProjectCSV;
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
    $('#ltCard').addEventListener('input', e => {
      if (!e.target.id || !e.target.id.startsWith('lt')) return;
      state.lt = ltFields();
      saveState(); renderLt();
    });
    $('#btnLtReset').onclick = () => {
      state.lt = null;
      saveState(); renderLtInputs(); renderLt();
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
