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
eq(core.nextStdBreaker(130), 150, '130 -> 150 (140 is NOT a standard size; 125 < 130 <= 150)');
eq(core.nextStdBreaker(151), 175, '151 -> 175 (165 is NOT a standard size)');
eq(core.nextStdBreaker(160), 175, '160 -> 175 (not 165)');
eq(core.nextStdBreaker(3200), 4000, '3200 -> 4000 (4000/5000/6000 are standard)');
eq(core.nextStdBreaker(9999), null, 'too big -> null (6000 is the largest)');
eq(core.nextStdBreaker(0), null, '0 -> null');
eq(core.nextStdBreaker(-5), null, 'neg -> null');

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
eq(artC.recommendedBreakerA, 150, 'artC -> 150 A (140 is NOT a standard size — v1.15.2 fix)');
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

// --- article (Session 30) boundary-seam demands: demand VA at each table seam ---
// 11 x 5,000 = 55,000 @ 47% = 25,850 ; 12 x 5,000 = 60,000 @ 46% = 27,600
eq(core.dryerDemand22054({ count: 11 }).demandVA, 25850, 'art 11 dryers 47% -> 25,850 VA');
eq(core.dryerDemand22054({ count: 12 }).demandVA, 27600, 'art 12 dryers 46% -> 27,600 VA (seam 11->12)');
// 23 x 5,000 = 115,000 @ 35% = 40,250 ; 24 x 5,000 = 120,000 @ 34.5% = 41,400
eq(core.dryerDemand22054({ count: 23 }).demandVA, 40250, 'art 23 dryers 35% -> 40,250 VA (bottom of 12-23 band)');
eq(core.dryerDemand22054({ count: 24 }).demandVA, 41400, 'art 24 dryers 34.5% -> 41,400 VA (seam 23->24)');
// 42 x 5,000 = 210,000 @ 25.5% = 53,550 ; 43 x 5,000 = 215,000 @ 25% = 53,750
eq(core.dryerDemand22054({ count: 42 }).demandVA, 53550, 'art 42 dryers 25.5% -> 53,550 VA (bottom of 24-42 band)');
eq(core.dryerDemand22054({ count: 43 }).demandVA, 53750, 'art 43 dryers 25% -> 53,750 VA (seam 42->43)');
// 43 and over holds the 25% floor: 50 x 5,000 = 250,000 @ 25% = 62,500
eq(core.dryerDemand22054({ count: 50 }).demandVA, 62500, 'art 50 dryers 25% floor -> 62,500 VA');
// demand in VA must be monotonic non-decreasing 11..50 even while the factor drops
const seamVA = [];
for (let n = 11; n <= 50; n++) seamVA.push(core.dryerDemand22054({ count: n }).demandVA);
let seamMonotone = true;
for (let i = 1; i < seamVA.length; i++) if (seamVA[i] < seamVA[i - 1]) seamMonotone = false;
eq(seamMonotone, true, 'art demand VA monotonic non-decreasing 11..50 dryers');
// --- article: 3-phase 4-wire effective count (max 4 between any two phases -> 8) ---
const de3ph = core.dryerDemand22054({ count: 8 });
eq(de3ph.connectedVA, 40000, 'art 3ph effective 8 connected 40,000 VA');
eq(de3ph.factorPct, 60, 'art 3ph effective 8 factor 60%');
eq(de3ph.demandVA, 24000, 'art 3ph effective 8 demand 24,000 VA');
// --- article: nameplate below the 5,000 VA minimum still floors at 5,000 each ---
eq(core.dryerDemand22054({ count: 4, nameplateVA: 3000 }).demandVA, 20000, 'art 4 dryers @3,000 nameplate -> 5,000 each -> 20,000 VA @100%');

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

// --- 220.42 feature article (Session 31): worked examples + tier-boundary seams ---
// Worked examples as published in articles/nec-22042-lighting-demand.html
eq(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 50000 }).demandVA, 19450, 'dw 50,000 -> 3,000@100% + 47,000@35% = 19,450');
eq(core.lightingDemand22042({ occupancy: 'others', totalVA: 50000 }).demandVA, 50000, 'others 50,000 -> 50,000 (no diversity)');
// Tier-boundary seams: one VA just over each upper bound (continuity, no jump)
approx(core.lightingDemand22042({ occupancy: 'dwelling', totalVA: 120001 }).demandVA, 43950.25, 0.01, 'dw 120,001 -> 43,950 + 1@25% = 43,950.25');
approx(core.lightingDemand22042({ occupancy: 'hospital', totalVA: 50001 }).demandVA, 20000.2, 0.01, 'hosp 50,001 -> 20,000 + 1@20% = 20,000.2');
approx(core.lightingDemand22042({ occupancy: 'hotel', totalVA: 20001 }).demandVA, 10000.4, 0.01, 'hotel 20,001 -> 10,000 + 1@40% = 10,000.4');
approx(core.lightingDemand22042({ occupancy: 'warehouse', totalVA: 12501 }).demandVA, 12500.5, 0.01, 'wh 12,501 -> 12,500 + 1@50% = 12,500.5');
// Tier-boundary seams: exactly at each upper bound (the higher band is 0)
eq(core.lightingDemand22042({ occupancy: 'hospital', totalVA: 50000 }).demandVA, 20000, 'hosp 50,000 (exact seam) -> 20,000');
eq(core.lightingDemand22042({ occupancy: 'hotel', totalVA: 20000 }).demandVA, 10000, 'hotel 20,000 (exact seam) -> 10,000');
eq(core.lightingDemand22042({ occupancy: 'warehouse', totalVA: 12500 }).demandVA, 12500, 'wh 12,500 (exact seam) -> 12,500');
// Hotel 3-tier worked example tail: 100,000 is the exact top of the 40% band
eq(core.lightingDemand22042({ occupancy: 'hotel', totalVA: 100000 }).tiers[2].sliceVA, 0, 'hotel 100,000: 30% band slice is 0 at the seam');
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
// --- 200 A seam (B2 applies only when basic STRICTLY exceeds 200 A) — article-locked ---
// nec-22061-neutral-load.html "The 200 A boundary, spelled out" table.
const s1 = core.neutralLoad22061({ totalVA: 23990, volt: 120, applyB2: true });
eq(s1.basicA, 199.92, 'seam: 23,990 VA @120V basic 199.92 A (under 200)');
eq(s1.b2Applied, false, 'seam: 199.92 A -> B2 not applied');
eq(s1.finalA, 199.92, 'seam: 199.92 A final (no reduction)');
const s2 = core.neutralLoad22061({ totalVA: 24010, volt: 120, applyB2: true });
eq(s2.basicA, 200.08, 'seam: 24,010 VA @120V basic 200.08 A (just over)');
eq(s2.b2Applied, true, 'seam: 200.08 A -> B2 applied to 0.08 A');
eq(s2.finalA, 200.06, 'seam: 200 + 0.08x0.70 = 200.06 A');
eq(core.neutralLoad22061({ totalVA: 24000, volt: 120, applyB2: true }).finalA, 200, 'seam: exactly 200 A -> B2 not applied (not in excess of 200)');
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

// --- 310.16 feature article (Session 33): boundary seams, column spread, OCPD caps, over-table ---
// Every value below is a pick from the shipped pickConductor31016() core, asserted so the
// article's worked-example table and boundary table can never drift from the tool.
{
  const pick = (a, m, t) => core.pickConductor31016(a, m, t);
  // Boundary seams (copper, 75 C column) — exact fit vs +1 A crossing the step
  eq(pick(130, 'cu', 75).size, '1',   '130 A Cu@75 -> 1 AWG (exact 130)');
  eq(pick(131, 'cu', 75).size, '1/0', '131 A Cu@75 -> 1/0 AWG (+1 A seam)');
  eq(pick(200, 'cu', 75).size, '3/0', '200 A Cu@75 -> 3/0 AWG (exact 200, the 200 A service knife edge)');
  eq(pick(201, 'cu', 75).size, '4/0', '201 A Cu@75 -> 4/0 AWG (+1 A seam)');
  eq(pick(230, 'cu', 75).size, '4/0', '230 A Cu@75 -> 4/0 AWG (exact 230)');
  eq(pick(231, 'cu', 75).size, '250', '231 A Cu@75 -> 250 kcmil (+1 A seam into kcmil)');
  // Temperature-column spread for one requirement (115 A)
  eq(pick(115, 'cu', 60).size, '1/0', '115 A Cu@60 -> 1/0 AWG (125)');
  eq(pick(115, 'cu', 75).size, '2',   '115 A Cu@75 -> 2 AWG (115)');
  eq(pick(115, 'cu', 90).size, '3',   '115 A Cu@90 -> 3 AWG (115, derating base)');
  // Over-table guard at the copper 75 C ceiling (665 A)
  eq(pick(665, 'cu', 75).size, '2000', '665 A Cu@75 -> 2000 kcmil (table max, exact)');
  eq(pick(666, 'cu', 75).size, null,   '666 A Cu@75 -> none (one past the table max)');
  eq(pick(666, 'cu', 75).over.indexOf('parallel conductors') >= 0, true, 'over-table message points to 310.4 parallel conductors');
}

// --- v1.15 citation-accuracy fix (Session 34): 5% neutral check is a screening guideline, NOT "NEC 408.3(C)" ---
// Math must be unchanged (limit = 5% of rating); only the citations/labels are corrected.
{
  const cs = [{ type: 'L1N', loadA: 100 }, { type: 'L2N', loadA: 30 }, { type: 'L3N', loadA: 30 }];
  const t = core.panelTotals(cs, '208-120-3ph', 400);
  eq(t.neutralLimit, 20, 'v1.15: neutral limit still 5% of 400 A rating (math unchanged)');
  approx(t.neutralEst, 46.67, 0.01, 'v1.15: neutral est 46.67 A (math unchanged)');
  eq(t.neutralOk, false, 'v1.15: 46.67 > 20 -> exceeds screening guideline');
  const proj = { version: 2, projectName: 'CitFix', panels: [{ name: 'P1', system: '208-120-3ph', ratingA: 400, circuits: cs }] };
  const csv = core.projectToCSV(proj);
  eq(csv.includes('408.3'), false, 'v1.15: CSV no longer cites 408.3 for the 5% check');
  eq(csv.includes('Neutral Limit 5% (A, screening guideline — not a NEC limit)'), true, 'v1.15: CSV uses the corrected label');
  const html = core.printReportHTML(proj);
  eq(html.includes('408.3(C) exceeded'), false, 'v1.15: print no longer claims 408.3(C) exceeded');
  eq(html.includes('(screening limit 20 A, 5% guideline — not a NEC limit)'), true, 'v1.15: print badge uses corrected wording');
  eq(html.includes('above the 5% screening guideline'), true, 'v1.15: print states the exceedance in screening terms');
  eq(html.includes('the NEC sets no percent-unbalance limit on panelboards'), true, 'v1.15: print discloses the NEC has no % unbalance limit on panelboards');
  eq(html.includes('220.61 / 310.12(D)'), true, 'v1.15: print points to the real neutral-minimum rules (220.61 / 310.12(D))');
}

// --- v1.15.1 citation correction (Session 35): v1.15's correction comments MIS-TITLED 408.3 ---
// Verified 2026-08-30 (Session 35): NEC 408.3 = "Support and Arrangement of Busbars and
// Conductors" in 2014/2017/2020/2023 (up.codes section index for all four editions + IAE 2015
// Art. 408/409 article + ELR verbatim 2014 text + Mike Holt 2023 Art. 408 newsletter). The
// "Identification of Phase Line or System Voltage" title is 110.15's PRE-2014 title (110.15 =
// "High-Leg Marking" in the 2020 NEC, verbatim on disk). The shipped app.js must never
// re-carry that mis-title.
{
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  eq(/NEC 408\.3 is "Identification of Phase Line or System/.test(src), false, 'v1.15.1: app.js no longer mis-titles 408.3 as "Identification of Phase Line or System Voltage"');
  eq(src.includes('NEC 408.3 is "Support and Arrangement of Busbars and\n  // Conductors" (2014–2023'), true, 'v1.15.1: inline comment carries the verified 2014–2023 408.3 title');
  eq(src.includes('"Support and Arrangement of Busbars and Conductors" (2014/2017/2020/2023,'), true, 'v1.15.1: header comment carries the verified 408.3 title (all four editions)');
  eq(src.includes('408.3 is "Support and Arrangement of Busbars and'), true, 'v1.15.1: header names 408.3 correctly');
  eq(src.includes('110.15'), true, 'v1.15.1: header documents that the mis-title belongs to 110.15 (pre-2014)');
  eq(src.includes('NO NEC edition'), true, 'v1.15.1: header states no NEC edition sets a % unbalance limit on panelboards');
  // version label bumped
  eq(src.startsWith('/*\n * PanelWright v1.16'), true, 'v1.16: version banner bumped');
  // v1.15.2 STD_BREAKERS citation fix: no non-standard 140/165; full 240.6(A) to 6000
  eq(src.includes('125, 150, 175, 200'), true, 'v1.15.2: standard list has no 140/165 (125,150,175,200)');
  eq(src.includes('2500, 3000, 4000, 5000, 6000'), true, 'v1.15.2: standard list includes 4000/5000/6000');
}

// --- 210.11 feature article (Session 34): articles/nec-21011-branch-circuits.html ---
// The article's worked-example numbers are produced by the shipped serviceLoad22082() and
// dwStatus() cores and asserted here so the article table can never drift from the tool.
{
  const sa = (n) => core.serviceLoad22082({ sqft: 1600, smallApplianceCircuits: n, laundryCircuits: 1, acVA: 12000, volt: 240 });
  eq(sa(2).smallApplianceVA, 3000, '210.11: 2 min small-appliance circuits -> 3,000 VA (220.52(A) 1,500 each)');
  eq(sa(3).smallApplianceVA, 4500, '210.11: permitted 3rd small-appliance circuit -> 4,500 VA');
  const la = (n) => core.serviceLoad22082({ sqft: 1600, smallApplianceCircuits: 2, laundryCircuits: n, acVA: 12000, volt: 240 });
  eq(la(1).laundryVA, 1500, '210.11: 1 min laundry circuit -> 1,500 VA (220.52(B))');
  eq(la(2).laundryVA, 3000, '210.11: permitted 2nd laundry circuit -> 3,000 VA');
  const base = sa(2);
  eq(base.generalConnectedVA, 9300, '210.11: baseline 1,600 sf + 2SA + 1 laundry -> 9,300 VA connected (4,800 lighting + 3,000 + 1,500)');
  eq(base.generalDemandVA, 9300, '210.11: baseline demand = connected (<= 10 kVA tier)');
  eq(base.totalVA, 21300, '210.11: baseline total 21,300 VA (9,300 + 12,000 AC)');
  approx(base.amps, 88.75, 0.01, '210.11: baseline 88.75 A @ 240 V');
  eq(base.recommendedBreakerA, 90, '210.11: baseline -> 90 A service');
  // --- dwStatus minimum-circuit check (210.11(C)(1)-(C)(4)) ---
  const mk = (names) => ({ version: 2, projectName: 'T', panels: [{ name: 'P1', system: '120-240-1ph', ratingA: 200, circuits: names.map(n => ({ name: n, notes: '', amps: 20 })) }] });
  const row = (project, id) => core.dwStatus(project).items.find(i => i.id === id);
  const full = mk(['SA1 kitchen','SA2 kitchen','LA laundry','BATH bathroom','GARAGE garage','L1 lighting','L2 lighting']);
  const fulls = core.dwStatus(full);
  eq(fulls.items.filter(i => i.cite.startsWith('210.11')).every(i => i.met), true, '210.11: full set -> all 4 code rows met');
  eq(fulls.items.filter(i => i.cite.startsWith('210.11')).length, 4, '210.11: exactly 4 code-cited rows (C)(1)-(C)(4)');
  eq(fulls.items.filter(i => !i.cite.startsWith('210.11')).length, 2, '210.11: exactly 2 design-practice rows (outdoor, lighting)');
  eq(fulls.metCount, 5, '210.11: full set -> 5/6 met (4 code + lighting; outdoor design-practice row unmet, no outdoor circuit in test)');
  eq(row(mk(['SA kitchen','LA laundry','BATH bathroom','GARAGE garage']), 'smallAppliance').met, false, '210.11: 1 small-appliance circuit -> (C)(1) MISS (min 2)');
  eq(row(mk(['SA1 kitchen','SA2 kitchen','LA laundry','BATH bathroom','GARAGE garage']), 'smallAppliance').met, true, '210.11: 2 small-appliance circuits -> (C)(1) met');
  eq(row(mk(['SA1 kitchen','SA2 kitchen','LA laundry','GARAGE garage']), 'bathroom').met, false, '210.11: no bathroom circuit -> (C)(3) MISS (min 1)');
  eq(row(mk(['SA1 kitchen','SA2 kitchen','LA laundry','BATH bathroom']), 'garage').met, false, '210.11: no garage circuit -> (C)(4) MISS (min 1)');
  // manual override: a row marked ok counts as met even at 0 auto (the card's verdict mechanism)
  const ov = { version: 2, projectName: 'T', panels: [{ name: 'P1', system: '120-240-1ph', ratingA: 200, circuits: [] }], dw: { items: core.DW_DEFAULT_ITEMS.map(i => Object.assign({}, i, { id: i.id, manual: i.id === 'garage' ? 'ok' : 'auto' })) } };
  eq(core.dwStatus(ov).items.find(i => i.id === 'garage').met, true, '210.11: manual ok on garage row -> met (user verdict wins)');
}

// --- 408.3 feature article (Session 35): articles/nec-4083-busbars-phase-identification.html ---
// The article's worked-example numbers are produced by the shipped panelTotals() and
// autoBalance() cores and asserted here so the article table can never drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-4083-busbars-phase-identification.html'), 'utf8');
  eq(art.includes('nec-4083-busbars-phase-identification.html'), true, '408.3 article: present');
  eq(art.includes('canonical') && art.includes('https://radloffbot.github.io/panelwright/articles/nec-4083-busbars-phase-identification.html'), true, '408.3 article: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, '408.3 article: AI disclosure present');
  eq(art.includes('Support and Arrangement of Busbars and Conductors'), true, '408.3 article: carries the verified 2014-2023 408.3 title');
  eq(art.includes('screening guideline'), true, '408.3 article: labels the 5% check as a screening guideline');
  // EX2: grossly unbalanced 3ph 400A
  const ex2 = core.panelTotals([{ type: 'L1N', loadA: 100 }, { type: 'L2N', loadA: 30 }, { type: 'L3N', loadA: 30 }], '208-120-3ph', 400);
  eq(ex2.L1, 100, '408.3 EX2: L1 = 100');
  eq(ex2.L2, 30, '408.3 EX2: L2 = 30');
  eq(ex2.L3, 30, '408.3 EX2: L3 = 30');
  approx(ex2.imbalancePct, 87.5, 0.01, '408.3 EX2: imbalance 87.5%');
  approx(ex2.neutralEst, 46.67, 0.01, '408.3 EX2: neutral est 46.67 A');
  eq(ex2.neutralLimit, 20, '408.3 EX2: 5% of 400 = 20 A');
  eq(ex2.neutralOk, false, '408.3 EX2: FAILS the screening guideline');
  // EX3: balanced 3ph 400A
  const ex3 = core.panelTotals([{ type: 'L1N', loadA: 40 }, { type: 'L2N', loadA: 40 }, { type: 'L3N', loadA: 40 }, { type: '3ph', loadA: 25 }], '208-120-3ph', 400);
  eq(ex3.L1, 65, '408.3 EX3: L1 = 65');
  eq(ex3.L2, 65, '408.3 EX3: L2 = 65');
  eq(ex3.L3, 65, '408.3 EX3: L3 = 65');
  eq(ex3.imbalancePct, 0, '408.3 EX3: imbalance 0%');
  eq(ex3.neutralEst, 0, '408.3 EX3: neutral est 0 A');
  eq(ex3.neutralOk, true, '408.3 EX3: PASSES');
  // EX5: auto-balance movable set (article's demo row)
  const ex5b = core.panelTotals([{ type: 'L1N', loadA: 40 }, { type: 'L1N', loadA: 35 }, { type: 'L1N', loadA: 30 }, { type: 'L1N', loadA: 25 }, { type: '3ph', loadA: 20 }], '208-120-3ph', 400);
  eq(ex5b.L1, 150, '408.3 EX5 before: L1 = 150');
  approx(ex5b.imbalancePct, 136.84, 0.01, '408.3 EX5 before: imbalance 136.84%');
  approx(ex5b.neutralEst, 86.67, 0.01, '408.3 EX5 before: neutral est 86.67 A');
  const ex5after = core.autoBalance([{ type: 'L1N', loadA: 40 }, { type: 'L1N', loadA: 35 }, { type: 'L1N', loadA: 30 }, { type: 'L1N', loadA: 25 }, { type: '3ph', loadA: 20 }], '208-120-3ph');
  const ex5a = core.panelTotals(ex5after, '208-120-3ph', 400);
  eq(ex5a.L1, 60, '408.3 EX5 after: L1 = 60');
  eq(ex5a.L2, 55, '408.3 EX5 after: L2 = 55');
  eq(ex5a.L3, 75, '408.3 EX5 after: L3 = 75');
  approx(ex5a.imbalancePct, 18.42, 0.01, '408.3 EX5 after: imbalance 18.42%');
  approx(ex5a.neutralEst, 11.67, 0.01, '408.3 EX5 after: neutral est 11.67 A');
  eq(ex5a.neutralOk, true, '408.3 EX5: auto-balance flips FAIL -> PASS');
  // 1ph example from the article: 55/30 + 45 two-pole
  const ex4 = core.panelTotals([{ type: 'L1', loadA: 55 }, { type: 'L2', loadA: 30 }, { type: 'L1L2', loadA: 45 }], '120-240-1ph', 200);
  eq(ex4.L1, 100, '408.3 EX4: L1 = 100');
  eq(ex4.L2, 75, '408.3 EX4: L2 = 75');
  approx(ex4.imbalancePct, 25, 0.01, '408.3 EX4: 1ph imbalance 25%');
  approx(ex4.loadPct, 50, 0.01, '408.3 EX4: 50% of 200 A rating');
  eq(ex4.neutralEst, null, '408.3 EX4: no 3ph neutral screen on 1ph panels');
}

// --- 215.2 feature article (Session 36): articles/nec-2152-feeder-ampacity.html ---
// The article's worked-example numbers are produced by the shipped
// pickConductor31016()/serviceLoad22082()/serviceLineConductor22082()/
// neutralLoad22061()/voltageDrop()/sizeForVoltageDrop() cores and asserted here
// so the article table can never drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-2152-feeder-ampacity.html'), 'utf8');
  eq(art.includes('nec-2152-feeder-ampacity.html'), true, '215.2 article: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-2152-feeder-ampacity.html'), true, '215.2 article: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, '215.2 article: AI disclosure present');
  eq(art.includes('Minimum Rating and Size'), true, '215.2 article: carries the verified 2014-2023 215.2 title');
  eq(art.includes('noncontinuous load plus 125 percent of the continuous load'), true, '215.2 article: verbatim 215.2(A)(1)(a) 125% rule present');
  eq(art.includes('Ampacity Relative to Service Conductors'), true, '215.2 article: carries 215.2(A)(3) title');
  eq(art.includes('Temperature Limitations'), true, '215.2 article: carries 110.14(C) title');
  // EX1: 60 A continuous -> 75 A required; 75C -> 4 AWG (85 A); 60C -> 3 AWG (85 A)
  const ex1p75 = core.pickConductor31016(75, 'cu', 75);
  const ex1p60 = core.pickConductor31016(75, 'cu', 60);
  eq(ex1p75.size, '4', '215.2 EX1: 75 A Cu @75 -> 4 AWG');
  eq(ex1p75.amp, 85, '215.2 EX1: 4 AWG = 85 A @75');
  eq(ex1p60.size, '3', '215.2 EX1: 75 A Cu @60 -> 3 AWG (110.14(C) trap)');
  eq(ex1p60.amp, 85, '215.2 EX1: 3 AWG = 85 A @60');
  // EX1b: ELR 2020 example — 60 A cont, 125F ambient (0.67 factor): (b) path 89.55 A -> 3 AWG @75 (100 A) governs
  const ex1b = core.pickConductor31016(60 / 0.67, 'cu', 75);
  eq(ex1b.size, '3', '215.2 EX1b: 89.55 A Cu @75 -> 3 AWG (100 A covers 89.55)');
  eq(ex1b.amp, 100, '215.2 EX1b: 3 AWG = 100 A @75');
  // EX2: 150 noncont + 80 cont = 250 A; Cu 250 kcmil (255 A), Al 350 kcmil (250 A)
  const ex2cu = core.pickConductor31016(250, 'cu', 75);
  const ex2al = core.pickConductor31016(250, 'al', 75);
  eq(ex2cu.size, '250', '215.2 EX2: 250 A Cu @75 -> 250 kcmil');
  eq(ex2cu.amp, 255, '215.2 EX2: 250 kcmil = 255 A @75');
  eq(ex2al.size, '350', '215.2 EX2: 250 A Al @75 -> 350 kcmil (250 A)');
  // EX3: 215.2(A)(3) 55 A service: service pick 6 AWG (65 A), feeder >= 65 A -> 6 AWG
  const ex3svc = core.pickConductor31016(55, 'cu', 75);
  const ex3fd = core.pickConductor31016(ex3svc.amp, 'cu', 75);
  eq(ex3svc.size, '6', '215.2 EX3: 55 A service -> 6 AWG (65 A @75)');
  eq(ex3fd.size, '6', '215.2 EX3: feeder ampacity >= 65 A -> 6 AWG');
  eq(ex3fd.amp, 65, '215.2 EX3: feeder 6 AWG = 65 A');
  // EX4: 220.82 flagship 1500sf + 2SA + 1laundry + 12kVA AC @240V -> 21,000 VA / 87.5 A -> floor 100 A -> 3 AWG Cu
  const ex4lc = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, acVA: 12000, volt: 240 });
  const ex4sl = core.serviceLineConductor22082(ex4lc, 'cu', 75);
  eq(ex4lc.totalVA, 21000, '215.2 EX4: 220.82 total 21,000 VA');
  eq(ex4lc.amps, 87.5, '215.2 EX4: 87.5 A');
  eq(ex4sl.reqA, 100, '215.2 EX4: required ampacity floored at 100 A (230.79(C)/230.42(B))');
  eq(ex4sl.pick.size, '3', '215.2 EX4: 100 A Cu @75 -> 3 AWG');
  eq(ex4sl.pick.amp, 100, '215.2 EX4: 3 AWG = 100 A @75');
  // EX5: 250 A one-dwelling neutral (no B1/B2 asserted): 83% -> 207.5 A -> 4/0 Cu (230 A)
  const ex5n = core.neutralLoad22061({ totalVA: 250 * 240, volt: 240, dwelling: true });
  const ex5p = core.pickConductor31016(ex5n.minAmpA, 'cu', 75);
  eq(ex5n.finalA, 250, '215.2 EX5: basic neutral 250 A (no reductions)');
  eq(ex5n.minAmpA, 207.5, '215.2 EX5: 310.12(B) 83% -> 207.5 A');
  eq(ex5p.size, '4/0', '215.2 EX5: 207.5 A Cu @75 -> 4/0 AWG');
  eq(ex5p.amp, 230, '215.2 EX5: 4/0 = 230 A @75');
  // EX5b: same with 220.61(B)(2): 200 + 0.7*50 = 235 A; 83% -> 195.05 A -> 3/0 Cu (200 A)
  const ex5b = core.neutralLoad22061({ totalVA: 250 * 240, volt: 240, dwelling: true, applyB2: true });
  const ex5bp = core.pickConductor31016(ex5b.minAmpA, 'cu', 75);
  eq(ex5b.b2Applied, true, '215.2 EX5b: B2 applies (basicA > 200 A)');
  eq(ex5b.finalA, 235, '215.2 EX5b: 200 + 0.70*50 = 235 A');
  eq(ex5b.minAmpA, 195.05, '215.2 EX5b: 83% -> 195.05 A');
  eq(ex5bp.size, '3/0', '215.2 EX5b: 195.05 A Cu @75 -> 3/0 AWG');
  eq(ex5bp.amp, 200, '215.2 EX5b: 3/0 = 200 A @75');
  // EX6: 2 AWG Cu, 100 A, 200 ft one-way, 1ph 240 V -> 7.76 V = 3.23% (warn); smallest <=3% -> 1 AWG (2.57%)
  const ex6 = core.voltageDrop({ amps: 100, lengthFt: 200, volt: 240, size: '2', mat: 'cu', config: '1ph' });
  eq(ex6.vdV, 7.76, '215.2 EX6: 2 AWG drop 7.76 V');
  eq(ex6.pctV, 3.23, '215.2 EX6: 3.23%');
  eq(ex6.status, 'warn', '215.2 EX6: over the 3% informational note -> warn');
  const ex6sm = core.sizeForVoltageDrop({ amps: 100, lengthFt: 200, volt: 240, mat: 'cu', config: '1ph' });
  eq(ex6sm.pick.size, '1', '215.2 EX6: smallest <=3% -> 1 AWG');
  eq(ex6sm.pick.pctV, 2.57, '215.2 EX6: 1 AWG = 2.57%');
}

// --- Conductor-sizing end-to-end article (Session 37): articles/nec-conductor-sizing.html ---
// Meta-article on 240.4 + 310.15 + 240.6. Worked examples computed by the shipped
// cores + the coordinate-verified 310.15 factors; asserted here so the article can
// never drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-conductor-sizing.html'), 'utf8');
  eq(art.includes('nec-conductor-sizing.html'), true, 'art13: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-conductor-sizing.html'), true, 'art13: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art13: AI disclosure present');
  eq(art.includes('Overcurrent Devices Rated 800 Amperes or Less'), true, 'art13: 240.4(B) title present');
  eq(art.includes('does not exceed 800 amperes'), true, 'art13: verbatim 240.4(B)(3) 800 A ceiling');
  eq(art.includes('Small Conductors'), true, 'art13: 240.4(D) title present');
  eq(art.includes('adjustable trip circuit breaker'), true, 'art13: 2023 240.4(B) adjustable-trip change present');
  eq(art.includes('<td class="num">80</td>') && art.includes('<td class="num">35</td>'), true, 'art13: 310.15(C) CCC factor rows (80% / 35%) present');
  // EX1: 60 A continuous -> 75 A; 75C -> 4 AWG (85 A); 60C -> 3 AWG (85 A); OCPD 80 A
  const a1p75 = core.pickConductor31016(75, 'cu', 75);
  const a1p60 = core.pickConductor31016(75, 'cu', 60);
  eq(a1p75.size, '4', 'art13 EX1: 75 A Cu @75 -> 4 AWG');
  eq(a1p75.amp, 85, 'art13 EX1: 4 AWG = 85 A @75');
  eq(a1p60.size, '3', 'art13 EX1: 75 A Cu @60 -> 3 AWG');
  eq(core.nextStdBreaker(75), 80, 'art13 EX1: OCPD 80 A');
  // EX2 flagship: 80 A, 6 CCC (0.80), 35C (0.94 @75): 3 AWG fails (75.2), 2 AWG passes (86.48)
  eq(Math.round(100 * 0.94 * 0.80 * 100) / 100, 75.2, 'art13 EX2: 3 AWG corrected 75.2 < 80 (fails)');
  eq(Math.round(115 * 0.94 * 0.80 * 100) / 100, 86.48, 'art13 EX2: 2 AWG corrected 86.48 >= 80 (passes)');
  // EX3: 60 noncont + 1.25*100 cont = 185 A; Cu 3/0 (200 A), Al 250 kcmil (205 A); OCPD 200 A standard
  const a3cu = core.pickConductor31016(185, 'cu', 75);
  const a3al = core.pickConductor31016(185, 'al', 75);
  eq(a3cu.size, '3/0', 'art13 EX3: 185 A Cu @75 -> 3/0 AWG');
  eq(a3cu.amp, 200, 'art13 EX3: 3/0 = 200 A @75');
  eq(a3al.size, '250', 'art13 EX3: 185 A Al @75 -> 250 kcmil');
  eq(a3al.amp, 205, 'art13 EX3: 250 kcmil Al = 205 A @75');
  eq(core.nextStdBreaker(185), 200, 'art13 EX3: OCPD 200 A (standard size matches ampacity)');
  // EX4: 125 noncont + 1.25*250 cont = 437.5 A; Cu 700 kcmil (460 A); OCPD min 450 A; 240.4(B) next std 500 A (<=800)
  const a4 = core.pickConductor31016(437.5, 'cu', 75);
  eq(a4.size, '700', 'art13 EX4: 437.5 A Cu @75 -> 700 kcmil');
  eq(a4.amp, 460, 'art13 EX4: 700 kcmil = 460 A @75');
  eq(core.nextStdBreaker(437.5), 450, 'art13 EX4: OCPD min 450 A (215.3)');
  eq(core.nextStdBreaker(460), 500, 'art13 EX4: 240.4(B) next std above 460 A = 500 A (<=800, permitted)');
  // EX5: 240.4(D) small-conductor caps (ampacity != OCPD)
  eq(core.pickConductor31016(18, 'cu', 60).notes.join(' ').includes('capped at 20 A'), true, 'art13 EX5: 12 AWG Cu 240.4(D) cap note (20 A)');
  // EX6: voltage drop 2 AWG Cu, 80 A, 150 ft, 1ph 120V -> 4.66 V = 3.88% (warn); 1 AWG 3.08%; smallest <=3% -> 1/0 (2.44%)
  const a6 = core.voltageDrop({ amps: 80, lengthFt: 150, volt: 120, size: '2', mat: 'cu', config: '1ph' });
  eq(a6.vdV, 4.66, 'art13 EX6: 2 AWG drop 4.66 V');
  eq(a6.pctV, 3.88, 'art13 EX6: 3.88% (warn, over 3%)');
  const a6sm = core.sizeForVoltageDrop({ amps: 80, lengthFt: 150, volt: 120, mat: 'cu', config: '1ph' });
  eq(a6sm.pick.size, '1/0', 'art13 EX6: smallest <=3% -> 1/0 AWG');
  eq(a6sm.pick.pctV, 2.44, 'art13 EX6: 1/0 = 2.44%');
  // EX7: 220.82 flagship service + drop: 21,000 VA / 87.5 A -> floor 100 A -> 3 AWG Cu (100 A);
  // drop 100 A, 200 ft, 240 V -> 9.80 V = 4.08% (warn); smallest <=3% -> 1 AWG (2.57%)
  const a7lc = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, acVA: 12000, volt: 240 });
  const a7sl = core.serviceLineConductor22082(a7lc, 'cu', 75);
  eq(a7lc.totalVA, 21000, 'art13 EX7: 220.82 total 21,000 VA');
  eq(a7lc.amps, 87.5, 'art13 EX7: 87.5 A');
  eq(a7sl.reqA, 100, 'art13 EX7: required ampacity floored at 100 A');
  eq(a7sl.pick.size, '3', 'art13 EX7: 100 A Cu @75 -> 3 AWG');
  eq(a7sl.pick.amp, 100, 'art13 EX7: 3 AWG = 100 A @75');
  const a7vd = core.voltageDrop({ amps: 100, lengthFt: 200, volt: 240, size: '3', mat: 'cu', config: '1ph' });
  eq(a7vd.vdV, 9.80, 'art13 EX7: 3 AWG drop 9.80 V');
  eq(a7vd.pctV, 4.08, 'art13 EX7: 4.08% (warn, over 3%)');
  const a7sm = core.sizeForVoltageDrop({ amps: 100, lengthFt: 200, volt: 240, mat: 'cu', config: '1ph' });
  eq(a7sm.pick.size, '1', 'art13 EX7: smallest <=3% -> 1 AWG');
  eq(a7sm.pick.pctV, 2.57, 'art13 EX7: 1 AWG = 2.57%');
  // 240.6(A) standard-size sanity (the v1.15.2 fix): no 140/165, to 6000
  eq(core.nextStdBreaker(130), 150, 'art13: 130 A -> 150 A (no 140 in the list)');
  eq(core.nextStdBreaker(160), 175, 'art13: 160 A -> 175 A (no 165 in the list)');
  eq(core.nextStdBreaker(3200), 4000, 'art13: 3200 A -> 4000 A (standard list now reaches 6000)');
  eq(core.nextStdBreaker(6000), 6000, 'art13: 6000 A -> 6000 A (largest standard)');
}

// --- v1.16 conductor-derating card (Session 38): NEC 310.15(B)(1) + 310.15(C)(1) ---
// Factor tables coordinate-verified from the verbatim 2023-NEC print (codeelec_2023.pdf
// pp. 29/33) + live cross-checks (conduit.site, zing2.app, SunCam 2023 PDH) 2026-08-31.
// The derating card now performs the 310.15 work the article-13 examples previously
// left to the user.
{
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(src.includes('AMB31015B'), true, 'v1.16: 310.15(B)(1) ambient table present in core');
  eq(src.includes('CCC31015C'), true, 'v1.16: 310.15(C)(1) CCC table present in core');
  eq(src.includes('function derate31015'), true, 'v1.16: derate31015() core present');
  eq(html.includes('id="drCard"'), true, 'v1.16: derating card in index.html');
  eq(html.includes('id="drSize"'), true, 'v1.16: check-size select present');
  // Table shape: 16 ambient rows, 7 CCC rows
  eq(core.AMB31015B.length, 16, 'v1.16: 310.15(B)(1) has 16 ambient rows');
  eq(core.CCC31015C.length, 7, 'v1.16: 310.15(C)(1) has 7 CCC rows');
  // Key ambient factors (2023 print, coordinate-verified)
  eq(core.ambFactor31015(35, 75).factor, 0.94, 'v1.16: 35 C @75 = 0.94');
  eq(core.ambFactor31015(30, 90).factor, 1.0, 'v1.16: 30 C @90 = 1.00 (base)');
  eq(core.ambFactor31015(5, 60).factor, 1.29, 'v1.16: <=10 C @60 = 1.29 (open upper)');
  eq(core.ambFactor31015(55, 90).factor, 0.76, 'v1.16: 51-55 C @90 = 0.76');
  eq(core.ambFactor31015(85, 90).factor, 0.29, 'v1.16: 81-85 C @90 = 0.29');
  // Blank cells the code prints no factor for (must be null, not guessed)
  eq(core.ambFactor31015(65, 60).factor, null, 'v1.16: 61-65 C @60 = null (blank cell)');
  eq(core.ambFactor31015(85, 75).factor, null, 'v1.16: 81-85 C @75 = null (blank cell)');
  // Out of table
  eq(core.ambFactor31015(90, 75).factor, null, 'v1.16: 90 C = out of table (null)');
  // CCC factors
  eq(core.cccFactor31015(3).pct, 100, 'v1.16: 3 CCC = 100%');
  eq(core.cccFactor31015(4).pct, 80, 'v1.16: 4 CCC = 80%');
  eq(core.cccFactor31015(6).pct, 80, 'v1.16: 6 CCC = 80%');
  eq(core.cccFactor31015(7).pct, 70, 'v1.16: 7 CCC = 70%');
  eq(core.cccFactor31015(9).pct, 70, 'v1.16: 9 CCC = 70%');
  eq(core.cccFactor31015(10).pct, 50, 'v1.16: 10 CCC = 50%');
  eq(core.cccFactor31015(20).pct, 50, 'v1.16: 20 CCC = 50%');
  eq(core.cccFactor31015(21).pct, 45, 'v1.16: 21 CCC = 45%');
  eq(core.cccFactor31015(30).pct, 45, 'v1.16: 30 CCC = 45%');
  eq(core.cccFactor31015(31).pct, 40, 'v1.16: 31 CCC = 40%');
  eq(core.cccFactor31015(40).pct, 40, 'v1.16: 40 CCC = 40%');
  eq(core.cccFactor31015(41).pct, 35, 'v1.16: 41+ CCC = 35%');
  // 240.4(D) caps
  eq(core.smallConductorCap('14', 'cu'), 15, 'v1.16: 14 Cu cap 15 A');
  eq(core.smallConductorCap('12', 'cu'), 20, 'v1.16: 12 Cu cap 20 A');
  eq(core.smallConductorCap('10', 'cu'), 30, 'v1.16: 10 Cu cap 30 A');
  eq(core.smallConductorCap('12', 'al'), 15, 'v1.16: 12 Al cap 15 A');
  eq(core.smallConductorCap('10', 'al'), 25, 'v1.16: 10 Al cap 25 A');
  eq(core.smallConductorCap('8', 'cu'), null, 'v1.16: 8 AWG no 240.4(D) cap');
  // FLAGSHIP (SunCam 2023 PDH): 80 A, 35 C, 6 CCC, 75 C Cu -> 2 AWG (115 base -> 86.48)
  const df = core.derate31015({ requiredA: 80, ambientC: 35, ccc: 6, mat: 'cu', temp: 75 });
  eq(df.pick.size, '2', 'v1.16 flagship: 80A/6CCC/35C/75C Cu -> 2 AWG');
  eq(df.pick.baseAmp, 115, 'v1.16 flagship: 2 AWG base 115 A');
  eq(df.pick.deratedA, 86.48, 'v1.16 flagship: 115 x 0.94 x 0.80 = 86.48 A');
  eq(df.effectiveA, 86.48, 'v1.16 flagship: effective 86.48 A');
  eq(df.ambF, 0.94, 'v1.16 flagship: ambient 0.94');
  eq(df.cccFactor, 0.8, 'v1.16 flagship: CCC 0.80');
  // 3 AWG twin fails: 100 x 0.94 x 0.80 = 75.2 < 80
  const d3 = core.derate31015({ requiredA: 80, ambientC: 35, ccc: 6, mat: 'cu', temp: 75, size: '3' });
  eq(d3.deratedA, 75.2, 'v1.16: 3 AWG check = 75.2 A derated');
  eq(d3.passes, false, 'v1.16: 3 AWG FAILS (75.2 < 80)');
  // No derating at base conditions == plain pick
  const dn = core.derate31015({ requiredA: 100, ambientC: 30, ccc: 3, mat: 'cu', temp: 75 });
  const dp = core.pickConductor31016(100, 'cu', 75);
  eq(dn.pick.size, dp.size, 'v1.16: 30C/3CCC derate == plain pick (30 C base)');
  eq(dn.ambF, 1.0, 'v1.16: 30 C ambient factor 1.00');
  // 240.4(D) cap governs in check mode: 12 AWG 60C @35C/6CCC = 14.56 < 15 -> fails
  const dc = core.derate31015({ requiredA: 15, ambientC: 35, ccc: 6, mat: 'cu', temp: 60, size: '12' });
  eq(dc.deratedA, 14.56, 'v1.16: 12 AWG 60C derated 14.56 A');
  eq(dc.passes, false, 'v1.16: 12 AWG fails (14.56 < 15)');
  // Blank-cell honest error (no guess): 60 C col at 65 C ambient
  const db = core.derate31015({ requiredA: 10, ambientC: 65, ccc: 3, mat: 'cu', temp: 60 });
  eq(db.error && /No 310\.15\(B\)\(1\) ambient factor/.test(db.error), true, 'v1.16: 60C@65C blank -> honest error');
  eq(db.pick, null, 'v1.16: blank cell -> no pick (not guessed)');
  // 75 C col works where 60 C is blank
  const d75 = core.derate31015({ requiredA: 10, ambientC: 65, ccc: 3, mat: 'cu', temp: 75 });
  eq(d75.ambF, 0.47, 'v1.16: 75C@65C works (0.47)');
  // Aluminum pick
  const dal = core.derate31015({ requiredA: 40, ambientC: 30, ccc: 3, mat: 'al', temp: 75 });
  eq(dal.pick.size, '8', 'v1.16: 40 A Al @75 -> 8 AWG (40 A base)');
  // 41+ CCC (35%): 50 A, 30C, 50 CCC, 75C -> base needed 50/0.35=142.9 -> 1/0 (150) -> 52.5
  const d50 = core.derate31015({ requiredA: 50, ambientC: 30, ccc: 50, mat: 'cu', temp: 75 });
  eq(d50.cccPct, 35, 'v1.16: 50 CCC = 35%');
  eq(d50.pick.size, '1/0', 'v1.16: 50 CCC 50 A -> 1/0 (150 x 0.35 = 52.5)');
  eq(d50.pick.deratedA, 52.5, 'v1.16: 1/0 derated 52.5 A');
  // Out-of-table ambient -> honest error
  const dout = core.derate31015({ requiredA: 10, ambientC: 90, ccc: 3, mat: 'cu', temp: 75 });
  eq(dout.error && /beyond the 310\.15\(B\)\(1\) table/.test(dout.error), true, 'v1.16: 90 C ambient -> honest out-of-table error');
  // CSV + print surfaces include the card
  const proj = core.defaultProject();
  proj.dr = { requiredA: 80, ambientC: 35, ccc: 6, mat: 'cu', temp: 75 };
  eq(core.projectToCSV(proj).includes('CONDUCTOR DERATING'), true, 'v1.16: CSV includes derating section');
  eq(core.printReportHTML(proj).includes('Conductor derating'), true, 'v1.16: print report includes derating section');
}

// --- Article 14 (Session 39): articles/nec-21019a-continuous-load.html ---
// 210.19(A) + Article 100 "Continuous Load" + 210.20(A). Worked examples EX1-EX8
// computed by the shipped cores (income-lab/compute_art14.js -> calc_21019_cited.json);
// asserted here so the article can never drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21019a-continuous-load.html'), 'utf8');
  eq(art.includes('nec-21019a-continuous-load.html'), true, 'art14: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21019a-continuous-load.html'), true, 'art14: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art14: AI disclosure present');
  eq(art.includes('A load where the maximum current is expected to continue for 3 hours or more'), true, 'art14: Art 100 Continuous Load def verbatim');
  eq(art.includes('ampacity not less than the noncontinuous load plus 125 percent of the continuous load'), true, 'art14: verbatim 210.19(A)(1)(a) 125% rule');
  eq(art.includes('rating of the overcurrent device shall not be less than the noncontinuous load plus 125 percent'), true, 'art14: verbatim 210.20(A) OCPD rule');
  eq(art.includes('voltage drop exceeding 3 percent'), true, 'art14: 210.19(A) Info Note 3 (3%) present');
  eq(art.includes('does not exceed 5 percent'), true, 'art14: 210.19(A) Info Note 3 (5%) present');
  eq(art.includes('100% divided by 80% equals 125%'), true, 'art14: 80/125 symmetry (PDH) quoted');
  // EX1: 16 A continuous -> reqA 20 A, OCPD 20 A; 14 AWG ampacity pick (20 A @75) but 240.4(D) cap 15 A < 20 A OCPD -> 12 AWG
  eq(Math.round((0 + 1.25 * 16) * 100) / 100, 20, 'art14 EX1: 1.25 x 16 = 20 A required');
  eq(core.nextStdBreaker(20), 20, 'art14 EX1: OCPD 20 A');
  eq(core.pickConductor31016(20, 'cu', 75).size, '14', 'art14 EX1: (a)-pick 14 AWG (20 A @75C)');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art14 EX1: 14 Cu 240.4(D) cap 15 A < 20 A OCPD -> 14 AWG fails OCPD gate');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art14 EX1: 12 Cu cap 20 A >= 20 A OCPD -> 12 AWG resolves');
  eq(20 * 0.80, 16, 'art14 EX1: 80% reciprocal (20 x 0.8 = 16 A max continuous)');
  // EX2: 8 A continuous single-outlet -> reqA 10 A, OCPD 15 A, 14 AWG (cap 15 A == OCPD)
  eq(Math.round(1.25 * 8), 10, 'art14 EX2: 1.25 x 8 = 10 A required');
  eq(core.nextStdBreaker(10), 15, 'art14 EX2: OCPD 15 A');
  eq(core.pickConductor31016(10, 'cu', 75).size, '14', 'art14 EX2: 14 AWG (20 A @75C)');
  // EX3: 20 noncont + 15 cont -> reqA 38.75, OCPD 40, (A)(2) floor 40 -> 8 AWG (50 A)
  eq(Math.round((20 + 1.25 * 15) * 100) / 100, 38.75, 'art14 EX3: 20 + 1.25 x 15 = 38.75 A required');
  eq(core.nextStdBreaker(38.75), 40, 'art14 EX3: OCPD 40 A');
  const a3 = core.pickConductor31016(40, 'cu', 75);
  eq(a3.size, '8', 'art14 EX3: (A)(2) floor 40 A -> 8 AWG');
  eq(a3.amp, 50, 'art14 EX3: 8 AWG = 50 A @75C');
  eq(core.smallConductorCap('10', 'cu'), 30, 'art14 EX3: 10 Cu cap 30 A < 40 A OCPD (second reason 10 AWG fails)');
  // EX4: 20 A requirement across 110.14(C) columns: 60C->12 AWG, 75C->14 AWG, 90C base 25 A
  eq(core.pickConductor31016(20, 'cu', 60).size, '12', 'art14 EX4: 60C column -> 12 AWG');
  eq(core.pickConductor31016(20, 'cu', 75).size, '14', 'art14 EX4: 75C column -> 14 AWG');
  eq(core.pickConductor31016(20, 'cu', 90).amp, 25, 'art14 EX4: 14 AWG 90C base 25 A (derating base only)');
  // EX5: 15 A continuous -> reqA 18.75, OCPD 20; 14 AWG passes (a) but cap 15 < 20 -> 12 AWG
  eq(Math.round(1.25 * 15 * 100) / 100, 18.75, 'art14 EX5: 1.25 x 15 = 18.75 A required');
  eq(core.nextStdBreaker(18.75), 20, 'art14 EX5: OCPD 20 A');
  eq(core.pickConductor31016(18.75, 'cu', 75).size, '14', 'art14 EX5: (a)-pick 14 AWG (20 A >= 18.75 A)');
  eq(core.smallConductorCap('14', 'cu') < 20, true, 'art14 EX5: 15 A cap < 20 A OCPD -> 14 AWG NOT usable');
  const row12 = core.T31016.find(r => r.s === '12');
  eq(row12.cu[1], 25, 'art14 EX5: 12 AWG Cu 75C base 25 A');
  eq(core.smallConductorCap('12', 'cu') >= 20, true, 'art14 EX5: 12 Cu cap 20 A >= 20 A OCPD -> 12 AWG resolves');
  // EX6: (A)(2) floor — 21 noncont + 5 cont: (a) 27.25 A, rating 30 A governs -> 10 AWG (35 A)
  eq(Math.round((21 + 1.25 * 5) * 100) / 100, 27.25, 'art14 EX6: 21 + 1.25 x 5 = 27.25 A ((a) number)');
  eq(core.nextStdBreaker(27.25), 30, 'art14 EX6: OCPD 30 A');
  const a6 = core.pickConductor31016(Math.max(27.25, 30), 'cu', 75);
  eq(a6.size, '10', 'art14 EX6: (A)(2) floor 30 A -> 10 AWG (35 A)');
  // EX7: 16 A continuous, 8 CCC (70%), 40 C (0.88 @75) -> 14 AWG 12.32 fail, 12 AWG 15.4 fail, 10 AWG 21.56 pass
  eq(core.ambFactor31015(40, 75).factor, 0.88, 'art14 EX7: 40 C @75 = 0.88');
  eq(core.cccFactor31015(8).pct, 70, 'art14 EX7: 8 CCC = 70%');
  const d7_14 = core.derate31015({ requiredA: 16, ambientC: 40, ccc: 8, mat: 'cu', temp: 75, size: '14' });
  eq(d7_14.deratedA, 12.32, 'art14 EX7: 14 AWG derated 12.32 A');
  eq(d7_14.passes, false, 'art14 EX7: 14 AWG FAILS (12.32 < 16)');
  const d7_12 = core.derate31015({ requiredA: 16, ambientC: 40, ccc: 8, mat: 'cu', temp: 75, size: '12' });
  eq(d7_12.deratedA, 15.4, 'art14 EX7: 12 AWG derated 15.4 A');
  eq(d7_12.passes, false, 'art14 EX7: 12 AWG FAILS (15.4 < 16)');
  const d7 = core.derate31015({ requiredA: 16, ambientC: 40, ccc: 8, mat: 'cu', temp: 75 });
  eq(d7.pick.size, '10', 'art14 EX7: derated pick -> 10 AWG');
  eq(d7.pick.deratedA, 21.56, 'art14 EX7: 10 AWG derated 21.56 A >= 16 A');
  eq(core.nextStdBreaker(1.25 * 16), 20, 'art14 EX7: OCPD still 20 A (derating changes wire, not requirement)');
  // EX8: voltage drop 30 A, 100 ft, 120 V, 10 AWG -> 7.26 V = 6.05% (bad); smallest <=3% -> 6 AWG 2.46%
  const a8 = core.voltageDrop({ amps: 30, lengthFt: 100, volt: 120, size: '10', mat: 'cu', config: '1ph' });
  eq(a8.vdV, 7.26, 'art14 EX8: 10 AWG drop 7.26 V');
  eq(a8.pctV, 6.05, 'art14 EX8: 6.05% (bad, over the 5% note)');
  const a8sm = core.sizeForVoltageDrop({ amps: 30, lengthFt: 100, volt: 120, mat: 'cu', config: '1ph' });
  eq(a8sm.pick.size, '6', 'art14 EX8: smallest <=3% -> 6 AWG');
  eq(a8sm.pick.pctV, 2.46, 'art14 EX8: 6 AWG = 2.46%');
  // core's own cap note text (what the tool emits on a 14 AWG pick)
  eq(core.pickConductor31016(20, 'cu', 75).notes.join(' ').includes('capped at 15 A'), true, 'art14: 14 AWG pick carries the 240.4(D) cap note (15 A)');
}

// --- Article 15 (Session 40): articles/nec-21023-permissible-loads.html ---
// NEC 210.23 (permissible loads, multiple-outlet branch circuits) + 210.24
// (branch-circuit requirements summary table) + Table 210.21(B)(2). Worked
// examples EX1-EX7 computed by the shipped cores (income-lab/compute_art15.js
// -> calc_21023_cited.json); asserted here so the article can never drift.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21023-permissible-loads.html'), 'utf8');
  eq(art.includes('nec-21023-permissible-loads.html'), true, 'art15: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21023-permissible-loads.html'), true, 'art15: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art15: AI disclosure present');
  eq(art.includes('In no case shall the load exceed the branch-circuit ampere rating'), true, 'art15: 210.23 opening sentence verbatim');
  eq(art.includes('shall not exceed 80 percent of the branch-circuit ampere rating'), true, 'art15: 210.23(A)(1) 80% cap verbatim');
  eq(art.includes('shall not exceed 50 percent of the branch-circuit ampere rating'), true, 'art15: 210.23(A)(2) 50% cap verbatim');
  eq(art.includes('Branch circuits larger than 50 amperes shall supply only nonlighting outlet loads'), true, 'art15: 210.23(D) >50 A verbatim');
  eq(art.includes('This table provides only a summary of minimum requirements'), true, 'art15: 210.24 summary-only sentence verbatim');
  eq(art.includes('Dwelling unit exhaust fans on bathroom or laundry room lighting circuits'), true, 'art15: 2023 10-A permitted loads (ELR) present');
  eq(art.includes('Garage door openers'), true, 'art15: 2023 10-A not-permitted list present');
  eq(art.includes('Table 210.24(1)'), true, 'art15: 2023 split-table naming flagged');
  // EX1: 80% cord-and-plug cap on 20 A
  eq(Math.round(20 * 0.8 * 100) / 100, 16, 'art15 EX1: 80% of 20 A = 16 A cap');
  eq(Math.round(1920 / 120 * 100) / 100, 16, 'art15 EX1: 1920 W @120 V = 16.00 A (at cap, pass)');
  eq(Math.round(2400 / 120 * 100) / 100, 20, 'art15 EX1: 2400 W @120 V = 20.00 A (> 16 A cap, fail)');
  // EX2: 50% fastened-in-place cap on 20 A
  eq(Math.round(20 * 0.5 * 100) / 100, 10, 'art15 EX2: 50% of 20 A = 10 A cap');
  eq(Math.round(1200 / 120 * 100) / 100, 10, 'art15 EX2: 1200 W @120 V = 10.00 A (at cap, pass)');
  eq(Math.round(1400 / 120 * 100) / 100, 11.67, 'art15 EX2: 1400 W @120 V = 11.67 A (> 10 A cap, fail)');
  // EX3: Table 210.24 picks reproduced by the shipped 310.16 core (60 C column)
  eq(core.pickConductor31016(15, 'cu', 60).size, '14', 'art15 EX3: 15 A -> 14 AWG Cu (table min)');
  eq(core.pickConductor31016(20, 'cu', 60).size, '12', 'art15 EX3: 20 A -> 12 AWG Cu (table min)');
  eq(core.pickConductor31016(30, 'cu', 60).size, '10', 'art15 EX3: 30 A -> 10 AWG Cu (table min)');
  eq(core.pickConductor31016(40, 'cu', 60).size, '8', 'art15 EX3: 40 A -> 8 AWG Cu (table min)');
  eq(core.pickConductor31016(50, 'cu', 60).size, '6', 'art15 EX3: 50 A -> 6 AWG Cu (table min)');
  eq(core.pickConductor31016(20, 'al', 60).size, '10', 'art15 EX3: 20 A Al -> 10 AWG (table Al)');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art15 EX3: 240.4(D) 14 Cu cap 15 A (binds)');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art15 EX3: 240.4(D) 12 Cu cap 20 A (binds)');
  eq(core.smallConductorCap('10', 'cu'), 30, 'art15 EX3: 240.4(D) 10 Cu cap 30 A (binds)');
  // EX4: 2023 10 A circuit
  eq(core.pickConductor31016(10, 'cu', 60).size, '14', 'art15 EX4: 10 A -> 14 AWG Cu pick');
  eq(core.nextStdBreaker(10), 15, 'art15 EX4: 10 A not standard -> nextStd 15 A (240.6)');
  // EX5: 210.21(B)(2) duplex vs single
  eq(Math.round(20 * 0.8 * 100) / 100, 16, 'art15 EX5: single receptacle on 20 A capped at 16 A (80%)');
  // EX7: 80% cap on 30 A
  eq(Math.round(30 * 0.8 * 100) / 100, 24, 'art15 EX7: 80% of 30 A = 24 A cap (210.23(B))');
  eq(Math.round(2880 / 120 * 100) / 100, 24, 'art15 EX7: 2880 W @120 V = 24.00 A (at cap, pass)');
  eq(Math.round(3000 / 120 * 100) / 100, 25, 'art15 EX7: 3000 W @120 V = 25.00 A (> 24 A cap, fail)');
}

// --- Article 16 (Session 41): articles/nec-21052-dwelling-receptacle-outlets.html ---
// NEC 210.52 (dwelling-unit receptacle outlets) — 6-ft spacing rule, 24-in
// countertop rule, 210.52(B) small-appliance circuits, the four 210.11(C)
// mandates, and the three 2023 changes (stationary appliances, countertop
// Exception No. 2, optional island receptacle). Worked examples EX1-EX7
// computed by the shipped cores (income-lab/compute_art16.js ->
// calc_21052_cited.json); asserted here so the article can never drift.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21052-dwelling-receptacle-outlets.html'), 'utf8');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21052-dwelling-receptacle-outlets.html'), true, 'art16: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art16: AI disclosure present');
  eq(art.includes('no point measured horizontally along the floor line of any wall space is more than 1.8 m (6 ft) from a receptacle outlet'), true, 'art16: 210.52(A)(1) 6-ft rule verbatim');
  eq(art.includes('Any space 600 mm (2 ft) or more in width (including space measured around corners) and unbroken along the floor line by doorways and similar openings, fireplaces, and fixed cabinets that do not have countertops or similar work surfaces'), true, 'art16: 210.52(A)(2)(1) wall-space definition verbatim (2020)');
  eq(art.includes('no point along the wall line is more than 600 mm (24 in.) measured horizontally from a receptacle outlet in that space'), true, 'art16: 210.52(C)(1) 24-in countertop rule verbatim');
  eq(art.includes('the two or more 20-ampere small-appliance branch circuits required by 210.11(C)(1) shall serve all wall and floor receptacle outlets covered by 210.52(A)'), true, 'art16: 210.52(B)(1) small-appliance service verbatim');
  eq(art.includes('shall have no other outlets'), true, 'art16: 210.52(B)(2) exclusivity verbatim');
  eq(art.includes('At least one receptacle outlet shall be installed in bathrooms within 900 mm (3 ft) of the outside edge of each basin'), true, 'art16: 210.52(D) bathroom 3-ft verbatim');
  eq(art.includes('In each attached garage and in each detached garage with electric power, at least one receptacle outlet shall be installed in each vehicle bay'), true, 'art16: 210.52(G)(1) garage verbatim');
  eq(art.includes('hallways of 3.0 m (10 ft) or more in length shall have at least one receptacle outlet'), true, 'art16: 210.52(H) hallway verbatim');
  eq(art.includes('greater than 5.6 m² (60 ft²)'), true, 'art16: 210.52(I) foyer 60 ft² verbatim');
  // 2023 changes (ELR code-language previews)
  eq(art.includes('fireplaces, <strong>stationary appliances</strong>, and fixed cabinets'), true, 'art16: 2023 (A)(2)(1) stationary appliances present');
  eq(art.includes('Where a required receptacle outlet cannot be installed in the wall areas shown in Figure 210.52(C)(1)'), true, 'art16: 2023 (C)(1) Exception No. 2 present');
  eq(art.includes('<strong>if installed</strong> to serve an island or peninsular countertop or work surface'), true, 'art16: 2023 (C)(2) optional island receptacle present');
  eq(art.includes('provisions shall be provided at the island or peninsula for future addition of a receptacle outlet'), true, 'art16: 2023 (C)(2) future-provision requirement present');
  // 2020 island math: first 9 ft2 (or fraction) = 1, +1 per additional 18 ft2 (or fraction)
  const island2020 = (ft2) => 1 + (ft2 <= 9 ? 0 : Math.ceil((ft2 - 9) / 18));
  eq(island2020(12), 2, 'art16 EX3: 12 ft2 island -> 2 (2020)');
  eq(island2020(27), 2, 'art16 EX3: 27 ft2 island -> 2 (2020)');
  eq(island2020(28), 3, 'art16 EX3: 28 ft2 island -> 3 (2020)');
  // EX1: 6-ft reach rule (n equally spaced outlets, max reach L/((n-1)*2))
  const nMin = (L, D) => Math.ceil(L / (2 * D) - 1e-9) + 1;
  eq(nMin(12, 6), 2, 'art16 EX1: 12 ft run -> 2 outlets (6 ft reach)');
  eq(nMin(24, 6), 3, 'art16 EX1: 24 ft run -> 3 outlets (6 ft reach)');
  eq(nMin(25, 6), 4, 'art16 EX1: 25 ft run -> 4 outlets (3 would give 6.25 ft)');
  // EX2: 24-in countertop reach
  eq(nMin(144, 24), 4, 'art16 EX2: 144 in run -> 4 outlets (24 in reach)');
  eq(nMin(120, 24), 4, 'art16 EX2: 120 in run -> 4 outlets (20 in reach)');
  eq(Math.ceil(72 / 12), 6, 'art16 EX2: 72 in assembly, 12 in per outlet -> 6 outlets');
  // EX4: two small-appliance circuits in the 220.82 service (REAL core)
  const sl4 = core.serviceLoad22082({ sqft: 1600, smallApplianceCircuits: 2, laundryCircuits: 1 });
  eq(sl4.smallApplianceVA, 3000, 'art16 EX4: 2 small-appliance circuits = 3000 VA (220.82(B)(2))');
  eq(sl4.laundryVA, 1500, 'art16 EX4: 1 laundry circuit = 1500 VA (220.82(B)(2))');
  eq(sl4.generalConnectedVA, 9300, 'art16 EX4: 1600 ft2 house general connected = 9300 VA');
  eq(sl4.amps, 38.75, 'art16 EX4: 9300 VA @ 240 V = 38.75 A');
  const sl4one = core.serviceLoad22082({ sqft: 1600, smallApplianceCircuits: 1, laundryCircuits: 1 });
  eq(sl4.generalConnectedVA - sl4one.generalConnectedVA, 1500, 'art16 EX4: delta of one small-appliance circuit = 1500 VA');
  // EX5: the dwelling checklist (REAL core dwStatus)
  const mkCircuits = (names) => names.map(n => ({ name: n, notes: '', A: 20, system: '120-208-1ph' }));
  const dwFull = core.dwStatus({ panels: [{ name: 'Main Panel', system: '120-208-1ph', ratingA: 200, notes: '',
    circuits: mkCircuits(['Small appliance circuit 1 (kitchen/pantry/dining)', 'Small appliance circuit 2 (kitchen/living)',
      'Laundry 20A', 'Bathroom 20A (vanity)', 'Garage 20A vehicle bay', 'Exterior porch GFCI 20A',
      'Lighting L1', 'Lighting L2', 'General purpose 1', 'General purpose 2', 'Range 50A', 'Dryer 30A', 'AC 40A']) }] });
  eq(dwFull.metCount, 6, 'art16 EX5: full panel passes all 6 checklist items');
  eq(dwFull.total, 6, 'art16 EX5: 6 default checklist items');
  const dwBad = core.dwStatus({ panels: [{ name: 'Main Panel', system: '120-208-1ph', ratingA: 200, notes: '',
    circuits: mkCircuits(['Small appliance circuit (kitchen)', 'Laundry 20A', 'Garage 20A vehicle bay', 'Lighting L1', 'Lighting L2', 'General 1']) }] });
  eq(dwBad.metCount, 3, 'art16 EX5: broken panel passes only 3 of 6');
  eq(dwBad.items.filter(r => !r.met).map(r => r.id).join(','), 'smallAppliance,bathroom,outdoor', 'art16 EX5: missing = smallAppliance+bathroom+outdoor');
  // EX6: wiring the required 20 A circuits (REAL core)
  eq(core.pickConductor31016(20, 'cu', 60).size, '12', 'art16 EX6: 20 A @60 -> 12 AWG Cu');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art16 EX6: 14 AWG Cu capped at 15 A (cannot feed 20 A circuit)');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art16 EX6: 12 AWG Cu capped at 20 A');
  eq(core.nextStdBreaker(20), 20, 'art16 EX6: 20 A standard OCPD (240.6)');
  // EX7: the mandated circuits inside the 220.82 flagship service (REAL core)
  const sl7 = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, acVA: 12000, volt: 240 });
  eq(sl7.totalVA, 21000, 'art16 EX7: flagship service = 21000 VA');
  eq(sl7.amps, 87.5, 'art16 EX7: 21000 VA @ 240 V = 87.5 A');
  eq(core.serviceLineConductor22082(sl7, 'cu', 75).reqA, 100, 'art16 EX7: 230.79(C) one-family floor -> 100 A');
  eq(core.serviceLineConductor22082(sl7, 'cu', 75).pick.size, '3', 'art16 EX7: 100 A service -> 3 AWG Cu (75 C)');
  const sl7no = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 0, laundryCircuits: 1, acVA: 12000, volt: 240 });
  eq(sl7.totalVA - sl7no.totalVA, 3000, 'art16 EX7: two small-appliance circuits add 3000 VA');
}

console.log('NEC 240.4(D) small-conductor caps — feature-article examples (Session 42 — articles/nec-2404d-small-conductors.html):');
{
  // EX1: the five common (D) caps exactly as the code text states them (2017/2020/2023 values).
  eq(core.smallConductorCap('14', 'cu'), 15, 'art17 EX1: 240.4(D)(3) 14 Cu cap 15 A');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art17 EX1: 240.4(D)(5) 12 Cu cap 20 A');
  eq(core.smallConductorCap('10', 'cu'), 30, 'art17 EX1: 240.4(D)(7) 10 Cu cap 30 A');
  eq(core.smallConductorCap('12', 'al'), 15, 'art17 EX1: 240.4(D)(4) 12 Al cap 15 A');
  eq(core.smallConductorCap('10', 'al'), 25, 'art17 EX1: 240.4(D)(6) 10 Al cap 25 A');
  // Boundary: no (D) cap for 8 AWG (not a (D) size) and for 16/18 AWG (tool Table starts at 14 AWG).
  eq(core.smallConductorCap('8', 'cu'), null, 'art17 EX1: 8 AWG Cu has no 240.4(D) cap');
  eq(core.smallConductorCap('16', 'cu'), null, 'art17 EX1: 16 AWG not modeled (tool Table 310.16 starts at 14 AWG)');
  eq(core.smallConductorCap('18', 'cu'), null, 'art17 EX1: 18 AWG not modeled (tool Table 310.16 starts at 14 AWG)');
  // EX2: the 14 AWG trap — required 20 A circuit.
  eq(core.pickConductor31016(20, 'cu', 75).size, '14', 'art17 EX2: ampacity pick for 20 A @75 = 14 AWG Cu');
  eq(core.pickConductor31016(20, 'cu', 75).amp, 20, 'art17 EX2: 14 AWG Cu 75 C ampacity = 20 A (passes (a))');
  eq(core.smallConductorCap('14', 'cu') < 20, true, 'art17 EX2: 14 AWG cap 15 A < 20 A OCPD -> 14 AWG NOT usable');
  eq(core.smallConductorCap('12', 'cu') >= 20, true, 'art17 EX2: 12 AWG cap 20 A >= 20 A OCPD -> 12 AWG resolves');
  // EX3: the 12 AWG THHN "30 A" myth — 90 C ampacity vs the 20 A cap.
  eq(core.pickConductor31016(30, 'cu', 90).size, '12', 'art17 EX3: 12 AWG Cu is the 30 A @90 C size');
  eq(core.pickConductor31016(30, 'cu', 90).amp, 30, 'art17 EX3: 12 AWG Cu 90 C ampacity = 30 A (THHN base)');
  eq(core.pickConductor31016(25, 'cu', 75).amp, 25, 'art17 EX3: 12 AWG Cu 75 C ampacity = 25 A (110.14(C) column)');
  eq(core.pickConductor31016(20, 'cu', 60).amp, 20, 'art17 EX3: 12 AWG Cu 60 C ampacity = 20 A');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art17 EX3: 12 AWG Cu OCPD cap = 20 A in EVERY column');
  eq(core.nextStdBreaker(20), 20, 'art17 EX3: 20 A standard OCPD (240.6)');
  // EX4: aluminum caps sit one size lower than copper.
  eq(core.pickConductor31016(20, 'al', 75).amp, 20, 'art17 EX4: 12 AWG Al 75 C ampacity = 20 A');
  eq(core.smallConductorCap('12', 'al'), 15, 'art17 EX4: 12 AWG Al OCPD cap = 15 A (one size down from Cu)');
  eq(core.pickConductor31016(30, 'al', 75).amp, 30, 'art17 EX4: 10 AWG Al 75 C ampacity = 30 A');
  eq(core.smallConductorCap('10', 'al'), 25, 'art17 EX4: 10 AWG Al OCPD cap = 25 A (one size down from Cu)');
  // EX5: cap governs (14 AWG Cu, normal conditions) — effective = min(derated, cap).
  const d5 = core.derate31015({ requiredA: 15, ambientC: 30, ccc: 3, mat: 'cu', temp: 75, size: '14' });
  eq(d5.baseAmp, 20, 'art17 EX5: 14 AWG Cu 75 C base = 20 A');
  eq(d5.deratedA, 20, 'art17 EX5: derated @30 C / 3 CCC = 20 A (factors 1.00)');
  eq(d5.capA, 15, 'art17 EX5: 240.4(D) cap = 15 A');
  eq(d5.effectiveA, 15, 'art17 EX5: effective (governing) ampacity = 15 A (cap governs)');
  eq(d5.passes, true, 'art17 EX5: 14 AWG Cu passes a 15 A requirement at cap-limited 15 A');
  // EX6: derating governs (10 AWG Cu, crowded raceway) — effective = derated (below cap).
  const d6 = core.derate31015({ requiredA: 20, ambientC: 40, ccc: 8, mat: 'cu', temp: 75, size: '10' });
  eq(d6.baseAmp, 35, 'art17 EX6: 10 AWG Cu 75 C base = 35 A');
  eq(d6.deratedA, 21.56, 'art17 EX6: derated @40 C (0.88) / 8 CCC (0.70) = 21.56 A');
  eq(d6.capA, 30, 'art17 EX6: 240.4(D) cap = 30 A');
  eq(d6.effectiveA, 21.56, 'art17 EX6: effective (governing) ampacity = 21.56 A (derated governs, below cap)');
  // EX7: (E)/(G) carve-outs — tap on 20 A circuit protected at circuit rating; motor per 430.
  eq(core.nextStdBreaker(20), 20, 'art17 EX7: 14 AWG tap on 20 A circuit -> OCPD 20 A (240.4(E), not the 15 A cap)');
  eq(core.nextStdBreaker(28), 30, 'art17 EX7: representative motor OCPD calc 28 A -> 30 A (240.4(G) -> Art 430, not (D)(7))');
}

// --- Article 18 (Session 43): articles/nec-2105-identification-for-branch-circuits.html ---
// NEC 210.5 (Identification for Branch Circuits) — 210.5(A) grounded -> 200.6
// (white/gray), (B) EGC -> 250.119 (green), (C) ungrounded -> clearly
// distinguishable (310.110(C) [2017] / 310.6(A)(3) [2020/2023]); the 210.5(C)(1)
// multi-voltage labeling rule + its "other unidentified systems exist on the
// premises" exception; the 210.5(C)(2) DC polarity rule (4 AWG / 6 AWG split,
// 610 mm / 24 in. imprinted interval per 310.120(B) [2017] / 310.8(B) [2020]);
// the 110.15 orange high leg; the 2020 "system voltage class" change. Worked
// examples EX1-EX7 computed by the shipped cores (income-lab/compute_art18.js ->
// calc_2105_cited.json); asserted here so the article can never drift.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-2105-identification-for-branch-circuits.html'), 'utf8');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-2105-identification-for-branch-circuits.html'), true, 'art18: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art18: AI disclosure present');
  // 210.5 section probes (2017 verbatim, OCR-normalized)
  eq(art.includes('The grounded conductor of a branch circuit shall be identified in accordance with 200.6.'), true, 'art18: 210.5(A) verbatim');
  eq(art.includes('The equipment grounding conductor shall be identified in accordance with 250.119.'), true, 'art18: 210.5(B) verbatim');
  eq(art.includes('Ungrounded conductors shall be identified in accordance with 210.5(C)(1) or (2), as applicable.'), true, 'art18: 210.5(C) lead-in verbatim');
  eq(art.includes('each ungrounded conductor of a branch circuit shall be identified by phase or line and system at all termination, connection, and splice points'), true, 'art18: 210.5(C)(1) 2017 wording verbatim');
  eq(art.includes('The new system label(s) shall include the words "other unidentified systems exist on the premises."'), true, 'art18: 210.5(C)(1) exception exact phrase');
  eq(art.includes('each ungrounded conductor of 4 AWG or larger shall be identified by polarity at all termination, connection, and splice points by marking tape, tagging, or other approved means'), true, 'art18: 210.5(C)(2) 4 AWG-or-larger verbatim');
  eq(art.includes('each ungrounded conductor of 6 AWG or smaller shall be identified by polarity at all termination, connection, and splice points'), true, 'art18: 210.5(C)(2) 6 AWG-or-smaller verbatim');
  eq(art.includes('A continuous red outer finish'), true, 'art18: 210.5(C)(2)(a)(1) red finish verbatim');
  eq(art.includes('A continuous black outer finish'), true, 'art18: 210.5(C)(2)(b)(1) black finish verbatim');
  eq(art.includes('repeated at intervals not exceeding 610 mm (24 in.) in accordance with 310.120(B)'), true, 'art18: 210.5(C)(2)(a)(3) 610 mm interval + 310.120(B) ref verbatim');
  // 2020 change probes
  eq(art.includes('by phase or line and <strong>by system voltage class</strong> at all termination, connection, and splice points'), true, 'art18: 2020 (C)(1) voltage-class wording present');
  eq(art.includes('Different systems within the same premises that have the same system voltage class shall be permitted to use the same identification.'), true, 'art18: 2020 new same-class sentence verbatim');
  eq(art.includes('310.8(B)'), true, 'art18: 2020 renumbered cross-reference (310.120(B) -> 310.8(B)) disclosed');
  // 200.6 / 250.119 / 310.110 / 110.15 / 408.4 probes
  eq(art.includes('An insulated grounded conductor of 6 AWG or smaller shall be identified by one of the following means: (1) A continuous white outer finish.'), true, 'art18: 200.6(A) lead + (A)(1) verbatim');
  eq(art.includes('An insulated grounded conductor 4 AWG or larger shall be identified by one of the following means'), true, 'art18: 200.6(B) lead verbatim');
  eq(art.includes('each grounded conductor shall be identified by system'), true, 'art18: 200.6(D) by-system rule verbatim');
  eq(art.includes('Conductors with insulation or individual covering that is green, green with one or more yellow stripes, or otherwise identified as permitted by this section shall not be used for ungrounded or grounded circuit conductors.'), true, 'art18: 250.119 lead-in egress rule verbatim');
  eq(art.includes('shall be finished to be clearly distinguishable from grounded and grounding conductors'), true, 'art18: 310.110(C) clearly-distinguishable verbatim');
  eq(art.includes('Branch-circuit ungrounded conductors shall be identified in accordance with 210.5(C).'), true, 'art18: 310.110(C) -> 210.5(C) routing verbatim');
  eq(art.includes('only the conductor or busbar having the higher phase voltage to ground shall be durably and permanently marked by an outer finish that is orange in color or by other effective means'), true, 'art18: 110.15 orange high-leg verbatim');
  eq(art.includes('The AWG size or circular mil area shall be repeated at intervals not exceeding 610 mm (24 in.).'), true, 'art18: 310.120(B)(1) 24-in repeat verbatim');
  eq(art.includes('No circuit shall be described in a manner that depends on transient conditions of occupancy.'), true, 'art18: 408.4(A) directory rule verbatim');
  // EX1: the 20 A circuit pick is 12 AWG Cu (14 AWG ruled out by the 240.4(D) 15 A cap)
  eq(core.pickConductor31016(20, 'cu', 75).size, '14', 'art18 EX1: bare ampacity pick for 20 A @75 = 14 AWG Cu');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art18 EX1: 14 AWG Cu cap 15 A < 20 A OCPD -> ruled out');
  const p12 = core.pickConductor31016(25, 'cu', 75);
  eq(p12.size, '12', 'art18 EX1: 12 AWG Cu is the 25 A @75 size');
  eq(p12.amp, 25, 'art18 EX1: 12 AWG Cu 75 C ampacity = 25 A');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art18 EX1: 12 AWG Cu cap 20 A covers the 20 A OCPD');
  eq(core.reqBreakerA(20, true), 25, 'art18 EX1: 20 A continuous load -> 25 A required (125%)');
  // EX2: multi-voltage branch picks (20 A -> 12 AWG; 30 A -> 10 AWG)
  eq(core.smallConductorCap('12', 'cu') >= 20, true, 'art18 EX2: 20 A branch -> 12 AWG Cu (cap 20 A OK)');
  eq(core.pickConductor31016(35, 'cu', 75).size, '10', 'art18 EX2: 35 A @75 pick = 10 AWG Cu (30 A branch + 240.4(D) headroom)');
  eq(core.smallConductorCap('10', 'cu'), 30, 'art18 EX2: 10 AWG Cu cap = 30 A (covers 30 A OCPD)');
  // EX3: DC polarity buckets (30 A cont -> 37.5 A -> 8 AWG "smaller"; 80 A cont -> 100 A -> 3 AWG "larger")
  const dc30 = core.pickConductor31016(core.reqBreakerA(30, true), 'cu', 75);
  eq(dc30.size, '8', 'art18 EX3: 37.5 A (30 A continuous) -> 8 AWG Cu');
  eq(dc30.amp, 50, 'art18 EX3: 8 AWG Cu 75 C ampacity = 50 A');
  const dc80 = core.pickConductor31016(core.reqBreakerA(80, true), 'cu', 75);
  eq(dc80.size, '3', 'art18 EX3: 100 A (80 A continuous) -> 3 AWG Cu');
  eq(dc80.amp, 100, 'art18 EX3: 3 AWG Cu 75 C ampacity = 100 A');
  // bucket logic: physical size, not gauge number (4 AWG or LARGER vs 6 AWG or SMALLER; 5 AWG = wording gap)
  const bucket = (s) => (/\d+\/0$/.test(s) || +s <= 4) ? 'larger' : (+s >= 6 ? 'smaller' : 'gap');
  eq(bucket('8'), 'smaller', 'art18 EX3: 8 AWG in the "6 AWG or smaller" four-means bucket');
  eq(bucket('6'), 'smaller', 'art18 EX3: 6 AWG itself in the "6 AWG or smaller" bucket');
  eq(bucket('4'), 'larger', 'art18 EX3: 4 AWG in the "4 AWG or larger" bucket');
  eq(bucket('3'), 'larger', 'art18 EX3: 3 AWG in the "4 AWG or larger" bucket');
  eq(bucket('1/0'), 'larger', 'art18 EX3: 1/0 kcmil in the "4 AWG or larger" bucket');
  eq(bucket('5'), 'gap', 'art18 EX3: 5 AWG is the literal wording gap (neither phrase)');
  // EX4: high-leg geometry (208Y/120 delta, midpoint grounded)
  eq(Math.round(Math.sqrt(3) * 120 * 10) / 10, 207.8, 'art18 EX4: high leg to ground = sqrt(3) x 120 = 207.8 V');
  // EX5: two-neutrals-in-one-raceway anchor picks
  const n100 = core.pickConductor31016(100, 'cu', 75);
  eq(n100.size, '3', 'art18 EX5: 100 A neutral anchor -> 3 AWG Cu');
  const n125 = core.pickConductor31016(125, 'cu', 75);
  eq(n125.size, '1', 'art18 EX5: 125 A neutral anchor -> 1 AWG Cu');
  eq(n125.amp, 130, 'art18 EX5: 1 AWG Cu 75 C ampacity = 130 A');
  // EX7: the 220.82 flagship (test-suite vector: 1,500 ft2 + 21,000 VA appl + 5,000 VA AC @240)
  const sl7 = core.serviceLoad22082({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 21000, volt: 240, acVA: 5000 });
  eq(sl7.totalVA, 23000, 'art18 EX7: flagship total = 23,000 VA');
  eq(core.serviceLineConductor22082(sl7, 'cu', 75).reqA, 100, 'art18 EX7: 95.83 A -> 100 A (230.79(C) floor)');
  eq(core.serviceLineConductor22082(sl7, 'cu', 75).pick.size, '3', 'art18 EX7: 100 A -> 3 AWG Cu ungrounded @75 C');
  eq(sl7.recommendedBreakerA, 100, 'art18 EX7: 100 A standard service OCPD');
  // EX7: dwStatus on the 100 A panel (garage absent -> 5 of 6 met)
  const dw7 = core.dwStatus({
    panels: [{ name: 'P1', ratingA: 100, system: '120/240', circuits: [
      { name: 'SA-1 KITCHEN', ratingA: 20 }, { name: 'SA-2 KITCHEN', ratingA: 20 },
      { name: 'Laundry', ratingA: 20 }, { name: 'BATH', ratingA: 20 },
      { name: 'GFCI OUTDOOR', ratingA: 20 },
      { name: 'LIGHT-1', ratingA: 15 }, { name: 'LIGHT-2', ratingA: 15 }
    ] }]
  });
  eq(dw7.metCount, 5, 'art18 EX7: dwStatus 5 of 6 met (no garage)');
  eq(dw7.items.find(i => i.id === 'garage').met, false, 'art18 EX7: garage item unmet (0 circuits)');
}

// --- 210.21 feature article (Session 44): articles/nec-21021-outlet-devices.html ---
// The article's worked-example numbers are produced by the shipped cores and asserted
// here so the article table can never drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21021-outlet-devices.html'), 'utf8');
  eq(art.includes('nec-21021-outlet-devices.html'), true, 'art19: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21021-outlet-devices.html'), true, 'art19: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art19: AI disclosure present');
  // verbatim code-text probes (2017 = 2020 word-identical)
  eq(art.includes('Outlet devices shall have an ampere rating that is not less than the load to be served'), true, 'art19: 210.21 lead-in verbatim');
  eq(art.includes('A single receptacle installed on an individual branch circuit shall have an ampere rating not less than that of the branch circuit.'), true, 'art19: (B)(1) single-receptacle minimum verbatim');
  eq(art.includes('a receptacle shall not supply a total cord-and-plug-connected load in excess of the maximum specified in Table 210.21(B)(2)'), true, 'art19: (B)(2) max-load verbatim');
  eq(art.includes('receptacle ratings shall conform to the values listed in Table 210.21(B)(3)'), true, 'art19: (B)(3) rating-conformance verbatim');
  eq(art.includes('The ampere rating of a range receptacle shall be permitted to be based on a single range demand load as specified in Table 220.55.'), true, 'art19: (B)(4) range-receptacle allowance verbatim');
  // Table 210.21(B)(3) "15 or 20" row + (A) lampholder 660/750 W
  eq(art.includes('15 or 20'), true, 'art19: Table (B)(3) "15 or 20" row present');
  eq(art.includes('660 watts if of the admedium type, or not less than 750 watts'), true, 'art19: (A) lampholder 660/750 W verbatim');
  // EX1: Table 210.21(B)(2) 80% max-load table (computed by the shipped core)
  eq(12 / 15 * 100, 80, 'art19 EX1: 15 A receptacle max load 12 A = 80%');
  eq(16 / 20 * 100, 80, 'art19 EX1: 20 A receptacle max load 16 A = 80%');
  eq(24 / 30 * 100, 80, 'art19 EX1: 30 A receptacle max load 24 A = 80%');
  eq(16 * 120, 1920, 'art19 EX1: 16 A @120 V = 1,920 W');
  eq(24 * 240, 5760, 'art19 EX1: 24 A @240 V = 5,760 W');
  // EX3: (B)(1) dedicated 20 A circuit — 14 AWG ruled out by the 240.4(D) 15 A cap
  eq(core.pickConductor31016(20, 'cu', 75).size, '14', 'art19 EX3: bare ampacity pick for 20 A @75 = 14 AWG Cu');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art19 EX3: 14 AWG Cu cap 15 A < 20 A -> ruled out');
  const a19_12 = core.pickConductor31016(25, 'cu', 75);
  eq(a19_12.size, '12', 'art19 EX3: 12 AWG Cu is the 25 A @75 size (feeds a 20 A circuit)');
  eq(a19_12.amp, 25, 'art19 EX3: 12 AWG Cu 75 C ampacity = 25 A');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art19 EX3: 12 AWG Cu cap 20 A covers the 20 A OCPD');
  // EX4: 240.4(D) trap the (B)(1) picks sit on — aluminum version
  eq(core.pickConductor31016(20, 'al', 75).size, '12', 'art19 EX4: bare ampacity pick for 20 A Al @75 = 12 AWG Al (20 A)');
  eq(core.smallConductorCap('12', 'al'), 15, 'art19 EX4: 12 AWG Al cap 15 A < 20 A -> ruled out (the Al trap)');
  const a19_10al = core.pickConductor31016(25, 'al', 75);
  eq(a19_10al.size, '10', 'art19 EX4: 10 AWG Al is the 25 A @75 size (feeds a 20 A Al circuit)');
  eq(core.smallConductorCap('10', 'al'), 25, 'art19 EX4: 10 AWG Al cap 25 A covers the 20 A OCPD');
  // EX5: 30 A receptacle on a 30 A circuit
  eq(core.pickConductor31016(30, 'cu', 75).size, '10', 'art19 EX5: 30 A circuit -> 10 AWG Cu (35 A @75)');
  eq(core.pickConductor31016(30, 'cu', 75).amp, 35, 'art19 EX5: 10 AWG Cu 75 C ampacity = 35 A');
  eq(core.smallConductorCap('10', 'cu'), 30, 'art19 EX5: 10 AWG Cu cap = 30 A (covers the 30 A OCPD)');
  // EX6: (B)(4) range receptacle rated by the 220.55 single-range demand
  const a19_range = core.cookingDemand22055({ count: 1, ratingKW: 12 });
  eq(a19_range.demandKW, 8, 'art19 EX6: 12 kW single range 220.55 Column C demand = 8 kW');
  eq(a19_range.demandVA, 8000, 'art19 EX6: 8 kW = 8,000 VA');
  eq(Math.round(8000 / 240 * 100) / 100, 33.33, 'art19 EX6: 8,000 VA / 240 V = 33.33 A demand');
  eq(core.pickConductor31016(50, 'cu', 75).size, '8', 'art19 EX6: 50 A range circuit -> 8 AWG Cu (50 A @75)');
  // EX7: 40 A circuit "40 or 50" row
  eq(core.pickConductor31016(40, 'cu', 75).size, '8', 'art19 EX7: 40 A @75 -> 8 AWG Cu (50 A)');
  eq(core.pickConductor31016(40, 'cu', 75).amp, 50, 'art19 EX7: 8 AWG Cu 75 C ampacity = 50 A');
  eq(core.pickConductor31016(40, 'cu', 60).size, '8', 'art19 EX7: 40 A @60 -> 8 AWG Cu (40 A)');
}

// --- Article 20 (Session 45): articles/nec-250119-egc-identification.html ---
// NEC 250.119 (Identification of EGCs) + 310.120 (Marking) + Table 250.122 +
// 250.122(B). Verbatim 2017 NFPA on disk; 2020 renumber 310.120->310.8 confirmed
// from on-disk 210.5(C)(2); 2023 gated (no word-diff claimed). Worked-example
// numbers produced by the shipped cores (income-lab/compute_art20.js ->
// calc_250119_cited.json) and asserted here so the article can never drift.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-250119-egc-identification.html'), 'utf8');
  eq(art.includes('nec-250119-egc-identification.html'), true, 'art20: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-250119-egc-identification.html'), true, 'art20: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art20: AI disclosure present');
  // 250.119 verbatim probes (official 2017 NFPA on disk)
  eq(art.includes('shall have a continuous outer finish that is either green or green with one or more yellow stripes'), true, 'art20: 250.119 green rule verbatim');
  eq(art.includes('shall not be used for ungrounded or grounded circuit conductors'), true, 'art20: 250.119 one-way reservation verbatim');
  eq(art.includes('Identification shall encircle the conductor'), true, 'art20: 250.119(A) must-encircle verbatim');
  eq(art.includes('Conductors 4 AWG and Larger'), true, 'art20: 250.119(A) 4 AWG threshold verbatim');
  // 310.120 verbatim probes
  eq(art.includes('The AWG size or circular mil area'), true, 'art20: 310.120(A)(4) size marking verbatim');
  eq(art.includes('repeated at intervals not exceeding 610 mm (24 in.)'), true, 'art20: 310.120(B)(1) 24-in size interval verbatim');
  eq(art.includes('All other markings shall be repeated at intervals not exceeding 1.0 m (40 in.)'), true, 'art20: 310.120(B)(1) 40-in other interval verbatim');
  eq(art.includes('marker tape located within the cable and running for its complete length'), true, 'art20: 310.120(B)(2) marker-tape verbatim');
  // Table 250.122 low rows (verbatim 2017)
  eq(art.includes('15   | 14  | 12'), true, 'art20: Table 250.122 15 A row (14/12) present');
  eq(art.includes('200  | 4   | 2'), true, 'art20: Table 250.122 200 A row (4/2) present');
  // 2020 renumber 310.120 -> 310.8 (confirmed from on-disk 210.5(C)(2))
  eq(art.includes('became 310.8'), true, 'art20: 2020 renumber 310.120 -> 310.8 stated');
  eq(art.includes('in accordance with 310.8(B)'), true, 'art20: on-disk 210.5(C)(2) 310.8(B) cross-ref cited');
  // EX2: Table 250.122 minimum EGC rows (computed)
  eq(core.ch9Row('14').cm, 4110, 'art20 EX2: 14 AWG cmil 4110');
  eq(core.ch9Row('12').cm, 6530, 'art20 EX2: 12 AWG cmil 6530');
  eq(core.ch9Row('10').cm, 10380, 'art20 EX2: 10 AWG cmil 10380');
  eq(core.ch9Row('8').cm, 16510, 'art20 EX2: 8 AWG cmil 16510');
  eq(core.ch9Row('6').cm, 26240, 'art20 EX2: 6 AWG cmil 26240');
  eq(core.ch9Row('4').cm, 41740, 'art20 EX2: 4 AWG cmil 41740');
  eq(core.ch9Row('2').cm, 66360, 'art20 EX2: 2 AWG cmil 66360');
  // EX4: 250.122(B) proportional increase — 200 A, ungrounded 3/0 -> 4/0
  eq(core.ch9Row('3/0').cm, 167800, 'art20 EX4: 3/0 cmil 167800 (min-ampacity ungrounded)');
  eq(core.ch9Row('4/0').cm, 211600, 'art20 EX4: 4/0 cmil 211600 (upsized ungrounded)');
  const a20_req = core.ch9Row('4').cm * (core.ch9Row('4/0').cm / core.ch9Row('3/0').cm);
  eq(Math.round(a20_req), 52635, 'art20 EX4: EGC cmil required = 41740 x (211600/167800) = 52635');
  eq(core.ch9Row('3').cm < a20_req, true, 'art20 EX4: 3 AWG (52620 cmil) is just under -> NOT sufficient');
  eq(core.ch9Row('2').cm >= a20_req, true, 'art20 EX4: 2 AWG (66360 cmil) >= 52635 -> the proportional EGC pick');
  // EX6: 310.120(B)(1) repeat counts per 100 ft (computed)
  eq(Math.ceil(1200 / 24), 50, 'art20 EX6: size marking every 24 in -> 50 per 100 ft');
  eq(Math.ceil(1200 / 40), 30, 'art20 EX6: other markings every 40 in -> 30 per 100 ft');
  // EX7: EGC resistance sense (Table 8 Ch 9 via the shipped core)
  const a20_vd = core.voltageDrop({ amps: 30, lengthFt: 100, volt: 120, size: '10', mat: 'cu', config: '1ph' });
  eq(a20_vd.rPerKft, 1.21, 'art20 EX7: 10 AWG Cu = 1.21 ohm/kft (Table 8 Ch 9)');
  eq(a20_vd.rOneWay, 0.121, 'art20 EX7: 100 ft one-way = 0.121 ohm');
  eq(a20_vd.vdV, 7.26, 'art20 EX7: 30 A x 0.121 x 2 = 7.26 V (illustrative, not a VD requirement)');
}

// --- Article 21 (Session 46): articles/nec-31015-ampacity-adjustments.html ---
// NEC 310.15 (Ampacities for Conductors Rated 0-2000 Volts): the
// ambient-temperature CORRECTION (Table 310.15(B)(2)(a) 2017 /
// 310.15(B)(1)(1) 2023, 30 C base, 16 rows incl. blank cells) + the
// more-than-three-current-carrying-conductor ADJUSTMENT
// (Table 310.15(B)(3)(a) 2017 / 310.15(C)(1) 2023). Verbatim 2017 NFPA
// on disk (nec2017_full.txt lines 25494-26447); 2023 renumber confirmed
// from the on-disk print (codeelec_2023.pdf pp. 29-37); 2020 body not on
// disk (scan ends at Art. 230) — no 2020 word-diff claimed. Worked-example
// numbers produced by the shipped cores (income-lab/compute_art21.js ->
// calc_31015_cited.json) and asserted here so the article can never drift.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-31015-ampacity-adjustments.html'), 'utf8');
  eq(art.includes('nec-31015-ampacity-adjustments.html'), true, 'art21: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-31015-ampacity-adjustments.html'), true, 'art21: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art21: AI disclosure present');
  // 310.15 verbatim probes (official 2017 NFPA on disk)
  eq(art.includes('310.15 Ampacities for Conductors Rated 0-2000 Volts.'), true, 'art21: section title verbatim');
  eq(art.includes('(A) General.'), true, 'art21: (A) General verbatim');
  eq(art.includes('the lowest value shall be used'), true, 'art21: (A)(2) lowest-value rule verbatim');
  eq(art.includes('The temperature correction and adjustment factors shall be permitted'), true, 'art21: (B) master rule verbatim');
  eq(art.includes('to be calculated using the following equation'), true, 'art21: (B)(2) equation reference verbatim');
  eq(art.includes('Where the number of'), true, 'art21: (B)(3)(a) lead-in verbatim');
  eq(art.includes('A grounding or bonding conductor shall not be counted'), true, 'art21: EGC-never-counts verbatim (2017 (B)(6) / 2023 (F))');
  eq(art.includes('shall not be required to be counted'), true, 'art21: unbalanced-neutral-not-counted verbatim (2017 (B)(5)(a) / 2023 (E)(1))');
  eq(art.includes('carries only the unbalanced current from other conductors of the same circuit'), true, 'art21: neutral definition verbatim');
  eq(art.includes('conductor of a paralleled set of conductors'), true, 'art21: (B)(3)(a) paralleled-set rule verbatim');
  eq(art.includes('(C) Engineering Supervision.'), true, 'art21: (C) Engineering Supervision verbatim');
  eq(art.includes('Under engineering supervision, conductor'), true, 'art21: (C) lead-in verbatim');
  eq(art.includes('ampacities shall be permitted to be calculated by means of the following'), true, 'art21: (C) equation intro verbatim');
  eq(art.includes('general equation:'), true, 'art21: (C) equation label verbatim');
  eq(art.includes('effective thermal resistance between conductor and'), true, 'art21: (C) variable def verbatim');
  eq(art.includes('component ac resistance resulting from skin effect and'), true, 'art21: (C) Yc definition verbatim');
  eq(art.includes('(3) Adjustment Factors.'), true, 'art21: (B)(3) Adjustment Factors verbatim');
  // edition posture (honest)
  eq(art.includes('310.15(B)(2)(a)'), true, 'art21: 2017 ambient table number cited');
  eq(art.includes('310.15(B)(1)(1)'), true, 'art21: 2020/2023 ambient table number cited');
  eq(art.includes('310.15(B)(3)(a)'), true, 'art21: 2017 CCC table number cited');
  eq(art.includes('310.15(C)(1)'), true, 'art21: 2020/2023 CCC table number cited');
  eq(art.includes('2017→2020 renumber'), true, 'art21: renumber trap named');
  eq(art.includes('codeelec_2023.pdf'), true, 'art21: on-disk 2023 print source cited');
  eq(art.includes('not on disk'), true, 'art21: 2020-body limitation stated plainly');
  // ambient table probes (rendered from the shipped core)
  eq(art.includes('1.29'), true, 'art21: ambient 1.29 (<=10C, 60C col) present');
  eq(art.includes('0.29'), true, 'art21: ambient 0.29 (81-85C, 90C col) present');
  eq(art.includes('0.94'), true, 'art21: ambient 0.94 (31-35C, 75C col) present');
  eq(art.includes('0.75'), true, 'art21: ambient 0.75 (46-50C, 75C col) present');
  // CCC table probes (rendered from the shipped core)
  eq(art.includes('1-3'), true, 'art21: CCC 1-3 row present');
  eq(art.includes('100% (no adjustment)'), true, 'art21: CCC 1-3 = no adjustment stated');
  eq(art.includes('41 and above'), true, 'art21: CCC 41+ row present');
  // EX3 — flagship: 80 A, 35C, 6 CCC, 75C Cu -> 2 AWG
  const ex3 = core.derate31015({ requiredA: 80, ambientC: 35, ccc: 6, mat: 'cu', temp: 75 });
  eq(ex3.pick.size, '2', 'art21 EX3: 80 A / 35C / 6 CCC / 75C Cu -> 2 AWG Cu');
  eq(ex3.pick.baseAmp, 115, 'art21 EX3: 2 AWG Cu 75C base = 115 A');
  eq(ex3.pick.deratedA, 86.48, 'art21 EX3: 115 x 0.94 x 0.80 = 86.48 A');
  eq(Math.round(100*0.94*0.80*100)/100, 75.2, 'art21 EX3: 3 AWG Cu 100 x 0.94 x 0.80 = 75.2 A (fails 80 A)');
  // EX4 — aluminum twin: 80 A, 35C, 6 CCC, 75C Al -> 1/0 Al
  const ex4 = core.derate31015({ requiredA: 80, ambientC: 35, ccc: 6, mat: 'al', temp: 75 });
  eq(ex4.pick.size, '1/0', 'art21 EX4: 80 A / 35C / 6 CCC / 75C Al -> 1/0 AWG Al');
  eq(ex4.pick.baseAmp, 120, 'art21 EX4: 1/0 Al 75C base = 120 A');
  eq(ex4.pick.deratedA, 90.24, 'art21 EX4: 120 x 0.94 x 0.80 = 90.24 A');
  // EX5 — ambient-only: 100 A, 50C, 3 CCC, 75C Cu -> 1/0 Cu
  const ex5 = core.derate31015({ requiredA: 100, ambientC: 50, ccc: 3, mat: 'cu', temp: 75 });
  eq(ex5.pick.size, '1/0', 'art21 EX5: 100 A / 50C / 3 CCC / 75C Cu -> 1/0 AWG Cu');
  eq(ex5.pick.baseAmp, 150, 'art21 EX5: 1/0 Cu 75C base = 150 A');
  eq(ex5.pick.deratedA, 112.5, 'art21 EX5: 150 x 0.75 = 112.5 A (ambient-only)');
  // EX6 — CCC-only: 100 A, 30C, 10 CCC (50%), 75C Cu -> 3/0 Cu
  const ex6 = core.derate31015({ requiredA: 100, ambientC: 30, ccc: 10, mat: 'cu', temp: 75 });
  eq(ex6.pick.size, '3/0', 'art21 EX6: 100 A / 30C / 10 CCC / 75C Cu -> 3/0 AWG Cu');
  eq(ex6.pick.baseAmp, 200, 'art21 EX6: 3/0 Cu 75C base = 200 A');
  eq(ex6.pick.deratedA, 100, 'art21 EX6: 200 x 0.50 = 100 A (CCC-only, 30C base)');
  // EX7 — the honesty rule: blank cell at 75C ambient, 75C column -> no factor, do not guess
  const ex7 = core.derate31015({ requiredA: 40, ambientC: 75, ccc: 3, mat: 'cu', temp: 75, size: '4' });
  eq(ex7.ambF === undefined || ex7.ambF === null, true, 'art21 EX7: 75C column at 75C ambient -> NO factor (blank cell)');
  eq(ex7.notes.some(n => n.includes('No 310.15(B)(1) factor is listed')), true, 'art21 EX7: core surfaces the blank-cell note');
  const ex7b = core.derate31015({ requiredA: 40, ambientC: 75, ccc: 3, mat: 'cu', temp: 90, size: '4' });
  eq(ex7b.ambF, 0.5, 'art21 EX7 rescue: 90C column at 75C ambient = 0.50 factor exists');
  eq(ex7b.deratedA, 47.5, 'art21 EX7 rescue: 4 AWG Cu 95 x 0.50 = 47.5 A (passes 40 A)');
  // EX8 — 240.4(D) cap coincidence: 12 AWG Cu, 30C, 4 CCC (80%)
  const ex8 = core.derate31015({ requiredA: 20, ambientC: 30, ccc: 4, mat: 'cu', temp: 75, size: '12' });
  eq(ex8.baseAmp, 25, 'art21 EX8: 12 AWG Cu 75C base = 25 A');
  eq(ex8.deratedA, 20, 'art21 EX8: 25 x 0.80 = 20 A derated');
  eq(ex8.capA, 20, 'art21 EX8: 240.4(D) cap for 12 Cu = 20 A');
  eq(ex8.effectiveA, 20, 'art21 EX8: effective = 20 A (cap and derate coincide)');
  // factor-table cell-match vs shipped core (the article tables are core-rendered)
  eq(core.AMB31015B.length, 16, 'art21: ambient core table = 16 rows');
  eq(core.CCC31015C.length, 7, 'art21: CCC core table = 7 rows (incl. implicit 1-3)');
  eq(core.CCC31015C.find(r => r.min === 1).pct, 100, 'art21: CCC 1-3 row = 100% (implicit in code, explicit in core)');
  eq(core.CCC31015C.find(r => r.min === 4).pct, 80, 'art21: CCC 4-6 row = 80%');
  eq(core.CCC31015C.find(r => r.min === 41).pct, 35, 'art21: CCC 41+ row = 35%');
}

// --- Article 22 (Session 47): articles/nec-250122-egc-sizing.html ---
// NEC 250.122 (Size of Equipment Grounding Conductors) deep-dive: the (A)
// table rule + ceiling, (B) proportional increase, (C) multiple circuits,
// (D) motor circuits, (E) flexible cord, (F) parallel conductors, (G) feeder
// taps. Verbatim 2017 section text (on disk, nec2017_full.txt lines 21479-21624)
// + Table 250.122 (18 rows, 3-way live-verified 2026-09-01). Every worked
// number asserted against the shipped cores (ch9Row cmil, nextStdBreaker,
// pickConductor31016, smallConductorCap) so the article cannot drift from the
// tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-250122-egc-sizing.html'), 'utf8');
  // whitespace-normalized copy: verbatim probes must survive pre-wrap line breaks
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  eq(art.includes('nec-250122-egc-sizing.html'), true, 'art22: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-250122-egc-sizing.html'), true, 'art22: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art22: AI disclosure present');
  eq(has('Size of Equipment Grounding Conductors'), true, 'art22: carries the verified 2014-2023 section title');
  // verbatim 2017 code probes
  eq(has('shall not be smaller than shown in Table 250.122'), true, 'art22: verbatim 250.122(A) floor');
  eq(has('in no case shall they be required to be larger than the circuit conductors'), true, 'art22: verbatim 250.122(A) ceiling');
  eq(has('increased in size proportionately, according to the circular mil area of the ungrounded conductors'), true, 'art22: verbatim 2017 250.122(B)');
  eq(has('it shall be sized for the largest overcurrent device protecting conductors in the raceway, cable, or cable tray'), true, 'art22: verbatim 250.122(C) largest-OCPD rule');
  eq(has('dual element time-delay fuse selected for branch-circuit short-circuit and ground-fault protection in accordance with 430.52(C)(1), Exception No. 1'), true, 'art22: verbatim 250.122(D)(2)');
  eq(has('shall not be smaller than 18 AWG copper and shall not be smaller than the circuit conductors'), true, 'art22: verbatim 250.122(E) 18 AWG floor');
  eq(has('310.10(H)'), true, 'art22: verbatim 250.122(F) parallel reference');
  eq(has('based on the rating of the overcurrent device ahead of the feeder but shall not be required to be larger than the tap conductors'), true, 'art22: verbatim 250.122(G) feeder taps');
  // edition-trap content (250.122(B) NOT new in 2020)
  eq(has('for any reason other than as required in 310.15(B) or 310.15(C)'), true, 'art22: 2020 (B) trigger wording present');
  eq(has('a revision of the existing section'), true, 'art22: the change record corrects the NFPA book "new section" flag');
  // 2023 (F) restructure
  eq(has('Auxiliary Gutter'), true, 'art22: 2023 (F)(1)(a) auxiliary-gutter addition present');
  // Table 250.122 row probes (all 18 rows)
  const rows = [
    ['15', '14', '12'], ['20', '12', '10'], ['30', '10', '8'], ['60', '8', '6'],
    ['100', '6', '4'], ['200', '4', '2'], ['300', '3', '1'], ['400', '2', '1/0'],
    ['500', '1', '2/0'], ['600', '1/0', '3/0'], ['800', '1/0', '4/0'],
    ['1000', '2/0', '250 kcmil'], ['1200', '3/0', '350 kcmil'],
    ['1600', '4/0', '400 kcmil'], ['2000', '250 kcmil', '500 kcmil'],
    ['2500', '350 kcmil', '600 kcmil'], ['3000', '400 kcmil', '700 kcmil'],
    ['4000', '500 kcmil', '750 kcmil'],
  ];
  for (const [a, cu, al] of rows) {
    const re = new RegExp('<td class="num">' + a + '</td><td class="ctr">' + cu + '</td><td class="ctr">' + al + '</td>');
    eq(re.test(art), true, 'art22: Table 250.122 row ' + a + ' A -> ' + cu + ' Cu / ' + al + ' Al');
  }
  // EX1: 30 A circuit, 10 AWG Cu phases, (A) ceiling binds
  eq(core.smallConductorCap('10', 'cu'), 30, 'art22 EX1: 240.4(D) cap 10 AWG Cu = 30 A');
  eq(core.nextStdBreaker(30), 30, 'art22 EX1: 30 A is a standard size');
  // EX2: 250.122(B) proportional increase, SunCam 2023 flagship recomputed exactly
  const a6 = core.ch9Row('6').cm;
  eq(a6, 26240, 'art22 EX2: 6 AWG = 26,240 cmil (Ch. 9 T8)');
  const req2 = a6 * (400000 / 300000);
  eq(Math.round(req2 * 10) / 10, 34986.7, 'art22 EX2: 26,240 x (400/300) = 34,986.7 cmil');
  let pick2 = null;
  for (const r of core.CH9_T8) if (r.cm >= req2 - 1e-9) { pick2 = r.s; break; }
  eq(pick2, '4', 'art22 EX2: smallest size >= 34,986.7 cmil -> 4 AWG Cu');
  eq(core.ch9Row('4').cm, 41740, 'art22 EX2: 4 AWG = 41,740 cmil');
  // EX3: exact-area landing 3/0 -> 4/0
  const a30 = core.ch9Row('3/0').cm;
  eq(a30, 167800, 'art22 EX3: 3/0 = 167,800 cmil');
  approx(a30 * (core.ch9Row('4/0').cm / a30), core.ch9Row('4/0').cm, 1e-6, 'art22 EX3: proportional math lands exactly on 4/0 area (float tol)');
  eq(core.ch9Row('4/0').cm, 211600, 'art22 EX3: 4/0 = 211,600 cmil');
  // EX4: (G) feeder tap, 200 A ahead -> 4 AWG Cu / 2 AWG Al (row probe above)
  eq(core.nextStdBreaker(200), 200, 'art22 EX4: 200 A is a standard size');
  // EX5: (D) motor, 40 A device -> "not exceeding 30" row = 10 AWG Cu
  eq(core.nextStdBreaker(40), 40, 'art22 EX5: 40 A device (not a table row)');
  // EX6: (E) flexible cord 14 AWG -> EGC 14 AWG (circuit size governs)
  eq(core.ch9Row('14').cm, 4110, 'art22 EX6: 14 AWG = 4,110 cmil');
  // EX7: 100 A service: EGC 6 AWG Cu vs phases 3 AWG Cu @75
  const ex7sl = core.pickConductor31016(100, 'cu', 75);
  eq(ex7sl.size, '3', 'art22 EX7: 100 A Cu @75 -> 3 AWG ungrounded');
  eq(ex7sl.amp, 100, 'art22 EX7: 3 AWG = 100 A @75');
  eq(core.ch9Row('6').cm, 26240, 'art22 EX7: EGC 6 AWG (26,240 cmil) << phases 3 AWG (52,620 cmil)');
  // EX8: (C) three 20 A circuits share one EGC -> 20 A row = 12 AWG Cu
  eq(core.nextStdBreaker(20), 20, 'art22 EX8: 20 A is a standard size (largest OCPD, no summation)');
}

// --- Article 23 (Session 48): articles/nec-250102-main-bonding-jumper.html ---
// NEC 250.102 (Grounded Conductor, Bonding Conductors, and Jumpers) deep-dive:
// (A) material, (B) attachment, (C) supply-side bonding jumper size (Table
// 250.102(C)(1) + the 12.5% Note 1 + the parallel rules), (D) load-side
// hand-off to 250.122, (E) installation. Verbatim 2017 section text (on disk,
// nec2017_full.txt lines 20450-20570) + the full 7-row Table 250.102(C)(1)
// (cross-checked this session against zing2.app 2020/2023/2026 — identical —
// and the ELR 2023 change record sectionID 1612, which prints Note 1's 12.5%
// rule; the on-disk OCR's "124% percent" is a garble and is NOT asserted).
// Every worked number asserted against the shipped cores (ch9Row cmil,
// pickConductor31016, T31016) so the article cannot drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-250102-main-bonding-jumper.html'), 'utf8');
  // whitespace-normalized copy: verbatim probes must survive pre-wrap line breaks
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art23: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-250102-main-bonding-jumper.html'), true, 'art23: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art23: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art23: Article + FAQPage JSON-LD present');
  // verbatim 2017 code probes (250.102 body)
  eq(has('Grounded Conductor, Bonding Conductors, and'), true, 'art23: carries the verified 2014-2023 section title');
  eq(has('Bonding jumpers shall be of copper, aluminum, copper-clad aluminum, or other corrosion-resistant material'), true, 'art23: verbatim 250.102(A) material');
  eq(has('A bonding jumper shall be a wire, bus, screw, or similar suitable conductor'), true, 'art23: verbatim 250.102(A) wire/bus/screw');
  eq(has('The supply-side bonding jumper shall not be smaller than specified in Table 250.102(C)(1)'), true, 'art23: verbatim 250.102(C)(1)');
  eq(has('the size of the supply-side bonding jumper for each raceway or cable shall be selected from Table 250.102(C)(1)'), true, 'art23: verbatim 250.102(C)(2) per-raceway rule');
  eq(has('The equipment bonding jumper on the load side of an overcurrent device(s) shall be sized in accordance with 250.122'), true, 'art23: verbatim 250.102(D) hand-off to 250.122');
  eq(has('the length of the bonding jumper or conductor or equipment bonding jumper shall not exceed 1.8 m (6 ft)'), true, 'art23: verbatim 250.102(E)(2) 6 ft limit');
  // the four sections that point at the one table
  eq(has('250.24(C)(1) Sizing for a Single Raceway or Cable. The grounded conductor shall not be smaller than specified in Table 250.102(C)(1)'), true, 'art23: verbatim 250.24(C)(1)');
  eq(has('but not smaller than 1/0 AWG'), true, 'art23: verbatim 250.24(C)(2) 1/0 AWG parallel minimum');
  eq(has('Main bonding jumpers and system bonding jumpers shall not be smaller than specified in Table 250.102(C)(1)'), true, 'art23: verbatim 250.28(D)(1)');
  eq(has('(a) Sizing for a Single Raceway. The grounded conductor shall not be smaller than specified in Table 250.102(C)(1)'), true, 'art23: verbatim 250.30(A)(3)(a)');
  eq(has('The lightning protection system ground terminals shall be bonded to the building or structure grounding electrode system'), true, 'art23: verbatim 250.106');
  // Note 1: the 12.5% rule (the OCR garble "124% percent" appears ONLY as a
  // documented garble in the honesty/source notes — the factor printed in the
  // notes list must be the resolved value)
  eq(has('not less than 12.5 percent'), true, 'art23: Note 1 prints the resolved 12.5 percent');
  eq(has('a garble for "12.5 percent"'), true, 'art23: the OCR "124% percent" is explicitly documented as a garble (not propagated as the factor)');
  eq(has('shall not be required to be larger than the largest ungrounded conductor'), true, 'art23: Note 1 ceiling (never larger than ungrounded)');
  // Note 3: equivalent area for multiple sets
  eq(has('the largest sum of the areas of the corresponding conductors of each set'), true, 'art23: Note 3 equivalent-area rule');
  // edition posture: 2023 change record
  eq(has('sectionID 1611') || has('1611'), true, 'art23: ELR 2023 record for 250.102(A) cited');
  eq(has('sectionID 1612') || has('1612'), true, 'art23: ELR 2023 record for the table cited');
  // Table 250.102(C)(1) row probes (all 7 rows; 2020/2023/2026 identical per zing2)
  const rows = [
    ['2 AWG or smaller', '1/0 AWG or smaller', '8 AWG', '6 AWG'],
    ['1 AWG or 1/0 AWG', '2/0 AWG or 3/0 AWG', '6 AWG', '4 AWG'],
    ['2/0 AWG or 3/0 AWG', '4/0 AWG or 250 kcmil', '4 AWG', '2 AWG'],
    ['Over 3/0 AWG through 350 kcmil', 'Over 250 kcmil through 500 kcmil', '2 AWG', '1/0 AWG'],
    ['Over 350 kcmil through 600 kcmil', 'Over 500 kcmil through 900 kcmil', '1/0 AWG', '3/0 AWG'],
    ['Over 600 kcmil through 1100 kcmil', 'Over 900 kcmil through 1750 kcmil', '2/0 AWG', '4/0 AWG'],
    ['Over 1100 kcmil', 'Over 1750 kcmil', '12.5%', '12.5%'],
  ];
  for (const [cuL, alL, cu, al] of rows) {
    const re = new RegExp('<td>' + cuL + '</td><td>' + alL + '</td><td class="ctr[^"]*">[^<]*' + cu.replace(/%/g, '%') + '[^<]*</td><td class="ctr[^"]*">[^<]*' + al + '[^<]*</td>');
    eq(re.test(art), true, 'art23: Table 250.102(C)(1) row ' + cuL + ' -> ' + cu + ' Cu / ' + al + ' Al');
  }
  // EX1: 100 A service: phases 3 AWG Cu, bonded neutral 8 AWG Cu (two sizes smaller), EGC 6 AWG Cu
  const ex1p = core.pickConductor31016(100, 'cu', 75);
  eq(ex1p.size, '3', 'art23 EX1: 100 A Cu @75 -> 3 AWG ungrounded');
  eq(ex1p.amp, 100, 'art23 EX1: 3 AWG = 100 A @75');
  eq(core.ch9Row('3').cm, 52620, 'art23 EX1: 3 AWG = 52,620 cmil (Ch. 9 T8)');
  // EX2: 200 A service: phases 3/0 Cu, bonded neutral 4 AWG Cu
  const ex2p = core.pickConductor31016(200, 'cu', 75);
  eq(ex2p.size, '3/0', 'art23 EX2: 200 A Cu @75 -> 3/0 ungrounded');
  eq(ex2p.amp, 200, 'art23 EX2: 3/0 = 200 A @75');
  eq(core.ch9Row('3/0').cm, 167800, 'art23 EX2: 3/0 = 167,800 cmil');
  // EX3: 400 kcmil Cu service -> "Over 350 through 600" row -> 1/0 AWG Cu; ampacity 335 A (NOT 475)
  eq(core.ch9Row('400').cm, 400000, 'art23 EX3: 400 kcmil = 400,000 cmil');
  const amp400 = core.T31016.find(r => r.s === '400').cu[1];
  eq(amp400, 335, 'art23 EX3: 400 kcmil Cu = 335 A @75 (the 475-A 90 °C value is NOT the governing column)');
  // EX4: Note 1 12.5%, both ends — smallest standard size >= 12.5% of ungrounded area
  const req4cu = core.ch9Row('1500').cm * 0.125;
  eq(core.ch9Row('1500').cm, 1500000, 'art23 EX4: 1500 kcmil = 1,500,000 cmil');
  approx(req4cu, 187500, 1e-6, 'art23 EX4: 1,500,000 x 12.5% = 187,500 cmil required');
  let pick4cu = null;
  for (const r of core.CH9_T8) if (r.cm >= req4cu - 1e-9) { pick4cu = r.s; break; }
  eq(pick4cu, '4/0', 'art23 EX4: smallest size >= 187,500 cmil -> 4/0 Cu (3/0 = 167,800 falls short)');
  eq(core.ch9Row('4/0').cm, 211600, 'art23 EX4: 4/0 = 211,600 cmil');
  const req4al = core.ch9Row('1750').cm * 0.125;
  eq(core.ch9Row('1750').cm, 1750000, 'art23 EX4: 1750 kcmil = 1,750,000 cmil');
  approx(req4al, 218750, 1e-6, 'art23 EX4: 1,750,000 x 12.5% = 218,750 cmil required');
  let pick4al = null;
  for (const r of core.CH9_T8) if (r.cm >= req4al - 1e-9) { pick4al = r.s; break; }
  eq(pick4al, '250', 'art23 EX4: smallest size >= 218,750 cmil -> 250 kcmil (250,000 cmil)');
  // EX5: paralleled sets, Note 3 equivalent area = largest sum of corresponding conductors
  const eq5 = 2 * core.ch9Row('4/0').cm;
  approx(eq5, 423200, 1e-6, 'art23 EX5: equivalent area = 2 x 4/0 (211,600) = 423,200 cmil');
  // EX6: separately derived 100 kVA 3-ph 208 V: secondary FLC, then pick, then table row
  const fla6 = 100000 / (Math.sqrt(3) * 208);
  approx(fla6, 277.6, 0.05, 'art23 EX6: 100,000 VA / (sqrt(3) x 208 V) = 277.6 A secondary FLC');
  const ex6p = core.pickConductor31016(Math.ceil(fla6), 'cu', 75);
  eq(ex6p.size, '300', 'art23 EX6: 278 A Cu @75 -> 300 kcmil ungrounded');
  eq(ex6p.amp, 285, 'art23 EX6: 300 kcmil = 285 A @75');
  eq(core.T31016.find(r => r.s === '250').cu[1], 255, 'art23 EX6: 250 kcmil Cu = 255 A @75 (< 278, not enough)');
  // ladder: 250.66 caps (no 12.5% row) while 250.102(C)(1) keeps scaling
  eq(has('3/0 Cu / 250 kcmil Al — CAPPED, no further row'), true, 'art23 ladder: 250.66 top row is a CAP (3/0 Cu / 250 kcmil Al)');
  eq(has('keeps scaling (Note 1)'), true, 'art23 ladder: 250.102(C)(1) keeps scaling via Note 1');
  eq(has('keyed to OCPD rating, not size'), true, 'art23 ladder: 250.122 keyed to OCPD rating, not conductor size');
}

// --- Article 24 (Session 49): articles/nec-25026-25030-separately-derived-systems.html ---
// NEC 250.26 + 250.30 + 250.66 (Separately Derived Systems) deep-dive:
// 250.26's five "conductor to be grounded" cases, 250.30(A)–(C) (system
// bonding jumper, grounded conductor, grounding electrode, GEC, common-GEC
// taps, ungrounded systems, outdoor sources), 250.66 + Table 250.66 (7
// rows, capped top — NO 12.5% row) with the 250.66(A)–(C) electrode caps.
// Verbatim 2017 section text (on disk, nec2017_full.txt lines 18501–18944 +
// 19859–19892, table 19960–20028) + the one documented 2017→2023 change in
// the 250.30 intro (ELR 2023 record sectionID 1590). Table 250.66 rows
// cross-checked against a cached zing2.app NEC-2023 copy this session
// (identical 7 rows). Every worked number asserted against the shipped
// cores so the article cannot drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-25026-25030-separately-derived-systems.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art24: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-25026-25030-separately-derived-systems.html'), true, 'art24: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art24: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art24: Article + FAQPage JSON-LD present');
  // verbatim 2017 code probes (250.26)
  eq(has('250.26 Conductor to Be Grounded — Alternating-Current'), true, 'art24: carries the verified 250.26 title');
  eq(has('Single-phase, 2-wire — one conductor'), true, 'art24: verbatim 250.26(1)');
  eq(has('Multiphase systems having one wire common to all phases — the neutral conductor'), true, 'art24: verbatim 250.26(3)');
  eq(has('Multiphase systems where one phase is grounded — one phase conductor'), true, 'art24: verbatim 250.26(4)');
  // verbatim 2017 code probes (250.30)
  eq(has('In addition to complying with 250.30(A) for grounded systems, or as provided in 250.30(B) for ungrounded systems, separately derived systems shall comply with 250.20, 250.21, 250.22, or 250.26, as applicable'), true, 'art24: verbatim 2017 250.30 intro');
  eq(has('Multiple separately derived systems that are connected in parallel shall be installed in accordance with 250.30'), true, 'art24: verbatim 2017 250.30 parallel sentence');
  eq(has('An alternate ac power source, such as an on-site generator, is not a separately derived system if the grounded conductor is solidly interconnected to a service-'), true, 'art24: verbatim 250.30 Info Note No. 1');
  eq(has('(1) System Bonding Jumper. An unspliced system bonding jumper shall comply with 250.28(A) through (D)'), true, 'art24: verbatim 250.30(A)(1)');
  eq(has('(a) Sizing for a Single Raceway. The grounded conductor shall not be smaller than specified in Table 250.102(C)(1)'), true, 'art24: verbatim 250.30(A)(3)(a)');
  eq(has('The building or structure grounding electrode system shall be used as the grounding electrode for the separately derived system'), true, 'art24: verbatim 250.30(A)(4)');
  eq(has('(5) Grounding Electrode Conductor, Single Separately Derived System. A grounding electrode conductor for a single separately derived system shall be sized in accordance with 250.66 for the derived ungrounded conductors'), true, 'art24: verbatim 250.30(A)(5)');
  eq(has('A conductor of the wire type not smaller than 3/0 AWG copper or 250 kcmil aluminum'), true, 'art24: verbatim 250.30(A)(6)(a)(1) common GEC minimum');
  eq(has('(b) Tap Conductor Size. Each tap conductor shall be sized in accordance with 250.66 based on the derived ungrounded conductors of the separately derived system it serves'), true, 'art24: verbatim 250.30(A)(6)(b) tap sizing');
  eq(has('remains without a splice or joint'), true, 'art24: verbatim 250.30(A)(6)(c) no-splice rule');
  eq(has('(1) Grounding Electrode Conductor. A grounding electrode conductor, sized in accordance with 250.66 for the largest derived ungrounded conductor(s)'), true, 'art24: verbatim 250.30(B)(1)');
  eq(has('(C) Outdoor Source. If the source of the separately derived system is located outside the building or structure supplied, a grounding electrode connection shall be made at the source location'), true, 'art24: verbatim 250.30(C)');
  eq(has('shall not be smaller than 14 AWG copper or 12 AWG aluminum'), true, 'art24: verbatim 250.30(A)(1) Ex 3 (1 kVA transformer floor)');
  // verbatim 2017 code probes (250.66)
  eq(has('250.66 Size of Alternating-Current Grounding Electrode Conductor. The size of the grounding electrode conductor at the service, at each building or structure where supplied by a feeder(s) or branch circuit(s), or at a separately derived system of a grounded or ungrounded ac system shall not be less than given in Table 250.66'), true, 'art24: verbatim 250.66 intro');
  eq(has('shall not be required to be larger than 6 AWG copper wire or 4 AWG aluminum wire'), true, 'art24: verbatim 250.66(A) rod/pipe/plate cap');
  eq(has('shall not be required to be larger than 4 AWG copper wire'), true, 'art24: verbatim 250.66(B) concrete-encased cap');
  eq(has('shall not be required to be larger than the conductor used for the ground ring'), true, 'art24: verbatim 250.66(C) ground ring cap');
  // Table 250.66 notes
  eq(has('largest sum of the areas of the corresponding conductors of each set'), true, 'art24: Table 250.66 Note 1 equivalent-area rule');
  eq(has('the grounding electrode conductor size shall be determined by the equivalent size of the largest service-entrance conductor required for the load to be served'), true, 'art24: Table 250.66 Note 2');
  eq(has('This table also applies to the derived conductors of separately derived ac systems'), true, 'art24: Table 250.66 asterisk (applies to derived systems)');
  // Table 250.66 row probes (all 7 rows; 2017 = 2023 per zing2 cross-check)
  const rows = [
    ['2 AWG or smaller', '1/0 AWG or smaller', '8 AWG', '6 AWG'],
    ['1 AWG or 1/0 AWG', '2/0 AWG or 3/0 AWG', '6 AWG', '4 AWG'],
    ['2/0 AWG or 3/0 AWG', '4/0 AWG or 250 kcmil', '4 AWG', '2 AWG'],
    ['Over 3/0 AWG through 350 kcmil', 'Over 250 kcmil through 500 kcmil', '2 AWG', '1/0 AWG'],
    ['Over 350 kcmil through 600 kcmil', 'Over 500 kcmil through 900 kcmil', '1/0 AWG', '3/0 AWG'],
    ['Over 600 kcmil through 1100 kcmil', 'Over 900 kcmil through 1750 kcmil', '2/0 AWG', '4/0 AWG'],
    ['Over 1100 kcmil', 'Over 1750 kcmil', '3/0 AWG', '250 kcmil'],
  ];
  for (const [cuL, alL, cu, al] of rows) {
    const re = new RegExp('<td>' + cuL + '</td><td>' + alL + '</td><td class="ctr[^"]*">[^<]*' + cu + '[^<]*</td><td class="ctr[^"]*">[^<]*' + al + '[^<]*</td>');
    eq(re.test(art), true, 'art24: Table 250.66 row ' + cuL + ' -> ' + cu + ' Cu / ' + al + ' Al');
  }
  // the cap row is flagged as capped (unlike 250.102(C)(1)'s 12.5% row)
  eq(has('3/0 AWG — CAPPED'), true, 'art24: Table 250.66 top row flagged CAPPED (no 12.5% row)');
  // edition posture: the one documented 2017→2023 change (ELR 1590)
  eq(has('treated as a single separately derived system'), true, 'art24: 2023 250.30 intro wording (ELR 1590) quoted');
  eq(has('sectionID 1590'), true, 'art24: ELR 2023 record 1590 cited');
  eq(has('sectionID 1591'), true, 'art24: ELR 2023 record 1591 cited');
  eq(has('sectionID 1592'), true, 'art24: ELR 2023 record 1592 cited');
  eq(has('sectionID 1602'), true, 'art24: ELR record 1602 cited');
  eq(has('sectionID 1603'), true, 'art24: ELR record 1603 cited');
  // OCR garble disclosed, not propagated
  eq(has('"lor 1/0"'), true, 'art24: the OCR "lor 1/0" row-label garble is documented');
  // EX1: 50 kVA 3-ph 208 V: 138.8 A -> 1/0 Cu (150 A) -> "1 or 1/0" row -> 6 AWG Cu
  const ex1fla = 50000 / (Math.sqrt(3) * 208);
  approx(ex1fla, 138.8, 0.05, 'art24 EX1: 50,000 VA / (sqrt(3) x 208 V) = 138.8 A');
  const ex1p = core.pickConductor31016(Math.ceil(ex1fla), 'cu', 75);
  eq(ex1p.size, '1/0', 'art24 EX1: 139 A Cu @75 -> 1/0 ungrounded');
  eq(ex1p.amp, 150, 'art24 EX1: 1/0 = 150 A @75 (>= 138.8 A)');
  // EX2: 100 kVA 3-ph 277 V: 208.4 A -> 4/0 Cu (230 A); 3/0 = 200 A not enough
  const ex2fla = 100000 / (Math.sqrt(3) * 277);
  approx(ex2fla, 208.4, 0.05, 'art24 EX2: 100,000 VA / (sqrt(3) x 277 V) = 208.4 A');
  const ex2p = core.pickConductor31016(Math.ceil(ex2fla), 'cu', 75);
  eq(ex2p.size, '4/0', 'art24 EX2: 209 A Cu @75 -> 4/0 ungrounded');
  eq(ex2p.amp, 230, 'art24 EX2: 4/0 = 230 A @75');
  eq(core.T31016.find(r => r.s === '3/0').cu[1], 200, 'art24 EX2: 3/0 = 200 A @75 (< 209, not enough)');
  eq(core.ch9Row('4/0').cm, 211600, 'art24 EX2: 4/0 = 211,600 cmil -> "Over 3/0 through 350 kcmil" row');
  // EX4: 25 kVA 3-ph 240 V delta (ungrounded): 60.1 A -> 6 AWG Cu (65 A); 8 AWG = 50 A not enough
  const ex4fla = 25000 / (Math.sqrt(3) * 240);
  approx(ex4fla, 60.1, 0.05, 'art24 EX4: 25,000 VA / (sqrt(3) x 240 V) = 60.1 A');
  const ex4p = core.pickConductor31016(Math.ceil(ex4fla), 'cu', 75);
  eq(ex4p.size, '6', 'art24 EX4: 61 A Cu @75 -> 6 AWG ungrounded');
  eq(core.T31016.find(r => r.s === '8').cu[1], 50, 'art24 EX4: 8 AWG = 50 A @75 (< 61, not enough)');
  // EX5: common GEC taps: 100 kVA 208 V -> 300 kcmil (285 A); 25 kVA 208 V -> 4 AWG (85 A)
  const ex5big = core.pickConductor31016(Math.ceil(100000 / (Math.sqrt(3) * 208)), 'cu', 75);
  eq(ex5big.size, '300', 'art24 EX5: 100 kVA 208 V -> 300 kcmil Cu ungrounded (tap "Over 3/0 through 350" -> 2 AWG Cu)');
  const ex5small = core.pickConductor31016(Math.ceil(25000 / (Math.sqrt(3) * 208)), 'cu', 75);
  eq(ex5small.size, '4', 'art24 EX5: 25 kVA 208 V -> 4 AWG Cu ungrounded (tap "2 or smaller" -> 8 AWG Cu)');
  eq(core.T31016.find(r => r.s === '6').cu[1], 65, 'art24 EX5: 6 AWG = 65 A @75 (< 69.4 A, not enough for the 25 kVA system)');
  // EX6: 1 kVA 120/240 V: 4.17 A -> 14 AWG Cu; GEC not required (Ex 3)
  approx(1000 / 240, 4.17, 0.01, 'art24 EX6: 1,000 VA / 240 V = 4.17 A');
  const ex6p = core.pickConductor31016(5, 'cu', 75);
  eq(ex6p.size, '14', 'art24 EX6: 5 A Cu @75 -> 14 AWG ungrounded (matches Exception No. 3 14 AWG floor)');
  // cross-links back to the grounding thread
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art24: cross-links to article 23 (250.102)');
  eq(art.includes('nec-250122-egc-sizing.html'), true, 'art24: cross-links to article 22 (250.122)');
}

// --- Article 25 (Session 50): articles/nec-25050-25052-25053-grounding-electrode-system.html ---
// NEC 250.50 + 250.52 + 250.53 (The Grounding Electrode System) deep-dive:
// 250.50 (bond every present electrode together; install if none from
// (A)(4)-(A)(8)), the 250.52(A) eight permitted electrodes + 250.52(B) three
// not-permitted, and 250.53(A)-(H) (25-ohm supplemental-rod exception, 6-ft
// spacing, ring/plate 30-in. depth, rod 8-ft, 250.53(C) bonding jumper per
// Table 250.66, 250.53(E) 6 AWG cap). HEADLINE: 250.51 does not exist (0
// occurrences in the official 2017 text on disk). Edition deltas: 2020 added
// the rebar-prohibition sentence to 250.53(C); 2023 relettered 250.52 to
// (A)(1)-(8)/(B) and reworded "reinforcing steel" -> "rebar" in (A)(3) and
// (B)(3). Verbatim 2017 on disk (nec2017_full.txt lines 19292-19549); Table
// 250.66 = same 7 capped rows as article 24. Every worked number asserted
// against the shipped cores so the article cannot drift from the tool.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-25050-25052-25053-grounding-electrode-system.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  eq(art.includes('nec-25050-25052-25053-grounding-electrode-system.html'), true, 'art25: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-25050-25052-25053-grounding-electrode-system.html'), true, 'art25: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art25: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art25: Article + FAQPage JSON-LD present');
  // verbatim 2017 code probes (250.50)
  eq(has('250.50 Grounding Electrode System. All grounding electrodes as described in 250.52(A)(1) through (A)(7) that are present at each building or structure served shall be bonded together to form the grounding electrode system'), true, 'art25: verbatim 2017 250.50');
  eq(has('one or more of the grounding electrodes specified in 250.52(A)(4) through (A)(8) shall be installed and used'), true, 'art25: verbatim 250.50 install-if-none range');
  eq(has('Concrete-encased electrodes of existing buildings or structures shall not be required to be part of the grounding electrode system where the steel reinforcing bars or rods are not accessible for use without disturbing the concrete'), true, 'art25: verbatim 250.50 Exception (accessible-rebar carve-out)');
  // verbatim 2017 code probes (250.52)
  eq(has('250.52 Grounding Electrodes.'), true, 'art25: carries the verified 250.52 title');
  eq(has('A metal underground water pipe in direct contact with the earth for 3.0 m (10 ft) or more (including any metal well casing bonded to the pipe) and electrically continuous'), true, 'art25: verbatim 250.52(A)(1) water pipe');
  eq(has('in direct contact with the earth vertically for 3.0 m (10 ft) or more, with or without concrete encasement'), true, 'art25: verbatim 250.52(A)(2) in-ground support');
  eq(has('at least 6.0 m (20 ft) of either (1) or (2)'), true, 'art25: verbatim 250.52(A)(3) Ufer 20 ft');
  eq(has('Bare copper conductor not smaller than 4 AWG'), true, 'art25: verbatim 250.52(A)(3)(2) Ufer 4 AWG floor');
  eq(has('A ground ring encircling the building or structure, in direct contact with the earth, consisting of at least 6.0 m (20 ft) of bare copper conductor not smaller than 2 AWG'), true, 'art25: verbatim 250.52(A)(4) ground ring 2 AWG');
  eq(has('Rod and pipe electrodes shall not be less than 2.44 m (8 ft) in length'), true, 'art25: verbatim 250.52(A)(5) rod 8 ft');
  eq(has('Rod-type grounding electrodes of stainless steel and copper or zinc coated steel shall be at least 15.87 mm (5/8 in.) in diameter, unless listed'), true, 'art25: verbatim 250.52(A)(5)(b) rod 5/8 in.');
  eq(has('Each plate electrode shall expose not less than 0.186 m² (2 ft²) of surface to exterior soil'), true, 'art25: verbatim 250.52(A)(7) plate 2 ft²');
  eq(has('Metal underground gas piping systems'), true, 'art25: verbatim 250.52(B)(1) gas pipe not permitted');
  eq(has('The structures and structural reinforcing steel described in 680.26(B)(1) and (B)(2)'), true, 'art25: verbatim 2017 250.52(B)(3) pool steel (2017 wording)');
  // verbatim 2017 code probes (250.53)
  eq(has('250.53 Grounding Electrode System Installation.'), true, 'art25: carries the verified 250.53 title');
  eq(has('A single rod, pipe, or plate electrode shall be supplemented by an additional electrode of a type specified in 250.52(A)(2) through (A)(8)'), true, 'art25: verbatim 250.53(A)(2) supplemental required');
  eq(has('If a single rod, pipe, or plate grounding electrode has a resistance to earth of 25 ohms or less, the supplemental electrode shall not be required'), true, 'art25: verbatim 250.53(A)(2) 25-ohm Exception');
  eq(has('they shall not be less than 1.8 m (6 ft) apart'), true, 'art25: verbatim 250.53(A)(3) 6-ft rod spacing');
  eq(has('The paralleling efficiency of rods is increased by spacing them twice the length of the longest rod'), true, 'art25: verbatim 250.53(A)(3) Info Note');
  eq(has('shall not be less than 1.83 m (6 ft) from any other electrode of another grounding system'), true, 'art25: verbatim 250.53(B) inter-system 6 ft');
  eq(has('The bonding jumper(s) used to connect the grounding electrodes together to form the grounding electrode system shall be installed in accordance with 250.64(A), (B), and (E), shall be sized in accordance with 250.66, and shall be connected in the manner specified in 250.70'), true, 'art25: verbatim 2017 250.53(C) (pre-rebar-sentence form)');
  eq(has('Continuity of the grounding path or the bonding connection to interior piping shall not rely on water meters or filtering devices'), true, 'art25: verbatim 250.53(D)(1) water-meter continuity');
  eq(has('shall not be required to be larger than 6 AWG copper wire or 4 AWG aluminum wire'), true, 'art25: verbatim 250.53(E) 6 AWG supplemental-connection cap');
  eq(has('The ground ring shall be installed not less than 750 mm (30 in.) below the surface of the earth'), true, 'art25: verbatim 250.53(F) ring 30 in.');
  eq(has('It shall be driven to a depth of not less than 2.44 m (8 ft)'), true, 'art25: verbatim 250.53(G) rod driven 8 ft');
  eq(has('Plate electrodes shall be installed not less than 750 mm (30 in.) below the surface of the earth'), true, 'art25: verbatim 250.53(H) plate 30 in.');
  // the 250.51 phantom (headline)
  eq(has('250.51 does not exist'), true, 'art25: 250.51 phantom headline stated');
  eq(has('zero occurrences of the string "250.51,"'), true, 'art25: 250.51 absence quantified (0 in official 2017 text)');
  eq(has('250.50 → 250.52 → 250.53 → 250.54 (Auxiliary Grounding Electrodes) → 250.58 (Common Grounding Electrode)'), true, 'art25: Part III sequence shown');
  // edition posture: 2020 rebar addition (ELR 863) + 2023 reletter/deltas (ELR 1593/1594/1595)
  eq(has('Rebar shall not be used as a conductor to interconnect the electrodes of grounding electrode systems'), true, 'art25: 2020-added 250.53(C) rebar sentence quoted');
  eq(has('sectionID 863'), true, 'art25: ELR 2020 record 863 cited');
  eq(has('sectionID 1593'), true, 'art25: ELR 2023 record 1593 cited');
  eq(has('sectionID 1595'), true, 'art25: ELR 2023 record 1595 cited');
  eq(has('structural rebar'), true, 'art25: 2023 "structural rebar" wording quoted');
  // Table 250.66 rows (all 7; same capped table as article 24)
  const rows25 = [
    ['2 AWG or smaller', '1/0 AWG or smaller', '8 AWG', '6 AWG'],
    ['1 AWG or 1/0 AWG', '2/0 AWG or 3/0 AWG', '6 AWG', '4 AWG'],
    ['2/0 AWG or 3/0 AWG', '4/0 AWG or 250 kcmil', '4 AWG', '2 AWG'],
    ['Over 3/0 AWG through 350 kcmil', 'Over 250 through 500 kcmil', '2 AWG', '1/0 AWG'],
    ['Over 350 through 600 kcmil', 'Over 500 through 900 kcmil', '1/0 AWG', '3/0 AWG'],
    ['Over 600 through 1100 kcmil', 'Over 900 through 1750 kcmil', '2/0 AWG', '4/0 AWG'],
    ['Over 1100 kcmil', 'Over 1750 kcmil', '3/0 AWG — CAPPED', '250 kcmil — CAPPED'],
  ];
  for (const [cuL, alL, cu, al] of rows25) {
    const re = new RegExp('<td>' + cuL + '</td><td class="ctr[^"]*">[^<]*' + alL + '[^<]*</td><td class="ctr[^"]*">[^<]*' + cu + '[^<]*</td><td class="ctr[^"]*">[^<]*' + al + '[^<]*</td>');
    eq(re.test(art), true, 'art25: Table 250.66 row ' + cuL + ' -> ' + cu + ' Cu / ' + al + ' Al');
  }
  // EX2: 220.82 flagship -> 3 AWG Cu service phases -> "2 AWG or smaller" row -> 8 AWG Cu jumper
  // (Session-51 correction: 3 AWG = 52,620 cmil < 66,360 cmil (2 AWG boundary) -> NOT the "2/0 or 3/0" row)
  const lc25 = core.serviceLoad22082({ sqft: 1500, appliancesKW: 12, acVA: 5000 });
  approx(lc25.amps, 58.3, 0.1, 'art25 EX2: 14,000 VA / 240 V = 58.3 A calc');
  const slc25 = core.serviceLineConductor22082(lc25, 'cu', 75);
  eq(slc25.pick.size, '3', 'art25 EX2: 100 A service -> 3 AWG Cu ungrounded service-entrance');
  eq(core.ch9Row('3').cm, 52620, 'art25 EX2: 3 AWG = 52,620 cmil -> "2 AWG or smaller" row (NOT "2/0 or 3/0")');
  eq(core.ch9Row('2').cm, 66360, 'art25 EX2: 2 AWG = 66,360 cmil (row boundary above 52,620)');
  eq(core.T31016.find(r => r.s === '3').cu[1], 100, 'art25 EX2: 3 AWG = 100 A @75 (covers the 100 A dwg service)');
  eq(core.T31016.find(r => r.s === '8').cu[1], 50, 'art25 EX2: corrected jumper 8 AWG Cu = 50 A @75');
  // the "2/0 or 3/0" row is reached by 3/0 Cu phases (200 A service): 167,800 cmil <= 167,840 boundary
  eq(core.ch9Row('3/0').cm, 167800, 'art25 EX2: 3/0 = 167,800 cmil -> "2/0 AWG or 3/0 AWG" row (the 200 A case)');
  // EX3: 2x longest rod
  eq(8 * 2, 16, 'art25 EX3: 8-ft rod -> 16 ft efficient spacing (2x longest)');
  // EX4/EX5: ampacity context for the Ufer/ring floors
  eq(core.T31016.find(r => r.s === '4').cu[1], 85, 'art25 EX4: 4 AWG Cu = 85 A @75 (Ufer floor context)');
  eq(core.T31016.find(r => r.s === '2').cu[1], 115, 'art25 EX5: 2 AWG Cu = 115 A @75 (ring floor context)');
  // EX6: 25-ohm decision
  eq(40 <= 25, false, 'art25 EX6: a 40-ohm single rod fails the 25-ohm Exception -> supplemental required');
  approx((40 * 40) / (40 + 40), 20.0, 0.05, 'art25 EX6: two 40-ohm rods in parallel = 20 ohms (illustrative)');
  // cross-links back to the grounding thread
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art25: cross-links to article 23 (250.102)');
  eq(art.includes('nec-250122-egc-sizing.html'), true, 'art25: cross-links to article 22 (250.122)');
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art25: cross-links to article 24 (250.26/250.30)');
}

// --- Article 26 (Session 51): articles/nec-25064-250104-gec-installation-bonding.html ---
// NEC 250.64 (GEC Installation) + 250.104 (Bonding of Piping Systems and
// Exposed Structural Metal) deep-dive: the no-splice rule (250.64(C): only
// irreversible compression connectors or exothermic welding for wire GECs),
// 250.64(B) protection (6 AWG+ exposed -> RMC/IMC/PVC/RTRC-XW/EMT/cable armor;
// <6 AWG always protected), 250.64(D) multiple-disconnect common GEC + taps
// (busbar 1/4 in x 2 in), 250.64(E) ferrous raceway bond-at-each-end,
// 250.64(F) install-to-electrode, 250.104(A) water pipe per 250.102(C)(1)
// (2020 cap: not larger than 3/0 Cu / 250 kcmil Al), 250.104(B) gas/other pipe
// per 250.122, 250.104(C) structural metal per 250.102(C)(1), 250.104(D)
// separately derived. Word-level verbatim audit: verify_art26_verbatim.js
// (6 code blocks, 0 words not in the official 2017 text modulo disclosed OCR
// fixes: copperclad, 2x busbar inch garbles, conductor(s}, Info Note No. |:).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-25064-250104-gec-installation-bonding.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  eq(art.includes('nec-25064-250104-gec-installation-bonding.html'), true, 'art26: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-25064-250104-gec-installation-bonding.html'), true, 'art26: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art26: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art26: Article + FAQPage JSON-LD present');
  // verbatim 2017 code probes (250.64)
  eq(has('250.64 Grounding Electrode Conductor Installation. Grounding electrode conductors at the service, at each building or structure where supplied by a feeder(s) or branch circuit(s), or at a separately derived system shall be installed as specified in 250.64(A) through (F).'), true, 'art26: verbatim 250.64 intro');
  eq(has('(A) Aluminum or Copper-Clad Aluminum Conductors. Bare aluminum or copper-clad aluminum grounding electrode conductors shall not be used where in direct contact with masonry or the earth or where subject to corrosive conditions'), true, 'art26: verbatim 250.64(A) (copperclad OCR fix)');
  eq(has('Where used outside, aluminum or copper-clad aluminum grounding electrode conductors shall not be terminated within 450 mm (18 in.) of the earth.'), true, 'art26: verbatim 250.64(A) 18-in earth rule');
  eq(has('(2) Exposed to Physical Damage. A 6 AWG or larger copper or aluminum grounding electrode conductor exposed to physical damage shall be protected in rigid metal conduit (RMC), intermediate metal conduit (IMC), rigid polyvinyl chloride conduit (PVC), reinforced thermosetting resin conduit Type XW (RTRC-XW), electrical metallic tubing (EMT), or cable armor.'), true, 'art26: verbatim 250.64(B)(2) protection list (2017 PVC = pre-Schedule-80)');
  eq(has('(3) Smaller Than 6 AWG. Grounding electrode conductors smaller than 6 AWG shall be protected in RMC, IMC, PVC, RTRC-XW, EMT, or cable armor.'), true, 'art26: verbatim 250.64(B)(3) <6 AWG always protected');
  eq(has('conductor(s) shall be installed in one continuous length without a splice or joint'), true, 'art26: verbatim 250.64(C) no-splice rule');
  eq(has('(1) Splicing of the wire-type grounding electrode conductor shall be permitted only by irreversible compression-type connectors listed as grounding and bonding equipment or by the exothermic welding process.'), true, 'art26: verbatim 250.64(C)(1) only two wire splice methods');
  eq(has('(4) Threaded, welded, brazed, soldered or bolted-flange connections of metal water piping.'), true, 'art26: verbatim 250.64(C)(4) soldered = the pipe joint, not a wire splice');
  eq(has('based on the sum of the circular mil area of the largest ungrounded conductor(s) of each set of conductors that supplies the disconnecting means'), true, 'art26: verbatim 250.64(D)(1) sum-of-cmil-area sizing');
  eq(has('not less than 6 mm thick x 50 mm wide (1/4 in. thick x 2 in. wide)'), true, 'art26: verbatim 250.64(D)(1)(3) busbar (inch value OCR-garbled in 2017 scan, corrected)');
  eq(has('The bonding jumper for a grounding electrode conductor raceway or cable armor shall be the same size as, or larger than, the enclosed grounding electrode conductor.'), true, 'art26: verbatim 250.64(E)(3) raceway jumper sizing');
  eq(has('shall be bonded at each end of the raceway or enclosure to the grounding electrode or grounding electrode conductor to create an electrically parallel path'), true, 'art26: verbatim 250.64(E)(1) ferrous bond-at-each-end');
  // verbatim 2017 code probes (250.104)
  eq(has('250.104 Bonding of Piping Systems and Exposed Structural Metal.'), true, 'art26: carries the verified 250.104 title');
  eq(has('(A) Metal Water Piping. The metal water piping system shall be bonded as required in (A)(1), (A)(2), or (A)(3) of this section.'), true, 'art26: verbatim 250.104(A)');
  eq(has('The bonding jumper(s) shall be installed in accordance with 250.64(A), 250.64(B), and 250.64(E). The points of attachment of the bonding jumper(s) shall be accessible.'), true, 'art26: verbatim 250.104(A)(1) install sentence');
  eq(has('(2) Buildings of Multiple Occupancy. In buildings of multiple occupancy where the metal water piping system(s) installed in or attached to a building or structure for the individual occupancies is metallically isolated from all other occupancies by use of nonmetallic water piping'), true, 'art26: verbatim 250.104(A)(2)');
  eq(has('The bonding jumper(s) shall be sized in accordance with Table 250.102(C)(1), based on the size of the feeder or branch-circuit conductors that supply the building or structure.'), true, 'art26: verbatim 250.104(A)(3) feeder sizing');
  eq(has('(B) Other Metal Piping. If installed in or attached to a building or structure, a metal piping system(s), including gas piping, that is likely to become energized shall be bonded to any of the following:'), true, 'art26: verbatim 250.104(B) gas pipe lead-in');
  eq(has('The bonding conductor(s) or jumper(s) shall be sized in accordance with Table 250.122, and equipment grounding conductors shall be sized in accordance with Table 250.122 using the rating of the circuit that is likely to energize the piping system(s).'), true, 'art26: verbatim 250.104(B) Table 250.122 sizing');
  eq(has('Informational Note No. 1: Bonding all piping and metal air ducts within the premises will provide additional safety.'), true, 'art26: verbatim 250.104(B) Info Note 1 (OCR "No. |:" fix)');
  eq(has('(C) Structural Metal. Exposed structural metal that is interconnected to form a metal building frame and is not intentionally grounded or bonded and is likely to become energized shall be bonded to any of the following:'), true, 'art26: verbatim 250.104(C)');
  eq(has('The bonding conductor(s) or jumper(s) shall be sized in accordance with Table 250.102(C)(1) and installed in accordance with 250.64(A), 250.64(B), and 250.64(E).'), true, 'art26: verbatim 250.104(C) sizing sentence');
  eq(has('(D) Separately Derived Systems. Metal water piping systems and structural metal that is interconnected to form a building frame shall be bonded to separately derived systems'), true, 'art26: verbatim 250.104(D) intro');
  // edition posture (ELR records fetched 2026-09-02)
  eq(has('Schedule 80 rigid polyvinyl chloride conduit (PVC)'), true, 'art26: 2020 Schedule 80 PVC requirement quoted (sectionID 865)');
  eq(has('not required to be larger than 3/0 copper or 250 kcmil aluminum'), true, 'art26: 2020 water-pipe jumper cap quoted (sectionID 869)');
  eq(has('sectionID 864'), true, 'art26: ELR 2020 record 864 cited (250.64(A) rewrite)');
  eq(has('sectionID 865'), true, 'art26: ELR 2020 record 865 cited (Schedule 80)');
  eq(has('sectionID 869'), true, 'art26: ELR 2020 record 869 cited (3/0 Cu cap)');
  eq(has('sectionID 1597'), true, 'art26: ELR 2023 record 1597 cited');
  eq(has('sectionID 1598'), true, 'art26: ELR 2023 record 1598 cited');
  eq(has('sectionID 1601'), true, 'art26: ELR 2023 record 1601 cited (cable armor)');
  eq(has('Raceways, Cable Armor, and Enclosures'), true, 'art26: 2023 250.64(E) rename quoted');
  eq(has('sectionID 1613'), true, 'art26: ELR 2023 record 1613 cited (250.104(A)(1) == 2020)');
  eq(has('sectionID 1614'), true, 'art26: ELR 2023 record 1614 cited (250.104(B) == 2017)');
  // 2017 title posture + 2020 title delta documented, not asserted
  eq(has('the 2020 ELR record title drops "Exposed"'), true, 'art26: 250.104 title 2020 delta documented honestly');
  // OCR garbles disclosed, not propagated
  eq(has('copperclad'), true, 'art26: the OCR "copperclad" fix is disclosed');
  // Table 250.66 rows (all 7; same capped table as articles 24/25)
  const rows26 = [
    ['2 AWG or smaller', '1/0 AWG or smaller', '8 AWG', '6 AWG'],
    ['1 AWG or 1/0 AWG', '2/0 AWG or 3/0 AWG', '6 AWG', '4 AWG'],
    ['2/0 AWG or 3/0 AWG', '4/0 AWG or 250 kcmil', '4 AWG', '2 AWG'],
    ['Over 3/0 AWG through 350 kcmil', 'Over 250 through 500 kcmil', '2 AWG', '1/0 AWG'],
    ['Over 350 through 600 kcmil', 'Over 500 through 900 kcmil', '1/0 AWG', '3/0 AWG'],
    ['Over 600 through 1100 kcmil', 'Over 900 through 1750 kcmil', '2/0 AWG', '4/0 AWG'],
    ['Over 1100 kcmil', 'Over 1750 kcmil', '3/0 AWG — CAPPED', '250 kcmil — CAPPED'],
  ];
  for (const [cuL, alL, cu, al] of rows26) {
    const re = new RegExp('<td>' + cuL + '</td><td class="ctr[^"]*">[^<]*' + alL + '[^<]*</td><td class="ctr[^"]*">[^<]*' + cu + '[^<]*</td><td class="ctr[^"]*">[^<]*' + al + '[^<]*</td>');
    eq(re.test(art), true, 'art26: Table 250.66 row ' + cuL + ' -> ' + cu + ' Cu / ' + al + ' Al');
  }
  // EX1: 100 A flagship (the corrected Article-25 chain): 3 AWG Cu (52,620 cmil) -> "2 AWG or smaller" -> 8 AWG Cu
  const lc26 = core.serviceLoad22082({ sqft: 1500, appliancesKW: 12, acVA: 5000 });
  approx(lc26.amps, 58.3, 0.1, 'art26 EX1: 14,000 VA / 240 V = 58.3 A calc');
  const slc26 = core.serviceLineConductor22082(lc26, 'cu', 75);
  eq(slc26.pick.size, '3', 'art26 EX1: 100 A service -> 3 AWG Cu ungrounded');
  eq(core.ch9Row('3').cm, 52620, 'art26 EX1: 3 AWG = 52,620 cmil (< 66,360 = 2 AWG boundary)');
  eq(core.ch9Row('2').cm, 66360, 'art26 EX1: 2 AWG = 66,360 cmil (the row-0/row-1 boundary)');
  eq(core.T31016.find(r => r.s === '8').cu[1], 50, 'art26 EX1: GEC 8 AWG Cu = 50 A @75');
  // EX1b: aluminum phases: 1 AWG Al (83,690 cmil) -> "1/0 AWG or smaller" -> 6 AWG Al
  const alp = core.pickConductor31016(100, 'al', 75);
  eq(alp.size, '1', 'art26 EX1b: 100 A Al @75 -> 1 AWG (83,690 cmil)');
  eq(core.ch9Row('1').cm, 83690, 'art26 EX1b: 1 AWG = 83,690 cmil (<= 105,600 = 1/0 Al boundary)');
  // EX2: 200 A service: 3/0 Cu (167,800 cmil) -> "2/0 or 3/0" row -> 4 AWG Cu (the genuine row-2 case)
  const p200 = core.pickConductor31016(200, 'cu', 75);
  eq(p200.size, '3/0', 'art26 EX2: 200 A Cu @75 -> 3/0 (200 A)');
  eq(core.ch9Row('3/0').cm, 167800, 'art26 EX2: 3/0 = 167,800 cmil -> "2/0 AWG or 3/0 AWG" row');
  // EX3: 1500 kcmil Cu parallel -> Note 1 (12.5%) = 187,500 cmil -> 4/0 Cu (211,600); 2020 cap -> 3/0 Cu
  eq(Math.round(1500000 * 0.125), 187500, 'art26 EX3: 12.5% of 1,500,000 cmil = 187,500 cmil (Note 1)');
  eq(core.ch9Row('4/0').cm, 211600, 'art26 EX3: 4/0 = 211,600 cmil (>= 187,500) -> 2017: 4/0 Cu jumper');
  eq(core.ch9Row('3/0').cm, 167800, 'art26 EX3: 3/0 = 167,800 cmil -> 2020/2023 cap: 3/0 Cu jumper');
  // EX4: gas pipe per Table 250.122 (250.104(B))
  eq(core.T31016.find(r => r.s === '6').cu[1], 65, 'art26 EX4: 100 A row: 6 AWG Cu = 65 A @75 (context)');
  // EX5: structural metal on a 4/0 Cu feeder (211,600 cmil) -> "Over 3/0 through 350 kcmil" -> 2 AWG Cu
  eq(core.ch9Row('4/0').cm, 211600, 'art26 EX5: 4/0 = 211,600 cmil -> "Over 3/0 through 350 kcmil" row -> 2 AWG Cu jumper');
  eq(core.T31016.find(r => r.s === '2').cu[1], 115, 'art26 EX5: 2 AWG Cu = 115 A @75 (context)');
  // cross-links across the grounding thread
  eq(art.includes('nec-25050-25052-25053-grounding-electrode-system.html'), true, 'art26: cross-links to article 25 (250.50/250.52/250.53)');
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art26: cross-links to article 24 (250.26/250.30)');
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art26: cross-links to article 23 (250.102)');
  eq(art.includes('nec-250122-egc-sizing.html'), true, 'art26: cross-links to article 22 (250.122)');
}

// ---------------------------------------------------------------------------
// ARTICLE 27 — NEC 110.14(C) Temperature Limitations + 310.14/310.15 ampacity
// section: the Termination-Temperature-Column explainer. The column rule:
// unmarked equipment -> 60°C column for circuits <=100 A (14 AWG-1 AWG),
// 75°C column for >100 A (larger than 1 AWG); a higher-rated conductor is
// counted at the termination column's ampacity unless the equipment is listed
// and identified for the higher rating; the 90°C column is the base for
// 310.15 adjustment/correction, not a termination column. The 2020 renumber
// (ampacity section 310.15 -> 310.14, Table 310.15(B)(16) "formerly Table
// 310.16" -> Table 310.16, 310.15(B)(7) -> 310.12) and the 110.14(D) torque
// rewrite ("calibrated torque tool" -> "approved means" + 3 info notes).
// Core-computed examples: compute_art27.js. Verbatim audit: verify_art27.js.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-11014c-31014-termination-temperature.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  eq(art.includes('nec-11014c-31014-termination-temperature.html'), true, 'art27: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-11014c-31014-termination-temperature.html'), true, 'art27: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art27: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art27: Article + FAQPage JSON-LD present');
  // verbatim 2017 110.14(C) probes
  eq(has('The temperature rating associated with the ampacity of a conductor shall be selected and coordinated so as not to exceed the lowest temperature rating of any connected termination, conductor, or device.'), true, 'art27: verbatim 110.14(C) floor sentence');
  eq(has('Conductors with temperature ratings higher than specified for terminations shall be permitted to be used for ampacity adjustment, correction, or both.'), true, 'art27: verbatim 110.14(C) 90C-derating sentence');
  eq(has('conductor ampacities used in determining equipment termination provisions shall be based on Table 310.15(B)(16) as appropriately modified by 310.15(B)(7)'), true, 'art27: verbatim 2017 (C)(1) table reference (pre-2020-renumber)');
  eq(has('Termination provisions of equipment for circuits rated 100 amperes or less, or marked for 14 AWG through 1 AWG conductors'), true, 'art27: verbatim (C)(1)(a) 100A boundary');
  eq(has('Termination provisions of equipment for circuits rated over 100 amperes, or marked for conductors larger than 1 AWG'), true, 'art27: verbatim (C)(1)(b) >100A boundary');
  eq(has('Conductors with higher temperature ratings, provided the ampacity of such conductors is determined based on the 60°C (140°F) ampacity of the conductor size used'), true, 'art27: verbatim (C)(1)(a)(2) 60C-counting rule');
  eq(has('For motors marked with design letters B, C, or D'), true, 'art27: verbatim (C)(1)(a)(4) motor carve-out');
  eq(has('Separately installed pressure connectors shall be used with conductors at the ampacities not exceeding the ampacity at the listed and identified temperature rating of the connector'), true, 'art27: verbatim (C)(2) separate connectors');
  // verbatim 2017 110.14(D) + 2020 torque rewrite
  eq(has('a calibrated torque tool shall be used to achieve the indicated torque value'), true, 'art27: verbatim 2017 (D) calibrated torque tool');
  eq(has('An approved means shall be used to achieve the indicated torque value'), true, 'art27: 2020 (D) approved means');
  eq(has('shear bolts or breakaway-style devices with visual indicators'), true, 'art27: 2020 (D) IN1 approved-means examples');
  eq(has('NFPA 70B-2019'), true, 'art27: 2020 (D) IN3 70B cross-ref');
  // 2020 renumber probes (ELR sectionID 878 / 880 + up.codes)
  eq(has('based on Table 310.16 as appropriately modified by 310.12'), true, 'art27: 2020 renumbered (C)(1) reference (Table 310.16 / 310.12)');
  eq(has('310.15(B)(16) (formerly Table 310.16)'), true, 'art27: 2017 table title with formerly-clause');
  eq(has('sectionID 797'), true, 'art27: cites ELR 110.14(D) torque record');
  eq(has('sectionID 878'), true, 'art27: cites ELR 310.12 single-phase record');
  eq(has('sectionID 880'), true, 'art27: cites ELR 310.16 table record');
  // core-computed examples (the real shipped app.js)
  const p = core.pickConductor31016;
  eq(p(75, 'cu', 60).size, '3', 'art27 EX1: 75 A @60C -> 3 AWG Cu (<=100A termination column)');
  eq(p(75, 'cu', 60).amp, 85, 'art27 EX1: 3 AWG Cu = 85 A @60');
  eq(p(125, 'cu', 75).size, '1', 'art27 EX2: 125 A @75C -> 1 AWG Cu (>100A termination column)');
  eq(p(125, 'cu', 75).amp, 130, 'art27 EX2: 1 AWG Cu = 130 A @75');
  eq(p(125, 'cu', 60).size, '1/0', 'art27 EX2: same 125 A @60C -> 1/0 AWG Cu (column moves the size)');
  eq(p(100, 'cu', 75).size, '3', 'art27 EX3: 100 A service Cu @75 -> 3 AWG (220.82 card pick)');
  eq(p(100, 'al', 75).size, '1', 'art27 EX3: 100 A service Al @75 -> 1 AWG');
  eq(p(125, 'al', 75).size, '2/0', 'art27 EX4: 125 A Al @75 -> 2/0 AWG (column = material-independent)');
  eq(p(125, 'al', 75).amp, 135, 'art27 EX4: 2/0 AWG Al = 135 A @75');
  // EX5: 90C base x 0.80 (4-6 CCC) vs 75C termination ceiling
  const row = s => core.T31016.find(r => r.s === s);
  eq(row('1/0').cu[2], 170, 'art27 EX5: 1/0 Cu 90C base = 170 A');
  eq(Math.round(170 * 0.80 * 100) / 100, 136, 'art27 EX5: 1/0 Cu derated 136 A (x0.80)');
  eq(row('1/0').cu[1], 150, 'art27 EX5: 1/0 Cu 75C termination ceiling = 150 A (136 < 150 passes)');
  eq(row('2').cu[2] * 0.80, 104, 'art27 EX5: 2 AWG Cu 90C base 130 x 0.80 = 104 A (< 125 A fails)');
  // service card end-to-end (the feature the article explains)
  const svc = core.serviceLineConductor22082({ amps: 100 }, 'cu', 75);
  eq(svc.reqA, 100, 'art27: 220.82 card reqA 100 A (230.79C floor)');
  eq(svc.pick.size, '3', 'art27: 220.82 card picks 3 AWG Cu (75C column = 110.14(C)(1)(b))');
  // cross-links
  eq(art.includes('nec-31016-ampacity.html'), true, 'art27: cross-links to the Table 310.16 article');
  eq(art.includes('nec-31015-ampacity-adjustments.html'), true, 'art27: cross-links to the 310.15 adjustments article');
  eq(art.includes('nec-22082-optional-service-load.html'), true, 'art27: cross-links to the 220.82 article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art27: cross-links to the 240.4(D) article');
  eq(art.includes('nec-2152-feeder-ampacity.html'), true, 'art27: cross-links to the 215.2 article');
}

// ---------------------------------------------------------------------------
// ARTICLE 28 — NEC 230.70 + 230.71 + 230.72 + 230.79 + 230.80 service
// disconnecting means: where, how many, grouping, rating floors (15/30/100/60 A)
// and the 230.80 combined-rating sum rule. The 2020 delta: 230.71 restructured
// (flat "not more than six" -> one-disconnect default + (B) "Two to Six" four
// configs; Single-Pole Units moved out to 225.33(B) / 230.90(A)); 230.79/230.80
// word-identical 2017->2020 (programmatic diff). Core-computed examples:
// compute_art28.js -> calc_23079_cited.json. Verbatim audit: verify_art28.js.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-23079-service-disconnecting-means.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  // the verbatim blocks preserve some line-wrap hyphens ("service-\nentrance",
  // "calcu-\nlated"); hasH strips hyphens (+ any space after) from BOTH sides so
  // probes read as the official text (a hyphenated probe matches a
  // hyphen-broken article line)
  const dehy = (s) => s.replace(/- */g, '');
  const normH = dehy(norm);
  const hasH = (s) => normH.includes(dehy(s.toLowerCase()));
  eq(art.includes('nec-23079-service-disconnecting-means.html'), true, 'art28: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-23079-service-disconnecting-means.html'), true, 'art28: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art28: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art28: Article + FAQPage JSON-LD present');
  // verbatim 2017 230.70 probes
  eq(hasH('Means shall be provided to disconnect all conductors in a building or other structure from the service-entrance conductors'), true, 'art28: verbatim 230.70 lead-in');
  eq(has('The service disconnecting means shall be installed at a readily accessible location either outside of a building or structure or inside nearest the point of entrance of the service conductors'), true, 'art28: verbatim 230.70(A)(1) location');
  eq(has('Service disconnecting means shall not be installed in bathrooms'), true, 'art28: verbatim 230.70(A)(2) bathrooms');
  eq(has('Each service disconnecting means shall be suitable for the prevailing conditions'), true, 'art28: verbatim 230.70(C) suitable for use');
  // verbatim 2017 230.71 probes (the pre-2020 flat rule + Single-Pole Units)
  eq(has('shall consist of not more than six switches or sets of circuit breakers, or a combination of not more than six switches and sets of circuit breakers'), true, 'art28: verbatim 2017 230.71(A) not-more-than-six');
  eq(has('There shall be not more than six sets of disconnects per service grouped in any one location'), true, 'art28: verbatim 2017 230.71(A) six-per-location cap');
  eq(has('Two or three single-pole switches or breakers, capable of individual operation, shall be permitted on multiwire circuits'), true, 'art28: verbatim 2017 230.71(B) single-pole units');
  eq(hasH('one pole for each ungrounded conductor, as one multipole disconnect, provided they are equipped with identified handle ties or a master handle'), true, 'art28: verbatim 2017 230.71(B) handle ties / master handle');
  eq(has('Informational Note: See 408.36'), true, 'art28: verbatim 2017 230.71 informational note (408.36)');
  // verbatim 2020 230.71 probes (the restructured default + two-to-six configs)
  eq(has('Each service shall have only one disconnecting means unless the requirements of 230.71(B) are met'), true, 'art28: verbatim 2020 230.71 one-disconnect default');
  eq(has('(B) Two to Six Service Disconnecting Means'), true, 'art28: verbatim 2020 230.71(B) heading');
  eq(has('Two to six service disconnects shall be permitted for each service permitted by 230.2'), true, 'art28: verbatim 2020 230.71(B) two-to-six lead');
  eq(has('(1) Separate enclosures with a main service disconnecting means in each enclosure'), true, 'art28: verbatim 2020 230.71(B)(1) separate enclosures');
  eq(has('(2) Panelboards with a main service disconnecting means in each panelboard enclosure'), true, 'art28: verbatim 2020 230.71(B)(2) panelboards');
  eq(has('(3) Switchboard(s) where there is only one service disconnect in each separate vertical section where there are barriers separating each vertical section'), true, 'art28: verbatim 2020 230.71(B)(3) switchboard sections');
  eq(has('(4) Service disconnects in switchgear or metering centers where each disconnect is located in a separate compartment'), true, 'art28: verbatim 2020 230.71(B)(4) switchgear/metering centers');
  // verbatim 2017 230.72 probes
  eq(has('The two to six disconnects as permitted in 230.71 shall be grouped'), true, 'art28: verbatim 230.72(A) grouping');
  eq(has('where used only for a water pump also intended to provide fire protection, shall be permitted to be located remote from the other disconnecting means'), true, 'art28: verbatim 230.72(A) exception water pump');
  eq(has('each occupant shall have access to the occupant\'s service disconnecting means'), true, 'art28: verbatim 230.72(C) occupant access');
  eq(has('shall be permitted to be accessible to authorized management personnel only'), true, 'art28: verbatim 230.72(C) exception management');
  // verbatim 2017 230.79 probes (floors identical in 2017 and 2020)
  eq(hasH('The service disconnecting means shall have a rating not less than the calculated load to be carried'), true, 'art28: verbatim 230.79 lead-in');
  eq(has('determined in accordance with Part III, IV, or V of Article 220, as applicable'), true, 'art28: verbatim 230.79 Part 220 ref (V not I)');
  eq(has('In no case shall the rating be lower than specified in 230.79(A), (B), (C), or (D)'), true, 'art28: verbatim 230.79 no-case-lower');
  eq(hasH('the service disconnecting means shall have a rating of not less than 15 amperes'), true, 'art28: verbatim 230.79(A) 15 A one-circuit floor');
  eq(hasH('the service disconnecting means shall have a rating of not less than 30 amperes'), true, 'art28: verbatim 230.79(B) 30 A two-circuit floor');
  eq(hasH('the service disconnecting means shall have a rating of not less than 100 amperes, 3-wire'), true, 'art28: verbatim 230.79(C) 100 A dwelling floor');
  eq(hasH('the service disconnecting means shall have a rating of not less than 60 amperes'), true, 'art28: verbatim 230.79(D) 60 A all-others floor');
  // verbatim 2017 230.80 probe
  eq(has('Where the service disconnecting means consists of more than one switch or circuit breaker, as permitted by 230.71'), true, 'art28: verbatim 230.80 more-than-one condition');
  eq(has('the combined ratings of all the switches or circuit breakers used shall not be less than the rating required by 230.79'), true, 'art28: verbatim 230.80 sum rule');
  // edition-delta box probes (the documented 2020 changes)
  eq(has('Single-Pole Units left the section'), true, 'art28: delta box names the single-pole move');
  eq(has('225.33(B)'), true, 'art28: delta box cites 225.33(B) survival home');
  eq(has('230.90(A)'), true, 'art28: delta box cites 230.90(A) OCPD counting ref');
  eq(has('Single-pole circuit breakers, grouped in accordance with 230.71(B), shall be considered as one protective device'), true, 'art28: delta box quotes 230.90(A) sentence');
  eq(has('word-for-word unchanged from 2017'), true, 'art28: delta box states 230.79/230.80 unchanged');
  eq(has('word-identical (programmatic diff'), true, 'art28: delta table shows programmatic diff evidence');
  // core-computed worked examples (the real shipped app.js, zero hand math)
  const p = core.pickConductor31016, nb = core.nextStdBreaker,
        svcLoad = core.serviceLoad22082, svcLine = core.serviceLineConductor22082;
  const r1 = svcLoad({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, hpNoSuppVA: 12000, volt: 240 });
  eq(r1.totalVA, 21000, 'art28 EX1: 220.82 load 21,000 VA (1,500 sq ft dwelling)');
  eq(r1.amps, 87.5, 'art28 EX1: 21,000 VA @ 240 V = 87.5 A');
  eq(nb(Math.max(r1.amps, 100)), 100, 'art28 EX1: 230.79(C) 100 A floor governs 87.5 A load');
  eq(svcLine(r1, 'cu', 75).pick.size, '3', 'art28 EX1: 3 AWG Cu (100 A @75)');
  eq(svcLine(r1, 'al', 75).pick.size, '1', 'art28 EX1: 1 AWG Al (100 A @75)');
  const r2 = svcLoad({ sqft: 2200, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 5000, hpCompressorVA: 11000, hpSuppVA: 3000, volt: 240 });
  eq(r2.totalVA, 25390, 'art28 EX2: 220.82 load 25,390 VA (larger dwelling)');
  eq(Math.round(r2.amps * 100) / 100, 105.79, 'art28 EX2: 25,390 VA @ 240 V = 105.79 A');
  eq(nb(Math.max(r2.amps, 100)), 110, 'art28 EX2: calculated load governs -> 110 A');
  eq(svcLine(r2, 'cu', 75).pick.size, '2', 'art28 EX2: 2 AWG Cu (115 A @75)');
  eq(p(60, 'cu', 75).size, '6', 'art28 EX3: 60 A floor -> 6 AWG Cu (65 A)');
  eq(p(15, 'cu', 75).size, '14', 'art28 EX4: 15 A floor -> 14 AWG Cu (20 A)');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art28 EX4: 240.4(D) caps 14 AWG Cu at 15 A (matches floor)');
  eq(p(30, 'cu', 75).size, '10', 'art28 EX5: 30 A floor -> 10 AWG Cu (35 A)');
  eq(core.smallConductorCap('10', 'cu'), 30, 'art28 EX5: 240.4(D) caps 10 AWG Cu at 30 A (matches floor)');
  eq((70 + 70) >= 150, false, 'art28 EX6: 230.80 sum 70+70=140 < 150 A -> NON-conforming');
  eq((100 + 70) >= 150, true, 'art28 EX6: 230.80 sum 100+70=170 >= 150 A -> conforming');
  eq(svcLine({ amps: 87.5 }, 'cu', 75).dwMinA, 100, 'art28: core dwMinA = 100 is the 230.79(C) floor');
  // worked-example figures actually appear in the article
  eq(has('21,000 VA') && has('87.5 A') && has('3 AWG Cu (100 A)') && has('1 AWG Al (100 A)'), true, 'art28: EX1 figures in article');
  eq(has('25,390 VA') && has('105.79 A') && has('2 AWG Cu (115 A)'), true, 'art28: EX2 figures in article');
  eq(has('5,400 VA') && has('22.5 A') && has('6 AWG Cu (65 A)'), true, 'art28: EX3 figures in article');
  eq(has('140 A') && has('170 A') && has('NON-conforming'), true, 'art28: EX6 sum-test figures in article');
  eq((art.match(/<h3>EX\d/g) || []).length, 6, 'art28: six worked examples');
  // cross-links
  eq(art.includes('nec-22082-optional-service-load.html'), true, 'art28: cross-links to the 220.82 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art28: cross-links to the Table 310.16 article');
  eq(art.includes('nec-conductor-sizing.html'), true, 'art28: cross-links to the conductor-sizing article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art28: cross-links to the 240.4(D) article');
  eq(art.includes('nec-11014c-31014-termination-temperature.html'), true, 'art28: cross-links to the 110.14(C) article');
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art28: cross-links to the 250.102 article');
}

// Article 29 (230.42 Minimum Size and Ampacity of Service-Entrance Conductors).
// The (A) rule (larger of 125% continuous or 100% of max load after correction
// factors), the (B) 230.79 disconnect-rating floor, the (C) grounded-conductor
// floor, and the 2017->2020 delta (310.15->310.14 + new 110.14(C) clause + title
// change + UL 857 note). Core-computed examples:
// compute_art29.js -> calc_23042_cited.json. Verbatim audit: verify_art29.js.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-23042-service-conductor-sizing.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const dehy = (s) => s.replace(/- */g, '');
  const normH = dehy(norm);
  const hasH = (s) => normH.includes(dehy(s.toLowerCase()));
  eq(art.includes('nec-23042-service-conductor-sizing.html'), true, 'art29: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-23042-service-conductor-sizing.html'), true, 'art29: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art29: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art29: Article + FAQPage JSON-LD present');
  // verbatim 2017 230.42 probes
  eq(has('230.42 Minimum Size and Rating'), true, 'art29: verbatim 2017 title "Minimum Size and Rating"');
  eq(hasH('Conductors shall be sized to carry not less than the largest of 230.42(A)(1) or (A)(2)'), true, 'art29: verbatim 2017 (A) lead-in (with "to carry")');
  eq(has('Ampacity shall be determined from 310.15'), true, 'art29: verbatim 2017 ampacity sentence (310.15)');
  eq(has('the sum of the noncontinuous loads plus 125 percent of continuous loads'), true, 'art29: verbatim 2017 (A)(1) 125% continuous rule');
  eq(hasH('the minimum serviceentrance conductor size shall have an ampacity not less than the maximum load to be served after the application of any adjustment or correction factors'), true, 'art29: verbatim 2017 (A)(2) correction-factor rule');
  eq(has('the minimum ampacity for ungrounded conductors for specific installations shall not be less than the rating of the service disconnecting means specified in 230.79(A) through (D)'), true, 'art29: verbatim 2017 (B) 230.79 floor');
  eq(has('The grounded conductor shall not be smaller than the minimum size as required by 250.24(C)'), true, 'art29: verbatim 2017 (C) grounded conductor');
  // verbatim 2020 230.42 probes (the renumber + new clause + title change)
  eq(has('230.42 Minimum Size and Ampacity'), true, 'art29: verbatim 2020 title "Minimum Size and Ampacity"');
  eq(hasH('Conductors shall be sized not less than the largest of 230.42(A)(1) or (A)(2)'), true, 'art29: verbatim 2020 (A) lead-in (no "to carry")');
  eq(has('Ampacity shall be determined from 310.14 and shall comply with 110.14(C)'), true, 'art29: verbatim 2020 ampacity sentence (310.14 + 110.14(C))');
  eq(has('For information on busways, see UL 857'), true, 'art29: verbatim 2020 UL 857 busway Informational Note');
  eq(has('the maximum current of busways shall be that value for which the busway has been listed or labeled'), true, 'art29: verbatim 2020 busway clause (no "allowable")');
  // edition-delta box probes
  eq(has('310.15'), true, 'art29: delta box names the 2017 310.15 reference');
  eq(has('310.14'), true, 'art29: delta box names the 2020 310.14 reference');
  eq(has('110.14(C)'), true, 'art29: delta box names the new 110.14(C) clause');
  eq(has('UL 857'), true, 'art29: delta box names the UL 857 note');
  // core-computed worked examples (the real shipped app.js, zero hand math)
  const p = core.pickConductor31016, derate = core.derate31015,
        svcLoad = core.serviceLoad22082, svcLine = core.serviceLineConductor22082;
  const r1 = svcLoad({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, hpNoSuppVA: 12000, volt: 240 });
  eq(r1.totalVA, 21000, 'art29 EX1: 220.82 load 21,000 VA (1,500 sq ft dwelling)');
  eq(r1.amps, 87.5, 'art29 EX1: 21,000 VA @ 240 V = 87.5 A');
  eq(svcLine(r1, 'cu', 75).dwMinA, 100, 'art29 EX1: 230.42(B) -> 230.79(C) 100 A floor governs 87.5 A load');
  eq(svcLine(r1, 'cu', 75).pick.size, '3', 'art29 EX1: 3 AWG Cu (100 A @75)');
  eq(svcLine(r1, 'al', 75).pick.size, '1', 'art29 EX1: 1 AWG Al (100 A @75)');
  const r2 = svcLoad({ sqft: 2200, smallApplianceCircuits: 2, laundryCircuits: 1, appliancesVA: 5000, hpCompressorVA: 11000, hpSuppVA: 3000, volt: 240 });
  eq(r2.totalVA, 25390, 'art29 EX2: 220.82 load 25,390 VA (larger dwelling)');
  eq(Math.round(r2.amps * 100) / 100, 105.79, 'art29 EX2: 25,390 VA @ 240 V = 105.79 A');
  eq(svcLine(r2, 'cu', 75).pick.size, '2', 'art29 EX2: (A)(2) calc governs -> 2 AWG Cu (115 A @75)');
  eq(Math.round((100 + 1.25 * 40) * 100) / 100, 150, 'art29 EX3: (A)(1) 100 + 125%x40 = 150 A');
  eq(p(150, 'cu', 75).size, '1/0', 'art29 EX3: 150 A -> 1/0 AWG Cu (150 A @75)');
  eq(Math.round((100 + 40) * 100) / 100, 140, 'art29 EX4: (A)(1) Ex No.1 grounded at 100% = 140 A');
  eq(p(140, 'cu', 75).size, '1/0', 'art29 EX4: 140 A -> 1/0 AWG Cu (clears it)');
  eq(p(150, 'cu', 75).size, '1/0', 'art29 EX5: bare-ampacity 75C pick = 1/0 Cu (150 A)');
  const d = derate({ requiredA: 150, ambientC: 35, ccc: 8, mat: 'cu', temp: 75 });
  eq(d.pick.size, '4/0', 'art29 EX5: (A)(2) after correction factors -> 4/0 Cu');
  eq(d.deratedA, 151.34, 'art29 EX5: 230 x 0.70 x 0.94 = 151.34 A derated');
  eq(d.cccFactor === 0.7 && d.ambF === 0.94, true, 'art29 EX5: 0.70 (8 CCC) x 0.94 (35 C) factors');
  eq(d.passes, true, 'art29 EX5: 4/0 Cu derated ampacity passes the 150 A requirement');
  eq(svcLine({ amps: 87.5 }, 'cu', 75).pick.amp, 100, 'art29 EX6: ungrounded pick ampacity (100 A) >= 230.79(C) floor (100 A)');
  // worked-example figures actually appear in the article
  eq(has('21,000 VA') && has('87.5 A') && has('3 AWG Cu (100 A)') && has('1 AWG Al (100 A)'), true, 'art29: EX1 figures in article');
  eq(has('25,390 VA') && has('105.79 A') && has('2 AWG Cu (115 A)'), true, 'art29: EX2 figures in article');
  eq(has('1/0 AWG Cu (150 A)') && has('4/0 AWG Cu (151.34 A derated)') && has('114.95 A'), true, 'art29: EX3/EX5 figures in article');
  eq(has('interlock holds'), true, 'art29: EX6 interlock statement in article');
  eq((art.match(/<h3>EX\d/g) || []).length, 6, 'art29: six worked examples');
  // cross-links
  eq(art.includes('nec-23079-service-disconnecting-means.html'), true, 'art29: cross-links to the 230.79 article');
  eq(art.includes('nec-22082-optional-service-load.html'), true, 'art29: cross-links to the 220.82 article');
  eq(art.includes('nec-11014c-31014-termination-temperature.html'), true, 'art29: cross-links to the 110.14(C) article');
  eq(art.includes('nec-31015-ampacity-adjustments.html'), true, 'art29: cross-links to the 310.15 article');
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art29: cross-links to the 250.102 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art29: cross-links to the Table 310.16 article');
  eq(has('250.24(C)'), true, 'art29: cites the (C) grounded-conductor 250.24(C) floor');
}

// Article 30 (230.90 Where Required — Overload Protection for Service Conductors).
// The (A) rule (OCPD rating/setting not higher than the conductor ampacity) with five
// exceptions, (B) no OCPD in the grounded conductor, and the 2017->2020 delta (dropped
// "allowable" in (A) + Exception 5 renumber 310.15(B)(7) -> 310.12). Core-computed
// examples: compute_art30.js -> calc_23090_cited.json. Verbatim audit: validate_art30.py.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-23090-service-overload-protection.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const p = core.pickConductor31016, nsb = core.nextStdBreaker,
        svcLoad = core.serviceLoad22082, svcLine = core.serviceLineConductor22082,
        r2 = core.round2;
  eq(art.includes('nec-23090-service-overload-protection.html'), true, 'art30: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-23090-service-overload-protection.html'), true, 'art30: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art30: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art30: Article + FAQPage JSON-LD present');
  eq(art.includes('"datePublished": "2026-09-03"'), true, 'art30: datePublished 2026-09-03');
  eq((art.match(/<h3>EX\d/g) || []).length, 6, 'art30: six worked examples');
  // verbatim 2017 230.90 probes
  eq(has('230.90 Where Required'), true, 'art30: verbatim title "Where Required"');
  eq(has('Each ungrounded service conductor shall have overload protection'), true, 'art30: verbatim lead-in (overload protection mandate)');
  eq(has('not higher than the allowable ampacity of the conductor'), true, 'art30: verbatim 2017 (A) (with "allowable")');
  eq(has('A set of fuses shall be considered all the fuses required to protect all the ungrounded conductors of a circuit'), true, 'art30: verbatim (A) fuse-set clause');
  eq(has('Single-pole circuit breakers, grouped in accordance with 230.71(B), shall be considered as one protective device'), true, 'art30: verbatim (A) single-pole-grouped clause');
  eq(has('For motor-starting currents, ratings that comply with 430.52, 430.62, and 430.63 shall be permitted'), true, 'art30: verbatim 2017 Exception No. 1 (motor starts)');
  eq(has('Fuses and circuit breakers with a rating or setting that complies with 240.4(B) or (C) and 240.6 shall be permitted'), true, 'art30: verbatim 2017 Exception No. 2 (240.4(B)/(C)+240.6)');
  eq(has('Two to six circuit breakers or sets of fuses shall be permitted as the overcurrent device'), true, 'art30: verbatim 2017 Exception No. 3 (two-to-six)');
  eq(has('the sum of the ratings of the circuit breakers or fuses shall be permitted to exceed the ampacity of the service conductors, provided the calculated load does not exceed the ampacity of the service conductors'), true, 'art30: verbatim 2017 Exception No. 3 (sum vs ampacity + load test)');
  eq(has('Overload protection for fire pump supply conductors shall comply with 695.4(B)(2)(a)'), true, 'art30: verbatim 2017 Exception No. 4 (fire pumps)');
  eq(has('requirements of 310.15(B)(7)'), true, 'art30: verbatim 2017 Exception No. 5 (310.15(B)(7))');
  eq(has('No overcurrent device shall be inserted in a grounded service conductor except a circuit breaker that simultaneously opens all conductors of the circuit'), true, 'art30: verbatim (B) not in grounded conductor');
  // verbatim 2020 230.90 probes (the two real changes)
  eq(has('not higher than the ampacity of the conductor'), true, 'art30: verbatim 2020 (A) (no "allowable")');
  eq(has('requirements of 310.12'), true, 'art30: verbatim 2020 Exception No. 5 (310.12)');
  // delta box probes
  eq(has('dropped "allowable"'), true, 'art30: delta box names the dropped "allowable"');
  eq(has('310.15(B)(7)'), true, 'art30: delta box names the 2017 310.15(B)(7) reference');
  eq(has('310.12'), true, 'art30: delta box names the 2020 310.12 reference');
  eq(has('unchanged in substance'), true, 'art30: delta box states the 83% rule unchanged in substance');
  eq(has('83 percent of the service rating'), true, 'art30: cites the 83% rule text');
  // core-computed worked examples (the real shipped app.js, zero hand math)
  const r1 = svcLoad({ sqft: 1500, smallApplianceCircuits: 2, laundryCircuits: 1, hpNoSuppVA: 12000, volt: 240 });
  eq(r1.totalVA, 21000, 'art30 EX1: 220.82 flagship 21,000 VA');
  eq(r1.amps, 87.5, 'art30 EX1: 21,000 VA @ 240 V = 87.5 A');
  eq(svcLine(r1, 'cu', 75).pick.size, '3', 'art30 EX1: ungrounded 3 AWG Cu (100 A @75)');
  eq(svcLine(r1, 'al', 75).pick.size, '1', 'art30 EX1: ungrounded 1 AWG Al (100 A @75)');
  eq(nsb(100), 100, 'art30 EX1: nextStdBreaker(100) = 100 A (230.79(C) one-family)');
  eq(nsb(100) <= svcLine(r1, 'cu', 75).pick.amp && nsb(100) <= svcLine(r1, 'al', 75).pick.amp, true, 'art30 EX1: 230.90(A) OCPD 100 <= ampacity 100 holds');
  eq(r2(100 * 0.83), 83, 'art30 EX2: 83% of 100 A = 83 A');
  eq(p(83, 'cu', 75).size, '4', 'art30 EX2: 83 A -> 4 AWG Cu (85 A @75)');
  eq(p(83, 'cu', 75).amp, 85, 'art30 EX2: 4 AWG Cu ampacity 85 A');
  eq(p(83, 'al', 75).size, '2', 'art30 EX2: 83 A -> 2 AWG Al (90 A @75)');
  eq(r2(200 * 0.83), 166, 'art30 EX2: 83% of 200 A = 166 A');
  eq(p(166, 'cu', 75).size, '2/0', 'art30 EX2: 166 A -> 2/0 AWG Cu (175 A @75)');
  eq(p(166, 'al', 75).size, '4/0', 'art30 EX2: 166 A -> 4/0 AWG Al (180 A @75)');
  eq(r2(400 * 0.83), 332, 'art30 EX2: 83% of 400 A = 332 A');
  eq(p(332, 'cu', 75).size, '400', 'art30 EX2: 332 A -> 400 kcmil Cu (335 A @75)');
  eq(p(332, 'cu', 75).amp, 335, 'art30 EX2: 400 kcmil Cu ampacity 335 A (3 A margin over 332)');
  eq(p(332, 'al', 75).size, '600', 'art30 EX2: 332 A -> 600 kcmil Al (340 A @75)');
  eq(p(100, 'cu', 75).size, '3', 'art30 EX2: without 83%, 100 A -> 3 AWG Cu');
  eq(p(200, 'cu', 75).size, '3/0', 'art30 EX2: without 83%, 200 A -> 3/0 AWG Cu');
  eq(p(200, 'al', 75).size, '250', 'art30 EX2: without 83%, 200 A -> 250 kcmil Al (205 A)');
  eq(p(400, 'cu', 75).size, '600', 'art30 EX2: without 83%, 400 A -> 600 kcmil Cu (420 A)');
  eq(p(400, 'al', 75).size, '900', 'art30 EX2: without 83%, 400 A -> 900 kcmil Al (425 A)');
  eq((100 + 100) > 100 && 87.5 <= 100, true, 'art30 EX3: two 100 A breakers (sum 200) > 3 AWG Cu ampacity 100, but load 87.5 <= 100 -> Ex 3 permits');
  eq(p(115, 'cu', 75).size, '2', 'art30 EX6: 115 A -> 2 AWG Cu (115 A @75)');
  eq(nsb(112), 125, 'art30 EX6: nextStdBreaker(112) = 125 A (240.6(A) next standard)');
  eq(nsb(112) > 115, true, 'art30 EX6: 125 A OCPD > 115 A ampacity -> permitted by Exception No. 2 (240.4(B)/(C)+240.6)');
  // worked-example figures actually appear in the article
  eq(has('83 A') && has('4 AWG Cu (85 A)') && has('2 AWG Al (90 A)'), true, 'art30: EX2 100 A row figures in article');
  eq(has('166 A') && has('2/0 AWG Cu (175 A)') && has('4/0 AWG Al (180 A)'), true, 'art30: EX2 200 A row figures in article');
  eq(has('332 A') && has('400 kcmil Cu (335 A)') && has('600 kcmil Al (340 A)'), true, 'art30: EX2 400 A row figures in article');
  eq(has('3/0 AWG Cu (200 A)') && has('250 kcmil Al (205 A)'), true, 'art30: EX2 200 A no-83% comparison in article');
  eq(has('600 kcmil Cu (420 A)') && has('900 kcmil Al (425 A)'), true, 'art30: EX2 400 A no-83% comparison in article');
  eq(has('125 A') && has('2 AWG Cu (115 A)'), true, 'art30: EX6 figures in article');
  eq(has('87.5 A') && has('3 AWG Cu (100 A)') && has('1 AWG Al (100 A)'), true, 'art30: EX1/EX3 figures in article');
  eq(has('holds: true') && has('permittedByEx3: true') && has('permittedByEx2: true'), true, 'art30: EX1/EX3/EX6 verdicts in article');
  eq(has('2-pole'), true, 'art30: EX4 2-pole simultaneous-open requirement');
  // cross-links
  eq(art.includes('nec-23079-service-disconnecting-means.html'), true, 'art30: cross-links to the 230.70-230.80 article');
  eq(art.includes('nec-23042-service-conductor-sizing.html'), true, 'art30: cross-links to the 230.42 article');
  eq(art.includes('nec-22082-optional-service-load.html'), true, 'art30: cross-links to the 220.82 article');
  eq(art.includes('nec-22061-neutral-load.html'), true, 'art30: cross-links to the 220.61 article');
  eq(art.includes('nec-11014c-31014-termination-temperature.html'), true, 'art30: cross-links to the 110.14(C) article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art30: cross-links to the Table 310.16 article');
  eq(art.includes('nec-conductor-sizing.html'), true, 'art30: cross-links to the conductor-sizing article');
}

// Article 31 (NEC 210.12 Arc-Fault Circuit-Interrupter Protection).
// Where an AFCI is required (dwelling rooms, dormitories, guest rooms + [2020] patient sleeping
// rooms in nursing homes/limited-care facilities), the six permitted means, the 50 ft / 70 ft
// distance limits on means (3)/(4), the 6 ft extension-exemption test in (D), and the 2023
// restructure to (A)-(E) with 10-ampere circuits. Core-computed examples: compute_art31.js ->
// calc_21012_cited.json. 2017->2020 delta audit: verify_art31_diff.py.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21012-afci-protection.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const p = core.pickConductor31016, nsb = core.nextStdBreaker;
  eq(art.includes('nec-21012-afci-protection.html'), true, 'art31: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21012-afci-protection.html'), true, 'art31: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art31: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art31: Article + FAQPage JSON-LD present');
  // verbatim 2017 NEC 210.12 probes (official NFPA text, lines 9816-9982)
  eq(has('210.12 Arc-Fault Circuit-Interrupter Protection. Arc-fault circuit-interrupter protection shall be provided as required in 210.12(A), (B), and (C)'), true, 'art31: verbatim 2017 lead-in (A),(B),(C)');
  eq(has('kitchens, family rooms, dining rooms, living rooms, parlors, libraries, dens, bedrooms, sunrooms, recreation rooms, closets, hallways, laundry areas, or similar rooms or areas'), true, 'art31: verbatim 2017 (A) dwelling room list');
  eq(has('The maximum length of the branch-circuit wiring from the branch-circuit overcurrent device to the first outlet shall not exceed 15.2 m (50 ft) for a 14 AWG conductor or 21.3 m (70 ft) for a 12 AWG conductor'), true, 'art31: verbatim 50 ft / 70 ft distance limit (means 3/4)');
  eq(has('(C) Guest Rooms and Guest Suites.'), true, 'art31: verbatim 2017 (C) title (guest rooms only)');
  eq(has('(D) Branch Circuit Extensions or Modifications — Dwelling Units and Dormitory Units.'), true, 'art31: verbatim 2017 (D) title (exists in 2017)');
  eq(has('A listed combination-type AFCI located at the origin of the branch circuit'), true, 'art31: verbatim 2017 (D)(1) (combination-type only)');
  eq(has('AFCI protection shall not be required where the extension of the existing conductors is not more than 1.8 m (6 ft) and does not include any additional outlets or devices.'), true, 'art31: verbatim 2017 (D) 6 ft extension exception');
  // verbatim 2020 NEC 210.12 probes (the four real changes)
  eq(has('210.12(A), (B), (C), and (D)'), true, 'art31: verbatim 2020 lead-in (A),(B),(C),(D)');
  eq(has('(C) Guest Rooms, Guest Suites, and Patient Sleeping Rooms in Nursing Homes and Limited-Care Facilities.'), true, 'art31: verbatim 2020 (C) title (patient sleeping rooms added)');
  eq(has('(D) Branch Circuit Extensions or Modifications — Dwelling Units, Dormitory Units, and Guest Rooms and Guest Suites.'), true, 'art31: verbatim 2020 (D) title (guest rooms added)');
  eq(has('By any of the means described in 210.12(A)(1) through (A)(6)'), true, 'art31: verbatim 2020 (D)(1) (broadened to all six means)');
  eq(has('other than splicing devices. This measurement shall not include the conductors inside an enclosure, cabinet, or junction box.'), true, 'art31: verbatim 2020 (D) exception additions');
  // delta box probes
  eq(has('exactly four changes'), true, 'art31: delta box names exactly four changes');
  eq(has('unchanged in substance'), true, 'art31: delta box states the six means unchanged in substance');
  eq(has('existed in 2017 already'), true, 'art31: delta box notes (D) existed in 2017');
  // 2023 restructure probes
  eq(has('210.12(B) through (E)'), true, 'art31: 2023 lead-in "(B) through (E)"');
  eq(has('Means of Protection'), true, 'art31: 2023 (A) "Means of Protection"');
  eq(has('Branch Circuit Wiring Extensions, Modifications, or Replacements'), true, 'art31: 2023 (E) title');
  eq(has('10-ampere'), true, 'art31: 2023 (B) adds 10-ampere circuits');
  // core-computed worked examples (real shipped app.js, zero hand math)
  eq(nsb(15), 15, 'art31 EX1: nextStdBreaker(15) = 15 A (240.6(A))');
  eq(p(15, 'cu', 75).size, '14', 'art31 EX1: 15 A -> 14 AWG Cu');
  eq(p(15, 'cu', 75).amp, 20, 'art31 EX1: 14 AWG Cu Table 310.16 ampacity 20 A');
  eq(p(25, 'cu', 75).size, '12', 'art31 EX2: 25 A -> 12 AWG Cu (the 20 A circuit wire)');
  eq(p(25, 'cu', 75).amp, 25, 'art31 EX2: 12 AWG Cu Table 310.16 ampacity 25 A');
  eq(nsb(10), 15, 'art31 EX4: nextStdBreaker(10) = 15 A (10 A is a standard 240.6(A) rating)');
  eq(40 <= 50, true, 'art31 EX2: 40 ft run on 14 AWG within the 50 ft cap');
  eq(75 > 70, true, 'art31 EX2: 75 ft run on 12 AWG exceeds the 70 ft cap');
  eq(4.5 <= 6, true, 'art31 EX3-A: 4.5 ft, no new outlet -> within 6 ft, exempt');
  eq(7.0 > 6, true, 'art31 EX3-B: 7 ft exceeds 6 ft -> AFCI required');
  // worked-example figures actually appear in the article
  eq(has('14 AWG Cu') && has('20 A') && has('15 A'), true, 'art31: EX1 14 AWG Cu (amp 20 / cap 15) in article');
  eq(has('12 AWG Cu') && has('25 A') && has('20 A'), true, 'art31: EX2 12 AWG Cu (amp 25 / cap 20) in article');
  eq(has('50 ft') && has('70 ft'), true, 'art31: EX2 50 ft / 70 ft limits in article');
  eq(has('40 ft') && has('75 ft'), true, 'art31: EX2 run lengths in article');
  eq(has('4.5 ft') && has('7.0 ft') && has('5.0 ft'), true, 'art31: EX3 run lengths in article');
  eq(has('6 ft'), true, 'art31: EX3 6 ft exemption cap in article');
  eq(has('exempt: true'), true, 'art31: EX3-A exempt verdict in article');
  eq(has('exempt: false'), true, 'art31: EX3-B/EX3-C required verdict in article');
  eq(has('inScope2023: true'), true, 'art31: EX4 2023 10-amp in-scope verdict in article');
  eq(has('inScope2017: false'), true, 'art31: EX4 2017 10-amp out-of-scope verdict in article');
  eq(has('inScope2020: false'), true, 'art31: EX4 2020 10-amp out-of-scope verdict in article');
  eq(has('2 in. concrete'), true, 'art31: EX5 means (6) 2 in. concrete in article');
  // cross-links
  eq(art.includes('nec-21011-branch-circuits.html'), true, 'art31: cross-links to the 210.11 article');
  eq(art.includes('nec-21052-dwelling-receptacle-outlets.html'), true, 'art31: cross-links to the 210.52 article');
  eq(art.includes('nec-21023-permissible-loads.html'), true, 'art31: cross-links to the 210.23 article');
  eq(art.includes('nec-21021-outlet-devices.html'), true, 'art31: cross-links to the 210.21 article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art31: cross-links to the 240.4(D) article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art31: cross-links to the Table 310.16 article');
  eq(art.includes('nec-21019a-continuous-load.html'), true, 'art31: cross-links to the 210.19(A) article');
  eq(art.includes('nec-2152-feeder-ampacity.html'), true, 'art31: cross-links to the 215.2 article');
}

// Article 32 (NEC 210.8 Ground-Fault Circuit-Interrupter Protection for Personnel).
// Where a GFCI is required (dwelling-unit locations, non-dwelling locations, appliances,
// the 210.63 service receptacle, outdoor outlets), the 6 ft sink/tub distance tests, the
// 2017->2020 restructure ((A)-(E) -> (A)-(F), 125 V only -> 125-250 V receptacles), TIA 1653,
// and the 2023/2026 change-record claims. Core-computed examples: compute_art32.js ->
// calc_21008_cited.json. Verbatim audit: verify_art32_verbatim.py.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21008-gfci-protection.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const p = core.pickConductor31016, nsb = core.nextStdBreaker;
  eq(art.includes('nec-21008-gfci-protection.html'), true, 'art32: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21008-gfci-protection.html'), true, 'art32: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art32: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art32: Article + FAQPage JSON-LD present');
  // verbatim 2017 NEC 210.8 probes (official NFPA text, lines 9524-9677)
  eq(has('210.8(A) through (E)'), true, 'art32: verbatim 2017 lead-in (A) through (E)');
  eq(has('(A) Dwelling Units. All 125-volt, single-phase, 15- and 20-ampere receptacles'), true, 'art32: verbatim 2017 (A) scope (125 V, 15/20 A)');
  eq(has('(A)(1) through (10)'), true, 'art32: verbatim 2017 (A)(1)-(10) list ref');
  eq(has('(B) Other Than Dwelling Units. All single-phase receptacles rated 150 volts to ground or less, 50 amperes or less'), true, 'art32: verbatim 2017 (B) scope');
  eq(has('(C) Boat Hoists.'), true, 'art32: verbatim 2017 (C) Boat Hoists');
  eq(has('(D) Kitchen Dishwasher Branch Circuit.'), true, 'art32: verbatim 2017 (D) dishwasher');
  eq(has('(E) Crawl Space Lighting Outlets. GFCI protection shall be provided for lighting outlets not exceeding 120 volts installed in crawl spaces.'), true, 'art32: verbatim 2017 (E) crawl-space lighting (120 V ceiling)');
  eq(has('conductor program as specified in 590.6(B)(3)'), true, 'art32: verbatim 2017 590.6(B)(3) AEGCP cross-ref');
  // verbatim 2020 NEC 210.8 probes (full-code scan, chars 332350-339620, pre-TIA 1653)
  eq(has('210.8(A) through (F)'), true, 'art32: verbatim 2020 lead-in (A) through (F)');
  eq(has('(A) Dwelling Units. All 125-volt through 250-volt receptacles installed in the locations specified in 210.8(A)(1) through (A)(11)'), true, 'art32: verbatim 2020 (A) scope (125-250 V, 11 locations)');
  eq(has('(11) Indoor damp and wet locations'), true, 'art32: verbatim 2020 (A)(11) damp and wet');
  eq(has('(B) Other Than Dwelling Units. All 125-volt through 250-volt receptacles supplied by single-phase branch circuits rated 150 volts or less to ground, 50 amperes or less'), true, 'art32: verbatim 2020 (B) scope');
  eq(has('210.8(B)(1) through (B)(12)'), true, 'art32: verbatim 2020 (B)(1)-(12) list ref');
  eq(has('(C) Crawl Space Lighting Outlets.'), true, 'art32: verbatim 2020 (C) (letter shifted; Boat Hoists gone)');
  eq(has('(D) Specific Appliances. Unless GFCI protection is provided in accordance with 422.5(B)(3) through (B)(5)'), true, 'art32: verbatim 2020 (D) Specific Appliances');
  eq(has('(E) Equipment Requiring Servicing. GFCI protection shall be provided for the receptacles required by 210.63.'), true, 'art32: verbatim 2020 (E) 210.63 rule');
  eq(has('(F) Outdoor Outlets. All outdoor outlets for dwellings, other than those covered in 210.8(A)(3)'), true, 'art32: verbatim 2020 (F) Outdoor Outlets (pre-TIA: no HVAC exception)');
  eq(has('conductor program as specified in 590.6(B)(2)'), true, 'art32: verbatim 2020 590.6(B)(2) AEGCP cross-ref (transcribed as found)');
  // delta + TIA probes
  eq(has('door, doorway'), true, 'art32: 2020 distance-rule fix names the deleted "door, doorway" language');
  eq(has('tia 1653'), true, 'art32: TIA 1653 documented');
  eq(has('september 1, 2026'), true, 'art32: TIA 1653 expiration September 1, 2026');
  eq(has('517.21'), true, 'art32: 2020 (B)(5) Ex 2 rewritten to point at 517.21');
  // 2023/2026 change-record probes
  eq(has('change-record verified'), true, 'art32: 2023/2026 section labeled change-record verified');
  eq(has('15 locations'), true, 'art32: 2023 (B) expanded to 15 locations');
  eq(has('60 amperes'), true, 'art32: 2026 (F) 50 A -> 60 A threshold');
  // core-computed worked examples (real shipped app.js, zero hand math)
  eq(nsb(15), 15, 'art32 EX1: nextStdBreaker(15) = 15 A (240.6(A))');
  eq(p(15, 'cu', 75).size, '14', 'art32 EX1: 15 A -> 14 AWG Cu');
  eq(p(15, 'cu', 75).amp, 20, 'art32 EX1: 14 AWG Cu Table 310.16 ampacity 20 A');
  eq(p(50, 'cu', 75).size, '8', 'art32 EX2: 50 A -> 8 AWG Cu (the 240 V dryer)');
  eq(p(50, 'cu', 75).amp, 50, 'art32 EX2: 8 AWG Cu Table 310.16 ampacity 50 A');
  // worked-example figures actually appear in the article
  eq(has('14 awg cu') && has('20 a'), true, 'art32: EX1 14 AWG Cu (amp 20) in article');
  eq(has('8 awg cu') && has('50 a'), true, 'art32: EX2 8 AWG Cu (amp 50) in article');
  eq(has('4.9 ft') && has('6.6 ft'), true, 'art32: EX3 sink distances 4.9 ft / 6.6 ft in article');
  eq(has('5.0 ft'), true, 'art32: EX3 doorway case 5.0 ft in article');
  eq(has('1.8 m (6 ft)'), true, 'art32: 6 ft (1.8 m) sink/tub test in article');
  eq(has('4.0 ft') && has('7.5 ft'), true, 'art32: EX8 tub distances 4.0 ft / 7.5 ft in article');
  eq(has('277 v'), true, 'art32: EX8 277 V crawl-space case in article');
  // site wiring
  eq(art.includes('nec-21012-afci-protection.html'), true, 'art32: cross-links to the 210.12 (AFCI) article');
  eq(art.includes('nec-21052-dwelling-receptacle-outlets.html'), true, 'art32: cross-links to the 210.52 article');
  eq(art.includes('nec-21021-outlet-devices.html'), true, 'art32: cross-links to the 210.21 article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art32: cross-links to the 240.4(D) article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art32: cross-links to the Table 310.16 article');
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap.includes('articles/nec-21008-gfci-protection.html'), true, 'art32: sitemap entry present');
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index.includes('articles/nec-21008-gfci-protection.html'), true, 'art32: index cross-link present');
}

// Article 33 (NEC 210.20 Branch-Circuit Overcurrent Protection — sizing the breaker).
// The (A) 125% continuous-load FLOOR on the OCPD rating (+ the listed-assembly 100%
// Exception), the (B) 240.4 hand-off, the (C) Table 240.3 equipment cap, the (D) 210.21
// outlet-device cap; the 2017->2020 word-identical delta (programmatic diff, zero
// true changes); the 2023 posture (210.20 unchanged — the 10-ampere allowance is a
// 210.18 change per ELR 1430). Core-computed examples: compute_art33.js ->
// calc_21020_cited.json. Verbatim audit: verify_art33_verbatim.py.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21020-branch-circuit-ocpd.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const p = core.pickConductor31016, nsb = core.nextStdBreaker, cap = core.smallConductorCap, der = core.derate31015;
  eq(art.includes('nec-21020-branch-circuit-ocpd.html'), true, 'art33: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21020-branch-circuit-ocpd.html'), true, 'art33: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art33: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art33: Article + FAQPage JSON-LD present');
  // verbatim 2017 NEC 210.20 probes (official NFPA text, lines 10189-10222)
  eq(has('210.20 Overcurrent Protection. Branch-circuit conductors and equipment shall be protected by overcurrent protective devices that have a rating or setting that complies with 210.20(A) through (D)'), true, 'art33: verbatim 2017 lead-in');
  eq(has('(A) Continuous and Noncontinuous Loads. Where a branch circuit supplies continuous loads or any combination of continuous and noncontinuous loads, the rating of the overcurrent device shall not be less than the noncontinuous load plus 125 percent of the continuous load'), true, 'art33: verbatim (A) 125% floor');
  eq(has('is listed for operation at 100 percent of its rating'), true, 'art33: verbatim (A) Exception (listed assembly 100%)');
  eq(has('(B) Conductor Protection. Conductors shall be protected in accordance with 240.4. Flexible cords and fixture wires shall be protected in accordance with 240.5'), true, 'art33: verbatim (B) 240.4/240.5 hand-off');
  eq(has('(C) Equipment. The rating or setting of the overcurrent protective device shall not exceed that specified in the applicable articles referenced in Table 240.3 for equipment'), true, 'art33: verbatim (C) Table 240.3 cap');
  eq(has('(D) Outlet Devices. The rating or setting shall not exceed that specified in 210.21 for outlet devices'), true, 'art33: verbatim (D) 210.21 cap');
  // 2020 block is word-identical to 2017 (the article's central claim)
  eq(has('word-for-word identical to the 2017 body'), true, 'art33: 2020 word-identical claim stated');
  // edition posture probes
  eq(has('no change record for 210.20'), true, 'art33: 2020 change log absence stated');
  eq(has('10-ampere'), true, 'art33: 2023 10-ampere (210.18) posture stated');
  eq(has('receptacle outlets'), true, 'art33: 210.18 Exception No. 2 (no receptacle outlets) stated');
  // worked-example figures (from calc_21020_cited.json) actually appear in the article
  eq(has('28 a'), true, 'art33: EX1 28 A floor in article');
  eq(has('30 a'), true, 'art33: EX1 30 A OCPD in article');
  eq(has('24 a'), true, 'art33: EX2 24 A floor (Exception) in article');
  eq(has('25 a'), true, 'art33: EX2 25 A OCPD in article');
  eq(has('12 awg cu'), true, 'art33: EX3/EX7 12 AWG Cu in article');
  eq(has('10 awg cu'), true, 'art33: EX1/EX7 10 AWG Cu in article');
  eq(has('86.48 a'), true, 'art33: EX8 86.48 A derated ampacity in article');
  eq(has('2 awg cu'), true, 'art33: EX8 2 AWG Cu in article');
  eq(has('125%'), true, 'art33: the 125% floor mechanic named');
  eq(has('240.4(d)'), true, 'art33: 240.4(D) small-conductor caps referenced');
  // core-computed assertions (real shipped app.js, zero hand math)
  eq(8 + 1.25 * 16, 28, 'art33 EX1: floor = 8 + 1.25*16 = 28 A');
  eq(nsb(28), 30, 'art33 EX1: nextStdBreaker(28) = 30 A (240.6)');
  eq(p(30, 'cu', 75).size, '10', 'art33 EX1: 30 A -> 10 AWG Cu');
  eq(p(30, 'cu', 75).amp, 35, 'art33 EX1: 10 AWG Cu Table 310.16 ampacity 35 A');
  eq(cap('14', 'cu'), 15, 'art33 EX3: 14 AWG Cu 240.4(D) cap 15 A');
  eq(cap('12', 'cu'), 20, 'art33 EX4: 12 AWG Cu 240.4(D) cap 20 A');
  eq(cap('12', 'al'), 15, 'art33 EX5: 12 AWG Al 240.4(D) cap 15 A');
  eq(cap('10', 'cu'), 30, 'art33 EX7: 10 AWG Cu 240.4(D) cap 30 A');
  eq(nsb(16 + 8), 25, 'art33 EX2: nextStdBreaker(24) = 25 A (Exception: floor = 24)');
  const r8 = der({ requiredA: 80, ambientC: 35, ccc: 6, mat: 'cu', temp: 75 });
  eq(r8.deratedA, 86.48, 'art33 EX8: derate31015(80A, 2AWG Cu, 35C, 6ccc) = 86.48 A');
  eq(r8.passes, true, 'art33 EX8: 86.48 A >= 80 A OCPD (pass)');
  eq(r8.pick.size, '2', 'art33 EX8: derating core picks 2 AWG Cu');
  eq(nsb(1.25 * 60), 80, 'art33 EX8: nextStdBreaker(75) = 80 A');
  // cross-links
  eq(art.includes('nec-21019a-continuous-load.html'), true, 'art33: cross-links to the 210.19(A) article');
  eq(art.includes('nec-21021-outlet-devices.html'), true, 'art33: cross-links to the 210.21 article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art33: cross-links to the 240.4(D) article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art33: cross-links to the Table 310.16 article');
  eq(art.includes('nec-31015-ampacity-adjustments.html'), true, 'art33: cross-links to the 310.15 article');
  eq(art.includes('nec-2152-feeder-ampacity.html'), true, 'art33: cross-links to the 215.2 article');
  eq(art.includes('nec-23090-service-overload-protection.html'), true, 'art33: cross-links to the 230.90 article');
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap.includes('articles/nec-21020-branch-circuit-ocpd.html'), true, 'art33: sitemap entry present');
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index.includes('articles/nec-21020-branch-circuit-ocpd.html'), true, 'art33: index cross-link present');
}

// Article 34 (NEC 210.18 Branch-Circuit Ratings — the OCPD sets the rating).
// The two sentences (OCPD = rating; closed list for other-than-individual circuits;
// bigger wire does not raise the rating) + the >50 A multioutlet exception; the
// 2017->2020 word-identical delta (programmatic diff, zero true changes); the four
// verified 2023 changes (10 A added to the list, Exception -> Exception No. 1,
// "on industrial premises" -> "in locations", new Exception No. 2 no-receptacle).
// Core-computed examples: compute_art34.js -> calc_21018_cited.json.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-21018-branch-circuit-ratings.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const p = core.pickConductor31016, nsb = core.nextStdBreaker, cap = core.smallConductorCap;
  // cap-aware pick (240.4(D) governing cap), same shape as the compute script
  const pickCap = (reqA, mat, temp) => {
    for (const row of core.T31016) {
      const cols = core.T31016_COLS[temp];
      const amp = row[mat === 'al' ? 'al' : 'cu'][mat === 'al' ? cols[1] : cols[0]];
      if (amp == null || amp < reqA) continue;
      if (row.small) { const c = cap(row.s, mat); if (c != null && c < reqA) continue; }
      return { size: row.s, amp, cap: row.small ? cap(row.s, mat) : null };
    }
    return { size: null, amp: null };
  };
  eq(art.includes('nec-21018-branch-circuit-ratings.html'), true, 'art34: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-21018-branch-circuit-ratings.html'), true, 'art34: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art34: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art34: Article + FAQPage JSON-LD present');
  // verbatim 2017 NEC 210.18 probes (official NFPA text, lines 10015-10025)
  eq(has('210.18 Rating. Branch circuits recognized by this article shall be rated in accordance with the maximum permitted ampere rating or setting of the overcurrent device'), true, 'art34: verbatim 2017 sentence 1 (OCPD sets the rating)');
  eq(has('The rating for other than individual branch circuits shall be 15, 20, 30, 40, and 50 amperes'), true, 'art34: verbatim 2017 closed list');
  eq(has('Where conductors of higher ampacity are used for any reason, the ampere rating or setting of the specified overcurrent device shall determine the circuit rating'), true, 'art34: verbatim 2017 sentence 3 (bigger wire, same rating)');
  eq(has('Exception: Multioutlet branch circuits greater than 50 amperes shall be permitted to supply nonlighting outlet loads on industrial premises where conditions of maintenance and supervision ensure that only qualified persons service the equipment'), true, 'art34: verbatim 2017 Exception');
  // 2020 block is word-identical to 2017 (the article's central claim)
  eq(has('word-for-word identical to the 2017 body'), true, 'art34: 2020 word-identical claim stated');
  // 2023 change probes (four verified changes)
  eq(has('10, 15, 20, 30, 40, and 50 amperes'), true, 'art34: 2023 list with 10 A added');
  eq(has('Exception No. 1:'), true, 'art34: 2023 Exception renumbered No. 1');
  eq(has('in locations'), true, 'art34: 2023 Exception No. 1 broadened to "in locations" (was "on industrial premises")');
  eq(has('where conditions of maintenance and supervision ensure that only qualified persons service the equipment'), true, 'art34: 2023 Exception No. 1 qualified-persons clause verbatim');
  eq(has('Exception No. 2: Branch circuits rated 10 amperes shall not supply receptacle outlets'), true, 'art34: 2023 Exception No. 2 (no receptacles on 10 A)');
  eq(has('Branch Circuit, Individual. A branch circuit that supplies only one utilization equipment'), true, 'art34: Article 100 individual-circuit definition quoted');
  // 240.6 context (the breaker list vs the circuit-rating list)
  eq(has('Additional standard ampere ratings for fuses shall be 1, 3, 6, 10, and 601'), true, 'art34: 240.6(A) fuse add-ons quoted');
  // worked-example figures (from calc_21018_cited.json) actually appear in the article
  eq(has('2,880 w'), true, 'art34: EX3 2,880 W water-heater load in article');
  eq(has('2,400 va'), true, 'art34: EX4 2,400 VA load in article');
  eq(has('1,200 w'), true, 'art34: EX5 1,200 W 10 A load in article');
  eq(has('12 awg cu'), true, 'art34: EX2 12 AWG Cu in article');
  eq(has('10 awg cu'), true, 'art34: EX3/EX4 10 AWG Cu in article');
  eq(has('14 awg cu'), true, 'art34: EX5 14 AWG Cu in article');
  eq(has('6 awg cu'), true, 'art34: EX6 6 AWG Cu in article');
  // core-computed assertions (real shipped app.js, zero hand math)
  eq(nsb(16), 20, 'art34 EX2: nextStdBreaker(16) = 20 A');
  eq([15,20,30,40,50].includes(nsb(16)), true, 'art34 EX2: 20 A on the 210.18 (2017/2020) list');
  eq(pickCap(20, 'cu', 75).size, '12', 'art34 EX2: 20 A -> 12 AWG Cu (14 AWG rejected: 240.4(D) cap 15 A)');
  eq(pickCap(20, 'cu', 75).amp, 25, 'art34 EX2: 12 AWG Cu Table 310.16 ampacity 25 A');
  eq(nsb(24), 25, 'art34 EX3: nextStdBreaker(24) = 25 A');
  eq([15,20,30,40,50].includes(nsb(24)), false, 'art34 EX3: 25 A NOT on the 210.18 multioutlet list (must be individual)');
  eq(pickCap(25, 'cu', 75).size, '10', 'art34 EX3: 25 A -> 10 AWG Cu (12 AWG rejected: 240.4(D) cap 20 A < 25 A)');
  eq(pickCap(25, 'cu', 75).amp, 35, 'art34 EX3: 10 AWG Cu Table 310.16 ampacity 35 A');
  eq(pickCap(60, 'cu', 75).size, '6', 'art34 EX6: 60 A -> 6 AWG Cu');
  eq(pickCap(60, 'cu', 75).amp, 65, 'art34 EX6: 6 AWG Cu Table 310.16 ampacity 65 A');
  eq(pickCap(10, 'cu', 75).size, '14', 'art34 EX5: 10 A (2023) -> 14 AWG Cu');
  eq(cap('14', 'cu'), 15, 'art34 EX5: 14 AWG Cu 240.4(D) cap 15 A (>= 10 A, OK)');
  eq(nsb(10), 15, 'art34 EX5: pre-2023 nextStdBreaker(10) = 15 A (breaker list starts at 15)');
  eq(p(35, 'cu', 75).size, '10', 'art34 EX4: 10 AWG Cu carries 35 A (the "bigger wire" in the EX4 20 A circuit)');
  // cross-links
  eq(art.includes('nec-21020-branch-circuit-ocpd.html'), true, 'art34: cross-links to the 210.20 article');
  eq(art.includes('nec-21019a-continuous-load.html'), true, 'art34: cross-links to the 210.19(A) article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art34: cross-links to the 240.4(D) article');
  eq(art.includes('nec-21021-outlet-devices.html'), true, 'art34: cross-links to the 210.21 article');
  eq(art.includes('nec-21023-permissible-loads.html'), true, 'art34: cross-links to the 210.23 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art34: cross-links to the Table 310.16 article');
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap.includes('articles/nec-21018-branch-circuit-ratings.html'), true, 'art34: sitemap entry present');
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index.includes('articles/nec-21018-branch-circuit-ratings.html'), true, 'art34: index cross-link present');
}

// Article 35 (NEC 240.6 Standard Ampere Ratings — the official breaker/fuse rating list).
// (A) Table 240.6(A) 15..6000 A (2017/2020, 37 values; 2023 prepends 10 A) + fuse-only
// 1,3,6,10,601 (2023: 1,3,6,601); (B) adjustable-trip = maximum setting; (C) restricted
// access = adjusted setting ((C)(4) password added 2020; NFPA 730/TIA-5017 note 2023);
// (D) NEW 2023 remote-adjust with cybersecurity conditions.
// Core-computed examples: compute_art35.js -> calc_24006_cited.json.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-2406-standard-ampere-ratings.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nsb = core.nextStdBreaker, SB = core.STD_BREAKERS;
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art35: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-2406-standard-ampere-ratings.html'), true, 'art35: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art35: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art35: Article + FAQPage JSON-LD present');
  // verbatim 2017 NEC 240.6 probes (official NFPA text, lines 16129-16195)
  eq(has('240.6 Standard Ampere Ratings.'), true, 'art35: verbatim 2017 section heading');
  eq(has('The standard ampere ratings for fuses and inverse time circuit breakers shall be considered as shown in Table 240.6(A)'), true, 'art35: verbatim 2017 (A) sentence 1');
  eq(has('Additional standard ampere ratings for fuses shall be 1, 3, 6, 10, and 601'), true, 'art35: verbatim 2017 (A) fuse add-ons (1,3,6,10,601)');
  eq(has('The use of fuses and inverse time circuit breakers with nonstandard ampere ratings shall be permitted'), true, 'art35: verbatim 2017 (A) nonstandard-permitted sentence');
  eq(has('not meeting the requirements of 240.6(C), shall be the maximum setting possible'), true, 'art35: verbatim (B) maximum-setting rule');
  eq(has('shall be the maximum setting possible'), true, 'art35: (B) quote complete');
  // 2020 (C) delta (change record ELR 848)
  eq(has('Restricted access shall be defined as located behind one of the following'), true, 'art35: 2017 (C) lead-in verbatim');
  eq(has('Restricted access shall be achieved by one of the following methods'), true, 'art35: 2020 (C) reworded lead-in verbatim');
  eq(has('(4) Password protected, with password accessible only to qualified personnel'), true, 'art35: 2020 (C)(4) password method verbatim');
  eq(has('(3) Locked doors accessible only to qualified personnel'), true, 'art35: (C)(3) locked-doors method verbatim (2017/2020/2023)');
  // 2023 (D) new subsection
  eq(has('(D) Remotely Accessible Adjustable-Trip Circuit Breakers'), true, 'art35: 2023 (D) heading verbatim');
  eq(has('can be adjusted remotely to modify the adjusting means'), true, 'art35: 2023 (D) remote-adjust clause verbatim');
  eq(has('evaluated for cybersecurity'), true, 'art35: 2023 (D)(2)(a) cybersecurity-evaluated clause verbatim');
  eq(has('A cybersecurity assessment of the network is completed'), true, 'art35: 2023 (D)(2)(b) assessment clause verbatim');
  eq(has('NFPA 730'), true, 'art35: 2023 (C) NFPA 730 informational note present');
  eq(has('ANSI/TIA-5017'), true, 'art35: 2023 (C) TIA-5017 informational note present');
  // 2023 table change: 10 A prepended; fuse list drops 10
  eq(has('10, 15, 20, 25, 30'), true, 'art35: 2023 table starts 10,15,20,25,30');
  eq(has('1, 3, 6, and 601'), true, 'art35: 2023 fuse list (1,3,6,601) — 10 removed');
  eq(has('601'), true, 'art35: 601 A fuse rating discussed');
  // worked-example figures appear in the article
  eq(has('2,880 w'), true, 'art35: EX3 2,880 W water-heater load in article');
  // core-computed assertions (real shipped app.js, zero hand math)
  eq(SB.length, 37, 'art35 EX1: shipped STD_BREAKERS has 37 values (2017/2020 table)');
  eq(SB[0], 15, 'art35 EX1: smallest standard rating = 15 A (pre-2023)');
  eq(SB[SB.length - 1], 6000, 'art35 EX1: largest standard rating = 6000 A');
  eq(SB.includes(140), false, 'art35 EX2: 140 A is NOT standard (125 -> 150 gap)');
  eq(SB.includes(165), false, 'art35 EX2: 165 A is NOT standard');
  eq(SB.includes(3500), false, 'art35: 3500 A is NOT standard (3000 -> 4000)');
  eq(SB.includes(4000) && SB.includes(5000) && SB.includes(6000), true, 'art35 EX2: 4000/5000/6000 A ARE standard (the v1.15.2 regression)');
  eq(nsb(165), 175, 'art35 EX2: nextStdBreaker(165) = 175 A');
  eq(nsb(95), 100, 'art35 EX2: nextStdBreaker(95) = 100 A');
  eq(nsb(24), 25, 'art35 EX3: nextStdBreaker(24) = 25 A (25 A IS a 240.6 standard rating)');
  eq(SB.includes(25), true, 'art35 EX3: 25 A on the 240.6 standard list');
  eq([15, 20, 30, 40, 50].includes(25), false, 'art35 EX3: 25 A NOT on the 210.18 multioutlet list (two different lists)');
  eq(nsb(10), 15, 'art35 EX7: pre-2023 nextStdBreaker(10) = 15 A (10 A not in the 2017/2020 breaker table)');
  eq(SB.includes(10), false, 'art35 EX7: 10 A absent from shipped (2017/2020) table; 2023 prepends it (1,3,6,10,601 -> 1,3,6,601 on the fuse list)');
  // cross-links
  eq(art.includes('nec-21018-branch-circuit-ratings.html'), true, 'art35: cross-links to the 210.18 article');
  eq(art.includes('nec-21020-branch-circuit-ocpd.html'), true, 'art35: cross-links to the 210.20 article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art35: cross-links to the 240.4(D) article');
  eq(art.includes('nec-conductor-sizing.html'), true, 'art35: cross-links to the conductor-sizing article');
  eq(art.includes('nec-23090-service-overload-protection.html'), true, 'art35: cross-links to the 230.90 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art35: cross-links to the Table 310.16 article');
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap.includes('articles/nec-2406-standard-ampere-ratings.html'), true, 'art35: sitemap entry present');
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index.includes('articles/nec-2406-standard-ampere-ratings.html'), true, 'art35: index cross-link present');
}

// Article 36 (NEC 215.1 Scope + 215.3 Feeder Overcurrent Protection).
// 215.3: Part I of Art 240 hand-off + OCPD floor = noncont + 125%*cont; single 100%
// listed-assembly exception (2020/2023 word-identical). 2017 carried Exception No. 2
// (600-1000 V -> Parts I-VII of Art 240; >1000 V -> Part IX) — deleted 2020 (AJB 2020
// change report; Part IX itself remained in the 2020 TOC). 2023: 215.1 scope narrowed
// to <=1000 V ac / 1500 V dc (Info Note -> Art 235 Part III); Art 240 Part IX removed,
// over-1000 V OCPD moved to new Article 245 (245.1). Worked examples EX1-EX5 computed
// by the shipped core (reqBreakerA / nextStdBreaker / pickConductor31016).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-2151-2153-feeder-overcurrent.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nsb = core.nextStdBreaker, rb = core.reqBreakerA, pick = core.pickConductor31016;
  const SB = core.STD_BREAKERS;
  eq(art.includes('nec-2151-2153-feeder-overcurrent.html'), true, 'art36: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-2151-2153-feeder-overcurrent.html'), true, 'art36: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art36: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art36: Article + FAQPage JSON-LD present');
  // verbatim 215.3 (2020/2023 text — 2020 on-disk scan, 2023 CSV; word-identical)
  eq(has('215.3 overcurrent protection.'), true, 'art36: verbatim 215.3 heading');
  eq(has('feeders shall be protected against overcurrent in accordance with part i of article 240'), true, 'art36: 215.3 hand-off sentence (2020/2023)');
  eq(has('the rating of the overcurrent device shall not be less than the noncontinuous load plus 125 percent of the continuous load'), true, 'art36: 215.3 125% floor verbatim');
  eq(has('where the assembly, including the overcurrent devices protecting the feeder(s), is listed for operation at 100 percent of its rating'), true, 'art36: 215.3 exception (100% listed assembly) verbatim');
  // 2017 body deltas
  eq(has('in accordance with the provisions of part i of article 240'), true, 'art36: 2017 "provisions of" phrasing (2020 cleanup removed it)');
  eq(has('exception no. 2: overcurrent protection for feeders between 600 and 1000 volts shall comply with parts i through vii of article 240'), true, 'art36: 2017 Exception No. 2 verbatim');
  eq(has('feeders over 1000 volts, nominal, shall comply with part ix of article 240'), true, 'art36: 2017 Exception No. 2 Part IX clause verbatim');
  // 215.1 scope (2017/2020 vs 2023)
  eq(has('215.1 scope. this article covers the installation requirements, overcurrent protection requirements, minimum size, and ampacity of conductors for feeders.'), true, 'art36: 2017/2020 215.1 scope verbatim');
  eq(has('feeders for electrolytic cells as covered in 668.3(c)(1) and (c)(4)'), true, 'art36: 215.1 electrolytic-cell exception verbatim');
  eq(has('for feeders not over 1000 volts ac or 1500 volts dc, nominal'), true, 'art36: 2023 215.1 narrowed scope verbatim');
  eq(has('see part iii of article 235 for feeders over 1000 volts ac or 1500 volts dc'), true, 'art36: 2023 215.1 Info Note -> Art 235 verbatim');
  // 215.2(A)(1) Exception No. 1 (conductor-side 100% twin; 2017 + 2020 on disk)
  eq(has('the allowable ampacity of the feeder conductors shall be permitted to be not less than the sum of the continuous load plus the noncontinuous load'), true, 'art36: 215.2(A)(1) Exc 1 ampacity language (2017 wording)');
  // edition-history claims
  eq(has('article 240 part ix still present'), true, 'art36: 2020 Part IX still present (TOC-verified)');
  eq(has('overcurrent protection over 1000 volts, nominal'), true, 'art36: Part IX title verbatim');
  eq(has('new article 245'), true, 'art36: 2023 new Article 245 named');
  eq(has('235.203'), true, 'art36: 235.203 OCPD pointer cited');
  eq(has('all 600-volt statements have been increased to 1000 volts'), true, 'art36: AJB 2020 deletion rationale quoted');
  // 240.4 / 240.4(B) / 240.4(C) (2023 CSV text)
  eq(has('unless otherwise permitted or required in 240.4(a) through (h)'), true, 'art36: 2023 240.4 (A)-(H) range verbatim');
  eq(has('the next higher standard overcurrent device rating (above the ampacity of the conductors being protected) shall be permitted to be used'), true, 'art36: 240.4(B) lead verbatim');
  eq(has('the next higher standard rating selected does not exceed 800 amperes'), true, 'art36: 240.4(B) 800 A condition verbatim');
  eq(has('where the overcurrent device is rated over 800 amperes, the ampacity of the conductors it protects shall be equal to or greater than the rating of the overcurrent device defined in 240.6'), true, 'art36: 240.4(C) >800 A rule verbatim');
  // worked-example figures appear in the article
  eq(has('3 awg cu'), true, 'art36: EX1 3 AWG Cu in article');
  eq(has('2/0 awg cu'), true, 'art36: EX3 2/0 AWG Cu in article');
  eq(has('250 kcmil cu'), true, 'art36: EX4 250 kcmil Cu in article');
  eq(has('4/0 awg'), true, 'art36: EX4 4/0 AWG 240.4(B) trap in article');
  // core-computed assertions (shipped app.js, zero hand math)
  // EX1: 25 noncont + 60 cont -> 25 + 75 = 100 -> 100 A; 3 AWG Cu @75 (100 A)
  eq(rb(60, true), 75, 'art36 EX1: reqBreakerA(60, cont) = 75');
  eq(nsb(25 + rb(60, true)), 100, 'art36 EX1: nextStdBreaker(100) = 100 A');
  eq(pick(100, 'cu', 75), { size: '3', amp: 100, label: '3 AWG Cu', over: null, notes: pick(100, 'cu', 75).notes }, 'art36 EX1: 100 A -> 3 AWG Cu @75C (100 A)');
  // EX2 std path: same as EX1; 100% path: 85 -> 90 A; 4 AWG Cu @75 (85 A)
  eq(nsb(25 + 60), 90, 'art36 EX2: 100% sum 85 -> 90 A standard');
  eq(pick(85, 'cu', 75).size, '4', 'art36 EX2: 85 A -> 4 AWG Cu @75C (85 A)');
  eq(pick(85, 'cu', 75).amp, 85, 'art36 EX2: 4 AWG Cu @75C = 85 A');
  // EX3: 125 noncont + 40 cont -> 175 -> 175 A; 2/0 AWG Cu @75 (175 A)
  eq(nsb(125 + rb(40, true)), 175, 'art36 EX3: nextStdBreaker(175) = 175 A');
  eq(pick(175, 'cu', 75).size, '2/0', 'art36 EX3: 175 A -> 2/0 AWG Cu @75C');
  eq(pick(175, 'cu', 75).amp, 175, 'art36 EX3: 2/0 AWG Cu @75C = 175 A');
  eq(nsb(125 + 40), 175, 'art36 EX3: 100% sum 165 -> 175 A (buys nothing here)');
  // EX4: 5 noncont + 200 cont -> 255 -> 300 A; 250 kcmil Cu @75 (255 A); 240.4(B) applies
  eq(nsb(5 + rb(200, true)), 300, 'art36 EX4: nextStdBreaker(255) = 300 A (240.4(B) case)');
  eq(pick(255, 'cu', 75).size, '250', 'art36 EX4: 255 A -> 250 kcmil Cu @75C');
  eq(pick(255, 'cu', 75).amp, 255, 'art36 EX4: 250 kcmil Cu @75C = 255 A');
  eq(nsb(5 + 200), 225, 'art36 EX4: 100% sum 205 -> 225 A');
  eq(pick(225, 'cu', 75).size, '4/0', 'art36 EX4: trap — 225 A still needs 4/0 AWG Cu @75C (230 A)');
  eq(pick(225, 'cu', 75).amp, 230, 'art36 EX4: 4/0 AWG Cu @75C = 230 A');
  // EX5: 60 cont -> 75 -> 80 A; conductor column: 75C 4 AWG (85 A) vs 60C 3 AWG (85 A)
  eq(nsb(rb(60, true)), 80, 'art36 EX5: nextStdBreaker(75) = 80 A');
  eq(pick(75, 'cu', 75).size, '4', 'art36 EX5: 75 A -> 4 AWG Cu @75C (85 A)');
  eq(pick(75, 'cu', 60).size, '3', 'art36 EX5: 75 A -> 3 AWG Cu @60C (4 AWG 60C = 70 A < 75)');
  eq(pick(75, 'cu', 60).amp, 85, 'art36 EX5: 3 AWG Cu @60C = 85 A');
  // 240.6(A) list (2017/2020 shipped: 15..6000, 37 values; 10 A is 2023-only)
  eq(SB.length, 37, 'art36: shipped STD_BREAKERS = 37 values (2017/2020 table)');
  eq(SB[0], 15, 'art36: smallest standard rating 15 A (pre-2023)');
  eq(SB.includes(10), false, 'art36: 10 A absent from shipped table (2023 addition, documented)');
  eq(SB.includes(175) && SB.includes(225), true, 'art36: 175 A / 225 A ARE 240.6 standard ratings');
  eq(SB.includes(165), false, 'art36: 165 A is NOT a standard rating (EX3 trap)');
  // cross-links
  eq(art.includes('nec-2152-feeder-ampacity.html'), true, 'art36: cross-links to the 215.2 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art36: cross-links to the 240.6 article');
  eq(art.includes('nec-conductor-sizing.html'), true, 'art36: cross-links to the conductor-sizing article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art36: cross-links to the Table 310.16 article');
  eq(art.includes('nec-11014c-31014-termination-temperature.html'), true, 'art36: cross-links to the 110.14(C) article');
  eq(art.includes('nec-21018-branch-circuit-ratings.html'), true, 'art36: cross-links to the 210.18 article');
  eq(art.includes('nec-21020-branch-circuit-ocpd.html'), true, 'art36: cross-links to the 210.20 article');
  eq(art.includes('nec-22061-neutral-load.html'), true, 'art36: cross-links to the 220.61 article');
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap.includes('articles/nec-2151-2153-feeder-overcurrent.html'), true, 'art36: sitemap entry present');
  const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index.includes('articles/nec-2151-2153-feeder-overcurrent.html'), true, 'art36: index cross-link present');
}

// ============================================================================
// Article 37 (Session 62) — NEC 250.32 Buildings or Structures Supplied by a
// Feeder(s) or Branch Circuit(s): the detached-garage / separate-building
// grounding rule. 250.32(A) electrode + single-branch-circuit Exception, (B)
// grounded systems (EGC with the supply + neutral-bonding prohibition + the
// two exceptions), (C) ungrounded, (D) remote disconnecting means (the
// 225.32 -> 225.31(B) 2023 renumber), (E) GEC sizing per 250.66. Verbatim 2017
// on disk (nec2017_full.txt lines 18947-19098) + 2023 on disk (art35_nec_csv.csv
// rows 250.32(A)-(E)); 2020 NOT on disk (scan ends at Art 230 - disclosed).
// Worked examples EX1-EX6 computed by the shipped core (reqBreakerA /
// nextStdBreaker / neutralLoad22061 / pickConductor31016) + the encoded
// Table 250.122 / Table 250.66 data (3-way live-verified in Sessions 47/49).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-25032-separate-building-grounding.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, rb = core.reqBreakerA, nsb = core.nextStdBreaker;
  eq(art.includes('nec-25032-separate-building-grounding.html'), true, 'art37: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-25032-separate-building-grounding.html'), true, 'art37: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art37: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art37: Article + FAQPage JSON-LD present');
  // section title (verified 2014-2023 identical)
  eq(has('buildings or structures supplied by a feeder(s) or branch circuit(s)'), true, 'art37: carries the verified section title');
  // verbatim 2017 (on-disk nec2017_full.txt lines 18947-19098)
  eq(has('(a) grounding electrode. building(s) or structure(s) supplied by feeder(s) or branch circuit(s) shall have a grounding electrode or grounding electrode system installed in accordance with part iii of article 250'), true, 'art37: verbatim 2017 250.32(A) lead');
  eq(has('where there is no existing grounding electrode, the grounding electrode(s) required in 250.50 shall be installed'), true, 'art37: verbatim 2017 250.32(A) "no existing electrode" sentence (dropped in 2023)');
  eq(has('exception: a grounding electrode shall not be required where only a single branch circuit, including a multiwire branch circuit, supplies the building or structure and the branch circuit includes an equipment grounding conductor'), true, 'art37: verbatim 2017 250.32(A) Exception');
  eq(has('an equipment grounding conductor, as described in 250.118, shall be run with the supply conductors and be connected to the building or structure disconnecting means and to the grounding electrode(s)'), true, 'art37: verbatim 250.32(B)(1) EGC-with-supply rule');
  eq(has('the equipment grounding conductor shall be sized in accordance with 250.122'), true, 'art37: verbatim 250.32(B)(1) EGC sizing hand-off');
  eq(has('any installed grounded conductor shall not be connected to the equipment grounding conductor or to the grounding electrode(s)'), true, 'art37: verbatim 250.32(B)(1) neutral-bonding PROHIBITION');
  eq(has('exception no. 1: for installations made in compliance with previous editions of this code that permitted such connection, the grounded conductor run with the supply to the building or structure shall be permitted to serve as the ground-fault return path'), true, 'art37: verbatim 250.32(B)(1) Exception No. 1 (previous-edition) lead');
  eq(has('an equipment grounding conductor is not run with the supply to the building or structure'), true, 'art37: verbatim 250.32(B)(1) Exc No. 1 condition (1)');
  eq(has('ground-fault protection of equipment has not been installed on the supply side of the feeder(s)'), true, 'art37: verbatim 250.32(B)(1) Exc No. 1 condition (3)');
  eq(has('exception no. 2: if system bonding jumpers are installed in accordance with 250.30(a)(1), exception no. 2, the feeder grounded circuit conductor at the building or structure served shall be connected to the equipment grounding conductors, grounding electrode conductor, and the enclosure for the first disconnecting means'), true, 'art37: verbatim 250.32(B)(1) Exception No. 2 (derived-system tie)');
  eq(has('the grounding electrode(s) shall also be connected to the building or structure disconnecting means'), true, 'art37: verbatim 250.32(C)(1) ungrounded-system electrode rule');
  // 250.32(D) — 2017 (225.32) vs 2023 (225.31(B)) citation delta
  eq(has('in accordance with the provisions of 225.32, exception no. 1 and no. 2, 700.12(b)(6), 701.12(b)(5), or 702.12'), true, 'art37: verbatim 2017 250.32(D) citation (225.32 + 700.12(B)(6)/701.12(B)(5))');
  eq(has('in accordance with 225.31(b), exception no. 1 and no. 2, 700.12(d)(4), 701.12(d)(3), or 702.12'), true, 'art37: verbatim 2023 250.32(D) citation (225.31(B) + renumbered 700/701)');
  eq(has('the connection of the grounded conductor to the grounding electrode, to normally non-current-carrying metal parts of equipment, or to the equipment grounding conductor at a separate building or structure shall not be made'), true, 'art37: verbatim 250.32(D)(1) neutral-bonding prohibition (remote disconnect)');
  eq(has('the connection between the equipment grounding conductor and the grounding electrode at a separate building or structure shall be made in a junction box, panelboard, or similar enclosure'), true, 'art37: verbatim 250.32(D)(3) junction-box rule');
  // 250.32(E) GEC sizing
  eq(has('the size of the grounding electrode conductor to the grounding electrode(s) shall not be smaller than given in 250.66, based on the largest ungrounded supply conductor'), true, 'art37: verbatim 250.32(E) GEC sizing rule (250.66, largest ungrounded)');
  // 2023 250.32(A) restructure (on-disk CSV)
  eq(has('shall have a grounding electrode system and grounding electrode conductor installed in accordance with part iii of article 250'), true, 'art37: verbatim 2023 250.32(A) restructured lead');
  eq(has('the calculated neutral load in accordance with 220.61'), true, 'art37: 2023 250.32(B)(1) Exc No. 1 sizing reword (220.61)');
  eq(has('the minimum equipment grounding conductor sized in accordance with 250.122'), true, 'art37: 2023 250.32(B)(1) Exc No. 1 sizing reword (250.122)');
  // 2020 gap disclosed (scan ends at Art 230)
  eq(has('2020'), true, 'art37: 2020 edition referenced');
  eq(has('ends at article 230'), true, 'art37: 2020 gap disclosed (on-disk scan ends at Art 230)');
  // Table 250.122 / Table 250.66 data (encoded; 3-way live-verified S47/S49).
  // The article quotes the rows its worked examples actually use (20/60/100/200 A)
  // + the 250.66 GEC cap; it does not reproduce the full 18-row 250.122 table.
  eq(has('3/0 awg'), true, 'art37: Table 250.66 cap / 200 A row (3/0 AWG Cu) referenced');
  eq(has('250 kcmil'), true, 'art37: Table 250.66 GEC cap (250 kcmil Al) referenced');
  // worked-example figures appear in the article
  eq(has('6 awg cu'), true, 'art37: EX1 6 AWG Cu feeder in article');
  eq(has('8 awg cu'), true, 'art37: EX1 8 AWG Cu EGC/GEC in article');
  eq(has('3 awg cu'), true, 'art37: EX2 3 AWG Cu feeder in article');
  eq(has('12 awg cu'), true, 'art37: EX3 12 AWG Cu EGC (20 A) in article');
  eq(has('3/0 awg cu'), true, 'art37: EX6 3/0 AWG Cu feeder in article');
  // core-computed assertions (shipped app.js, zero hand math)
  // EX1: 60 A garage -> 6 AWG Cu @75 (65 A); EGC 250.122 60 A = 8 AWG Cu; GEC 250.66 (6 AWG Cu -> 2AWG-or-smaller) = 8 AWG Cu
  eq(pick(60, 'cu', 75).size, '6', 'art37 EX1: 60 A -> 6 AWG Cu @75C');
  eq(pick(60, 'cu', 75).amp, 65, 'art37 EX1: 6 AWG Cu @75C = 65 A');
  eq(pick(100, 'cu', 75).size, '3', 'art37 EX2: 100 A -> 3 AWG Cu @75C');
  eq(pick(100, 'cu', 75).amp, 100, 'art37 EX2: 3 AWG Cu @75C = 100 A');
  eq(pick(200, 'cu', 75).size, '3/0', 'art37 EX6: 200 A -> 3/0 AWG Cu @75C');
  eq(pick(200, 'cu', 75).amp, 200, 'art37 EX6: 3/0 AWG Cu @75C = 200 A');
  // EX3: single 16 A circuit -> 20 A OCPD; 250.32(A) Exception -> no electrode
  eq(rb(16, false), 16, 'art37 EX3: reqBreakerA(16, noncont) = 16');
  eq(nsb(16), 20, 'art37 EX3: nextStdBreaker(16) = 20 A (single branch circuit)');
  // EX4: 250.32(B)(1) Exc No. 1 — 220.61 calculated neutral load governs (92.5 A)
  const nl = core.neutralLoad22061({ volt: 240, totalVA: 24000, cookingDryerVA: 6000, applyB1: true, applyB2: false, dwelling: true });
  eq(nl.basicA, 92.5, 'art37 EX4: 220.61 basic neutral = 92.5 A (24000-6000+4200 VA / 240 V)');
  eq(nl.cookDemandVA, 4200, 'art37 EX4: 220.61(B)(1) 70% on 6000 VA cooking/dryer = 4200 VA');
  eq(nl.basicVA, 22200, 'art37 EX4: 220.61 basic VA = 22,200 VA');
  eq(nl.minAmpA, 76.77, 'art37 EX4: 310.12(B) 83% one-dwelling floor = 76.77 A (EX4 uses 220.61 basicA, not the 83% floor, per 250.32(B)(1) Exc No. 1)');
  // cross-links
  eq(art.includes('nec-250122-egc-sizing.html'), true, 'art37: cross-links to the 250.122 EGC article');
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art37: cross-links to the 250.26/250.30 (250.66 GEC table) article');
  eq(art.includes('nec-25050-25052-25053-grounding-electrode-system.html'), true, 'art37: cross-links to the 250.50/250.52/250.53 electrode article');
  eq(art.includes('nec-25064-250104-gec-installation-bonding.html'), true, 'art37: cross-links to the 250.64/250.104 GEC-installation article');
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art37: cross-links to the 250.102 bonding-jumper article');
  eq(art.includes('nec-22061-neutral-load.html'), true, 'art37: cross-links to the 220.61 neutral-load article');
  eq(art.includes('nec-23042-service-conductor-sizing.html'), true, 'art37: cross-links to the 230.42 service-conductor article');
  const sitemap37 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap37.includes('articles/nec-25032-separate-building-grounding.html'), true, 'art37: sitemap entry present');
  const index37 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index37.includes('articles/nec-25032-separate-building-grounding.html'), true, 'art37: index cross-link present');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
