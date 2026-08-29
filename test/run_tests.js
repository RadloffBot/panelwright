/* PanelWright v1.1 core math tests — run: node test/run_tests.js */
'use strict';
const core = require('../app.js');
let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       expected ${JSON.stringify(expected)}\n       got      ${JSON.stringify(actual)}`); }
}
function approx(actual, expected, tol, label) {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       expected ${expected} ± ${tol}\n       got      ${actual}`); }
}

console.log('nextStdBreaker:');
eq(core.nextStdBreaker(15), 15, '15 -> 15');
eq(core.nextStdBreaker(15.1), 20, '15.1 -> 20');
eq(core.nextStdBreaker(18.75), 20, '18.75 -> 20');
eq(core.nextStdBreaker(21), 25, '21 -> 25');
eq(core.nextStdBreaker(26.25), 30, '26.25 -> 30 (21A continuous)');
eq(core.nextStdBreaker(90), 90, '90 -> 90');
eq(core.nextStdBreaker(91), 100, '91 -> 100');
eq(core.nextStdBreaker(130), 140, '130 -> 140 (standard size exists)');
eq(core.nextStdBreaker(0), null, '0 -> null');
eq(core.nextStdBreaker(-5), null, 'neg -> null');
eq(core.nextStdBreaker(9999), null, 'too big -> null');

console.log('reqBreakerA:');
eq(core.reqBreakerA(16, true), 20, '16A continuous -> 20 required');
eq(core.reqBreakerA(16, false), 16, '16A non-cont -> 16 required');
eq(core.reqBreakerA(0, true), 0, '0A cont -> 0');
eq(core.reqBreakerA(-1, false), null, 'neg load -> null');

console.log('circuitContribution:');
eq(core.circuitContribution({ type: 'L1N', loadA: 10 }, '208-120-3ph'), { L1: 10, L2: 0, L3: 0 }, 'L1N 10A');
eq(core.circuitContribution({ type: 'L1L2', loadA: 12 }, '208-120-3ph'), { L1: 12, L2: 12, L3: 0 }, '2-pole L1L2 adds to both');
eq(core.circuitContribution({ type: '3ph', loadA: 5 }, '480-277-3ph'), { L1: 5, L2: 5, L3: 5 }, '3ph adds to all');
eq(core.circuitContribution({ type: 'L2', loadA: 8 }, '120-240-1ph'), { L1: 0, L2: 8, L3: 0 }, '1ph system L2');
eq(core.circuitContribution({ type: 'BOGUS', loadA: 8 }, '208-120-3ph'), { L1: 0, L2: 0, L3: 0 }, 'unknown type -> zero');

console.log('panelTotals (hand-verified):');
// L1: 10+12+5=27 ; L2: 12+0+16.7+5=33.7 ; L3: 16.7+5=21.7 ; avg=27.4667 ; dev=6.2333
const cs = [
  { type: 'L1N', loadA: 10 },
  { type: 'L1L2', loadA: 12, continuous: true },
  { type: 'L2N', loadA: 0 },
  { type: 'L2L3', loadA: 16.7 },
  { type: '3ph', loadA: 5 }
];
const t = core.panelTotals(cs, '208-120-3ph', 400);
eq(t.L1, 27, 'L1 = 27');
eq(t.L2, 33.7, 'L2 = 33.7');
eq(t.L3, 21.7, 'L3 = 21.7');
approx(t.imbalancePct, 22.69, 0.01, 'imbalance 22.69%');
eq(t.neutralEst, 6.23, 'neutral est 6.23');
eq(t.neutralLimit, 20, 'neutral limit 20 (5% of 400)');
eq(t.neutralOk, true, 'neutral ok');
approx(t.loadPct, 8.43, 0.01, 'load 8.43% of rating');
eq(t.is3ph, true, 'is 3ph');

console.log('panelTotals 1ph:');
const t1 = core.panelTotals([{ type: 'L1', loadA: 30 }, { type: 'L2', loadA: 25 }], '120-240-1ph', 200);
approx(t1.imbalancePct, 16.67, 0.01, '(30-25)/30 = 16.67%');
approx(t1.loadPct, 15, 0.01, 'max phase 15% of 200A');

console.log('panelTotals overload:');
const t2 = core.panelTotals([{ type: 'L1', loadA: 250 }], '120-240-1ph', 200);
approx(t2.loadPct, 125, 0.01, '125% of rating');

console.log('panelTotals empty/null:');
eq(core.panelTotals([], '208-120-3ph', 400).totalLoadA, 0, 'empty circuits -> 0');
eq(core.panelTotals(null, '208-120-3ph', 400).is3ph, true, 'null circuits handled');

console.log('autoBalance:');
const ab = core.autoBalance([
  { pos: '1', type: 'L1N', loadA: 50 },
  { pos: '2', type: 'L1N', loadA: 40 },
  { pos: '3', type: 'L1N', loadA: 30 },
  { pos: '4', type: '3ph', loadA: 10 }
], '208-120-3ph');
const tb = core.panelTotals(ab, '208-120-3ph', 400);
eq(tb.L1 + tb.L2 + tb.L3, 150, 'totals conserved (150)');
const sorted = [tb.L1, tb.L2, tb.L3].sort((a, b) => b - a);
eq(sorted, [60, 50, 40], 'balanced as evenly as possible 60/50/40');
eq(core.autoBalance([], '208-120-3ph'), [], 'empty ok');
const ab1 = core.autoBalance([
  { type: 'L1', loadA: 30 }, { type: 'L1', loadA: 20 }, { type: 'L1', loadA: 10 }
], '120-240-1ph');
const tb1 = core.panelTotals(ab1, '120-240-1ph', 200);
eq(Math.max(tb1.L1, tb1.L2), 30, '1ph max phase 30');
eq(Math.min(tb1.L1, tb1.L2), 30, '1ph min phase 30 (perfect)');
// pole-count constraint: 2-pole circuit must stay 2-pole after balance
const ab2 = core.autoBalance([{ type: 'L1L2', loadA: 40 }], '208-120-3ph');
eq(ab2[0].type, 'L1L2', '2-pole stays 2-pole');
// bookkeeping fields stripped
eq(ab2[0]._i, undefined, '_i stripped');
eq(ab2[0]._poles, undefined, '_poles stripped');

console.log('project model (v1.1):');
const proj = {
  version: 2, projectName: 'Test', serviceA: 600, notes: '',
  panels: [
    { name: 'Main', system: '208-120-3ph', ratingA: 400, notes: '',
      circuits: [{ type: 'L1N', loadA: 10 }, { type: 'L2N', loadA: 20 }, { type: 'L1L2', loadA: 5 }] },
    { name: 'Sub', system: '120-240-1ph', ratingA: 200, notes: '',
      circuits: [{ type: 'L1', loadA: 30 }] }
  ]
};
const pt = core.projectTotals(proj);
// Main: L1=15, L2=25, L3=0 ; Sub: L1=30
// Service: L1=45, L2=25, L3=0 ; total=70
eq(pt.L1, 45, 'service L1 = 45');
eq(pt.L2, 25, 'service L2 = 25');
eq(pt.L3, 0, 'service L3 = 0');
eq(pt.total, 70, 'service total = 70');
eq(pt.perPanel.length, 2, 'two panels reported');
eq(pt.perPanel[0].L2, 25, 'per-panel main L2 = 25');
approx(pt.servicePct, 7.5, 0.01, '45/600 = 7.5% of service');
const ptNull = core.projectTotals({ version: 2, projectName: 'x', serviceA: null, panels: proj.panels });
eq(ptNull.servicePct, null, 'no service rating -> null pct');

console.log('migrate (v1 -> v2):');
const v1 = { name: 'Old Panel', system: '120-240-1ph', ratingA: 200, notes: 'legacy', circuits: [{ type: 'L1', loadA: 5, continuous: false, breaker: 15 }] };
const mig = core.migrate(v1);
eq(mig.version, 2, 'migrated to v2');
eq(mig.panels.length, 1, 'one panel');
eq(mig.panels[0].system, '120-240-1ph', 'panel system kept');
eq(mig.panels[0].circuits[0].loadA, 5, 'circuits kept');
let threw = false;
try { core.migrate({ foo: 1 }); } catch (e) { threw = true; }
eq(threw, true, 'rejects unknown shape');
const rt = core.fromJSON(core.toJSON(proj));
eq(rt.panels[1].circuits[0].type, 'L1', 'v2 roundtrip ok');

console.log('toCSV (single panel, v1-compatible):');
const csv = core.toCSV(proj.panels[0], 'Test Project');
const rows = csv.split('\n');
eq(rows[0], 'PanelWright Panel Schedule,', 'csv header row');
eq(rows[1], 'Panel,Main', 'csv panel row');
eq(rows[2], 'Project,Test Project', 'csv project row');
eq(csv.includes('Position,Circuit,Type'), true, 'csv column header');
eq(csv.includes('Total L1 (A),15'), true, 'csv L1 total 15');
eq(csv.includes('Total L2 (A),25'), true, 'csv L2 total 25');
const csvNoProj = core.toCSV(proj.panels[0], undefined);
eq(csvNoProj.includes('Project,'), false, 'no project row when absent');

console.log('projectToCSV:');
const csvP = core.projectToCSV(proj);
const pr = csvP.split('\n');
eq(pr[0], 'PanelWright — Multi-Panel Load Rollup,', 'rollup header');
eq(pr[2], 'Service Rating (A),600', 'service rating row (index 2)');
eq(csvP.includes('Panel,System,L1 (A),L2 (A),L3 (A),Total (A),Imbalance %'), true, 'per-panel header');
eq(csvP.includes('Main,208Y/120V 3∅ 4-wire,15,25,0,40,'), true, 'main panel row');
eq(csvP.includes('Sub,120/240V 1∅ 2-wire,30,0,,30,'), true, 'sub panel row (L3 blank for 1ph)');
eq(csvP.includes('SERVICE ENTRANCE,'), true, 'service section');
eq(csvP.includes('L1 (A),45'), true, 'service L1');
eq(csvP.includes('Max Phase % of Service,7.5'), true, 'service pct row');
eq(csvP.includes('=== Main ==='), true, 'panel 1 detail section');
eq(csvP.includes('=== Sub ==='), true, 'panel 2 detail section');

console.log('1ph 240V two-pole option (v1.2):');
eq(core.SYSTEMS['120-240-1ph'].options.map(o => o.id), ['L1', 'L2', 'L1L2'], '1ph now has L1-L2 240V 2-pole');
const t1b = core.panelTotals([{ type: 'L1L2', loadA: 20 }, { type: 'L1', loadA: 5 }], '120-240-1ph', 200);
eq(t1b.L1, 25, '1ph 2-pole adds to L1');
eq(t1b.L2, 20, '1ph 2-pole adds to L2');
eq(core.circuitContribution({ type: 'L1L2', loadA: 10 }, '120-240-1ph'), { L1: 10, L2: 10, L3: 0 }, '1ph L1L2 contribution');

console.log('NEC 210.11 dwelling check (v1.2):');
const dwP = {
  version: 2, projectName: 'House', serviceA: 200, notes: '',
  panels: [
    { name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [
      { name: 'Small appliance 1', type: 'L1', loadA: 10 },
      { name: 'Kitchen counter', type: 'L2', loadA: 10 },
      { name: 'Laundry', type: 'L1', loadA: 8 },
      { name: 'Bathroom', type: 'L2', loadA: 8 },
      { name: 'Garage', type: 'L1', loadA: 12 },
      { name: 'Exterior', type: 'L2', loadA: 6 },
      { name: 'General lighting', type: 'L1', loadA: 5 },
      { name: 'Ceiling fixtures', type: 'L2', loadA: 5 }
    ] }
  ]
};
const dws = core.dwStatus(dwP);
eq(dws.total, 6, 'six default items');
eq(dws.items[0].label, 'Small-appliance receptacles (kitchen/dining/living…)', 'item 1 label');
eq(dws.items[0].auto, 2, 'small-appliance auto = 2 (SA1 + Kitchen counter)');
eq(dws.items[0].met, true, 'small-appliance met');
eq(dws.items[1].auto, 1, 'laundry auto = 1');
eq(dws.items[2].auto, 1, 'bathroom auto = 1');
eq(dws.items[3].auto, 1, 'garage auto = 1');
eq(dws.items[4].auto, 1, 'outdoor auto = 1 (Exterior)');
eq(dws.items[5].auto, 2, 'lighting auto = 2');
eq(dws.items[4].cite, '— no dedicated-circuit mandate', 'outdoor: no 210.11(C)(5) mandate');
eq(dws.items[5].cite, '— 210.11(B) is load balancing only', 'lighting: not a code cite');
eq(dws.items[0].cite, '210.11(C)(1)', 'small-appliance cite');
eq(dws.items[1].cite, '210.11(C)(2)', 'laundry cite');
eq(dws.items[2].cite, '210.11(C)(3)', 'bathroom cite');
eq(dws.items[3].cite, '210.11(C)(4)', 'garage cite');
eq(dws.metCount, 6, 'all six met -> 6 of 6');
// manual override: bathroom "missing" -> not met
const dwP2 = { version: 2, projectName: 'H', serviceA: 200, notes: '', dw: {
  items: core.DW_DEFAULT_ITEMS.map(i => Object.assign({}, i, { id: i.id }))
}, panels: dwP.panels };
dwP2.dw.items[2].manual = 'missing';
const dws2 = core.dwStatus(dwP2);
eq(dws2.items[2].met, false, 'manual missing overrides auto');
eq(dws2.metCount, 5, '5 of 6 met');
dwP2.dw.items[3].manual = 'ok';
dwP2.dw.items[3].min = 0;
eq(core.dwStatus(dwP2).metCount, 5, 'min 0 + manual ok still counts');
// custom kw
dwP2.dw.items[3].kw = 'zzz_nomatch';
const dws3 = core.dwStatus(dwP2);
eq(dws3.items[3].auto, 0, 'custom kw no match -> 0');
// normalize: bad manual value coerced, missing fields defaulted, empty -> defaults
const nd = core.normalizeDw({ items: [{ label: 'X', min: 999, manual: 'bogus' }] });
eq(nd.items[0].min, 99, 'min clamped to 99');
eq(nd.items[0].manual, 'auto', 'bogus manual -> auto');
eq(core.normalizeDw(null).items.length, 6, 'null -> 6 defaults');
eq(core.normalizeDw({}).items.length, 6, 'empty -> 6 defaults');
// invalid regex does not throw
const dws4 = core.dwStatus({ version: 2, projectName: 'H', panels: [{ name: 'P', system: '120-240-1ph', ratingA: 200, circuits: [{ name: 'a' }] }], dw: { items: [{ id: 'x', label: 'X', cite: '', min: 1, kw: '([', note: '', manual: 'auto' }] } });
eq(dws4.items[0].auto, 0, 'invalid regex -> 0, no throw');
// rollup CSV includes the checklist
const dwsCSV = core.projectToCSV(dwP);
eq(dwsCSV.includes('DWELLING UNIT MINIMUM CIRCUITS (NEC 210.11),'), true, 'csv has dwelling section');
eq(dwsCSV.includes('Required 2'), true, 'csv required counts');
eq(dwsCSV.includes('Requirements met,6 of 6'), true, 'csv summary row');

console.log('NEC 220.82 optional method — service load (v1.3, code-verified):');
// --- WORKED EXAMPLE 1 (Mike Holt / EC&M, 2020 NEC) — 1,500 sq ft, 240 V ---
// lighting 4,500 + SA 3,000 + laundry 1,500 + dishwasher 1,200 + disposer 900
// + cooktop 6,000 + oven 3,000 + dryer 4,000 + water heater 4,500 = 28,600 connected
// demand = 10,000 + 0.4*18,600 = 17,440
// HP compressor 240*28 = 6,720 + 65% of 7,000 supp = 4,550 -> 11,270 (largest HVAC)
// total = 17,440 + 11,270 = 28,710 VA; /240 = 120 A -> 125 A standard
const ex1 = core.serviceLoad22082({
  sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1,
  appliancesVA: 1200 + 900 + 6000 + 3000 + 4000 + 4500, // 19,600
  volt: 240,
  hpCompressorVA: 6720, hpSuppVA: 7000
});
eq(ex1.lightingVA, 4500, 'ex1 lighting 1500*3=4500');
eq(ex1.smallApplianceVA, 3000, 'ex1 small-appliance 2*1500');
eq(ex1.laundryVA, 1500, 'ex1 laundry 1*1500');
eq(ex1.appliancesVA, 19600, 'ex1 appliances 19,600');
eq(ex1.generalConnectedVA, 28600, 'ex1 general connected 28,600');
eq(ex1.generalDemandVA, 17440, 'ex1 general demand 17,440');
eq(ex1.hvacDemandVA, 11270, 'ex1 HVAC (HP w/ supp) 11,270');
eq(ex1.totalVA, 28710, 'ex1 total demand 28,710');
approx(ex1.amps, 119.63, 0.01, 'ex1 28,710/240 = 119.63 A (Holt "120 A" was int rounding)');
eq(ex1.recommendedBreakerA, 125, 'ex1 -> 125 A standard');

// --- WORKED EXAMPLE 2 (Electrician U, 2023 NEC) — 1,500 sq ft, 240 V ---
// NOTE: this source is internally inconsistent (it lists AC 5,000 VA AND space
// heating 6,000 VA, then calls "space heating 3,900" the largest even though
// AC 5,000 > 3,900). We test the CLEAN 65% space-heating tier in isolation here
// (matches the source's 3,900 / 21,900 / 91.25 / 100A), and separately assert the
// correct 220.82(C) "add the LARGEST" tiebreak where AC wins (ex2b).
// Clean: lighting 4,500 + SA 3,000 + laundry 1,500 = 9,000; appliances 21,000;
// connected 30,000; demand 10,000 + 0.4*20,000 = 18,000; space heating 6,000@65%
// = 3,900 (only HVAC); total 21,900; /240 = 91.25 A -> 100 A.
const ex2 = core.serviceLoad22082({
  sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1,
  appliancesVA: 12000 + 4000 + 5000, // 21,000
  volt: 240,
  spaceHeatingVA: 6000, spaceUnits: 1   // <4 units -> 65%
});
eq(ex2.generalConnectedVA, 30000, 'ex2 general connected 30,000');
eq(ex2.generalDemandVA, 18000, 'ex2 general demand 18,000');
eq(ex2.hvacDemandVA, 3900, 'ex2 space heating 65% = 3,900 (only HVAC)');
eq(ex2.totalVA, 21900, 'ex2 total demand 21,900');
approx(ex2.amps, 91.25, 0.01, 'ex2 21,900/240 = 91.25 A');
eq(ex2.recommendedBreakerA, 100, 'ex2 -> 100 A standard');

// --- ex2b: 220.82(C) "add the LARGEST" — AC 5,000 (100%) > space heating 3,900 (65%) ---
// This is the case where the Electrician U source erred; we assert the CORRECT
// code behavior: the largest calculated load (AC) is what gets added.
const ex2b = core.serviceLoad22082({
  sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1,
  appliancesVA: 21000, volt: 240,
  spaceHeatingVA: 6000, spaceUnits: 1, acVA: 5000
});
eq(ex2b.hvacDemandVA, 5000, 'ex2b AC 5,000 is largest over space heating 3,900');
eq(ex2b.totalVA, 23000, 'ex2b total = 18,000 + 5,000 = 23,000');
approx(ex2b.amps, 95.83, 0.01, 'ex2b 23,000/240 = 95.83 A');
eq(ex2b.recommendedBreakerA, 100, 'ex2b -> 100 A standard');

// --- (C) tiering: >=4 space units uses 40% ---
const ex3 = core.serviceLoad22082({ sqft: 1000, spaceHeatingVA: 10000, spaceUnits: 4, volt: 240 });
eq(ex3.hvacDemandVA, 4000, 'ex3 space heating >=4 units -> 40% = 4,000');
// --- (C) largest-of: AC 100% beats HP-with-supp ---
const ex4 = core.serviceLoad22082({ sqft: 1000, acVA: 12000, hpCompressorVA: 3000, hpSuppVA: 4000, volt: 240 });
eq(ex4.hvacDemandVA, 12000, 'ex4 AC 100% (12,000) is largest over HP w/ supp (3,000+2,600)');
// --- below-10kVA: demand equals connected (factor never exceeds connected) ---
const ex5 = core.serviceLoad22082({ sqft: 1000, smallApplianceCircuits: 1, laundryCircuits: 0, volt: 240 });
// 3,000 + 1,500 + 0 = 4,500 connected (<= 10k) -> demand = 4,500 (NOT 10,000)
eq(ex5.generalConnectedVA, 4500, 'ex5 general connected 4,500');
eq(ex5.generalDemandVA, 4500, 'ex5 below 10k -> demand = connected (4,500)');
eq(ex5.totalVA, 4500, 'ex5 total = 4,500 (no HVAC)');
// --- exactly 10 kVA boundary ---
const ex6 = core.serviceLoad22082({ sqft: 2000, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 3500, volt: 240 });
// 6,000 + 3,000 + 1,500 + 3,500 = 14,000 -> 10,000 + 0.4*4,000 = 11,600
eq(ex6.generalDemandVA, 11600, 'ex6 14,000 connected -> 11,600 demand');
// --- empty input: no area/appliances/HVAC -> 210.11 minimum circuit base only ---
// (2 small-appliance + 1 laundry = 4,500 VA; the code-required floor)
const ex7 = core.serviceLoad22082({});
eq(ex7.generalConnectedVA, 4500, 'ex7 empty -> 4,500 VA (210.11 min circuits)');
eq(ex7.totalVA, 4500, 'ex7 total = 4,500 (no area/HVAC)');
eq(ex7.recommendedBreakerA, 20, 'ex7 4,500/240=18.75A -> 20 A');
// --- null-safe (same minimum base, no throw) ---
eq(core.serviceLoad22082(null).totalVA, 4500, 'null input -> 210.11 min base, no throw');
// --- voltage passthrough ---
eq(core.serviceLoad22082({ sqft: 1000, volt: 208 }).volt, 208, 'ex volt 208 respected');
eq(core.serviceLoad22082({ sqft: 1000, volt: 999 }).volt, 240, 'ex bad volt defaults 240');
// --- CSV includes the 220.82 section when present ---
const lcCSVProj = { version: 2, projectName: 'House', serviceA: 200, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
  lc: { sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 19600, volt: 240, hpCompressorVA: 6720, hpSuppVA: 7000 } };
const lcCSV = core.projectToCSV(lcCSVProj);
eq(lcCSV.includes('DWELLING SERVICE LOAD — NEC 220.82 OPTIONAL METHOD'), true, 'csv has 220.82 section');
eq(lcCSV.includes('Total demand load,28710 VA'), true, 'csv total demand 28,710 VA');
eq(lcCSV.includes('Service current (VA/V),119.63 A'), true, 'csv service current 119.63 A');
eq(lcCSV.includes('Recommended standard breaker (NEC 240.6),125 A'), true, 'csv breaker rec 125 A');
// --- CSV omits the 220.82 section when no lc present ---
eq(core.projectToCSV(proj).includes('NEC 220.82 OPTIONAL METHOD'), false, 'csv omits 220.82 when absent');

console.log('NEC 220.82 feature-article examples (Session 29 — articles/nec-22082-optional-service-load.html):');
// --- art A: 1,500 sf, 2 SA + 1 laundry, no nameplate, 12,000 VA AC ---
const artA = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, acVA: 12000, volt: 240 });
eq(artA.generalConnectedVA, 9000, 'artA connected 9,000');
eq(artA.generalDemandVA, 9000, 'artA demand = connected (<=10 kVA)');
eq(artA.hvacDemandVA, 12000, 'artA AC 100% = 12,000');
eq(artA.totalVA, 21000, 'artA total 21,000');
approx(artA.amps, 87.5, 0.01, 'artA 87.5 A');
eq(artA.recommendedBreakerA, 90, 'artA -> 90 A');
// --- art B: 1,200 sf, 15,000 VA appliances, HP 5,000 comp + 10,000 supp ---
const artB = core.serviceLoad22082({ sqft: 1200, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 15000, hpCompressorVA: 5000, hpSuppVA: 10000, volt: 240 });
eq(artB.generalConnectedVA, 23100, 'artB connected 23,100');
eq(artB.generalDemandVA, 15240, 'artB demand 10,000 + 0.4*13,100 = 15,240');
eq(artB.hvacDemandVA, 11500, 'artB HP w/ supp 5,000 + 65%*10,000 = 11,500');
eq(artB.totalVA, 26740, 'artB total 26,740');
approx(artB.amps, 111.42, 0.01, 'artB 111.42 A');
eq(artB.recommendedBreakerA, 125, 'artB -> 125 A');
// --- art C: 2,500 sf, 18,000 VA appliances, HP 6,000 comp + 10,000 supp ---
const artC = core.serviceLoad22082({ sqft: 2500, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 18000, hpCompressorVA: 6000, hpSuppVA: 10000, volt: 240 });
eq(artC.generalConnectedVA, 30000, 'artC connected 30,000');
eq(artC.generalDemandVA, 18000, 'artC demand 10,000 + 0.4*20,000 = 18,000');
eq(artC.hvacDemandVA, 12500, 'artC HP w/ supp 6,000 + 65%*10,000 = 12,500');
eq(artC.totalVA, 30500, 'artC total 30,500');
approx(artC.amps, 127.08, 0.01, 'artC 127.08 A');
eq(artC.recommendedBreakerA, 140, 'artC -> 140 A');
// --- art D: space heating <4 units 65% — 1,000 sf, 2 x 10,000 VA ---
const artD = core.serviceLoad22082({ sqft: 1000, smallApplianceCircuits: 2, laundryCircuits: 1, spaceHeatingVA: 20000, spaceUnits: 2, volt: 240 });
eq(artD.generalDemandVA, 7500, 'artD demand 7,500 (<=10 kVA)');
eq(artD.hvacDemandVA, 13000, 'artD space heat 65% * 20,000 = 13,000');
eq(artD.totalVA, 20500, 'artD total 20,500');
approx(artD.amps, 85.42, 0.01, 'artD 85.42 A');
eq(artD.recommendedBreakerA, 90, 'artD -> 90 A');
// --- art E: same connected space heat, 4 separately controlled units -> 40% ---
const artE = core.serviceLoad22082({ sqft: 1000, smallApplianceCircuits: 2, laundryCircuits: 1, spaceHeatingVA: 20000, spaceUnits: 4, volt: 240 });
eq(artE.hvacDemandVA, 8000, 'artE space heat 40% * 20,000 = 8,000 (vs 13,000 at 65%)');
eq(artE.totalVA, 15500, 'artE total 15,500');
approx(artE.amps, 64.58, 0.01, 'artE 64.58 A');
eq(artE.recommendedBreakerA, 70, 'artE -> 70 A');
// --- art F: the 10 kVA boundary — 1,500 sf, 3 SA + 1 laundry, no HVAC ---
const artF = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 3, laundryCircuits: 1, volt: 240 });
eq(artF.generalConnectedVA, 10500, 'artF connected 10,500');
eq(artF.generalDemandVA, 10200, 'artF demand 10,000 + 0.4*500 = 10,200');
eq(artF.totalVA, 10200, 'artF total 10,200');
approx(artF.amps, 42.5, 0.01, 'artF 42.5 A');
// --- art G: kW nameplate entry — 2,000 sf, 12.5 kW appliances (article (B)(3) note) ---
const artG = core.serviceLoad22082({ sqft: 2000, smallApplianceCircuits: 2, laundryCircuits: 1, nameplateUnit: 'kw', appliancesKW: 12.5, volt: 240 });
eq(artG.appliancesVA, 12500, 'artG 12.5 kW -> 12,500 VA');
eq(artG.generalDemandVA, 15200, 'artG demand 10,000 + 0.4*13,000 = 15,200');
eq(artG.totalVA, 15200, 'artG total 15,200 (no HVAC)');
approx(artG.amps, 63.33, 0.01, 'artG 63.33 A');

console.log('NEC 220.82 kW nameplate entry (v1.10):');
// --- kW input converts at ×1,000 to VA, identical to the equivalent VA call ---
const kwEq = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1,
  nameplateUnit: 'kw', appliancesKW: 19.6, motorsKW: 0, volt: 240, hpCompressorVA: 6720, hpSuppVA: 7000 });
eq(kwEq.nameplateUnit, 'kw', 'result reports nameplateUnit kw');
eq(kwEq.appliancesVA, 19600, '19.6 kW -> 19,600 VA appliances');
eq(kwEq.generalConnectedVA, 28600, 'kw-mode general connected 28,600 (same as ex1 VA input)');
eq(kwEq.totalVA, 28710, 'kw-mode total demand 28,710 (== ex1)');
eq(kwEq.amps, 119.63, 'kw-mode amps 119.63 (== ex1)');
eq(kwEq.recommendedBreakerA, 125, 'kw-mode breaker rec 125 (== ex1)');
// --- fractional kW ---
const kwFrac = core.serviceLoad22082({ nameplateUnit: 'kw', appliancesKW: 12.5, volt: 240 });
eq(kwFrac.appliancesVA, 12500, '12.5 kW -> 12,500 VA (fractional kW)');
// --- in kW mode the legacy VA keys are ignored (unit is authoritative) ---
eq(core.serviceLoad22082({ nameplateUnit: 'kw', appliancesKW: 1, appliancesVA: 99999 }).appliancesVA, 1000,
  'kw mode: appliancesVA key ignored (1 kW -> 1,000 VA)');
// --- in VA mode (explicit or default) kW keys are ignored ---
eq(core.serviceLoad22082({ nameplateUnit: 'va', appliancesVA: 1, appliancesKW: 99999 }).appliancesVA, 1,
  'va mode: appliancesKW key ignored');
eq(core.serviceLoad22082({ appliancesVA: 1, appliancesKW: 99999 }).appliancesVA, 1,
  'unit omitted: legacy VA behavior (1 VA, kW key ignored)');
eq(core.serviceLoad22082({ nameplateUnit: 'va' }).nameplateUnit, 'va', 'explicit va reported');
eq(core.serviceLoad22082({}).nameplateUnit, 'va', 'unit omitted defaults to va');
// --- zero/negative/blank kW values behave like the VA path ---
eq(core.serviceLoad22082({ nameplateUnit: 'kw', appliancesKW: 0 }).appliancesVA, 0, '0 kW -> 0 VA');
eq(core.serviceLoad22082({ nameplateUnit: 'kw', appliancesKW: -5 }).appliancesVA, 0, 'negative kW -> 0 VA');
eq(core.serviceLoad22082({ nameplateUnit: 'kw', appliancesKW: '' }).appliancesVA, 0, "empty kW -> 0 VA");
// --- motors in kW ---
eq(core.serviceLoad22082({ nameplateUnit: 'kw', motorsKW: 3.5 }).motorsVA, 3500, '3.5 kW motors -> 3,500 VA');
// --- JSON roundtrip keeps the unit + kW values ---
{
  const pKw = { version: 2, projectName: 'KW House', serviceA: 200, notes: '',
    panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
    lc: { nameplateUnit: 'kw', appliancesKW: 19.6, motorsKW: 3.5, sqft: 1500, volt: 240 } };
  const pBack = core.fromJSON(core.toJSON(pKw));
  eq(pBack.lc.nameplateUnit, 'kw', 'json roundtrip keeps unit kw');
  eq(pBack.lc.appliancesKW, 19.6, 'json roundtrip keeps appliancesKW 19.6');
  eq(pBack.lc.motorsKW, 3.5, 'json roundtrip keeps motorsKW 3.5');
  eq(core.serviceLoad22082(pBack.lc).appliancesVA, 19600, 'recomputed from imported kW state = 19,600 VA');
}
// --- CSV shows the converted VA and notes the kW entry ---
const lcKwCSV = core.projectToCSV({ version: 2, projectName: 'KW CSV', serviceA: 200, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
  lc: { nameplateUnit: 'kw', appliancesKW: 12, motorsKW: 0.5, sqft: 1000, volt: 240 } });
eq(lcKwCSV.includes('Appliances nameplate (220.82B3),12000 VA (entered as 12 kW)'), true, 'csv kw appliances row');
eq(lcKwCSV.includes('Permanently connected motors (220.82B4),500 VA (entered as 0.5 kW)'), true, 'csv kw motors row');
eq(lcKwCSV.includes('entered as') === true, true, 'csv carries the kw note');
// VA-mode CSV unchanged (no kw note)
eq(core.projectToCSV(lcCSVProj).includes('entered as'), false, 'csv va mode has no kw note');
// --- print report shows the same converted numbers + the kW note ---
{
  const pKwR = { version: 2, projectName: 'KW Print', serviceA: 200, notes: '',
    panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
    lc: { nameplateUnit: 'kw', appliancesKW: 12, motorsKW: 0.5, sqft: 1000, volt: 240 } };
  const htmlKw = core.printReportHTML(pKwR, new Date(Date.UTC(2026, 7, 27, 12, 0, 0)));
  const lcKwR = core.serviceLoad22082(pKwR.lc);
  eq(htmlKw.includes('NEC 220.82'), true, 'kw-mode print report has 220.82 section');
  eq(htmlKw.includes(lcKwR.totalVA + ' VA'), true, 'kw-mode print total matches core');
  eq(htmlKw.includes('entered as 12 kW'), true, 'kw-mode print report notes appliances kW entry');
  eq(htmlKw.includes('entered as 0.5 kW'), true, 'kw-mode print report notes motors kW entry');
  const htmlVa = core.printReportHTML(Object.assign({}, pKwR, { lc: { nameplateUnit: 'va', appliancesVA: 12000, motorsVA: 500, sqft: 1000, volt: 240 } }), new Date(Date.UTC(2026, 7, 27, 12, 0, 0)));
  eq(htmlVa.includes('entered as'), false, 'va-mode print report has no kW note');
}

console.log('NEC 220.54 multi-dwelling dryer demand (v1.4, Table verified from NFPA 2014 PDF):');
// --- Table 220.54 factor rows (verbatim from NFPA 70 2014 Article 220 PDF) ---
eq(core.dryerFactorPct(1), 100, 't 1 dryer -> 100%');
eq(core.dryerFactorPct(4), 100, 't 4 dryers -> 100%');
eq(core.dryerFactorPct(5), 85, 't 5 dryers -> 85%');
eq(core.dryerFactorPct(6), 75, 't 6 dryers -> 75%');
eq(core.dryerFactorPct(7), 65, 't 7 dryers -> 65%');
eq(core.dryerFactorPct(8), 60, 't 8 dryers -> 60%');
eq(core.dryerFactorPct(9), 55, 't 9 dryers -> 55%');
eq(core.dryerFactorPct(10), 50, 't 10 dryers -> 50%');
eq(core.dryerFactorPct(11), 47, 't 11 dryers -> 47%');
eq(core.dryerFactorPct(12), 46, 't 12 dryers -> 47% - 1 = 46%');
eq(core.dryerFactorPct(15), 43, 't 15 dryers -> 47% - 4 = 43%');
eq(core.dryerFactorPct(17), 41, 't 17 dryers -> 47% - 6 = 41%');
eq(core.dryerFactorPct(23), 35, 't 23 dryers -> 47% - 12 = 35%');
eq(core.dryerFactorPct(24), 34.5, 't 24 dryers -> 35% - 0.5 = 34.5%');
eq(core.dryerFactorPct(30), 31.5, 't 30 dryers -> 35% - 3.5 = 31.5%');
eq(core.dryerFactorPct(42), 25.5, 't 42 dryers -> 35% - 9.5 = 25.5%');
eq(core.dryerFactorPct(43), 25, 't 43 dryers -> 25%');
eq(core.dryerFactorPct(100), 25, 't 100 dryers -> 25% (43+ floor)');
eq(core.dryerFactorPct(0), null, 't 0 dryers -> null factor');
eq(core.dryerFactorPct(-2), null, 't negative -> null');
eq(core.dryerFactorPct(null), null, 't null -> null');

// --- 5,000 VA minimum rule (220.54) ---
eq(core.dryerDemand22054({ count: 1 }).perDryerVA, 5000, 'min: no nameplate -> 5,000 VA each');
eq(core.dryerDemand22054({ count: 3, nameplateVA: 4500 }).perDryerVA, 5000, 'min: nameplate 4,500 < 5,000 -> use 5,000');
eq(core.dryerDemand22054({ count: 2, nameplateVA: 5200 }).perDryerVA, 5200, 'min: nameplate 5,200 > 5,000 -> use nameplate');
eq(core.dryerDemand22054({ count: 2, nameplateVA: 5000 }).perDryerVA, 5000, 'min: nameplate = 5,000 -> 5,000');
eq(core.dryerDemand22054({ count: 4, nameplateVA: 4500 }).connectedVA, 20000, 'connected: 4 x 5,000 (min applied) = 20,000');

// --- WORKED EXAMPLE 1 (expertce): 15 dryers @ 5,000 VA ---
// 15 x 5,000 = 75,000 connected; factor 47% - (15-11)% = 43%; 75,000 x 0.43 = 32,250 VA
const de1 = core.dryerDemand22054({ count: 15 });
eq(de1.count, 15, 'ex1 count 15');
eq(de1.perDryerVA, 5000, 'ex1 per-dryer 5,000');
eq(de1.connectedVA, 75000, 'ex1 connected 75,000');
eq(de1.factorPct, 43, 'ex1 factor 43%');
eq(de1.demandVA, 32250, 'ex1 demand 32,250 VA (matches expertce)');

// --- WORKED EXAMPLE 2 (necmastery): 17 dryers @ 5,000 VA ---
// 17 x 5,000 = 85,000 connected; factor 47% - (17-11)% = 41%; 85,000 x 0.41 = 34,850 VA
const de2 = core.dryerDemand22054({ count: 17 });
eq(de2.connectedVA, 85000, 'ex2 connected 85,000');
eq(de2.factorPct, 41, 'ex2 factor 41%');
eq(de2.demandVA, 34850, 'ex2 demand 34,850 VA (matches necmastery)');

// --- WORKED EXAMPLE 3 (voltprep/roughlogic): 5 dryers @ 5,000 VA ---
// 5 x 5,000 = 25,000 connected; factor 85%; 25,000 x 0.85 = 21,250 VA
const de3 = core.dryerDemand22054({ count: 5 });
eq(de3.factorPct, 85, 'ex3 factor 85%');
eq(de3.demandVA, 21250, 'ex3 demand 21,250 VA');
// and 4 dryers (100%, no reduction): 4 x 5,000 = 20,000 VA
eq(core.dryerDemand22054({ count: 4, nameplateVA: 4500 }).demandVA, 20000, 'ex3b 4 dryers 100% -> 20,000 VA (roughlogic)');

// --- 10 dryers (necmastery example): 10 x 5,000 = 50,000 @ 50% = 25,000 VA ---
const de4 = core.dryerDemand22054({ count: 10 });
eq(de4.factorPct, 50, 'ex4 factor 50%');
eq(de4.demandVA, 25000, 'ex4 demand 25,000 VA (matches necmastery)');

// --- high nameplate (mixed): 6 dryers @ 7,500 VA nameplate ---
// 6 x 7,500 = 45,000 connected; factor 75%; 45,000 x 0.75 = 33,750 VA
const de5 = core.dryerDemand22054({ count: 6, nameplateVA: 7500 });
eq(de5.connectedVA, 45000, 'ex5 connected 45,000 (nameplate 7,500 each)');
eq(de5.factorPct, 75, 'ex5 factor 75%');
eq(de5.demandVA, 33750, 'ex5 demand 33,750 VA');

// --- factor-label monotonic boundary check: no upward jumps at table seams ---
// 11->47, 12->46 (down), 23->35, 24->34.5 (down), 42->25.5, 43->25 (down)
const seq1 = [11, 12, 23, 24, 42, 43].map(n => core.dryerFactorPct(n));
eq(seq1, [47, 46, 35, 34.5, 25.5, 25], 'boundary factors strictly non-increasing across seams');
// the 12-23 branch must never exceed its 11-dryer neighbor (47): 12=46 < 47
eq(core.dryerFactorPct(12) < core.dryerFactorPct(11), true, '12-dryer (46) < 11-dryer (47): no jump up');
eq(core.dryerFactorPct(24) < core.dryerFactorPct(23), true, '24-dryer (34.5) < 23-dryer (35): no jump up');

// --- edge / null-safe ---
eq(core.dryerDemand22054({}).count, 0, 'edge: empty -> 0 dryers');
eq(core.dryerDemand22054({}).demandVA, 0, 'edge: empty -> 0 VA demand');
eq(core.dryerDemand22054(null).demandVA, 0, 'edge: null input -> 0 VA, no throw');
eq(core.dryerDemand22054({ count: -3 }).count, 0, 'edge: negative count clamped to 0');
eq(core.dryerDemand22054({ count: 4.9 }).count, 4, 'edge: fractional count floors (4.9 -> 4)');
eq(core.dryerDemand22054({ count: 0, nameplateVA: 9000 }).connectedVA, 0, 'edge: 0 dryers -> 0 connected even w/ nameplate');

// --- CSV includes the 220.54 section when present ---
const ddProj = { version: 2, projectName: 'Apartment', serviceA: 200, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
  dd: { count: 15, nameplateVA: 5000 } };
const ddCSV = core.projectToCSV(ddProj);
eq(ddCSV.includes('MULTI-DWELLING CLOTHES DRYER LOAD — NEC 220.54'), true, 'csv has 220.54 section');
eq(ddCSV.includes('Number of dryers,15'), true, 'csv dryer count row');
eq(ddCSV.includes('Total connected dryer load,75000 VA'), true, 'csv connected 75,000 VA');
eq(ddCSV.includes('Table 220.54 demand factor,43%'), true, 'csv factor 43%');
eq(ddCSV.includes('Dryer demand load,32250 VA'), true, 'csv demand 32,250 VA');
// --- CSV omits the 220.54 section when no dd present ---
eq(core.projectToCSV(proj).includes('NEC 220.54'), false, 'csv omits 220.54 when absent');

console.log('NEC 220.42 general lighting demand — Table 220.42 (v1.5, verbatim from NFPA 2014 Article 220 PDF):');
// --- Dwelling unit tiers: first 3,000 @100% · 3,001–120,000 @35% · remainder >120,000 @25% ---
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 0 }).demandVA, 0, 'dw 0 VA -> 0 demand');
// exactly 3,000 -> all @100%
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 3000 }).demandVA, 3000, 'dw 3,000 -> 3,000 (all 100%)');
// 3,001 boundary: 3,000@100% + 1@35% = 3,000.35
approx(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 3001 }).demandVA, 3000.35, 0.01, 'dw 3,001 -> 3,000.35 (boundary)');
// 12,000: 3,000@100% + 9,000@35% = 3,000 + 3,150 = 6,150
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 12000 }).demandVA, 6150, 'dw 12,000 -> 6,150');
// 120,000 boundary: 3,000@100% + 117,000@35% = 3,000 + 40,950 = 43,950
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 120000 }).demandVA, 43950, 'dw 120,000 -> 43,950 (upper 35% boundary)');
// 150,000: 3,000 + 40,950 + 30,000@25% = 43,950 + 7,500 = 51,450
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 150000 }).demandVA, 51450, 'dw 150,000 -> 51,450 (25% tail)');
// demand never exceeds connected (sanity at boundary)
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 3001 }).demandVA <= 3001, true, 'dw demand <= connected');
// tier slices reported
const dwt = core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 150000 });
eq(dwt.tiers.length, 3, 'dw three tiers');
eq(dwt.tiers[0].sliceVA, 3000, 'dw tier1 slice 3,000');
eq(dwt.tiers[0].demandVA, 3000, 'dw tier1 demand 3,000');
eq(dwt.tiers[1].sliceVA, 117000, 'dw tier2 slice 117,000');
eq(dwt.tiers[1].demandVA, 40950, 'dw tier2 demand 40,950');
eq(dwt.tiers[2].sliceVA, 30000, 'dw tier3 slice 30,000');
eq(dwt.tiers[2].demandVA, 7500, 'dw tier3 demand 7,500');
eq(dwt.tiers[2].upTo, Infinity, 'dw tier3 is remainder');

// --- Hospital: first 50,000 @40% · remainder @20% ---
eq(core.lightingDemand22042({ occupancy: 'hospital', totalVA: 50000 }).demandVA, 20000, 'hosp 50,000 -> 20,000 (40%)');
eq(core.lightingDemand22042({ occupancy: 'hospital', totalVA: 100000 }).demandVA, 30000, 'hosp 100,000 -> 20,000 + 10,000@20% = 30,000');
eq(core.lightingDemand22042({ occupancy: 'hospital', totalVA: 10000 }).demandVA, 4000, 'hosp 10,000 -> 4,000');

// --- Hotel/motel: first 20,000 @50% · 20,001–100,000 @40% · remainder @30% ---
eq(core.lightingDemand22042({ occupancy: 'hotel', totalVA: 20000 }).demandVA, 10000, 'hotel 20,000 -> 10,000 (50%)');
eq(core.lightingDemand22042({ occupancy: 'hotel', totalVA: 30000 }).demandVA, 14000, 'hotel 30,000 -> 10,000 + 4,000 = 14,000');
eq(core.lightingDemand22042({ occupancy: 'hotel', totalVA: 100000 }).demandVA, 42000, 'hotel 100,000 -> 10,000 + 32,000 = 42,000 (40% boundary)');
eq(core.lightingDemand22042({ occupancy: 'hotel', totalVA: 130000 }).demandVA, 51000, 'hotel 130,000 -> 42,000 + 9,000@30% = 51,000');

// --- Warehouse (storage): first 12,500 @100% · remainder @50% ---
eq(core.lightingDemand22042({ occupancy: 'warehouse', totalVA: 12500 }).demandVA, 12500, 'wh 12,500 -> 12,500 (100%)');
eq(core.lightingDemand22042({ occupancy: 'warehouse', totalVA: 25000 }).demandVA, 18750, 'wh 25,000 -> 12,500 + 6,250 = 18,750');
eq(core.lightingDemand22042({ occupancy: 'warehouse', totalVA: 100000 }).demandVA, 56250, 'wh 100,000 -> 12,500 + 43,750 = 56,250');

// --- All others: total @100% ---
eq(core.lightingDemand22042({ occupancy: 'others', totalVA: 43210 }).demandVA, 43210, 'others 43,210 -> 43,210 (100%)');
eq(core.lightingDemand22042({ totalVA: 99999 }).occupancy, 'others', 'no occupancy -> defaults to others');
eq(core.lightingDemand22042({ totalVA: 99999 }).demandVA, 99999, 'default others 99,999 -> 100%');

// --- edge / null-safe ---
eq(core.lightingDemand22042({}).demandVA, 0, 'edge: empty -> 0');
eq(core.lightingDemand22042(null).demandVA, 0, 'edge: null -> 0, no throw');
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: -500 }).demandVA, 0, 'edge: negative -> 0');
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 'abc' }).demandVA, 0, 'edge: non-numeric -> 0');
eq(core.lightingDemand22042({ occupancy: 'bogus', totalVA: 5000 }).occupancy, 'others', 'edge: unknown occupancy -> others (100%)');
eq(core.lightingDemand22042({ occupancy: 'bogus', totalVA: 5000 }).demandVA, 5000, 'edge: unknown occupancy -> 100%');

// --- CSV includes the 220.42 section when present ---
const ltProj = { version: 2, projectName: 'Hotel', serviceA: 200, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
  lt: { totalVA: 150000, occupancy: 'dwelling' } };
const ltCSV = core.projectToCSV(ltProj);
eq(ltCSV.includes('GENERAL LIGHTING LOAD DEMAND — NEC 220.42'), true, 'csv has 220.42 section');
eq(ltCSV.includes('Total general lighting load (VA),150000 VA'), true, 'csv lighting connected 150,000 VA');
eq(ltCSV.includes('Tier: up to 3000 VA @ 100%,3000 VA'), true, 'csv tier1 row');
eq(ltCSV.includes('Tier: up to 120000 VA @ 35%,40950 VA'), true, 'csv tier2 row');
eq(ltCSV.includes('Tier: remainder @ 25%,7500 VA'), true, 'csv tier3 row');
eq(ltCSV.includes('Lighting demand load (VA),51450 VA'), true, 'csv lighting demand 51,450 VA');
// --- CSV omits the 220.42 section when no lt present ---
eq(core.projectToCSV(proj).includes('NEC 220.42'), false, 'csv omits 220.42 when absent');

console.log('NEC 220.55 cooking appliance demand — Table 220.55 (v1.6, 2014 = 2020 verbatim; programmatic diff 0/30 mismatches):');
// --- Column C base maximum demand (kW) — rows 1..25 from the verbatim table ---
eq(core.cookingColumnCKW(1), 8, 'C 1 range -> 8');
eq(core.cookingColumnCKW(2), 11, 'C 2 -> 11');
eq(core.cookingColumnCKW(4), 17, 'C 4 -> 17');
eq(core.cookingColumnCKW(8), 23, 'C 8 -> 23');
eq(core.cookingColumnCKW(12), 27, 'C 12 -> 27');
eq(core.cookingColumnCKW(15), 30, 'C 15 -> 30');
eq(core.cookingColumnCKW(20), 35, 'C 20 -> 35');
eq(core.cookingColumnCKW(25), 40, 'C 25 -> 40');
// --- Formula bands (merged cells: 26-40 = 15+1n; 41-60/61+ = 25+0.75n) ---
eq(core.cookingColumnCKW(26), 41, 'C 26 -> 15+26 = 41');
eq(core.cookingColumnCKW(30), 45, 'C 30 -> 45');
eq(core.cookingColumnCKW(35), 50, 'C 35 -> 50');
eq(core.cookingColumnCKW(40), 55, 'C 40 -> 55');
eq(core.cookingColumnCKW(41), 55.75, 'C 41 -> 25+0.75*41 = 55.75');
eq(core.cookingColumnCKW(50), 62.5, 'C 50 -> 62.5');
eq(core.cookingColumnCKW(60), 70, 'C 60 -> 70');
eq(core.cookingColumnCKW(61), 70.75, 'C 61 -> 70.75 (61-and-over row)');
eq(core.cookingColumnCKW(100), 100, 'C 100 -> 100 (formula extends)');
// --- Band seam continuity: no demand drop across 25/26, 40/41, 60/61 ---
eq(core.cookingColumnCKW(26) > core.cookingColumnCKW(25), true, '26 (41) > 25 (40): no drop at 15 kW band seam');
eq(core.cookingColumnCKW(41) > core.cookingColumnCKW(40), true, '41 (55.75) > 40 (55): no drop at 25 kW band seam');
eq(core.cookingColumnCKW(61) > core.cookingColumnCKW(60), true, '61 (70.75) > 60 (70): no drop at 61+ row');
// full-table monotonicity 1..61
let cKwPrev = 0, monoOk = true;
for (let n = 1; n <= 61; n++) { const v = core.cookingColumnCKW(n); if (v <= cKwPrev) { monoOk = false; break; } cKwPrev = v; }
eq(monoOk, true, 'Column C strictly increasing 1..61');
// --- Column C edges ---
eq(core.cookingColumnCKW(0), null, 'C 0 -> null');
eq(core.cookingColumnCKW(-3), null, 'C negative -> null');
eq(core.cookingColumnCKW(null), null, 'C null -> null');
eq(core.cookingColumnCKW(4.9), 17, 'C fractional floors (4.9 -> 4 -> 17)');

// --- Note 1 (equal ratings, over 12 through 27 kW): 5% per kW or major fraction over 12 ---
eq(core.cookingNote1Kw(11, 12), 0, 'N1 rating 12 -> no increase');
eq(core.cookingNote1Kw(11, 12.1), 0.55, 'N1 2 ranges @12.1: 11 * 5% * 1 = 0.55');
eq(core.cookingNote1Kw(20, 14), 2, 'N1 5 ranges @14: 20 * 5% * 2 = 2');
eq(core.cookingNote1Kw(27, 12.25), 1.35, 'N1 12 ranges @12.25: 27 * 5% * 1 = 1.35');
eq(core.cookingNote1Kw(27, 27), 20.25, 'N1 12 ranges @27: 27 * 5% * 15 = 20.25');
eq(core.cookingNote1Kw(27, 27.5), 0, 'N1 over 27 kW -> no increase (out of Note 1 range)');
eq(core.cookingNote1Kw(20, 1.75), 0, 'N1 low rating -> 0');

// --- cookingDemand22055 primary mode (Column C + Note 1, kVA == kW) ---
const ck1 = core.cookingDemand22055({ count: 1 });
eq(ck1.valid, true, 'colC valid');
eq(ck1.ratingKW, 12, 'colC default rating 12 kW');
eq(ck1.baseKW, 8, 'colC 1 range base 8');
eq(ck1.demandKW, 8, 'colC 1 range @12 kW -> 8 kW');
eq(ck1.demandVA, 8000, 'colC 8 kW == 8,000 VA (kVA ~ kW)');
eq(core.cookingDemand22055({ count: 4, ratingKW: 12 }).demandKW, 17, 'colC 4 ranges @12 -> 17');
const ck10 = core.cookingDemand22055({ count: 10, ratingKW: 14 });
eq(ck10.baseKW, 25, 'colC 10 ranges base 25');
eq(ck10.increaseKW, 2.5, 'colC 10 ranges @14: +2.5 (Note 1)');
eq(ck10.demandKW, 27.5, 'colC 10 ranges @14 -> 27.5 kW');
eq(core.cookingDemand22055({ count: 26 }).demandKW, 41, 'colC 26 ranges @12 -> 41 (15 kW band)');
eq(core.cookingDemand22055({ count: 40 }).demandKW, 55, 'colC 40 ranges @12 -> 55');
eq(core.cookingDemand22055({ count: 41 }).demandKW, 55.75, 'colC 41 ranges @12 -> 55.75 (25 kW band)');
eq(core.cookingDemand22055({ count: 60 }).demandKW, 70, 'colC 60 ranges @12 -> 70');
eq(core.cookingDemand22055({ count: 61 }).demandKW, 70.75, 'colC 61 ranges @12 -> 70.75');
// 3-phase 4-wire: table count = 2 x max connected between any two phases
eq(core.cookingDemand22055({ threePhasePerPhaseMax: 4 }).effectiveCount, 8, '3ph: 4 per phase -> effective 8');
eq(core.cookingDemand22055({ threePhasePerPhaseMax: 4 }).demandKW, 23, '3ph: effective 8 -> 23 kW');
eq(core.cookingDemand22055({ count: 10, threePhasePerPhaseMax: 4 }).demandKW, 23, '3ph: per-phase input wins over count');
// scope guards
eq(core.cookingDemand22055({ count: 3, ratingKW: 1.5 }).valid, false, 'colC 1.5 kW -> invalid (must exceed 1.75)');
eq(core.cookingDemand22055({ count: 5, ratingKW: 28 }).valid, false, 'colC 28 kW -> invalid (over 27)');
eq(core.cookingDemand22055({ count: 0 }).valid, false, 'colC 0 ranges -> invalid');
eq(core.cookingDemand22055({}).valid, false, 'colC empty -> invalid, no throw');
eq(core.cookingDemand22055(null).valid, false, 'colC null -> invalid, no throw');
eq(core.cookingDemand22055({ count: 4.9, ratingKW: 12 }).count, 4, 'colC fractional count floors');

// --- Note 2 (unequal ratings, all over 8¾ kW, none over 27 kW) ---
// worked: 10 + 12 + 14.25 -> sum uses 12 for the 10-kW unit: 12+12+14.25 = 38.25
// avg 12.75 -> over 12 by 0.75 -> 1 kW step -> base C(3) = 14 -> +0.70 = 14.70
const n2a = core.cookingNote2([10, 12, 14.25]);
eq(n2a.valid, true, 'N2 valid');
eq(n2a.avgKW, 12.75, 'N2 average 12.75 kW (10-kW unit counted at 12)');
eq(n2a.baseKW, 14, 'N2 base C(3) = 14');
eq(n2a.increaseKW, 0.7, 'N2 increase 0.70 (1 major fraction)');
eq(n2a.demandKW, 14.7, 'N2 demand 14.7 kW');
// average over 12 but just barely: 10.5 + 12.5 -> 12.5 + 12.5... no: 10.5<12 -> 12; sum 24.5, avg 12.25
// -> 1 step -> base C(2) = 11 -> +0.55 = 11.55
const n2b = core.cookingNote2([10.5, 12.5]);
eq(n2b.avgKW, 12.25, 'N2 avg 12.25 (10.5-kW unit counted at 12)');
eq(n2b.increaseKW, 0.55, 'N2 increase 0.55 (1 major fraction)');
eq(n2b.demandKW, 11.55, 'N2 demand 11.55 (base 11 + 0.55)');
// boundary: exactly 8.75 is NOT over 8¾
eq(core.cookingNote2([8.75, 12]).valid, false, 'N2 8.75 -> invalid (must be OVER 8¾)');
eq(core.cookingNote2([8.76, 12]).valid, true, 'N2 8.76 -> valid');
eq(core.cookingNote2([8, 12]).valid, false, 'N2 8.0 -> invalid');
eq(core.cookingNote2([10, 12, 30]).valid, false, 'N2 30 kW -> invalid (over 27)');
eq(core.cookingNote2([12, 12]).valid, false, 'N2 all-equal -> invalid (use Note 1)');
eq(core.cookingNote2([]).valid, false, 'N2 empty -> invalid');
eq(core.cookingNote2(null).valid, false, 'N2 null -> invalid, no throw');
// worked: 5 ranges 10,10.5,11,12,13 -> every unit under 12 counted at 12:
// sum 12+12+12+12+13 = 61 -> avg 12.2 -> 1 step -> base C(5) = 20 -> +1.00 = 21
const n2c = core.cookingNote2([10, 10.5, 11, 12, 13]);
eq(n2c.avgKW, 12.2, 'N2 avg exactly 12.2 (all sub-12 units at 12)');
eq(n2c.increaseKW, 1, 'N2 increase 1.00 (1 major fraction)');
eq(n2c.demandKW, 21, 'N2 demand = base C(5) 20 + 1 = 21');
// sub-12 average -> no increase (still Note 2 eligible): 9 + 10 -> 12+12 = 24, avg 12.0
const n2d = core.cookingNote2([9, 10]);
eq(n2d.avgKW, 12, 'N2 9,10 -> both at 12 -> avg 12.0');
eq(n2d.increaseKW, 0, 'N2 avg 12.0 -> no increase');
eq(n2d.demandKW, 11, 'N2 demand = base C(2) = 11');

// --- Note 3: Column A/B demand factors (in lieu of Column C) ---
eq(core.cookingABFactorPct(1, 'A'), 80, 'A 1 -> 80%');
eq(core.cookingABFactorPct(1, 'B'), 80, 'B 1 -> 80%');
eq(core.cookingABFactorPct(2, 'A'), 75, 'A 2 -> 75%');
eq(core.cookingABFactorPct(2, 'B'), 65, 'B 2 -> 65%');
eq(core.cookingABFactorPct(8, 'A'), 53, 'A 8 -> 53%');
eq(core.cookingABFactorPct(8, 'B'), 36, 'B 8 -> 36%');
eq(core.cookingABFactorPct(12, 'A'), 45, 'A 12 -> 45%');
eq(core.cookingABFactorPct(12, 'B'), 32, 'B 12 -> 32%');
eq(core.cookingABFactorPct(15, 'A'), 40, 'A 15 -> 40%');
eq(core.cookingABFactorPct(15, 'B'), 32, 'B 15 -> 32%');
eq(core.cookingABFactorPct(20, 'A'), 35, 'A 20 -> 35%');
eq(core.cookingABFactorPct(20, 'B'), 28, 'B 20 -> 28%');
eq(core.cookingABFactorPct(25, 'A'), 30, 'A 25 -> 30%');
eq(core.cookingABFactorPct(25, 'B'), 26, 'B 25 -> 26%');
eq(core.cookingABFactorPct(26, 'A'), 30, 'A 26 (26-30) -> 30%');
eq(core.cookingABFactorPct(26, 'B'), 24, 'B 26 (26-30) -> 24%');
eq(core.cookingABFactorPct(30, 'B'), 24, 'B 30 -> 24%');
eq(core.cookingABFactorPct(31, 'B'), 22, 'B 31 (31-40) -> 22%');
eq(core.cookingABFactorPct(40, 'B'), 22, 'B 40 -> 22%');
eq(core.cookingABFactorPct(41, 'B'), 20, 'B 41 (41-50) -> 20%');
eq(core.cookingABFactorPct(50, 'B'), 20, 'B 50 -> 20%');
eq(core.cookingABFactorPct(51, 'B'), 18, 'B 51 (51-60) -> 18%');
eq(core.cookingABFactorPct(60, 'B'), 18, 'B 60 -> 18%');
eq(core.cookingABFactorPct(61, 'B'), 16, 'B 61+ -> 16%');
eq(core.cookingABFactorPct(100, 'A'), 30, 'A 100 (61+) -> 30%');
eq(core.cookingABFactorPct(100, 'B'), 16, 'B 100 (61+) -> 16%');
eq(core.cookingABFactorPct(0, 'A'), null, 'A 0 -> null');
eq(core.cookingABFactorPct(-2, 'B'), null, 'B negative -> null');
// Note 3 demand: sum nameplates per column x that column's factor
const n3a = core.cookingNote3KW({ countA: 4, totalKWa: 8 });
eq(n3a.demandKW, 5.28, 'N3 4 @ <3.5 kW, 8 kW total -> 66% = 5.28');
const n3b = core.cookingNote3KW({ countB: 6, totalKWb: 18 });
eq(n3b.demandKW, 7.74, 'N3 6 @ 3.5-8.75 kW, 18 kW total -> 43% = 7.74');
const n3c = core.cookingNote3KW({ countA: 2, totalKWa: 4, countB: 2, totalKWb: 8 });
eq(n3c.demandKW, 8.2, 'N3 mixed: 4 kW @75% + 8 kW @65% = 3 + 5.2 = 8.2');
eq(core.cookingNote3KW({}).demandKW, null, 'N3 empty -> null, no throw');
eq(core.cookingNote3KW(null).demandKW, null, 'N3 null -> null, no throw');

// --- CSV includes the 220.55 section when present ---
const ckProj = { version: 2, projectName: 'Apartments', serviceA: 200, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
  ck: { mode: 'colC', count: 10, ratingKW: 14 } };
const ckCSV = core.projectToCSV(ckProj);
eq(ckCSV.includes('COOKING APPLIANCE LOAD — NEC 220.55'), true, 'csv has 220.55 section');
eq(ckCSV.includes('Number of ranges / cooking appliances,10'), true, 'csv count row');
eq(ckCSV.includes('Column C base maximum demand,25 kW'), true, 'csv base 25 kW');
eq(ckCSV.includes('Note 1 increase (5% per kW over 12 kW),+2.5 kW'), true, 'csv Note 1 row');
eq(ckCSV.includes('Demand load,27.5 kW (27500 VA)'), true, 'csv demand 27.5 kW / 27,500 VA');
// --- CSV omits the 220.55 section when no ck present ---
eq(core.projectToCSV(proj).includes('NEC 220.55'), false, 'csv omits 220.55 when absent');

// --- NEC 220.61 feeder/service neutral load (v1.7) ---
// 220.61(A) basic: neutral = max unbalance; (B)(1) 70% on cooking/dryer demand
// portion; (B)(2) 70% on portion over 200 A; 310.12(B) 83% min ampacity for
// a one-dwelling service/feeder. Text verified 2014 vs 2020 (substantively identical;
// normalized diff shows only OCR artifacts), no 2023 change.
console.log('neutralLoad22061:');
// (A) only, no reductions: 24,000 VA @ 120 V = 200 A
const n1 = core.neutralLoad22061({ totalVA: 24000, volt: 120 });
eq(n1.valid, true, 'n1 valid');
eq(n1.basicA, 200, 'n1 basic 200 A');
eq(n1.b2Applied, false, 'n1 B2 not applied at exactly 200 A (must EXCEED)');
eq(n1.finalA, 200, 'n1 final 200 A');
eq(n1.minAmpA, 200, 'n1 no 310.12(B) (not one-dwelling) -> 200 A');
// (B)(2) just over 200 A: 24,400 VA @ 120 = 203.33 A -> 200 + 3.33*0.70 = 202.33 A
const n2 = core.neutralLoad22061({ totalVA: 24400, volt: 120, applyB2: true });
eq(n2.basicA, 203.33, 'n2 basic 203.33 A');
eq(n2.b2Applied, true, 'n2 B2 applied (over 200 A)');
eq(n2.finalA, 202.33, 'n2 final 200 + 3.33x0.70 = 202.33 A');
// (B)(2) not applied when disabled
const n3 = core.neutralLoad22061({ totalVA: 24400, volt: 120, applyB2: false });
eq(n3.finalA, 203.33, 'n3 B2 disabled -> 203.33 A');
// (B)(1): total 10,000 VA @ 120 V, cooking/dryer 4,000 VA (demand per 220.55/54)
const n4 = core.neutralLoad22061({ totalVA: 10000, cookingDryerVA: 4000, volt: 120, applyB1: true });
eq(n4.cookDemandVA, 2800, 'n4 B1 cooking 4000 -> 2800 VA');
eq(n4.basicVA, 8800, 'n4 basic 8800 VA');
eq(n4.basicA, 73.33, 'n4 basic 73.33 A');
const n5 = core.neutralLoad22061({ totalVA: 10000, cookingDryerVA: 4000, volt: 120, applyB1: false });
eq(n5.basicA, 83.33, 'n5 B1 off -> 83.33 A');
// Real 2023 worked example (terrylove_2023): total basic 75,212 VA @ 240 V,
// (B)(1) already applied upstream, (B)(2) over 200 A. Source rounds to 313 / 279 / 232 A.
const n6 = core.neutralLoad22061({ totalVA: 75212, volt: 240, applyB2: true, dwelling: true });
eq(n6.basicA, 313.38, 'n6 (2023 worked ex) basic 313.38 A (source: 313)');
eq(n6.finalA, 279.37, 'n6 (2023 worked ex) 200 + 113.38x0.70 = 279.37 A (source: 279)');
eq(n6.minAmpA, 231.88, 'n6 (2023 worked ex) 310.12(B) 83% -> 231.88 A (source: 232 = ceil)');
eq(Math.trunc(n6.basicA), 313, 'n6 trunc(basic) == source 313');
eq(Math.trunc(n6.finalA), 279, 'n6 trunc(final) == source 279');
eq(Math.ceil(n6.minAmpA), 232, 'n6 ceil(minAmp) == source 232');
// Combined: 100,000 VA @ 240 V, cooking 40,000 VA, B1 + B2 + one-dwelling
const n7 = core.neutralLoad22061({ totalVA: 100000, cookingDryerVA: 40000, volt: 240, applyB1: true, applyB2: true, dwelling: true });
eq(n7.basicA, 366.67, 'n7 basic 88,000 VA / 240 = 366.67 A');
eq(n7.finalA, 316.67, 'n7 B2: 200 + 166.67x0.70 = 316.67 A');
eq(n7.minAmpA, 262.84, 'n7 310.12(B): 316.67 x 0.83 = 262.84 A');
// 3-phase system, 277 V phase-neutral: 200,000 VA, B2 on
const n8 = core.neutralLoad22061({ totalVA: 200000, volt: 277, applyB2: true });
eq(n8.basicA, 722.02, 'n8 basic 200,000/277 = 722.02 A');
eq(n8.finalA, 565.41, 'n8 B2: 200 + 522.02x0.70 = 565.41 A');
// Guards
eq(core.neutralLoad22061({ totalVA: 5000 }).valid, false, 'no voltage -> invalid');
eq(core.neutralLoad22061({ volt: 120 }).valid, false, 'no total -> invalid');
eq(core.neutralLoad22061({ totalVA: 5000, cookingDryerVA: 9000, volt: 120 }).valid, false, 'cooking > total -> invalid');
eq(core.neutralLoad22061(null).valid, false, 'null -> invalid, no throw');
eq(core.neutralLoad22061({ totalVA: 8000, cookingDryerVA: -50, volt: 120 }).basicA, 66.67, 'negative cooking clamped to 0 -> 66.67 A');
// B1 boundary: cooking exactly equals total
const n9 = core.neutralLoad22061({ totalVA: 12000, cookingDryerVA: 12000, volt: 120, applyB1: true });
eq(n9.basicA, 70, 'n9 all-cooking B1: 12000x0.7/120 = 70 A');
// --- CSV includes the 220.61 section when present ---
const nlProj = { version: 2, projectName: 'Neutral', serviceA: 400, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 400, notes: '', circuits: [] }],
  nl: { totalVA: 75212, volt: 240, applyB2: true, dwelling: true } };
const nlCSV = core.projectToCSV(nlProj);
eq(nlCSV.includes('FEEDER / SERVICE NEUTRAL LOAD — NEC 220.61'), true, 'csv has 220.61 section');
eq(nlCSV.includes('Total neutral (max unbalanced) load,75212 VA'), true, 'csv total row');
eq(nlCSV.includes('Basic neutral load (220.61(A)),313.38 A'), true, 'csv basic row');
eq(nlCSV.includes('220.61(B)(2) 70% on portion over 200 A,Y'), true, 'csv B2 row');
eq(nlCSV.includes('310.12(B) one-dwelling service: min neutral ampacity,231.88 A (83% of calculated)'), true, 'csv 83% row');
// --- CSV omits the 220.61 section when no nl present ---
eq(core.projectToCSV(proj).includes('NEC 220.61'), false, 'csv omits 220.61 when absent');
// JSON roundtrip preserves nl
const nlRT = core.fromJSON(core.toJSON(nlProj));
eq(nlRT.nl.totalVA, 75212, 'json roundtrip keeps nl.totalVA');

// --- NEC Table 310.16 conductor pick (v1.8) ---
// Table verified at coordinate level from a verbatim 2023-NEC print
// (codeelec_2023.pdf) + 4 independent live references (see LOG 2026-08-18 s12).
console.log('T31016 table integrity:');
eq(core.T31016.length, 28, '28 conductor sizes (14 AWG .. 2000 kcmil; 16/18 AWG are dash-only rows)');
{
  // monotonic non-decreasing within each of the 6 columns
  let mono = true;
  for (let c = 0; c < 6; c++) {
    let prev = 0;
    for (const row of core.T31016) {
      const v = row.cu[c];
      if (v == null) continue;
      if (v < prev) mono = false;
      prev = v;
    }
  }
  eq(mono, true, 'all 6 columns monotonic non-decreasing');
}
eq(core.T31016[0].cu, [15, 20, 25, null, null, null], 'row 14 AWG (no Al columns)');
eq(core.T31016.find(r => r.s === '12').cu, [20, 25, 30, 15, 20, 25], 'row 12 AWG');
eq(core.T31016.find(r => r.s === '4/0').cu, [195, 230, 260, 150, 180, 205], 'row 4/0');
eq(core.T31016.find(r => r.s === '250').cu, [215, 255, 290, 170, 205, 230], 'row 250 kcmil');
eq(core.T31016.find(r => r.s === '500').cu, [320, 380, 430, 260, 310, 350], 'row 500 kcmil');
eq(core.T31016.find(r => r.s === '750').cu, [400, 475, 535, 320, 385, 435], 'row 750 kcmil');
eq(core.T31016.find(r => r.s === '2000').cu, [555, 665, 750, 470, 560, 630], 'row 2000 kcmil');

console.log('conductorLabel:');
eq(core.conductorLabel('14'), '14 AWG', '14 AWG');
eq(core.conductorLabel('8'), '8 AWG', '8 AWG');
eq(core.conductorLabel('4/0'), '4/0 AWG', '4/0 AWG');
eq(core.conductorLabel('250'), '250 kcmil', '250 kcmil');
eq(core.conductorLabel('2000'), '2000 kcmil', '2000 kcmil');

console.log('pickConductor31016:');
// The 2023 worked neutral example: 231.88 A min ampacity
eq(core.pickConductor31016(231.88, 'cu', 75), 
   { size: '250', amp: 255, label: '250 kcmil Cu', over: null, notes: ['75 °C column (>100 A circuits per 110.14(C)(1)(b), or 75 °C-rated terminations)'] },
   '231.88 A Cu @ 75 -> 250 kcmil (255 A) — the 2023 worked example');
eq(core.pickConductor31016(232, 'al', 75).size, '350', '232 A Al @ 75 -> 350 kcmil (250 A; 300=230 is short)');
eq(core.pickConductor31016(231.88, 'cu', 60).size, '300', '231.88 A Cu @ 60 -> 300 kcmil (240 A; 250=215 short)');
eq(core.pickConductor31016(231.88, 'cu', 90).size, '4/0', '231.88 A Cu @ 90 -> 4/0 AWG (260 A)');
eq(core.pickConductor31016(231.88, 'al', 90).size, '300', '231.88 A Al @ 90 -> 300 kcmil (260 A; 250=230 is short)');
// exact-boundary: required == table ampacity picks that size (>=)
eq(core.pickConductor31016(255, 'cu', 75).size, '250', '255 A Cu @ 75 -> exactly 250 kcmil');
eq(core.pickConductor31016(255.01, 'cu', 75).size, '300', '255.01 A Cu @ 75 -> 300 kcmil (next up)');
// small-conductor picks + 240.4(D) cap note
eq(core.pickConductor31016(15, 'cu', 60).size, '14', '15 A Cu @ 60 -> 14 AWG');
eq(core.pickConductor31016(15, 'cu', 60).notes[0], '240.4(D): overcurrent device for this size is capped at 15 A', '14 AWG 240.4(D) note');
eq(core.pickConductor31016(20, 'cu', 60).size, '12', '20 A Cu @ 60 -> 12 AWG (14=15 short)');
eq(core.pickConductor31016(20, 'cu', 75).size, '14', '20 A Cu @ 75 -> 14 AWG (20 A)');
eq(core.pickConductor31016(20, 'al', 75).size, '12', '20 A Al @ 75 -> 12 AWG (14 not listed for Al)');
eq(core.pickConductor31016(25, 'al', 75).size, '10', '25 A Al @ 75 -> 10 AWG (12 AWG AL = 20 A short; 10 = 30 A)');
eq(core.pickConductor31016(20, 'al', 60).size, '10', '20 A Al @ 60 -> 10 AWG (12=15 short, 14 not listed)');
// over the table
eq(core.pickConductor31016(800, 'cu', 75).size, null, '800 A Cu @ 75 -> none (max 750)');
eq(core.pickConductor31016(800, 'cu', 75).over.indexOf('parallel conductors') >= 0, true, 'over-table note suggests 310.4');
eq(core.pickConductor31016(700, 'al', 90).size, null, '700 A Al @ 90 -> none (max 630)');
// guards
eq(core.pickConductor31016(0, 'cu', 75).size, null, '0 A -> invalid');
eq(core.pickConductor31016(-5, 'cu', 75).size, null, 'negative -> invalid');
eq(core.pickConductor31016(100, 'cu', 85).over, 'pick a temperature column (60/75/90)', 'bogus temp -> invalid');
eq(core.pickConductor31016(100, 'gold', 75).label.indexOf('Cu') >= 0, true, 'unknown material defaults to copper');
// 90°C note wording (derating base)
eq(core.pickConductor31016(100, 'cu', 90).notes[0].indexOf('DERATING base') >= 0, true, '90 C note flags derating base');

// --- CSV neutral section now carries the conductor pick (v1.8) ---
const nlProj2 = { version: 2, projectName: 'Neutral', serviceA: 400, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 400, notes: '', circuits: [] }],
  nl: { totalVA: 75212, volt: 240, applyB2: true, dwelling: true, mat: 'cu', temp: 75 } };
const nlCSV2 = core.projectToCSV(nlProj2);
eq(nlCSV2.includes('"Neutral conductor (Table 310.16, 75 °C, copper)",250 kcmil Cu — 255 A'), true, 'csv conductor pick row (Cu 75C; comma label is quoted)');
const nlProj3 = { version: 2, projectName: 'Neutral', serviceA: 400, notes: '',
  panels: [{ name: 'Main', system: '120-240-1ph', ratingA: 400, notes: '', circuits: [] }],
  nl: { totalVA: 75212, volt: 240, applyB2: true, dwelling: true, mat: 'al', temp: 90 } };
const nlCSV3 = core.projectToCSV(nlProj3);
eq(nlCSV3.includes('Neutral conductor (Table 310.16, 90 °C, aluminum),3/0 AWG Al — 175 A'), false, 'csv Al 90C: 231.88 > 175 so 3/0 is NOT the pick (sanity)');
{
  const al90 = core.pickConductor31016(231.88, 'al', 90);
  eq(nlCSV3.includes(`"Neutral conductor (Table 310.16, 90 °C, aluminum)",${al90.label} — ${al90.amp} A`), true, 'csv Al 90C pick matches core (' + al90.label + ')');
}
// JSON roundtrip preserves mat/temp
const nlRT2 = core.fromJSON(core.toJSON(nlProj2));
eq(nlRT2.nl.mat, 'cu', 'json roundtrip keeps nl.mat');
eq(nlRT2.nl.temp, 75, 'json roundtrip keeps nl.temp');

// ================= v1.9: printReportHTML (branded PDF report core) =================
console.log('printReportHTML (v1.9):');
eq(typeof core.printReportHTML, 'function', 'exported as a function');
{
  const lcObj = { sqft: 2000, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 3500, motorsVA: null, volt: 240, acVA: null, hpNoSuppVA: null, hpCompressorVA: null, hpSuppVA: null, spaceHeatingVA: null, spaceUnits: null, thermalStorageVA: null };
  const projFull = {
    version: 2, projectName: 'Print Test House', serviceA: 600, notes: 'v1.9 test fixture',
    panels: [
      { name: 'Main LBO', system: '208-120-3ph', ratingA: 400, notes: '', circuits: [
        { pos: '1', name: 'kitchen counter', type: 'L1N', loadA: 10, breaker: 20 },
        { pos: '2', name: 'kitchen counter 2', type: 'L2N', loadA: 10, breaker: 20 },
        { pos: '3', name: 'laundry', type: 'L3N', loadA: 10, breaker: 20 },
        { pos: '4', name: 'bath', type: 'L1N', loadA: 10, breaker: 20 },
        { pos: '5', name: 'garage', type: 'L2N', loadA: 10, breaker: 20 },
        { pos: '6', name: 'outdoor', type: 'L3N', loadA: 10, breaker: 20 },
        { pos: '7', name: 'lighting 1', type: 'L1N', loadA: 10, breaker: 20 },
        { pos: '8', name: 'lighting 2', type: 'L2N', loadA: 10, breaker: 20 }
      ] },
      { name: 'Sub', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [
        { pos: '1', name: 'range', type: 'L1L2', loadA: 30 }
      ] }
    ],
    lc: lcObj, dd: { count: 6 }, lt: { totalVA: 12000, occupancy: 'dwelling' },
    ck: { mode: 'colC', count: 6, ratingKW: 12 },
    nl: { totalVA: 75212, cookingDryerVA: 0, volt: 240, applyB1: false, applyB2: true, dwelling: true, mat: 'cu', temp: 75 }
  };
  const fixedDate = new Date(Date.UTC(2026, 7, 27, 12, 0, 0));
  const html = core.printReportHTML(projFull, fixedDate);
  eq(typeof html, 'string', 'returns a string');
  // branded header
  eq(html.includes('Panel<span>Wright</span>'), true, 'brand title');
  eq(html.includes('<svg'), true, 'brand mark svg');
  eq(html.includes('Panel Schedule &amp; Load Rollup'), true, 'report subtitle');
  eq(html.includes('2026-08-27'), true, 'UTC report date');
  // project block
  eq(html.includes('Print Test House'), true, 'project name');
  eq(html.includes('v1.9 test fixture'), true, 'project notes');
  eq(html.includes('>600 A<'), true, 'service rating 600 A');
  // service rollup — numbers from the same core functions
  const pt = core.projectTotals(projFull);
  eq(pt.L1, 60, 'fixture: service L1 = 60');
  eq(pt.L2, 60, 'fixture: service L2 = 60');
  eq(pt.L3, 20, 'fixture: service L3 = 20');
  eq(pt.total, 140, 'fixture: service total = 140');
  eq(html.includes('<td class="num">60</td><td class="num">60</td><td class="num">20</td><td class="num">140</td>'), true, 'service rollup footer 60/60/20/140');
  eq(html.includes('Main LBO'), true, 'panel 1 in report');
  eq(html.includes('L1-N (120V)'), true, 'circuit type label');
  eq(html.includes('kitchen counter'), true, 'circuit name');
  eq(html.includes('L1 30'), true, 'panel L1 total 30');
  eq(html.includes('L3 20'), true, 'panel L3 total 20');
  // 220.82 — same core numbers as the UI card
  const lcR = core.serviceLoad22082(lcObj);
  eq(lcR.totalVA, 11600, 'fixture: 220.82 total 11600 VA');
  eq(html.includes('NEC 220.82'), true, '220.82 section present');
  eq(html.includes(lcR.totalVA + ' VA'), true, '220.82 total matches core');
  eq(html.includes(lcR.amps + ' A'), true, '220.82 amps match core');
  eq(html.includes(lcR.recommendedBreakerA + ' A'), true, '220.82 recommended breaker matches core');
  // 220.54
  const ddR = core.dryerDemand22054({ count: 6 });
  eq(html.includes('NEC 220.54'), true, '220.54 section present');
  eq(html.includes(ddR.demandVA + ' VA'), true, '220.54 demand matches core');
  eq(html.includes(ddR.factorPct + '%'), true, '220.54 factor matches core');
  // 220.42 (report formats with toLocaleString like the UI)
  const ltR = core.lightingDemand22042({ totalVA: 12000, occupancy: 'dwelling' });
  eq(html.includes('NEC 220.42'), true, '220.42 section present');
  eq(html.includes(ltR.totalVA.toLocaleString() + ' VA'), true, '220.42 connected load matches core');
  eq(html.includes(ltR.demandVA.toLocaleString() + ' VA'), true, '220.42 demand matches core');
  eq(html.includes(ltR.occupancyLabel), true, '220.42 occupancy label');
  // 220.55 Column C + Note 1
  const ckR = core.cookingDemand22055({ mode: 'colC', count: 6, ratingKW: 12 });
  eq(html.includes('NEC 220.55'), true, '220.55 section present');
  eq(html.includes(ckR.demandKW + ' kW (' + ckR.demandVA + ' VA)'), true, '220.55 demand matches core');
  // 220.61 + 310.16 pick
  const nlR = core.neutralLoad22061(projFull.nl);
  eq(nlR.valid, true, 'fixture: 220.61 valid');
  eq(html.includes('NEC 220.61'), true, '220.61 section present');
  eq(html.includes(nlR.basicA + ' A'), true, '220.61 basic A matches core');
  eq(html.includes(nlR.finalA + ' A'), true, '220.61 final A matches core');
  eq(html.includes(nlR.minAmpA + ' A'), true, '220.61 min ampacity matches core');
  const nlPick = core.pickConductor31016(nlR.minAmpA, 'cu', 75);
  eq(html.includes(nlPick.label + ' — ' + nlPick.amp + ' A'), true, '310.16 conductor pick matches core');
  // 210.11 checklist — fixture circuit names satisfy all 6 default rows
  eq(html.includes('NEC 210.11'), true, '210.11 section present');
  eq(html.includes('6 of 6'), true, 'checklist 6 of 6 met');
  // AI disclosure + design-aid footer
  eq(html.includes('Radloff Bot, an AI software assistant'), true, 'AI disclosure in footer');
  eq(html.includes('https://radloffbot.github.io/panelwright/'), true, 'app URL in footer');
  eq(html.includes('Design aid only'), true, 'design-aid disclaimer');
  // no app chrome in the print document
  eq(html.includes('app-ui'), false, 'no app UI class in report');
  eq(html.includes('btnPrint'), false, 'no app buttons in report');
  eq(html.includes('<input'), false, 'no inputs in report');
  // pure & deterministic
  eq(html, core.printReportHTML(projFull, fixedDate), true, 'deterministic for a fixed date');
  // escaping
  const htmlEsc = core.printReportHTML(Object.assign({}, projFull, { projectName: 'A & <B> "C"' }), fixedDate);
  eq(htmlEsc.includes('A &amp; &lt;B&gt; &quot;C&quot;'), true, 'project name is HTML-escaped');
  eq(htmlEsc.includes('<B>'), false, 'no raw <B> tag leaks');
}
console.log('printReportHTML edge cases:');
{
  const htmlEmpty = core.printReportHTML();
  eq(htmlEmpty.includes('Untitled Project'), true, 'no-args project -> untitled');
  eq(htmlEmpty.includes('not set'), true, 'no-args project -> service rating not set');
  eq(htmlEmpty.includes('0 of 6'), true, 'no-args project -> 0 of 6 requirements met');
  eq(htmlEmpty.includes('Service rating not set'), true, 'no-args project -> service % guidance');
  const htmlNoCirc = core.printReportHTML({ version: 2, projectName: 'EmptyPanel', serviceA: null, notes: '',
    panels: [{ name: 'P', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }] });
  eq(htmlNoCirc.includes('No circuits'), true, 'empty panel -> No circuits row');
  const over = { version: 2, projectName: 'Over', serviceA: 20, notes: '', panels: [
    { name: 'Main', system: '208-120-3ph', ratingA: 400, notes: '', circuits: [
      { type: 'L1N', loadA: 60 }
    ] }
  ] };
  const htmlOver = core.printReportHTML(over);
  eq(htmlOver.includes('exceeds rating'), true, 'service % > 100 flagged');
  const note2 = { version: 2, projectName: 'N2', serviceA: 200, notes: '', panels: [
    { name: 'Main', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }
  ], ck: { mode: 'note2', count: 6, ratingKW: 12, ratingsList: '11,12,13' } };
  const htmlN2 = core.printReportHTML(note2);
  const ckColC = core.cookingDemand22055({ count: 6, ratingKW: 12 });
  eq(htmlN2.includes(ckColC.demandKW + ' kW'), true, 'note2 mode: prints Column C demand');
  eq(htmlN2.includes('Note 2'), true, 'note2 mode: note names the selected mode');
}

console.log('NEC 230.42 / 310.16 service-line (ungrounded) conductor pick (v1.11, 220.82 card):');
{
  const S = core.serviceLineConductor22082;
  // invalid / no-load cases
  eq(S(null), { valid: false, reason: 'enter the 220.82 service load' }, 'null lc -> invalid');
  eq(S({}), { valid: false, reason: 'enter the 220.82 service load' }, 'no amps -> invalid');
  eq(S({ amps: 0 }), { valid: false, reason: 'enter the 220.82 service load' }, '0 A -> invalid');
  // 230.79(C) 100 A one-family floor dominates small loads
  const floor95 = S({ amps: 95 }, 'cu', 75);
  eq(floor95.reqA, 100, '95 A calc -> 100 A required (230.79(C) floor)');
  eq(floor95.pick.size, '3', '95 A calc Cu 75C -> 3 AWG (100 A exactly meets floor; 4 AWG=85 short)');
  eq(S({ amps: 95 }, 'al', 75).pick.size, '1', '95 A calc Al 75C -> 1 AWG (100 A; 2 AWG=90 short)');
  // above-floor: 230.42(A)(2) 100% of calculated load
  const big = S({ amps: 124.7 }, 'cu', 75);
  eq(big.reqA, 124.7, '124.7 A calc -> 124.7 A required (no floor)');
  eq(big.pick.size, '1', '124.7 A Cu 75C -> 1 AWG (130 A; 2/0? 2 AWG=115 short)');
  eq(S({ amps: 231.88 }, 'cu', 75).pick.size, '250', '231.88 A Cu 75C -> 250 kcmil (255 A; 2/0=175 short)');
  eq(S({ amps: 231.88 }, 'cu', 60).pick.size, '300', '231.88 A Cu 60C -> 300 kcmil (240 A; 250=215 short)');
  eq(S({ amps: 231.88 }, 'cu', 90).pick.size, '4/0', '231.88 A Cu 90C -> 4/0 AWG (260 A)');
  eq(S({ amps: 232 }, 'al', 75).pick.size, '350', '232 A Al 75C -> 350 kcmil (250 A; 300=230 short)');
  // defaults: mat->cu, temp->75
  eq(S({ amps: 100 }).pick.size, '3', 'defaults Cu 75C, req 100 -> 3 AWG (100 A)');
  eq(S({ amps: 100 }, 'bogus', 'bogus').pick.size, '3', 'bad mat/temp default to Cu 75C -> 3 AWG');
  // over table
  const over = S({ amps: 5000 }, 'cu', 90);
  eq(over.pick.over, 'exceeds Table 310.16 (750 A max for copper at 90 °C) — parallel conductors (310.4) or larger system', '5000 A -> over table');
  // end-to-end: serviceLoad22082 -> serviceLineConductor22082
  const lc = core.serviceLoad22082({ sqft: 2000, acVA: 12000, volt: 240 });
  const e2e = S(lc, 'cu', 75);
  eq(e2e.valid, true, 'e2e valid');
  eq(e2e.reqA, Math.max(lc.amps, 100), 'e2e reqA = max(amps,100)');
  // CSV + print report surface the pick
  const projSvc = { version: 2, projectName: 'SvcLine', serviceA: 200, notes: '',
    panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, notes: '', circuits: [] }],
    lc: { sqft: 2000, acVA: 12000, volt: 240, mat: 'cu', temp: 75 } };
  const csvSvc = core.projectToCSV(projSvc);
  eq(csvSvc.includes('Service-line (ungrounded) required ampacity'), true, 'csv has svc-line required-ampacity row');
  eq(csvSvc.includes('Service-line (ungrounded) conductor (Table 310.16'), true, 'csv has svc-line conductor row');
  eq(csvSvc.includes('310.12(A) 83% ungrounded service-conductor reduction NOT applied'), true, 'csv notes 310.12(A) not applied');
  const htmlSvc = core.printReportHTML(projSvc);
  eq(htmlSvc.includes('Service-line (ungrounded) required ampacity'), true, 'print has svc-line required-ampacity row');
  eq(htmlSvc.includes('Service-line (ungrounded) conductor (Table 310.16'), true, 'print has svc-line conductor row');
  eq(htmlSvc.includes('310.12(A) 83% ungrounded service-conductor reduction NOT applied'), true, 'print notes 310.12(A) not applied');
  // CSV omits the svc-line rows when no load
  const projSvc0 = { version: 2, projectName: 'Svc0', panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, circuits: [] }] };
  eq(core.projectToCSV(projSvc0).includes('Service-line (ungrounded) required ampacity'), false, 'csv omits svc-line when no lc load');
}

console.log('NEC 220.53 fixed-appliance demand (v1.12, 2017-2023 code verified):');
{
  const F = core.applianceDemand22053;
  // 4 or more appliances -> 75% of combined nameplate
  const f1 = F({ count: 6, totalVA: 8000 });
  eq(f1.eligible, true, '6 appliances -> eligible');
  eq(f1.factorPct, 75, '6 appliances -> 75% factor');
  eq(f1.demandVA, 6000, '8,000 VA x 75% = 6,000 VA demand');
  eq(f1.savingsVA, 2000, 'savings 2,000 VA (25%)');
  eq(F({ count: 4, totalVA: 4000 }).demandVA, 3000, 'boundary: exactly 4 -> 75% (4,000 -> 3,000)');
  // fewer than 4 -> factor not permitted, 100%
  const f3 = F({ count: 3, totalVA: 3000 });
  eq(f3.eligible, false, '3 appliances -> not eligible');
  eq(f3.factorPct, 100, '3 appliances -> 100%');
  eq(f3.demandVA, 3000, '3,000 VA x 100% = 3,000 VA');
  eq(f3.savingsVA, 0, 'no savings under 4');
  eq(F({ count: 1, totalVA: 1200 }).demandVA, 1200, '1 appliance -> 100%');
  // rounding
  eq(F({ count: 5, totalVA: 1000 }).demandVA, 750, '1,000 VA x 75% = 750 VA');
  eq(F({ count: 5, totalVA: 1010 }).demandVA, 757.5, '1,010 VA x 75% = 757.5 VA (round2)');
  // edge / invalid inputs (no throw, clamp to 0)
  eq(F({}).count, 0, 'empty -> 0 count');
  eq(F({}).demandVA, 0, 'empty -> 0 VA');
  eq(F(null).demandVA, 0, 'null -> 0 VA, no throw');
  eq(F({ count: -3 }).count, 0, 'negative count clamped to 0');
  eq(F({ count: 4.9 }).count, 4, 'fractional count floors (4.9 -> 4)');
  eq(F({ count: 4, totalVA: 0 }).demandVA, 0, '4 appliances, 0 VA -> 0');
  eq(F({ count: 0, totalVA: 9000 }).demandVA, 0, '0 appliances -> 0 demand even w/ VA');
  eq(F({ count: 5, totalVA: -500 }).totalVA, 0, 'negative VA clamped to 0');
  // CSV surface
  const projFa = { version: 2, projectName: 'Fa22053', panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, circuits: [] }],
    fa: { count: 6, totalVA: 8000 } };
  const csvFa = core.projectToCSV(projFa);
  eq(csvFa.includes('FIXED APPLIANCE LOAD — NEC 220.53'), true, 'csv has 220.53 section header');
  eq(csvFa.includes('220.53 demand factor'), true, 'csv has factor row');
  eq(csvFa.includes('75% (4 or more appliances)'), true, 'csv states 75% (4+)');
  eq(csvFa.includes('6000 VA'), true, 'csv has 6000 VA demand (raw number in CSV)');
  eq(csvFa.includes('220.82(B)(3)'), true, 'csv notes exclude cooking (220.55) / dryers');
  // under-4 case flags in CSV
  const csvFa3 = core.projectToCSV(Object.assign({}, projFa, { fa: { count: 3, totalVA: 3000 } }));
  eq(csvFa3.includes('fewer than 4 — factor not permitted; counted at 100%'), true, 'csv flags under-4 at 100%');
  // print report surface
  const htmlFa = core.printReportHTML(projFa);
  eq(htmlFa.includes('NEC 220.53'), true, 'print has 220.53 section');
  eq(htmlFa.includes('Fixed-appliance demand'), true, 'print has 220.53 title');
  eq(htmlFa.includes('75% (4 or more appliances)'), true, 'print states 75% (4+)');
  eq(htmlFa.includes('− 2,000 VA'), true, 'print shows 25% reduction');
  // CSV + print omit the section when no appliances
  const projFa0 = { version: 2, projectName: 'Fa0', panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, circuits: [] }] };
  eq(core.projectToCSV(projFa0).includes('FIXED APPLIANCE LOAD'), false, 'csv omits 220.53 when no fa');
  eq(core.printReportHTML(projFa0).includes('Fixed-appliance demand'), false, 'print omits 220.53 when no fa');
}

console.log('NEC 220.56 commercial kitchen equipment demand (v1.14, 2014 = 2020 verbatim):');
{
  const K = core.kitchenDemand22056;
  // Table 220.56 factors (verified: 2014 PDF coordinate extraction == 2020 text;
  // no 2023 change; independent live cross-check expertce.com)
  eq(K({ count: 1, totalVA: 10000 }).factorPct, 100, '1 unit -> 100%');
  eq(K({ count: 2, totalVA: 10000 }).factorPct, 100, '2 units -> 100%');
  eq(K({ count: 3, totalVA: 10000 }).factorPct, 90, '3 units -> 90%');
  eq(K({ count: 4, totalVA: 10000 }).factorPct, 80, '4 units -> 80%');
  eq(K({ count: 5, totalVA: 10000 }).factorPct, 70, '5 units -> 70%');
  eq(K({ count: 6, totalVA: 10000 }).factorPct, 65, '6 units -> 65%');
  eq(K({ count: 12, totalVA: 10000 }).factorPct, 65, '12 units (over 6) -> 65%');
  eq(K({ count: 6, totalVA: 10000 }).factorLabel, '6 and over: 65%', 'label for 6+');
  // Independent live worked example (expertce.com, 6 units @ 57 kW = 57,000 VA):
  // 65% factor -> 37.05 kW; two largest sum 29 kW -> factor result governs
  const live = K({ count: 6, totalVA: 57000, largestVA: 16000, secondVA: 13000 });
  eq(live.rawDemandVA, 37050, '57,000 VA x 65% = 37,050 VA (live vector: 37.05 kW)');
  eq(live.twoLargestVA, 29000, 'two largest = 29,000 VA (live vector: 29 kW)');
  eq(live.demandVA, 37050, 'factor result 37,050 VA governs (floor 29,000 <= factored)');
  eq(live.floorApplied, false, 'floor not applied when it is below the factored load');
  eq(live.savingsVA, 19950, 'savings 19,950 VA (35%)');
  // Two-largest floor governs: 4 units @ 80% of 20,000 = 16,000; two largest 12,000+10,000=22,000
  const floorCase = K({ count: 4, totalVA: 20000, largestVA: 12000, secondVA: 10000 });
  eq(floorCase.rawDemandVA, 16000, '20,000 VA x 80% = 16,000 VA');
  eq(floorCase.twoLargestVA, 22000, 'two largest = 22,000 VA');
  eq(floorCase.demandVA, 22000, 'demand = 22,000 VA (two-largest floor governs)');
  eq(floorCase.floorApplied, true, 'floorApplied flagged when floor > factored');
  eq(floorCase.savingsVA, -2000, 'savings negative when the floor exceeds the total (flag, do not hide)');
  // 100% factors: demand = connected (no savings possible)
  eq(K({ count: 2, totalVA: 42000 }).demandVA, 42000, '2 units 100% -> full connected');
  // One largest given but not the second: floor NOT applied (needs both), flagged
  const oneSide = K({ count: 3, totalVA: 20000, largestVA: 9000 });
  eq(oneSide.hasTwoLargest, false, 'single largest -> no floor data');
  eq(oneSide.demandVA, 18000, '3 units 90% -> 18,000 VA (floor not applied)');
  // Edge / invalid inputs (no throw, clamp to 0)
  eq(K({}).count, 0, 'empty -> 0 count');
  eq(K({}).demandVA, 0, 'empty -> 0 VA');
  eq(K(null).demandVA, 0, 'null -> 0 VA, no throw');
  eq(K({ count: -2 }).count, 0, 'negative count clamped to 0');
  eq(K({ count: 5.9 }).count, 5, 'fractional count floors (5.9 -> 5)');
  eq(K({ count: 0, totalVA: 9000 }).demandVA, 0, '0 units -> 0 demand even w/ VA');
  eq(K({ count: 3, totalVA: -500 }).totalVA, 0, 'negative VA clamped to 0');
  eq(K({ count: 3, totalVA: 1000 }).factorPct, 90, '3 units -> 90% factor (sanity at small total)');
  // CSV surface
  const projK56 = { version: 2, projectName: 'K56', panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, circuits: [] }],
    k56: { count: 6, totalVA: 57000, largestVA: 16000, secondVA: 13000 } };
  const csvK56 = core.projectToCSV(projK56);
  eq(csvK56.includes('COMMERCIAL KITCHEN EQUIPMENT LOAD — NEC 220.56'), true, 'csv has 220.56 section header');
  eq(csvK56.includes('Table 220.56 demand factor'), true, 'csv has factor row');
  eq(csvK56.includes('65%'), true, 'csv states 65% factor');
  eq(csvK56.includes('37050 VA'), true, 'csv has 37,050 VA factored demand (raw number in CSV)');
  eq(csvK56.includes('29000 VA'), true, 'csv has two-largest floor 29,000 VA');
  eq(csvK56.includes('EXCLUDED'), true, 'csv notes space-heating/ventilating/AC exclusion');
  // Floor-governing case in CSV
  const csvK56Floor = core.projectToCSV(Object.assign({}, projK56,
    { k56: { count: 4, totalVA: 20000, largestVA: 12000, secondVA: 10000 } }));
  eq(csvK56Floor.includes('two-largest floor 22000 VA (exceeds the factored demand)'), true, 'csv flags the governing floor');
  // Not-entered two-largest wording
  const csvK56No2 = core.projectToCSV(Object.assign({}, projK56, { k56: { count: 3, totalVA: 20000 } }));
  eq(csvK56No2.includes('not entered — verify the factor result against the sum of your two largest units'), true, 'csv flags missing two-largest');
  // Print report surface
  const htmlK56 = core.printReportHTML(projK56);
  eq(htmlK56.includes('NEC 220.56'), true, 'print has 220.56 section');
  eq(htmlK56.includes('Commercial kitchen equipment demand'), true, 'print has 220.56 title');
  eq(htmlK56.includes('37,050 VA'), true, 'print shows 37,050 VA factored demand (formatted)');
  eq(htmlK56.includes('29,000 VA'), true, 'print shows 29,000 VA floor (formatted)');
  eq(core.printReportHTML(Object.assign({}, projK56,
    { k56: { count: 4, totalVA: 20000, largestVA: 12000, secondVA: 10000 } })).includes('GOVERNS'), true, 'print flags the governing floor');
  // Omission when the card is untouched
  const projK560 = { version: 2, projectName: 'K0', panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, circuits: [] }] };
  eq(core.projectToCSV(projK560).includes('COMMERCIAL KITCHEN'), false, 'csv omits 220.56 when no k56');
  eq(core.printReportHTML(projK560).includes('Commercial kitchen equipment demand'), false, 'print omits 220.56 when no k56');
  // JSON roundtrip keeps the card state
  const rtK56 = core.fromJSON(core.toJSON(projK56));
  eq(rtK56.k56.count, 6, 'JSON roundtrip keeps k56.count');
  eq(rtK56.k56.totalVA, 57000, 'JSON roundtrip keeps k56.totalVA');
  eq(rtK56.k56.largestVA, 16000, 'JSON roundtrip keeps k56.largestVA');
  eq(rtK56.k56.secondVA, 13000, 'JSON roundtrip keeps k56.secondVA');
}

console.log('Voltage drop — NEC Ch. 9 Table 8 (v1.13, 3-source cross-checked):');
{
  // Table integrity (28 sizes; values verified vs zing2 2023 / nordix / voltagelab + codeelec 2023 print)
  eq(core.CH9_T8.length, 28, 'CH9_T8 has 28 sizes (14 AWG … 2000 kcmil)');
  eq(core.ch9Row('14'), { s: '14', cm: 4110, cu: 3.07, al: 5.04 }, '14 AWG row 3.07/5.04');
  eq(core.ch9Row('4').cu, 0.308, '4 AWG Cu 0.308 (codeelec 2023 print anchor)');
  eq(core.ch9Row('4').al, 0.508, '4 AWG Al 0.508');
  eq(core.ch9Row('4/0'), { s: '4/0', cm: 211600, cu: 0.0608, al: 0.100 }, '4/0 row 0.0608/0.100');
  eq(core.ch9Row('2000').cu, 0.00662, '2000 kcmil Cu 0.00662');
  eq(core.ch9Row('2000').al, 0.0108, '2000 kcmil Al 0.0108');
  eq(core.ch9Row('12').cm, 6530, '12 AWG 6,530 CM');
  eq(core.ch9Row('99'), null, 'unknown size -> null');

  const V = core.voltageDrop;
  // Worked example (matches the K-formula method used in field references):
  // 120 V, 12 AWG Cu, 16 A, 75 ft one-way. R = 1.93 x .075 = .14475 ohm
  // Vd = 2 x 16 x .14475 = 4.632 V -> 3.86% (over 3%, under 5%)
  const v1 = V({ amps: 16, lengthFt: 75, volt: 120, size: '12', mat: 'cu', config: '1ph' });
  eq(v1.valid, true, '12 AWG case valid');
  eq(v1.rPerKft, 1.93, 'R = 1.93 ohm/kft');
  eq(v1.rOneWay, 0.1447, 'one-way R = 0.1447 ohm (4 dp)');
  eq(v1.vdV, 4.63, 'Vd = 4.63 V');
  eq(v1.pctV, 3.86, '3.86% of 120 V');
  eq(v1.status, 'warn', '3.86% -> warn band');
  eq(v1.kEff, 12.6, 'K-eff = 1.93 x 6530 / 1000 = 12.6');
  eq(v1.label, '12 AWG Cu', 'label 12 AWG Cu');
  // 240 V L-L, 4 AWG Cu, 25 A, 150 ft: R = .0462; Vd = 2.31 V = 0.96% (ok)
  const v2 = V({ amps: 25, lengthFt: 150, volt: 240, size: '4', mat: 'cu', config: '1ph' });
  eq(v2.rOneWay, 0.0462, 'one-way R 0.0462');
  eq(v2.vdV, 2.31, 'Vd 2.31 V');
  eq(v2.pctV, 0.96, '0.96%');
  eq(v2.status, 'ok', '0.96% -> ok');
  // 3-phase L-L: 480 V, 8 AWG Cu, 20 A, 100 ft: R = .0778; Vd = sqrt(3) x 20 x .0778 = 2.6951
  const v3 = V({ amps: 20, lengthFt: 100, volt: 480, size: '8', mat: 'cu', config: '3ph' });
  eq(v3.threePhase, true, '3ph flagged');
  approx(v3.vdV, 2.7, 0.01, '3ph Vd ≈ 2.7 V (sqrt3 factor)');
  approx(v3.pctV, 0.56, 0.01, '3ph pct ≈ 0.56%');
  // Over-5% case: 120 V, 14 AWG Cu, 15 A, 120 ft: R = .3684; Vd = 11.052 = 9.21%
  const v4 = V({ amps: 15, lengthFt: 120, volt: 120, size: '14', mat: 'cu', config: '1ph' });
  eq(v4.vdV, 11.05, 'Vd 11.05 V');
  eq(v4.pctV, 9.21, '9.21%');
  eq(v4.status, 'bad', '9.21% -> bad band');
  // Aluminum: 120 V, 12 AWG Al, 10 A, 60 ft: R = 3.17 x .06 = .1902; Vd = 3.804 = 3.17%
  const v5 = V({ amps: 10, lengthFt: 60, volt: 120, size: '12', mat: 'al', config: '1ph' });
  eq(v5.mat, 'al', 'mat al');
  eq(v5.vdV, 3.8, 'Al Vd 3.8 V');
  eq(v5.pctV, 3.17, 'Al 3.17% -> warn');
  eq(v5.status, 'warn', 'Al warn band');
  // K-equivalent consistency for the 8 AWG–4/0 range (~12.9 Cu / ~21.2 Al)
  approx(V({ amps: 1, lengthFt: 1000, volt: 120, size: '8', mat: 'cu' }).kEff, 12.84, 0.02, 'K-eff 8 AWG Cu ≈ 12.8 (12.9 handbook approx)');
  approx(V({ amps: 1, lengthFt: 1000, volt: 120, size: '2', mat: 'al' }).kEff, 21.15, 0.05, 'K-eff 2 AWG Al ≈ 21.2');
  // Invalid inputs (no throw)
  eq(V({}).valid, false, 'empty -> invalid');
  eq(V({ amps: 10, lengthFt: 50, volt: 120 }).valid, false, 'no size -> invalid');
  eq(V({ amps: 0, lengthFt: 50, volt: 120, size: '12' }).valid, false, 'zero amps -> invalid');
  eq(V({ amps: 10, lengthFt: 0, volt: 120, size: '12' }).valid, false, 'zero length -> invalid');
  eq(V({ amps: 10, lengthFt: 50, volt: 0, size: '12' }).valid, false, 'zero volts -> invalid');
  eq(V(null).valid, false, 'null -> invalid, no throw');
  eq(V({ amps: -5, lengthFt: 50, volt: 120, size: '12' }).valid, false, 'negative amps -> invalid');

  // Size-for-drop picker (default target 3%)
  const S = core.sizeForVoltageDrop;
  const s1 = S({ amps: 15, lengthFt: 120, volt: 120, mat: 'cu', config: '1ph' });
  eq(s1.valid, true, 'sizer valid');
  eq(s1.targetPct, 3, 'default target 3%');
  eq(s1.pick.size, '8', '15 A / 120 ft @120 V -> 8 AWG Cu (2.33%)');
  eq(s1.pick.pctV, 2.33, '8 AWG = 2.33%');
  // 12 AWG (5.79%) and 10 AWG (3.63%) must both be rejected at the 3% target
  eq(V({ amps: 15, lengthFt: 120, volt: 120, size: '12' }).pctV, 5.79, '12 AWG 5.79% (rejected)');
  eq(V({ amps: 15, lengthFt: 120, volt: 120, size: '10' }).pctV, 3.63, '10 AWG 3.63% (rejected)');
  // Custom target 5% -> 10 AWG (3.63%)
  const s2 = S({ amps: 15, lengthFt: 120, volt: 120, mat: 'cu', config: '1ph', targetPct: 5 });
  eq(s2.pick.size, '10', 'target 5% -> 10 AWG Cu');
  // Aluminum sizer: 15 A / 120 ft @120 V -> 8 AWG Al (0.778->1.28: 2×15×1.28×.12/120 = 3.84% no;
  // 6 AWG Al 0.808: 2×15×0.808×.12/120 = 2.42% yes)
  const s3 = S({ amps: 15, lengthFt: 120, volt: 120, mat: 'al', config: '1ph' });
  eq(s3.pick.size, '6', 'aluminum -> 6 AWG Al (2.42%)');
  eq(s3.pick.pctV, 2.42, '6 AWG Al = 2.42%');
  // Over-table: 400 A / 1000 ft @120 V — even 2000 kcmil Cu is 4.41%
  const s4 = S({ amps: 400, lengthFt: 1000, volt: 120, mat: 'cu', config: '1ph' });
  eq(s4.pick, null, 'over-table -> no pick');
  eq(typeof s4.over, 'string', 'over-table message present');
  eq(s4.over.includes('2000 kcmil'), true, 'over message names 2000 kcmil');
  eq(V({ amps: 400, lengthFt: 1000, volt: 120, size: '2000' }).pctV, 4.41, '2000 kcmil still 4.41% (sanity)');

  // CSV surface
  const projVd = { version: 2, projectName: 'Vd113', panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, circuits: [] }],
    vd: { amps: 16, lengthFt: 75, volt: 120, size: '12', mat: 'cu', config: '1ph' } };
  const csvVd = core.projectToCSV(projVd);
  eq(csvVd.includes('VOLTAGE DROP — ONE CIRCUIT RUN'), true, 'csv has vd section header');
  eq(csvVd.includes('Voltage drop (%)'), true, 'csv has pct row');
  eq(csvVd.includes('3.86% (between 3% and 5%'), true, 'csv states 3.86% warn wording');
  eq(csvVd.includes('1.93 ohm/kft @ 75 °C'), true, 'csv cites Table 8 R value');
  eq(csvVd.includes('Smallest size at ≤ 3%'), true, 'csv suggests the ≤3% size');
  eq(csvVd.includes('10 AWG Cu (2.42%)'), true, 'csv names 10 AWG Cu pick (16 A/75 ft: 12 AWG=3.86%, 10 AWG=2.42%)');
  eq(csvVd.includes('INFORMATIONAL NOTE recommendations'), true, 'csv discloses 3%/5% are recommendations');
  // Print surface
  const htmlVd = core.printReportHTML(projVd);
  eq(htmlVd.includes('Voltage drop — one circuit run'), true, 'print has vd section title');
  eq(htmlVd.includes('4.63 V'), true, 'print shows 4.63 V');
  eq(htmlVd.includes('3.86%'), true, 'print shows 3.86%');
  eq(htmlVd.includes('Smallest size at ≤ 3%'), true, 'print suggests the ≤3% size');
  // Omission when the card is untouched
  const projVd0 = { version: 2, projectName: 'Vd0', panels: [{ name: 'M', system: '120-240-1ph', ratingA: 200, circuits: [] }] };
  eq(core.projectToCSV(projVd0).includes('VOLTAGE DROP'), false, 'csv omits vd when no vd');
  eq(core.printReportHTML(projVd0).includes('Voltage drop — one circuit run'), false, 'print omits vd when no vd');
  // JSON roundtrip keeps the card state
  const rt = core.fromJSON(core.toJSON(projVd));
  eq(rt.vd.size, '12', 'JSON roundtrip keeps vd.size');
  eq(rt.vd.amps, 16, 'JSON roundtrip keeps vd.amps');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
