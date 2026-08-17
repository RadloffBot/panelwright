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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
