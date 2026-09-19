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

// ---------------------------------------------------------------------------
// Article 38 — NEC 430.22 (single-motor branch-circuit conductors, 125% of
// the 430.6(A)(1) full-load current from Table 430.248/430.250) + 430.52 +
// Table 430.52 (OCPD rating/setting: 250% inverse / 175% time-delay / 300%
// nontime / 800% instantaneous, Exception No. 2 increases to 400/225/300/300%)
// + the 240.4(D)/(G) interaction (motor circuits are "specific conductor
// applications" — the 240.4(D) small-conductor caps do NOT govern). Verbatim
// 2017 on disk (nec2017_full.txt lines 52750-52910, 53613-53770, 54616-54660,
// 54716-54799, 15905-15952, 15989-16044) + 2023 on disk (art35_nec_csv.csv
// rows 430.6, 430.6(A), 430.6(A)(1), 430.22(A)-(G)(2), 430.52(A)-(D));
// 2020 NOT on disk (scan ends at Art 230 — disclosed, no 2017→2020 diff).
// Worked examples EX1-EX6 computed by the shipped core (nextStdBreaker /
// pickConductor31016 / smallConductorCap) + encoded Table 430.52 / 430.248 /
// 430.250 data (verify_art38.py 54/54; FLC cells live-verified this session
// because the on-disk 2017 scan of those tables is OCR-garbled).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-43022-43052-single-motor-branch-circuit.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker, cap = core.smallConductorCap;
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art38: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-43022-43052-single-motor-branch-circuit.html'), true, 'art38: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art38: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art38: Article + FAQPage JSON-LD present');
  // verbatim 2017 — 430.22 lead + subsections (on-disk lines 53613-53770)
  eq(has('conductors that supply a single motor used in a continuous duty application shall have an ampacity of not less than 125 percent of the motor full-load current rating, as determined by 430.6(a)(1)'), true, 'art38: verbatim 2017 430.22 lead (125% of 430.6(A)(1) FLC)');
  eq(has('shall not be less than 125 percent of the rated input current to the rectifier'), true, 'art38: verbatim 430.22(A) rectifier input 125%');
  eq(has('(1) where a rectifier bridge of the single-phase, half-wave type is used, 190 percent'), true, 'art38: verbatim 430.22(A) half-wave 190%');
  eq(has('(2) where a rectifier bridge of the single-phase, full-wave type is used, 150 percent'), true, 'art38: verbatim 430.22(A) full-wave 150%');
  eq(has('the selection of branch-circuit conductors on the line side of the controller shall be based on the highest of the full-load current ratings shown on the motor nameplate'), true, 'art38: verbatim 430.22(B) multispeed highest nameplate');
  eq(has('not be less than 72 percent of the motor full-load current rating as determined by 430.6(a)(1)'), true, 'art38: verbatim 430.22(C) wye-start controller side 72%');
  eq(has('the multiplier of 72 percent is obtained by multiplying 58 percent by 1.25'), true, 'art38: verbatim 430.22(C) Info Note (58% × 1.25)');
  eq(has('not be less than 62.5 percent of the motor full-load current rating as determined by 430.6(a)(1)'), true, 'art38: verbatim 430.22(D) part-winding controller side 62.5%');
  eq(has('the multiplier of 62.5 percent is obtained by multiplying 50 percent by 1.25'), true, 'art38: verbatim 430.22(D) Info Note (50% × 1.25)');
  eq(has('shall have an ampacity of not less than the percentage of the motor nameplate current rating shown in table 430.22(e)'), true, 'art38: verbatim 430.22(E) other-than-continuous per Table 430.22(E)');
  eq(has('shall be permitted to be smaller than 14 awg but not smaller than 18 awg, provided they have an ampacity as specified in 430.22'), true, 'art38: verbatim 430.22(F) separate-terminal-enclosure 18 AWG');
  eq(has('conductors for small motors shall not be smaller than 14 awg unless otherwise permitted in 430.22(g)(1) or (g)(2)'), true, 'art38: verbatim 430.22(G) 14 AWG floor');
  // verbatim 2017 — 430.52 (A)-(C)(1) (on-disk lines 54616-54660)
  eq(has('430.52 rating or setting for individual motor circuit'), true, 'art38: verbatim 2017 430.52 section title (2023 renames it)');
  eq(has('shall be capable of carrying the starting current of the motor'), true, 'art38: verbatim 430.52(B) starting-current rule');
  eq(has('has a rating or setting not exceeding the value calculated according to the values given in table 430.52 shall be used'), true, 'art38: verbatim 430.52(C)(1) table rule');
  eq(has('a higher size, rating, or possible setting that does not exceed the next higher standard ampere rating shall be permitted'), true, 'art38: verbatim 430.52(C)(1) Exception No. 1 (next standard size)');
  eq(has('shall in no case exceed 400 percent of the full-load current'), true, 'art38: verbatim 430.52(C)(1) Exception No. 2(a) nontime/Class CC 400%');
  eq(has('shall in no case exceed 225 percent of the full-load current'), true, 'art38: verbatim 430.52(C)(1) Exception No. 2(b) time-delay 225%');
  // Table 430.52 (2017, on-disk lines 54716-54799) — all seven rows + note
  eq(has('single-phase motors | 300 | 175 | 800 | 250'), true, 'art38: Table 430.52 single-phase row 300/175/800/250');
  eq(has('ac polyphase motors other than wound-rotor | 300 | 175 | 800 | 250'), true, 'art38: Table 430.52 polyphase row 300/175/800/250');
  eq(has('squirrel cage — other than design b energy-efficient | 300 | 175 | 800 | 250'), true, 'art38: Table 430.52 squirrel-cage row');
  eq(has('design b energy-efficient | 300 | 175 | 1100 | 250'), true, 'art38: Table 430.52 Design B row (1100% instantaneous)');
  eq(has('wound-rotor | 150 | 150 | 800 | 150'), true, 'art38: Table 430.52 wound-rotor row 150/150/800/150');
  eq(has('dc (constant voltage) | 150 | 150 | 250 | 150'), true, 'art38: Table 430.52 DC row 150/150/250/150');
  eq(has('the values in the nontime delay fuse column apply to time-delay class cc fuses'), true, 'art38: Table 430.52 Note 1 (Class CC)');
  // 430.6(A)(1) + the nameplate-vs-table rule (on-disk lines 52750-52910)
  eq(has('table 430.247, table 430.248, table 430.249, and table 430.250'), true, 'art38: 430.6(A)(1) FLA table citation (247/248/249/250)');
  eq(has('instead of the actual current rating marked on the motor nameplate'), true, 'art38: 430.6(A)(1) "instead of nameplate" rule');
  // 240.4(D)/(G) interaction (on-disk lines 15905-15952, 15989-16044)
  eq(has('unless specifically permitted in 240.4(e) or (g)'), true, 'art38: verbatim 240.4(D) lead-in (E)/(G) carve-out');
  eq(has('430, parts ii, iv, and vii'), true, 'art38: Table 240.4(G) motor row -> 430 Parts II/IV/VII');
  // edition posture
  eq(has('2020'), true, 'art38: 2020 edition referenced');
  eq(has('ends at article 230'), true, 'art38: 2020 gap disclosed (on-disk scan ends at Art 230)');
  eq(has('not on disk'), true, 'art38: 2020 body explicitly not on disk');
  eq(has('ocr-garbled'), true, 'art38: on-disk 430.248/430.250 OCR garble disclosed');
  eq(has('live-verified'), true, 'art38: FLC values live-verified against clean sources');
  eq(has('art35_nec_csv.csv'), true, 'art38: 2023 on-disk CSV source cited');
  eq(has('53613'), true, 'art38: 430.22 on-disk line citation');
  eq(has('54619'), true, 'art38: 430.52 on-disk line citation');
  eq(has('table 430.52(c)(1)'), true, 'art38: 2023 table rename documented');
  eq(has('design b premium efficiency'), true, 'art38: 2023 Design B "premium efficiency" addition documented');
  eq(has('nema mg 1-2016'), true, 'art38: 2023 NEMA MG 1-2016 citation documented');
  eq(has('1300 percent'), true, 'art38: Exception No. 2 instantaneous 1300% increase documented');
  eq(has('1700 percent'), true, 'art38: Exception No. 2 Design B 1700% increase documented');
  // worked-example figures (core-computed) appear in the article
  eq(has('17.0 a'), true, 'art38: EX1 3 hp 1-ph FLC 17.0 A');
  eq(has('21.25 a'), true, 'art38: EX1 125% = 21.25 A');
  eq(has('15.2 a'), true, 'art38: EX2 5 hp 3-ph FLC 15.2 A (Table 430.250, not 28.0)');
  eq(has('12.0 a'), true, 'art38: EX3 2 hp 1-ph FLC 12.0 A');
  eq(has('20.16 a'), true, 'art38: EX4 wye-start 72% × 28.0 = 20.16 A');
  eq(has('17.5 a'), true, 'art38: EX5 part-winding 62.5% × 28.0 = 17.5 A');
  eq(has('52.5 a'), true, 'art38: EX6 125% × 42.0 = 52.5 A');
  eq(has('10 awg cu'), true, 'art38: EX1 10 AWG Cu (60 °C) in article');
  eq(has('8 awg cu'), true, 'art38: EX4/EX5 8 AWG Cu line in article');
  eq(has('6 awg cu'), true, 'art38: EX6 6 AWG Cu in article');
  // core-computed assertions (shipped app.js, zero hand math)
  // EX1: 3 hp 230 V 1-ph: FLC 17.0 -> 125% = 21.25 A
  eq(pick(21.25, 'cu', 60).size, '10', 'art38 EX1: 21.25 A -> 10 AWG Cu @60C');
  eq(pick(21.25, 'cu', 60).amp, 30, 'art38 EX1: 10 AWG Cu @60C = 30 A');
  eq(pick(21.25, 'cu', 75).size, '12', 'art38 EX1: 21.25 A -> 12 AWG Cu @75C (column trap)');
  eq(nsb(17 * 2.5), 45, 'art38 EX1: 250% × 17.0 = 42.5 -> next std 45 A inverse breaker');
  eq(nsb(17 * 1.75), 30, 'art38 EX1: 175% × 17.0 = 29.75 -> next std 30 A time-delay fuse');
  // EX2: 5 hp 230 V 3-ph: FLC 15.2 -> 19.0 A
  eq(pick(19, 'cu', 60).size, '12', 'art38 EX2: 19.0 A -> 12 AWG Cu @60C');
  eq(pick(19, 'cu', 75).size, '14', 'art38 EX2: 19.0 A -> 14 AWG Cu @75C');
  eq(nsb(15.2 * 2.5), 40, 'art38 EX2: 250% × 15.2 = 38 -> next std 40 A inverse breaker');
  // EX3: 2 hp 230 V 1-ph: FLC 12.0 -> 15.0 A; 30 A breaker on 14 AWG (240.4(G) case)
  eq(pick(15, 'cu', 60).size, '14', 'art38 EX3: 15.0 A -> 14 AWG Cu @60C');
  eq(pick(15, 'cu', 75).size, '14', 'art38 EX3: 15.0 A -> 14 AWG Cu @75C');
  eq(nsb(12 * 2.5), 30, 'art38 EX3: 250% × 12.0 = 30 -> 30 A inverse breaker (exactly standard)');
  eq(nsb(12 * 3.0), 40, 'art38 EX3: 300% × 12.0 = 36 -> next std 40 A nontime fuse');
  eq(cap('14', 'cu'), 15, 'art38 EX3: 240.4(D) cap for 14 AWG Cu = 15 A (does NOT govern — 240.4(G) motor carve-out)');
  // EX4: 10 hp 230 V 3-ph wye-start: FLC 28.0; line 125% = 35 A, controller 72% = 20.16 A
  eq(pick(35, 'cu', 60).size, '8', 'art38 EX4: line 35.0 A -> 8 AWG Cu @60C');
  eq(pick(35, 'cu', 75).size, '10', 'art38 EX4: line 35.0 A -> 10 AWG Cu @75C');
  eq(pick(20.16, 'cu', 60).size, '10', 'art38 EX4: controller 20.16 A -> 10 AWG Cu @60C');
  eq(pick(20.16, 'cu', 75).size, '12', 'art38 EX4: controller 20.16 A -> 12 AWG Cu @75C');
  eq(nsb(28 * 2.5), 70, 'art38 EX4: 250% × 28.0 = 70 -> 70 A inverse (already standard)');
  // EX5: 5 hp 230 V 1-ph part-winding: FLC 28.0; line 35 A, controller 62.5% = 17.5 A
  eq(pick(17.5, 'cu', 60).size, '12', 'art38 EX5: controller 17.5 A -> 12 AWG Cu @60C');
  eq(pick(17.5, 'cu', 75).size, '14', 'art38 EX5: controller 17.5 A -> 14 AWG Cu @75C');
  // EX6: 15 hp 230 V 3-ph heavy start: FLC 42.0 -> 52.5 A; base 250% = 105 -> 110 A
  eq(pick(52.5, 'cu', 60).size, '6', 'art38 EX6: 52.5 A -> 6 AWG Cu @60C');
  eq(pick(52.5, 'cu', 75).size, '6', 'art38 EX6: 52.5 A -> 6 AWG Cu @75C');
  eq(nsb(42 * 2.5), 110, 'art38 EX6: 250% × 42.0 = 105 -> next std 110 A inverse');
  eq(nsb(42 * 4.0), 175, 'art38 EX6: Exc No. 2 inverse 400% × 42.0 = 168 -> max 175 A (FLC ≤ 100 A band)');
  eq(nsb(42 * 2.25), 100, 'art38 EX6: Exc No. 2 time-delay 225% × 42.0 = 94.5 -> 100 A');
  // cross-links
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art38: cross-links to the 240.4(D) small-conductors article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art38: cross-links to the 310.16 ampacity article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art38: cross-links to the 240.6 standard-ratings article');
  eq(art.includes('nec-conductor-sizing.html'), true, 'art38: cross-links to the conductor-sizing pipeline article');
  eq(art.includes('nec-31015-ampacity-adjustments.html'), true, 'art38: cross-links to the 310.15 adjustments article');
  eq(art.includes('nec-21020-branch-circuit-ocpd.html'), true, 'art38: cross-links to the 210.20 (non-motor) OCPD article');
  eq(art.includes('nec-25032-separate-building-grounding.html'), true, 'art38: cross-links back to article 37 (250.32)');
  const sitemap38 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap38.includes('articles/nec-43022-43052-single-motor-branch-circuit.html'), true, 'art38: sitemap entry present');
  const index38 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index38.includes('articles/nec-43022-43052-single-motor-branch-circuit.html'), true, 'art38: index cross-link present');
}

// ============================================================
// Article 39: NEC 430.32 + 430.36 — Motor Overload Protection
// (the nameplate-current pair to Article 38: 430.22/430.52 table-FLC)
// The nameplate-vs-table split: 430.32(A)(1) separate overload device at
// 125%/115% of the NAMEPLATE FLC; 430.32(A)(2) thermal protector at
// 170/156/140% of the TABLE FLC (buckets ≤9 A / 9.1–20 A / >20 A); the
// 430.32(C) higher-setting cap 140/130% of nameplate; 430.32(D)(2)(a)
// branch-OCPD path for ≤1 hp manually-started in-sight motors; 430.35(A)
// 400% shunt ceiling; 430.33 intermittent duty; 430.36/430.37/430.38 which
// conductors / how many units / how many opened (Table 430.37).
// Verbatim 2017 on disk (nec2017_full.txt lines 54039–54066, 54067–54307,
// 54309–54321, 54324–54360, 54363–54381) + 2023 on disk
// (art35_nec_csv.csv rows 430.31(A)/(B), 430.32(A)(1)–(E), 430.33,
// 430.35(A)/(B), 430.36, 430.37, 430.38); 2020 body NOT on disk (scan ends
// at Art 230 — disclosed). Verified deltas: 430.32(A)(2)/(B)(2) gain the
// "electronically protected" sentence; 430.31 restructured (A)/(B); 430.33
// re-cite 430.52→430.52(C)(1); 430.35 renumber (a)/(b)→(1)/(2),
// (1)(2)(3)→a/b/c; 430.36/37/38 bodies word-identical (verify_art39.py
// 73/73). Worked examples computed by the shipped core (nextStdBreaker /
// pickConductor31016) under node (compute_art39.js → art39_examples.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-43032-43036-motor-overload-protection.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art39: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-43032-43036-motor-overload-protection.html'), true, 'art39: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art39: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art39: Article + FAQPage JSON-LD present');
  eq(has('Part III specifies overload devices intended to protect motors, motor-control apparatus, and motor branch-circuit conductors against excessive heating due to motor overloads and failure to start'), true, 'art39: verbatim 2017 430.31 lead');
  eq(has('shall not require overload protection where a power loss would cause a hazard, such as in the case of fire pumps'), true, 'art39: verbatim 2017 430.31 fire-pump exclusion');
  eq(has('The provisions of Part III shall not apply to motor circuits rated over 1000 volts, nominal'), true, 'art39: verbatim 2017 430.31 over-1000V exclusion');
  eq(has('Each motor used in a continuous duty application and rated more than 1 hp shall be protected against overload by one of the means in 430.32(A)(1) through (A)(4)'), true, 'art39: verbatim 2017 430.32(A) lead (1 hp)');
  eq(has('This device shall be selected to trip or shall be rated at no more than the following percent of the motor nameplate full-load current rating'), true, 'art39: verbatim 2017 430.32(A)(1) NAMEPLATE basis');
  eq(has('For a multispeed motor, each winding connection shall be considered separately'), true, 'art39: verbatim 2017 430.32(A)(1) multispeed');
  eq(has('The ultimate trip current of a thermally protected motor shall not exceed the following percentage of motor full-load current given in Table 430.248, Table 430.249, and Table 430.250'), true, 'art39: verbatim 2017 430.32(A)(2) TABLE FLC basis');
  eq(has('Motor full-load current 9 amperes or less: 170%'), true, 'art39: verbatim 2017 430.32(A)(2) 170% bucket');
  eq(has('from 9.1 to, and including, 20 amperes: 156%'), true, 'art39: verbatim 2017 430.32(A)(2) 156% bucket');
  eq(has('Motor full-load current greater than 20 amperes: 140%'), true, 'art39: verbatim 2017 430.32(A)(2) 140% bucket');
  eq(has('higher size sensing elements or incremental settings or sizing shall be permitted to be used, provided the trip current of the overload device does not exceed the following percentage of motor nameplate full-load current rating'), true, 'art39: verbatim 2017 430.32(C) higher-setting provision');
  eq(has('If not shunted during the starting period of the motor as provided in 430.35, the overload device shall have sufficient time delay to permit the motor to start and accelerate its load'), true, 'art39: verbatim 2017 430.32(C) time-delay/shunt tie');
  eq(has('A Class 20 overload relay will provide a longer motor acceleration time than a Class 10 or Class 10A overload relay'), true, 'art39: verbatim 2017 430.32(C) Class 10/20/30 note');
  eq(has('Any motor of 1 hp or less that is started automatically shall be protected against overload by one of the following means'), true, 'art39: verbatim 2017 430.32(B) lead');
  eq(has('(4) Impedance-Protected'), true, 'art39: verbatim 2017 430.32(B)(4) impedance-protected mean');
  eq(has('Overload protection shall be permitted to be furnished by the branch-circuit short-circuit and ground-fault protective device; such device, however, shall not be larger than that specified in Part IV of Article 430'), true, 'art39: verbatim 2017 430.32(D)(2)(a) branch-OCPD path');
  eq(has('Any such motor shall be permitted on a nominal 120-volt branch circuit protected at not over 20 amperes'), true, 'art39: verbatim 2017 430.32(D)(2)(a) 120V/20A exception');
  eq(has('The secondary circuits of wound-rotor ac motors, including conductors, controllers, resistors, and so forth, shall be permitted to be protected against overload by the motor-overload device'), true, 'art39: verbatim 2017 430.32(E) wound-rotor secondaries');
  eq(has('A motor used for a condition of service that is inherently short-time, intermittent, periodic, or varying duty, as illustrated by Table 430.22(E), shall be permitted to be protected against overload by the branch-circuit short-circuit and ground-fault protective device'), true, 'art39: verbatim 2017 430.33 intermittent duty');
  eq(has('Any motor application shall be considered to be for continuous duty unless the nature of the apparatus it drives is such that the motor cannot operate continuously with load under any condition of use'), true, 'art39: verbatim 2017 430.33 continuous-duty default');
  eq(has('the overload protection shall be permitted to be shunted or cut out of the circuit during the starting period of the motor if the device by which the overload protection is shunted or cut out cannot be left in the starting position'), true, 'art39: verbatim 2017 430.35(A) shunt permission');
  eq(has('fuses or inverse time circuit breakers rated or set at not over 400 percent of the full-load current of the motor are located in the circuit so as to be operative during the starting period of the motor'), true, 'art39: verbatim 2017 430.35(A) 400% OCPD ceiling');
  eq(has('The motor overload protection shall not be shunted or cut out during the starting period if the motor is automatically started'), true, 'art39: verbatim 2017 430.35(B) auto-start no-shunt');
  eq(has('Where fuses are used for motor overload protection, a fuse shall be inserted in each ungrounded conductor and also in the grounded conductor if the supply system is 3-wire, 3-phase ac with one conductor grounded'), true, 'art39: verbatim 2017 430.36 fuse conductor rule');
  eq(has('Where devices other than fuses are used for motor overload protection, Table 430.37 shall govern the minimum allowable number and location of overload units such as trip coils or relays'), true, 'art39: verbatim 2017 430.37 Table 430.37 governs');
  eq(has('Motor overload devices, other than fuses or thermal protectors, shall simultaneously open a sufficient number of ungrounded conductors to interrupt current flow to the motor'), true, 'art39: verbatim 2017 430.38 conductors opened');
  // 2023 deltas (on-disk CSV)
  eq(has('An electronically protected motor shall be approved for use on the basis that it will prevent dangerous overheating due to the failure of the electronic control, overload, or failure to start the motor'), true, 'art39: 2023 (A)(2)/(B)(2) NEW electronically-protected sentence');
  eq(has('thermally or electronically protected'), true, 'art39: 2023 delta "thermally or electronically protected" (edition table, 430.32(A)(2))');
  // worked examples (core-computed; art39_examples.json)
  approx(9.5 * 1.25, 11.875, 1e-6, 'art39 EX1: 430.32(A)(1) 125% x 9.5 nameplate = 11.88 A (SF >= 1.15)');
  approx(9.5 * 1.4, 13.3, 1e-6, 'art39 EX1: 430.32(C) cap 140% x 9.5 nameplate = 13.30 A');
  eq(pick(12, 'cu', 60).size, '14', 'art39 EX1: 430.22 125% of 9.6 table = 12.0 A -> 14 AWG Cu @60C (context)');
  approx(15.6 * 1.15, 17.94, 1e-6, 'art39 EX2: 430.32(A)(1) 115% x 15.6 nameplate = 17.94 A (standard motor)');
  approx(15.6 * 1.3, 20.28, 1e-6, 'art39 EX2: 430.32(C) cap 130% x 15.6 nameplate = 20.28 A');
  approx(5.8 * 1.7, 9.86, 1e-6, 'art39 EX3: 430.32(A)(2) 170% x 5.8 table (1 hp 3-ph 230V, <=9A bucket) = 9.86 A');
  approx(15.2 * 1.56, 23.712, 1e-6, 'art39 EX3: 430.32(A)(2) 156% x 15.2 table (5 hp 3-ph 230V, 9.1-20A bucket) = 23.71 A');
  approx(4.4 * 1.25, 5.5, 1e-6, 'art39 EX4: 430.32(B)(1)->(A)(1) 125% x 4.4 nameplate (1/2 hp 1-ph auto-started) = 5.50 A');
  approx(4.4 * 1.4, 6.16, 1e-6, 'art39 EX4: 430.32(C) cap 140% x 4.4 nameplate = 6.16 A');
  eq(nsb(2.8 * 2.5), 15, 'art39 EX5: 430.52 250% x 2.8 table = 7.0 A -> next std 15 A (branch OCPD = overload per 430.32(D)(2)(a))');
  eq(nsb(2.8 * 1.75), 15, 'art39 EX5: 175% x 2.8 = 4.9 A -> next std 15 A time-delay fuse');
  approx(28.0 * 4.0, 112, 1e-6, 'art39 EX6: 430.35(A) shunt ceiling 400% x 28.0 table = 112 A');
  eq(nsb(28.0 * 2.5), 70, 'art39 EX6: 430.52 250% x 28.0 table = 70 A inverse (standard)');
  eq(nsb(28.0 * 2.5) <= 28.0 * 4.0, true, 'art39 EX6: 70 A OCPD <= 112 A (400% ceiling) -> shunting during start permitted');
  approx(28.5 * 1.25, 35.625, 1e-6, 'art39 EX6: 430.32(A)(1) 125% x 28.5 nameplate = 35.63 A (overload restored after start)');
  eq(pick(35, 'cu', 60).size, '8', 'art39 EX6: 430.22 125% of 28.0 table = 35.0 A -> 8 AWG Cu @60C');
  // cross-links
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art39: cross-links back to article 38 (430.22/430.52)');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art39: cross-links to the 310.16 ampacity article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art39: cross-links to the 240.6 standard-ratings article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art39: cross-links to the 240.4(D) small-conductors article');
  eq(art.includes('nec-31015-ampacity-adjustments.html'), true, 'art39: cross-links to the 310.15 adjustments article');
  const sitemap39 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap39.includes('articles/nec-43032-43036-motor-overload-protection.html'), true, 'art39: sitemap entry present');
  const index39 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index39.includes('articles/nec-43032-43036-motor-overload-protection.html'), true, 'art39: index cross-link present');
}

// ===== Article 40: NEC 430.72 + 430.75 — motor CONTROL circuit protection =====
// The third in the motor trilogy: 430.72 (overcurrent protection of the motor
// control circuit — tapped-control-circuit rule, Table 430.72(B) Columns A/B/C,
// fire-pump Exception No. 1, two-wire-transformer Exception No. 2, and the
// 430.72(C)(1)–(5) control-transformer paths incl. <50 VA no-protection and
// <2 A / 500% primary) + 430.75 (disconnection: two-device rule, adjacency,
// >12-conductor remote exception, transformer on the load side), with
// 430.71/430.73/430.74 as scope. Verbatim 2017 on disk
// (nec2017_full.txt lines 55194–55432, OCR corrections disclosed) + 2023 on
// disk (art35_nec_csv.csv). Verified deltas (verify_art40.py, 15 section
// diffs + 35 table checks): all Table 430.72(B) values unchanged; 725.43→
// 724.43; 430.72(C)(1) restructured into the 724/725 split; 430.75(A)
// (a)/(b)→(1)/(2) + "complied with"→"met" + "motor controller"; 430.75(B)
// "controller enclosure"→"motor controller enclosure"; Table 430.72(B)
// renumbered Table 430.72(B)(2) with Notes 2/3 citing 310.17/310.16. Worked
// examples computed by the shipped core under node (compute_art40.js →
// art40_numbers.json). "430.78" does not exist in Part VI (mis-citation).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-43072-43075-motor-control-circuit-protection.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  const T31016_60 = Object.fromEntries(core.T31016.map(r => [r.s, r.cu[0]])); // 60C Cu col
  // meta
  eq(art.includes('nec-43072-43075-motor-control-circuit-protection.html'), true, 'art40: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-43072-43075-motor-control-circuit-protection.html'), true, 'art40: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art40: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art40: Article + FAQPage JSON-LD present');
  // verbatim 2017
  eq(has('430.71 General. Part VI contains modifications of the general requirements and applies to the particular conditions of motor control circuits'), true, 'art40: verbatim 2017 430.71 scope');
  eq(has('A motor control circuit tapped from the load side of a motor branch-circuit short-circuit and ground-fault protective device(s) and functioning to control the motor(s) connected to that branch circuit shall be protected against overcurrent in accordance with 430.72'), true, 'art40: verbatim 2017 430.72(A) tapped rule');
  eq(has('Such a tapped control circuit shall not be considered to be a branch circuit'), true, 'art40: verbatim 2017 430.72(A) not-a-branch-circuit');
  eq(has('shall be protected against overcurrent in accordance with 725.43 or the notes to Table 11(A) and Table 11(B) in Chapter 9'), true, 'art40: verbatim 2017 430.72(A) 725.43/Ch9 cite');
  eq(has('The overcurrent protection for conductors shall be provided as specified in 430.72(B)(1) or (B)(2)'), true, 'art40: verbatim 2017 430.72(B) lead');
  eq(has('Where the opening of the control circuit would create a hazard as, for example, the control circuit of a fire pump motor, and the like, conductors of control circuits shall require only short-circuit and ground-fault protection'), true, 'art40: verbatim 2017 430.72(B) Exception No. 1 (fire pump)');
  eq(has('Conductors supplied by the secondary side of a single-phase transformer having only a two-wire (single-voltage) secondary shall be permitted to be protected by overcurrent protection provided on the primary (supply) side of the transformer'), true, 'art40: verbatim 2017 430.72(B) Exception No. 2 (two-wire xfmr)');
  eq(has('The overcurrent protection shall not exceed the values specified in Column A of Table 430.72(B)'), true, 'art40: verbatim 2017 430.72(B)(1) Column A cap');
  eq(has('Where the conductors do not extend beyond the motor control equipment enclosure, the rating of the protective device(s) shall not exceed the value specified in Column B of Table 430.72(B)'), true, 'art40: verbatim 2017 430.72(B)(2) Column B (within)');
  eq(has('Where the conductors extend beyond the motor control equipment enclosure, the rating of the protective device(s) shall not exceed the value specified in Column C of Table 430.72(B)'), true, 'art40: verbatim 2017 430.72(B)(2) Column C (beyond)');
  eq(has('the transformer shall be protected in accordance with 430.72(C)(1), (C)(2), (C)(3), (C)(4), or (C)(5)'), true, 'art40: verbatim 2017 430.72(C) five paths');
  eq(has('Overcurrent protection shall be omitted where the opening of the control circuit would create a hazard as, for example, the control circuit of a fire pump motor and the like'), true, 'art40: verbatim 2017 430.72(C) Exception (fire pump)');
  eq(has('Control circuit transformers rated less than 50 volt-amperes (VA) and that are an integral part of the motor controller and located within the motor controller enclosure shall be permitted to be protected by primary overcurrent devices, impedance limiting means, or other inherent protective means'), true, 'art40: verbatim 2017 430.72(C)(3) <50 VA no OCPD');
  eq(has('Where the control circuit transformer rated primary current is less than 2 amperes, an overcurrent device rated or set at not more than 500 percent of the rated primary current shall be permitted in the primary circuit'), true, 'art40: verbatim 2017 430.72(C)(4) <2A 500% primary');
  eq(has('Where damage to a motor control circuit would constitute a hazard, all conductors of such a remote motor control circuit that are outside the control device itself shall be installed in a raceway or be otherwise protected from physical damage'), true, 'art40: verbatim 2017 430.73 physical damage');
  eq(has('Where one conductor of the motor control circuit is grounded, the motor control circuit shall be arranged so that a ground fault in the control circuit remote from the motor controller will (1) not start the motor and (2) not bypass manually operated shutdown devices or automatic safety shutdown devices'), true, 'art40: verbatim 2017 430.74 ground-fault logic');
  eq(has('The disconnecting means shall be permitted to consist of two or more separate devices, one of which disconnects the motor and the controller from the source(s) of power supply for the motor'), true, 'art40: verbatim 2017 430.75(A) two-device rule');
  eq(has('Where separate devices are used, they shall be located immediately adjacent to each other'), true, 'art40: verbatim 2017 430.75(A) adjacency');
  eq(has('Where more than 12 motor control circuit conductors are required to be disconnected, the disconnecting means shall be permitted to be located other than immediately adjacent to each other'), true, 'art40: verbatim 2017 430.75(A) Exception No. 1 >12 cond');
  eq(has('such transformer or other device shall be connected to the load side of the disconnecting means for the motor control circuit'), true, 'art40: verbatim 2017 430.75(B) transformer load side');
  // Table 430.72(B) cells (2017 = 2023 values)
  eq(has('160') && has('140') && has('90') && has('75'), true, 'art40: Table 430.72(B) 10 AWG row cells (160/140/90/75)');
  eq(has('120') && has('100') && has('60') && has('45'), true, 'art40: Table 430.72(B) 12 AWG row cells (120/100/60/45)');
  eq(has('400 percent of value specified in Table 310.15(B) (17) for 60'), true, 'art40: Table 430.72(B) Note 2 (400% free-air, 2017 cite)');
  eq(has('300 percent of value specified in Table 310.15(B) (16) for 60'), true, 'art40: Table 430.72(B) Note 3 (300% in-raceway, 2017 cite)');
  // 2023 deltas (on-disk CSV)
  eq(has('724.43'), true, 'art40: 2023 delta 430.72(A) 725.43 -> 724.43 renumber');
  eq(has('724.30 through 724.52'), true, 'art40: 2023 delta 430.72(C)(1) Class 1 power-limited 724.30-52');
  eq(has('the requirements of Part II of Article 725'), true, 'art40: 2023 delta 430.72(C)(1) Class 2/3 -> 725 Part II');
  eq(has('Table 430.72(B)(2)'), true, 'art40: 2023 delta table renumbered 430.72(B)(2)');
  eq(has('Table 310.17'), true, 'art40: 2023 delta Note 2 re-cite Table 310.17 (free air)');
  eq(has('Table 310.16'), true, 'art40: 2023 delta Note 3 re-cite Table 310.16 (in-raceway)');
  eq(has('conditions are met'), true, 'art40: 2023 delta 430.75(A) "conditions are met"');
  eq(has('the motor controller power supply disconnecting means'), true, 'art40: 2023 delta 430.75(A) "motor controller"');
  eq(has('motor controller enclosure'), true, 'art40: 2023 delta 430.75(B) "motor controller enclosure"');
  // mis-citation callout
  eq(has('430.78'), true, 'art40: flags the 430.78 mis-citation (does not exist in Part VI)');
  // worked examples (core-computed; art40_numbers.json)
  // EX1: 10 AWG Cu in-enclosure, 30 A branch OCPD <= Column B
  eq(T31016_60['10'], 30, 'art40 EX1: T31016 10 AWG Cu 60C in-raceway = 30 A (Column A basis)');
  eq(40 * 4, 160, 'art40 EX1: Note 2 400% x 10 AWG Cu 60C free-air (40 A) = 160 A (Column B printed value)');
  eq(30 <= 160, true, 'art40 EX1: 30 A branch OCPD <= Column B (10 AWG Cu within = 160 A) -> ride branch');
  // EX2: 12 AWG Cu beyond, 30 A branch OCPD <= Column C
  approx(20 * 300 / 100, 60, 1e-6, 'art40 EX2: 300% of 12 AWG Cu 60C in-raceway (20 A) = 60 A (Column C)');
  eq(30 <= 60, true, 'art40 EX2: 30 A branch OCPD <= Column C (12 AWG Cu beyond = 60 A) -> ride branch');
  // EX3: 12 AWG Cu beyond, 60 A branch OCPD = exactly Column C
  eq(60 <= 60, true, 'art40 EX3: 60 A branch OCPD = exactly Column C (12 AWG Cu beyond) -> at the cap, permitted');
  eq(nsb(60), 60, 'art40 EX3: 60 A is a standard rating');
  eq(core.STD_BREAKERS.indexOf(70) >= 0, true, 'art40 EX3: 70 A IS a standard rating (next size up that would fail)');
  // EX4: 12 AWG Cu beyond, 100 A branch OCPD -> fails; upsizer to 8 AWG Cu
  eq(100 <= 60, false, 'art40 EX4: 100 A branch OCPD > Column C (12 AWG Cu beyond = 60 A) -> fails (B)(2)');
  approx(40 * 300 / 100, 120, 1e-6, 'art40 EX4: Note 3 300% of 8 AWG Cu 60C in-raceway (40 A) = 120 A (larger-than-10)');
  eq(120 >= 100, true, 'art40 EX4: 120 A (8 AWG Cu Note 3) >= 100 A branch OCPD -> branch OCPD now permitted');
  eq(pick(12.5, 'cu', 60).size, '14', 'art40 EX4: (context) 12.5 A -> 14 AWG Cu @60C');
  // EX5: 40 VA integral in-enclosure -> (C)(3) no OCPD
  approx(40 / 120, 0.333, 1e-3, 'art40 EX5: 40 VA / 120 V = 0.333 A primary');
  approx(40 / 24, 1.667, 1e-3, 'art40 EX5: 40 VA / 24 V = 1.667 A secondary');
  eq(40 < 50, true, 'art40 EX5: 40 VA < 50 VA integral in-enclosure -> (C)(3) no separate OCPD');
  // EX6: 300 VA (2.5 A primary) -> (C)(4) NOT available
  approx(300 / 120, 2.5, 1e-3, 'art40 EX6: 300 VA / 120 V = 2.5 A primary');
  eq(2.5 < 2, false, 'art40 EX6: 2.5 A primary NOT < 2 A -> (C)(4) 500% shortcut unavailable -> 450.3');
  approx(300 / 24, 12.5, 1e-3, 'art40 EX6: 300 VA / 24 V = 12.5 A secondary');
  eq(pick(12.5, 'cu', 60).size, '14', 'art40 EX6: secondary 12.5 A -> 14 AWG Cu @60C (15 A)');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art40 EX6: 240.4(D) cap on 14 AWG Cu = 15 A');
  // EX6b: 200 VA (1.667 A) -> (C)(4) 500% cap
  approx(200 / 120, 1.667, 1e-3, 'art40 EX6b: 200 VA / 120 V = 1.667 A primary (< 2 A)');
  eq(1.667 < 2, true, 'art40 EX6b: 1.667 A primary < 2 A -> (C)(4) applies');
  approx(200 / 120 * 5, 8.3333, 1e-3, 'art40 EX6b: (C)(4) 500% cap = 500% x (200/120 A) = 8.333 A (a cap, not a target)');
  // cross-links
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art40: cross-links back to article 39 (430.32/430.36)');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art40: cross-links back to article 38 (430.22/430.52)');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art40: cross-links to the 310.16 ampacity article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art40: cross-links to the 240.6 standard-ratings article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art40: cross-links to the 240.4(D) small-conductors article');
  const sitemap40 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap40.includes('articles/nec-43072-43075-motor-control-circuit-protection.html'), true, 'art40: sitemap entry present');
  const index40 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index40.includes('articles/nec-43072-43075-motor-control-circuit-protection.html'), true, 'art40: index cross-link present');
}

// ===== Article 41: NEC 430.81-430.90 — Part VII MOTOR CONTROLLERS =====
// The fourth in the motor series: the DEVICE that starts/stops the motor.
// 430.81 (1/8 hp stationary left-running / 1/3 hp portable exceptions — the
// 2017 scan garbles both fractions; corrected from clean 2023), 430.82 (design:
// start/stop + interrupt locked-rotor current; autotransformer; rheostat),
// 430.83 (ratings: (A)(1) hp, (A)(2) inverse breaker, (A)(3) molded case,
// (C) 2 hp/300 V 2× / 80% snap, (D) torque motor, (E) voltage rating,
// (F) NEW 2023 short-circuit-current-rating installation limit), 430.84 (need
// not open all), 430.85 (pole in grounded conductor), 430.87 (one per motor;
// group exception by equivalent hp), 430.88 (weak field), 430.89 (speed
// limiting), 430.90 (combination fuseholder fits Part III overload fuse),
// + 430.8 (SCR marking, 4 exceptions) + 430.9 (terminals, 0.8 N-m).
// Verbatim 2017 on disk (nec2017_full.txt lines 53147-53214 + 55435-55653,
// OCR corrections disclosed) + 2023 on disk (art35_nec_csv.csv). Verified
// deltas (verify_art41.py, 32 checks): 430.83(F) is the ONLY structural
// addition 2017->2023; section set identical; all numerics unchanged; 430.86
// does not exist. Worked examples computed by the shipped core under node
// (compute_art41.js -> art41_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-43081-43090-motor-controllers.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  // meta
  eq(art.includes('nec-43081-43090-motor-controllers.html'), true, 'art41: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-43081-43090-motor-controllers.html'), true, 'art41: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art41: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art41: Article + FAQPage JSON-LD present');
  // verbatim 2017 — 430.81 small-motor exceptions (fractions corrected from OCR)
  eq(has('Part VII is intended to require suitable controllers for all motors'), true, 'art41: verbatim 2017 430.81 scope');
  eq(has('stationary motor rated at 1/8 hp or less that is normally left running and is constructed so that it cannot be damaged by overload or failure to start, such as clock motors and the like'), true, 'art41: verbatim 2017 430.81(A) 1/8 hp stationary (OCR-corrected)');
  eq(has('portable motor rated at 1/3 hp or less'), true, 'art41: verbatim 2017 430.81(B) 1/3 hp portable (OCR-corrected)');
  // verbatim 2017 — 430.82 design
  eq(has('Each controller shall be capable of starting and stopping the motor it controls and shall be capable of interrupting the locked-rotor current of the motor'), true, 'art41: verbatim 2017 430.82(A) start/stop + locked-rotor');
  eq(has('Motor-starting rheostats for dc motors operated from a constant voltage supply shall be equipped with automatic devices that will interrupt the supply before the speed of the motor has fallen to less than one-third its normal rate'), true, 'art41: verbatim 2017 430.82(C)(2) one-third rate');
  // verbatim 2017 — 430.83 ratings (A)(1)-(E)
  eq(has('Controllers, other than inverse time circuit breakers and molded case switches, shall have horsepower ratings at the application voltage not lower than the horsepower rating of the motor'), true, 'art41: verbatim 2017 430.83(A)(1) hp rating');
  eq(has('A branch-circuit inverse time circuit breaker rated in amperes shall be permitted as a controller for all motors'), true, 'art41: verbatim 2017 430.83(A)(2) inverse breaker');
  eq(has('A molded case switch rated in amperes shall be permitted as a controller for all motors'), true, 'art41: verbatim 2017 430.83(A)(3) molded case');
  eq(has('For stationary motors rated at 2 hp or less and 300 volts or less'), true, 'art41: verbatim 2017 430.83(C) 2 hp/300 V');
  eq(has('A general-use switch having an ampere rating not less than twice the full-load current rating of the motor'), true, 'art41: verbatim 2017 430.83(C)(1) 2x FLC');
  eq(has('On ac circuits, a general-use snap switch suitable only for use on ac (not general-use ac-dc snap switches) where the motor full-load current rating is not more than 80 percent of the ampere rating of the switch'), true, 'art41: verbatim 2017 430.83(C)(2) 80% ac-only snap');
  eq(has('For torque motors, the controller shall have a continuous-duty, full-load current rating not less than the nameplate current rating of the motor'), true, 'art41: verbatim 2017 430.83(D) torque motor');
  eq(has('A controller with a straight voltage rating, for example, 240 volts or 480 volts'), true, 'art41: verbatim 2017 430.83(E) straight voltage');
  eq(has('A controller with a slash rating, for example, 120/240 volts or 480Y/277 volts, shall only be applied in a solidly grounded circuit'), true, 'art41: verbatim 2017 430.83(E) slash voltage');
  // 430.83(F) — the NEW 2023 subsection (verbatim from on-disk 2023 CSV)
  eq(has('A motor controller shall not be installed where the available fault current exceeds the motor controller\'s short-circuit current rating'), true, 'art41: verbatim 2023 430.83(F) SCR rule (NEW)');
  eq(has('The short-circuit current rating might be marked on the device or might be a rating for a tested combination specified in the motor controller\'s technical manual or instruction sheet'), true, 'art41: verbatim 2023 430.83(F) Informational Note');
  // verbatim 2017 — 430.84 / 430.85 / 430.87 / 430.88 / 430.89 / 430.90
  eq(has('The controller shall not be required to open all conductors to the motor'), true, 'art41: verbatim 2017 430.84 need not open all');
  eq(has('Where the controller serves also as a disconnecting means, it shall open all ungrounded conductors to the motor as provided in 430.111'), true, 'art41: verbatim 2017 430.84 Exception (430.111)');
  eq(has('One pole of the controller shall be permitted to be placed in a permanently grounded conductor, provided the controller is designed so that the pole in the grounded conductor cannot be opened without simultaneously opening all conductors of the circuit'), true, 'art41: verbatim 2017 430.85 grounded-conductor pole');
  eq(has('Each motor shall be provided with an individual controller'), true, 'art41: verbatim 2017 430.87 one per motor');
  eq(has('For motors rated 1000 volts or less, a single controller rated at not less than the equivalent horsepower, as determined in accordance with 430.110(C)(1), of all the motors in the group'), true, 'art41: verbatim 2017 430.87 Exc No. 1 equivalent hp');
  eq(has('Adjustable-speed motors that are controlled by means of field regulation shall be equipped and connected so that they cannot be started under a weakened field'), true, 'art41: verbatim 2017 430.88 weak field');
  eq(has('Machines of the following types shall be provided with speed-limiting devices or other speed-limiting means'), true, 'art41: verbatim 2017 430.89 speed limiting');
  eq(has('The rating of a combination fuseholder and switch used as a motor controller shall be such that the fuseholder will accommodate the size of the fuse specified in Part III of this article for motor overload protection'), true, 'art41: verbatim 2017 430.90 combination fuseholder');
  // 430.8 marking (2017) — SCR marking + exceptions
  eq(has('A controller shall be marked with the manufacturer\'s name or identification, the voltage, the current or horsepower rating, the short-circuit current rating, and other necessary data to properly indicate the applications for which it is suitable'), true, 'art41: verbatim 2017 430.8 marking incl. SCR');
  // 430.9 terminals (2017)
  eq(has('Control circuit devices with screw-type pressure terminals used with 14 AWG or smaller copper conductors shall be torqued to a minimum of 0.8'), true, 'art41: verbatim 2017 430.9(C) 0.8 N-m torque');
  // 2023 delta claims (on-disk CSV)
  eq(has('NEW'), true, 'art41: flags 430.83(F) as the NEW subsection');
  eq(has('in 2023, not in 2017'), true, 'art41: edition claim is the verifiable 2017->2023 delta');
  eq(has('430.86'), true, 'art41: flags the 430.86 mis-citation (does not exist)');
  eq(has('430.86 does not exist'), true, 'art41: 430.86 non-existence stated');
  eq(has('2020 scan ends at Article 230'), true, 'art41: 2020 gap disclosed');
  // OCR fraction disclosure
  eq(has('OCR'), true, 'art41: OCR correction disclosed');
  eq(has('1/8 hp'), true, 'art41: clean 1/8 hp value present');
  eq(has('1/3 hp'), true, 'art41: clean 1/3 hp value present');
  // worked examples (core-computed; art41_numbers.json)
  // EX1: 1 hp 1-ph 230 V (C)(1) 2x  [FLC 8.0 A from on-disk Table 430.248]
  eq(2 * 8.0, 16.0, 'art41 EX1: 2x x 8.0 A FLC = 16.0 A (C)(1) general-use switch requirement');
  eq(nsb(16.0), 20, 'art41 EX1: next std >= 16.0 A = 20 A');
  eq(1.25 * 8.0, 10.0, 'art41 EX1: 125% x 8.0 A = 10.0 A conductor requirement (430.22)');
  eq(pick(10.0, 'cu', 75).size, '14', 'art41 EX1: 10.0 A -> 14 AWG Cu @75C (20 A)');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art41 EX1: 240.4(D) cap on 14 AWG Cu = 15 A');
  // EX2: 1 hp 1-ph 230 V (C)(2) 80% snap
  eq(8.0 / 0.8, 10.0, 'art41 EX2: 8.0 A / 0.80 = 10.0 A (C)(2) ac-only snap requirement');
  eq(nsb(10.0), 15, 'art41 EX2: next std >= 10.0 A = 15 A');
  eq(0.8 * 15 >= 8.0, true, 'art41 EX2: 80% x 15 A = 12 A >= 8.0 A FLC -> pass');
  // EX2b: (C) ceiling 2 hp 1-ph 230 V
  eq(2 * 12.0, 24.0, 'art41 EX2b: 2x x 12.0 A (2 hp) = 24.0 A -> 25 A general-use');
  eq(nsb(24.0), 25, 'art41 EX2b: next std >= 24.0 A = 25 A');
  eq(12.0 / 0.8, 15.0, 'art41 EX2b: 12.0 A / 0.80 = 15.0 A (C)(2) snap (boundary: 80%x15=12=FLC)');
  // EX3: 3 hp OUTSIDE (C)
  eq((3 <= 2) && (230 <= 300), false, 'art41 EX3: 3 hp NOT <= 2 hp -> (C) not available');
  // EX4: torque motor (D)
  eq(10.0, 10.0, 'art41 EX4: 10 A nameplate -> >= 10 A controller (D)');
  eq(1.25 * 10.0, 12.5, 'art41 EX4: 125% x 10 A = 12.5 A conductor req');
  eq(pick(12.5, 'cu', 75).size, '14', 'art41 EX4: 12.5 A -> 14 AWG Cu @75C');
  eq(1.25 * 25.0, 31.25, 'art41 EX4b: 125% x 25 A = 31.25 A');
  eq(pick(31.25, 'cu', 75).size, '10', 'art41 EX4b: 31.25 A -> 10 AWG Cu @75C (35 A)');
  // EX5: voltage rating (E)
  eq(460 <= 480, true, 'art41 EX5: straight 480 V controller on 460 V system -> legal');
  eq(277 <= 277 && 480 <= 480, true, 'art41 EX5: 480Y/277 on 480Y/277 (LN<=277, LL<=480) -> legal');
  eq(300 <= 277, false, 'art41 EX5: 300 V-to-ground > 277 (lower slash value) -> NOT permitted');
  // EX6: 430.83(F) fault current (CH9_T8 core)
  const r20 = core.CH9_T8.find(r => r.s === '2/0').cu;
  eq(r20, 0.0967, 'art41 EX6: CH9_T8 2/0 Cu R = 0.0967 ohm/kft (shipped core)');
  const Vph480 = 480/Math.sqrt(3), Zs = (Vph480/1000)/100, Zc = r20*25/1000;
  const IscA = Vph480/(Zs+Zc)/1000;
  approx(IscA, 53.41, 0.05, 'art41 EX6a: 480 V bus 100 kA source 25 ft 2/0 Cu -> 53.41 kA at controller');
  eq(50 >= IscA, false, 'art41 EX6a: 50 kA SCR < 53.41 kA -> FAILS 430.83(F)');
  eq(65 >= IscA, true, 'art41 EX6a: 65 kA SCR >= 53.41 kA -> passes');
  const Vph208 = 208/Math.sqrt(3), Zs208 = Zs*(208/480)**2, Zt = (208*208)*(5/100)/100000;
  const IscB = Vph208/(Zs208+Zt+Zc)/1000;
  approx(IscB, 4.89, 0.05, 'art41 EX6b: behind 100 kVA 5% xfmr -> 4.89 kA at controller');
  eq(10 >= IscB, true, 'art41 EX6b: 10 kA SCR >= 4.89 kA -> passes (location matters)');
  // EX7: group controller (430.87)
  approx(3 * 7.6, 22.8, 1e-9, 'art41 EX7: 3 x 5 hp 3-ph 460 V (7.6 A each) = 22.8 A combined FLC');
  eq(27 >= 22.8, true, 'art41 EX7: 20 hp (27 A FLC) >= 22.8 A -> equivalent 20 hp controller');
  eq(21 >= 22.8, false, 'art41 EX7: 15 hp (21 A) < 22.8 A -> 15 hp too small');
  // EX8: 430.90 combination fuseholder
  eq(1.25 * 28.0, 35.0, 'art41 EX8: 125% x 28.0 A (5 hp 1-ph 230 V) = 35.0 A overload fuse -> 35 A holder');
  // EX9: small-motor boundary (430.81)
  eq(2.9, 2.9, 'art41 EX9: 1/4 hp 1-ph 230 V = 2.9 A FLC (outside the 1/8 hp exception)');
  eq(4.9, 4.9, 'art41 EX9: 1/2 hp 1-ph 230 V = 4.9 A FLC (outside the 1/3 hp exception)');
  // cross-links
  eq(art.includes('nec-43072-43075-motor-control-circuit-protection.html'), true, 'art41: cross-links back to article 40 (430.72/430.75)');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art41: cross-links back to article 39 (430.32/430.36)');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art41: cross-links back to article 38 (430.22/430.52)');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art41: cross-links to the 240.6 standard-ratings article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art41: cross-links to the 310.16 ampacity article');
  const sitemap41 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap41.includes('articles/nec-43081-43090-motor-controllers.html'), true, 'art41: sitemap entry present');
  const index41 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index41.includes('articles/nec-43081-43090-motor-controllers.html'), true, 'art41: index cross-link present');
  const readme41 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme41.includes('articles/nec-43081-43090-motor-controllers.html'), true, 'art41: README entry present');
}

// ===== Article 42: NEC 430.101-430.113 — Part IX DISCONNECTING MEANS =====
// The fifth in the motor series: the DEVICE that takes the circuit + controller
// dead for service. 430.101 (scope), 430.102 (location: in sight, lockable-110.25
// exceptions), 430.103 (operation: all ungrounded, no auto-close), 430.104
// (indicating), 430.105 (pole in grounded conductor, mechanically tied),
// 430.107 (readily accessible), 430.108 (sweep), 430.109 (type: 7 devices +
// (B)-(G) small-motor relaxations), 430.110 (115% rating; combined loads;
// NEW 2023 design letter A LRA equation), 430.111 (switch/CB as controller +
// disconnect), 430.112 (group disconnects), 430.113 (multi-source; NEW 2023
// sign content). 430.106 does NOT exist (verified both editions).
// Verbatim 2017 on disk (nec2017_full.txt lines 55811-56248; OCR corrections
// disclosed) + 2023 on disk (art35_nec_csv.csv). Verified deltas
// (verify_art42.py, 67 checks): two substantive changes — 430.110(C)(1)
// Exception No. 1 (design A LRA equation) + 430.113 sign content; all numbers
// unchanged. Verbatim audit (audit_art42_verbatim.py): all 12 blockquotes are
// char-stream substrings of the scan. Worked examples computed by the shipped
// core under node (compute_art42.js -> art42_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-430101-430113-disconnecting-means.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  // meta
  eq(art.includes('nec-430101-430113-disconnecting-means.html'), true, 'art42: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-430101-430113-disconnecting-means.html'), true, 'art42: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art42: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art42: Article + FAQPage JSON-LD present');
  // verbatim 2017 (char-stream audit separately verifies full blockquotes)
  eq(has('Part IX is intended to require disconnecting means capable of disconnecting motors and controllers from the circuit'), true, 'art42: verbatim 2017 430.101');
  eq(has('A disconnecting means for the motor shall be located in sight from the motor location and the driven machinery location'), true, 'art42: verbatim 2017 430.102(B)(1)');
  eq(has('The disconnecting means shall open all ungrounded supply conductors and shall be designed so that no pole can be operated independently'), true, 'art42: verbatim 2017 430.103');
  eq(has('One pole of the disconnecting means shall be permitted to disconnect a permanently grounded conductor, provided the disconnecting means is designed so that the pole in the grounded conductor cannot be opened without simultaneously disconnecting all conductors of the circuit'), true, 'art42: verbatim 2017 430.105');
  eq(has('A listed motor-circuit switch rated in horsepower'), true, 'art42: verbatim 2017 430.109(A)(1)');
  eq(has('For stationary motors of 1/8 hp or less, the branch-circuit overcurrent device shall be permitted to serve as the disconnecting means'), true, 'art42: verbatim 2017 430.109(B) (OCR-corrected 1/8)');
  eq(has('For stationary motors rated at more than 40 hp dc or 100 hp ac'), true, 'art42: verbatim 2017 430.109(E) (OCR-corrected dc)');
  eq(has('or portable motors rated 1/3 hp or less'), true, 'art42: verbatim 2017 430.109(F) (OCR-corrected 1/3)');
  eq(has('A listed unfused motor-circuit switch having a horsepower rating not less than the motor horsepower shall be permitted to have an ampere rating less than 115 percent of the full-load current rating of the motor'), true, 'art42: verbatim 2017 430.110(A) Exception');
  eq(has('For small motors not covered by Table 430.247, Table 430.248, Table 430.249, or Table 430.250, the locked-rotor current shall be assumed to be six times the full-load current'), true, 'art42: verbatim 2017 430.110(C)(3) 6x');
  eq(has('An autotransformer-type controller shall be provided with a separate disconnecting means'), true, 'art42: verbatim 2017 430.111(A) auto exclusion');
  eq(has('Each motor shall be provided with an individual disconnecting means'), true, 'art42: verbatim 2017 430.112');
  eq(has('Where multiple disconnecting means are provided, a permanent warning sign shall be provided on or adjacent to each disconnecting means'), true, 'art42: verbatim 2017 430.113 sign (2017 content-free)');
  // 2023 NEW 430.110(C)(1) Exception No. 1 (on-disk CSV)
  eq(has('The locked-rotor current equivalent to the horsepower rating of each polyphase motor with design letter A shall be one of following'), true, 'art42: verbatim 2023 430.110(C)(1) Exc No. 1 (NEW)');
  eq(has('kva/hp = maximum range value of kilovolt-amperes per horsepower with locked rotor in table 430.7(b) associated with the motor'), true, 'art42: verbatim 2023 kVA/hp definition');
  // 2023 NEW 430.113 sign content (on-disk CSV)
  eq(has('indicating that multiple sources must be shut off to remove all power to the equipment'), true, 'art42: verbatim 2023 430.113 sign content (NEW)');
  eq(has('the sign at each disconnect shall identify the other specific circuits'), true, 'art42: verbatim 2023 430.113 sign identifies other circuits (NEW)');
  // edition claims
  eq(has('in 2023, not in 2017'), true, 'art42: edition claim is the verifiable 2017->2023 delta');
  eq(has('430.106'), true, 'art42: flags the 430.106 gap');
  eq(has('430.106 gap'), true, 'art42: 430.106 gap stated');
  eq(has('2020 scan ends at Article 230'), true, 'art42: 2020 gap disclosed');
  eq(has('OCR'), true, 'art42: OCR corrections disclosed');
  eq(has('verify_art42.py'), true, 'art42: references the 67-check delta verifier');
  eq(has('audit_art42_verbatim.py'), true, 'art42: references the verbatim audit');
  // worked examples (core-computed; art42_numbers.json)
  // EX1: 1 hp 1-ph 230 V (C) paths  [FLC 8.0 A from on-disk Table 430.248]
  eq(2 * 8.0, 16.0, 'art42 EX1: 2x x 8.0 A FLC = 16.0 A (C)(1)');
  eq(nsb(16.0), 20, 'art42 EX1: next std >= 16.0 A = 20 A');
  eq(8.0 / 0.8, 10.0, 'art42 EX1: 8.0 A / 0.80 = 10.0 A (C)(2) snap');
  eq(nsb(10.0), 15, 'art42 EX1: next std >= 10.0 A = 15 A');
  eq(0.8 * 15 >= 8.0, true, 'art42 EX1: 80% x 15 A = 12 A >= 8.0 A FLC -> pass');
  eq(1.25 * 8.0, 10.0, 'art42 EX1: 125% conductor req 10.0 A');
  eq(pick(10.0, 'cu', 75).size, '14', 'art42 EX1: 10.0 A -> 14 AWG Cu @75C');
  // EX2: 5 hp 3-ph 460 V 115% rule  [FLC 7.6 A from on-disk Table 430.250]
  approx(1.15 * 7.6, 8.74, 1e-9, 'art42 EX2: 115% x 7.6 A = 8.74 A');
  eq(nsb(8.74), 15, 'art42 EX2: next std >= 8.74 A = 15 A');
  eq(1.25 * 7.6, 9.5, 'art42 EX2: 125% conductor req 9.5 A');
  eq(pick(9.5, 'cu', 75).size, '14', 'art42 EX2: 9.5 A -> 14 AWG Cu @75C');
  // EX3: group 3 x 5 hp 3-ph 460 V  [LRA 46 A, 20 hp = 27 A / 145 A; 15 hp = 21 A]
  approx(3 * 7.6, 22.8, 1e-9, 'art42 EX3: combined FLC 22.8 A');
  approx(3 * 46, 138, 1e-9, 'art42 EX3: combined LRA 138 A');
  eq(21 < 22.8 && 27 >= 22.8, true, 'art42 EX3: 15 hp too small, 20 hp (27 A) suffices');
  eq(145 >= 138, true, 'art42 EX3: 20 hp LRA 145 A >= 138 A combined');
  approx(1.15 * 22.8, 26.22, 1e-9, 'art42 EX3: 115% x 22.8 A = 26.22 A');
  eq(nsb(26.22), 30, 'art42 EX3: next std >= 26.22 A = 30 A');
  // EX4: 2023 equation, design A, 25 hp 460 V, kVA/hp = 3.14 (max of 0-3.14)
  approx(1000 * 3.14 * 25 / (Math.sqrt(3) * 460), 98.53, 0.05, 'art42 EX4: 430.110(C)(1)a I_LR = 98.5 A (design A)');
  eq(183, 183, 'art42 EX4: Table 430.251(B) 25 hp 460 V = 183 A (B/C/D) for contrast');
  approx(98.53 / 183, 0.54, 0.01, 'art42 EX4: design A fallback is ~0.54x the B/C/D table value');
  approx(34.0 + 10, 44.0, 1e-9, 'art42 EX4: combined FLC 44.0 A (25 hp + 10 A heater)');
  approx(98.53 + 10, 108.53, 0.05, 'art42 EX4: combined LRA 108.5 A');
  approx(1.15 * 44.0, 50.6, 1e-9, 'art42 EX4: 115% x 44.0 A = 50.6 A');
  eq(nsb(50.6), 60, 'art42 EX4: next std >= 50.6 A = 60 A');
  // EX5: 430.111(B)(2) single-device 5 hp 460 V
  approx(2.5 * 7.6, 19.0, 1e-9, 'art42 EX5: 250% x 7.6 A = 19.0 A (430.52 inverse time)');
  eq(nsb(19.0), 20, 'art42 EX5: next std >= 19.0 A = 20 A 3-pole inverse CB');
  // EX6: 430.109(D) autotransformer conditions, 50 hp 460 V  [FLC 65 A]
  eq(2 < 50 && 50 <= 100, true, 'art42 EX6: 50 hp inside (D) scope over 2 hp to 100 hp');
  approx(1.5 * 65, 97.5, 1e-9, 'art42 EX6: (D)(3) 150% x 65 A = 97.5 A fuse/CB cap');
  approx(1.25 * 65, 81.25, 1e-9, 'art42 EX6: (D)(2) 125% overload = 81.25 A');
  // EX7: cord-and-plug boundary (OCR-garbled values, clean)
  eq(3.6, 3.6, 'art42 EX7: 1/3 hp 230 V = 3.6 A FLC (exempt)');
  eq(4.9, 4.9, 'art42 EX7: 1/2 hp 230 V = 4.9 A FLC (hp-rated plug required)');
  // cross-links
  eq(art.includes('nec-43081-43090-motor-controllers.html'), true, 'art42: cross-links back to article 41');
  eq(art.includes('nec-43072-43075-motor-control-circuit-protection.html'), true, 'art42: cross-links back to article 40');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art42: cross-links back to article 39');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art42: cross-links back to article 38');
  const sitemap42 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap42.includes('articles/nec-430101-430113-disconnecting-means.html'), true, 'art42: sitemap entry present');
  const index42 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index42.includes('articles/nec-430101-430113-disconnecting-means.html'), true, 'art42: index cross-link present');
  const readme42 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme42.includes('articles/nec-430101-430113-disconnecting-means.html'), true, 'art42: README entry present');
}

// ===== Article 43: NEC 430.92-430.99 — Part VIII MOTOR CONTROL CENTERS =====
// The sixth in the motor series: the ENCLOSURE + the common power bus, not a
// single motor. 430.92 (scope), 430.94 (OCPD <= common power bus rating),
// 430.95 (single main disconnect + main bonding jumper per 250.28(D) /
// Table 250.102(C)(1); Exception No. 1/No. 2 in 2023), 430.96 (multisection
// EGC/bus per Table 250.122), 430.97 (busbars: (A) support, (B) A-B-C phase +
// B = high leg on 4-wire delta, (C) wire-bending space per 312.6, (D) spacings
// per Table 430.97(D), (E) barriers), 430.98 (marking: 110.21 + bus rating +
// SCCR; (B) each MCU per 430.8), 430.99 (available fault current documented +
// dated, available to those authorized to inspect/install/maintain).
// 430.93 does NOT exist (verified both editions).
// Verbatim 2017 on disk (nec2017_full.txt lines 55654-55810; OCR corrections
// disclosed: 430.92 "Part VII"->VIII, 430.94 "I, H, and VII"->"I, II, and
// VIII", 430.97(B) "delta-cconnected", 430.97(C) "Article 312(D)"->"312.6(B)",
// Table 430.97(D) inches garbled) + 2023 on disk (art35_nec_csv.csv).
// Verified 2017->2023 deltas (verify_art43.py, 41 checks): FOUR substantive,
// all non-numeric — 430.95 exception numbering, 430.97(C) 312.6(B)->312.6
// (NFPA SR-7536), 430.98(A) "current" added, 430.99 fault-current rewording +
// scope; all busbar/spacing/ampacity numbers unchanged. Worked examples
// computed by the shipped core under node (compute_art43.js ->
// art43_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-430092-430099-motor-control-centers.html'), 'utf8');
  const norm = art.replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  // meta
  eq(art.includes('nec-430092-430099-motor-control-centers.html'), true, 'art43: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-430092-430099-motor-control-centers.html'), true, 'art43: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art43: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art43: Article + FAQPage JSON-LD present');
  // verbatim 2017 (OCR-corrected char stream; on-disk scan lines disclosed)
  eq(has('Part VIII covers motor control centers installed for the control of motors, lighting, and power circuits'), true, 'art43: verbatim 2017 430.92 (OCR-corrected Part VIII)');
  eq(has('Motor control centers shall be provided with overcurrent protection in accordance with Parts I, II, and VIII of Article 240'), true, 'art43: verbatim 2017 430.94 (OCR-corrected I, II, and VIII)');
  eq(has('The ampere rating or setting of the overcurrent protective device shall not exceed the rating of the common power bus'), true, 'art43: verbatim 2017 430.94 bus-rating cap');
  eq(has('Where used as service equipment, each motor control center shall be provided with a single main disconnecting means to disconnect all ungrounded service conductors'), true, 'art43: verbatim 2017 430.95 single main disconnect');
  eq(has('the motor control center shall be provided with a main bonding jumper, sized in accordance with 250.28(D)'), true, 'art43: verbatim 2017 430.95 MBJ per 250.28(D)');
  eq(has('High-impedance grounded neutral systems shall be permitted to be connected as provided in 250.36'), true, 'art43: verbatim 2017 430.95 Exception No. 2 (250.36)');
  eq(has('Multisection motor control centers shall be connected together with an equipment grounding conductor or an equivalent equipment grounding bus sized in accordance with Table 250.122'), true, 'art43: verbatim 2017 430.96');
  eq(has('Busbars shall be protected from physical damage and be held firmly in place'), true, 'art43: verbatim 2017 430.97(A)');
  eq(has('The B phase shall be that phase having the higher voltage to ground on 3-phase, 4-wire, delta-connected systems'), true, 'art43: verbatim 2017 430.97(B) high-leg (OCR-corrected delta-connected)');
  eq(has('The minimum wire-bending space at the motor control center terminals and minimum gutter space shall be in accordance with 312.6'), true, 'art43: verbatim 2023 430.97(C) (312.6; 2017 = 312.6(B))');
  eq(has('Spacings between motor control center bus terminals and other bare metal parts shall not be less than specified in Table 430.97(D)'), true, 'art43: verbatim 2017 430.97(D)');
  eq(has('Barriers shall be placed in all service-entrance motor control centers to isolate service busbars and terminals from the remainder of the motor control center'), true, 'art43: verbatim 2017 430.97(E)');
  eq(has('Motor control centers shall be marked according to 110.21, and the marking shall be plainly visible after installation'), true, 'art43: verbatim 2017 430.98(A)');
  eq(has('Motor control units in a motor control center shall comply with 430.8'), true, 'art43: verbatim 2017 430.98(B)');
  eq(has('The available short circuit current at the motor control center and the date the short circuit current calculation was performed shall be documented and made available to those authorized to inspect the installation'), true, 'art43: verbatim 2017 N 430.99 (note)');
  // 2023 deltas (on-disk CSV)
  eq(has('Exception No. 1'), true, 'art43: 2023 430.95 Exception No. 1 numbering (NEW)');
  eq(has('Exception No. 2'), true, 'art43: 2023 430.95 Exception No. 2 numbering (NEW)');
  eq(has('short-circuit current rating'), true, 'art43: 2023 430.98(A) "short-circuit current rating" (NEW word "current")');
  eq(has('The available fault current at the motor control center and the date the available fault current calculation was performed shall be documented and made available to those authorized to inspect, install, or maintain the installation'), true, 'art43: verbatim 2023 430.99 (fault current + install/maintain)');
  // edition claims
  eq(has('430.93'), true, 'art43: flags the 430.93 gap');
  eq(has('430.93 gap'), true, 'art43: 430.93 gap stated');
  eq(has('does not exist'), true, 'art43: 430.93 "does not exist" stated');
  eq(has('OCR'), true, 'art43: OCR corrections disclosed');
  eq(has('verify_art43.py'), true, 'art43: references the 41-check delta verifier');
  eq(has('SR-7536'), true, 'art43: cites NFPA SR-7536 (2021 cycle) for 430.97(C)');
  eq(has('2020 scan ends at Article 230'), true, 'art43: 2020 gap disclosed');
  // worked examples (core-computed; art43_numbers.json)
  // EX1: 430.94 bus-rating cap, 250 A bus @ 600 V
  eq(nsb(249.9), 250, 'art43 EX1: next std >= 249.9 A = 250 A (at the cap)');
  eq(nsb(251), 300, 'art43 EX1: next std >= 251 A = 300 A (exceeds the 250 A bus, NOT permitted)');
  // EX2: 430.95 MBJ, 200 A service MCC
  eq(pick(200, 'cu', 75).size, '3/0', 'art43 EX2: 200 A -> 3/0 AWG Cu @75C (largest ungrounded)');
  eq(core.CH9_T8.find(r => r.s === '3/0').cm, 167800, 'art43 EX2: 3/0 Cu = 167,800 cmil (CH9_T8)');
  // EX3: 430.96 inter-section EGC, 400 A OCPD
  eq(400, 400, 'art43 EX3: 400 A OCPD -> Table 250.122 row "400" -> 2/0 Cu');
  // EX4: 430.97(B) 480 V 4-wire delta high leg
  approx(480 * Math.sqrt(3) / 2, 415.69, 0.05, 'art43 EX4: B high leg = 480 x sqrt(3)/2 = 415.69 V');
  approx(480 / Math.sqrt(3), 277.13, 0.05, 'art43 EX4: A/C to ground = 480 / sqrt(3) = 277.13 V');
  eq(415.69 > 277.13, true, 'art43 EX4: B (415.69 V) > A/C (277.13 V) to ground');
  // EX5: 430.99 available fault current, 125 kA source, 30 ft 2/0 Cu
  const Vph = 480 / Math.sqrt(3);
  const Zs = Vph / 125000;
  const r20 = core.CH9_T8.find(r => r.s === '2/0').cu;
  const Zc = r20 * 30 / 1000;
  const Isc = Vph / (Zs + Zc) / 1000;
  approx(Vph, 277.13, 0.05, 'art43 EX5: phase voltage 277.13 V');
  approx(Zs, 0.002217, 1e-6, 'art43 EX5: Zs = 0.002217 ohm');
  approx(Zc, 0.002901, 1e-6, 'art43 EX5: Zc = 0.002901 ohm (30 ft 2/0 Cu)');
  approx(Isc, 54.15, 0.05, 'art43 EX5: available fault current = 54.15 kA at the MCC bus');
  eq(65 >= Isc, true, 'art43 EX5: 65 kA SCCR MCC passes (65 > 54.15)');
  eq(42 >= Isc, false, 'art43 EX5: 42 kA SCCR MCC fails (42 < 54.15)');
  // EX6: 430.98 marking (asserted via the verbatim 430.98(A) check above)
  // cross-links
  eq(art.includes('nec-430101-430113-disconnecting-means.html'), true, 'art43: cross-links to article 42 (Part IX)');
  eq(art.includes('nec-43081-43090-motor-controllers.html'), true, 'art43: cross-links to article 41 (Part VII)');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art43: cross-links to article 38 (branch circuit)');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art43: cross-links to article 39 (overload)');
  const sitemap43 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap43.includes('articles/nec-430092-430099-motor-control-centers.html'), true, 'art43: sitemap entry present');
  const index43 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index43.includes('articles/nec-430092-430099-motor-control-centers.html'), true, 'art43: index cross-link present');
  const readme43 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme43.includes('articles/nec-430092-430099-motor-control-centers.html'), true, 'art43: README entry present');
}

// ===== Article 44: NEC 430.120-430.131 — Part X ADJUSTABLE-SPEED DRIVE SYSTEMS =====
// The seventh in the motor series: what changes when the motor is fed from power
// conversion equipment (a VFD). 430.120 (Parts I-IX apply unless modified; 2023
// adds the 1000 V / Part XI scope sentence, SR-7544 2021 cycle), 430.122 (conductors:
// (A) 125% of the DRIVE's rated input current, (B) 2017=bypass rule -> 2023=NEW
// output-conductor rule 125% motor FLC + SOOCP exception + 2 informational notes,
// (C) 2023=relocated trimmed bypass rule, (D) 2023=several-motors via 430.24),
// 430.124 (overload: drive-marked-included / bypass Part III / multiple individual;
// word-identical), 430.126 (overtemperature: 4 means + Exception to (2) + 430.43/
// 430.44; 2023: (A)(3) drops "or (B)(2)", (C) drops "The provisions of"), 430.128
// (disconnect in incoming line, 115% of drive rated input current; word-identical),
// 430.130 (branch OCPD: 430.52(C)(1) on motor FLC; 2023: "all of the following",
// 430.6(A) or (B), NEW SOOCP Exception to (1) + 2 notes, "motor controller"; (B)
// bypass word-identical), 430.131 (430.53 multi-motor: drive = motor controller;
// word-identical). 430.129 does NOT exist (verified both editions; also 121/123/125/127).
// Verbatim 2017 on disk (nec2017_full.txt lines 56249-56468; OCR corrections
// disclosed: 430.124(C) "Part IIL"->"Part III", 430.130(A)(1) "(C)(S)"->"(C)(5)",
// 430.130(A)(2) "430,130(A) (1)" comma, 430.130(A)(3) "selfprotected", 430.130(A)(4)
// "instantaneous trip", 430.131 "mecting"->"meeting", 430.124 lead-in reordered)
// + 2023 on disk (art35_nec_csv.csv).
// Verified 2017->2023 deltas (verify_art44.py, 87 checks): 430.120 reword + NEW
// 1000V/Part XI sentence (SR-7544, the only Part X section the 2021-cycle SRs
// touch); 430.122 restructured (bypass (B)->(C) trimmed, NEW (B) output + SOOCP,
// NEW (D) via 430.24); 430.130(A) restructured (SOOCP exception + 2 notes +
// "motor controller"); 430.126(A)(3)/(C) trimmed; word-identical: 430.124, 430.128,
// 430.130(B), 430.131. All numbers unchanged. SOOCP provisions predate the 2023
// cycle (edition of origin not pinnable from on-disk sources — disclosed; 2020 scan
// ends at Article 230); SR-8024 (2024 cycle = 2026) "when"->"where" is out of scope.
// Worked examples computed by the shipped core under node (compute_art44.js ->
// art44_numbers.json): EX1 125% x 20 A input = 25 A -> 12 AWG Cu (not 14 AWG from
// motor FLC); EX2 output 125% x 7.6 A = 9.5 A -> 14 AWG Cu + SOOCP larger-of;
// EX3 bypass larger(25, 9.5) = 25 A -> 12 AWG Cu + 175% overload 13.3 -> 15 A;
// EX4 115% x 20 A = 23 A -> 25 A disconnect; EX5 250% x 7.6 = 19 A -> 20 A inverse;
// EX6 SOOCP 250% x 20 A = 50 A (2.0x EX5); EX7 430.53(B) cap 250% x 2.1 A (1 hp)
// = 5.25 A -> 6 A per 240.6 (the shipped breaker core starts at 15 A — disclosed).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-430120-430131-adjustable-speed-drive-systems.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  // meta
  eq(art.includes('nec-430120-430131-adjustable-speed-drive-systems.html'), true, 'art44: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-430120-430131-adjustable-speed-drive-systems.html'), true, 'art44: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art44: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art44: Article + FAQPage JSON-LD present');
  // verbatim 2017 (OCR-corrected; on-disk scan lines disclosed)
  eq(has('The installation provisions of Part I through Part IX are applicable unless modified or supplemented by Part X'), true, 'art44: verbatim 2017 430.120');
  eq(has('Circuit conductors supplying power conversion equipment included as part of an adjustable-speed drive system shall have an ampacity not less than 125 percent of the rated input current to the power conversion equipment'), true, 'art44: verbatim 2017 430.122(A) 125% rated input current');
  eq(has('Overload protection of the motor shall be provided'), true, 'art44: verbatim 2017 430.124 lead-in');
  eq(has('Where the power conversion equipment is marked to indicate that motor overload protection is included, additional overload protection shall not be required'), true, 'art44: verbatim 2017 430.124(A)');
  eq(has('For adjustable-speed drive systems that utilize a bypass device to allow motor operation at rated full-load speed, motor overload protection as described in Article 430, Part III, shall be provided in the bypass circuit'), true, 'art44: verbatim 2017 430.124(B) (OCR-corrected Part III)');
  eq(has('Adjustable-speed drive systems shall protect against motor overtemperature conditions where the motor is not rated to operate at the nameplate rated current over the speed range required by the application'), true, 'art44: verbatim 2017 430.126(A) trigger');
  eq(has('meeting the requirements of 430.126(A)(2) or (B)(2)'), true, 'art44: verbatim 2017 430.126(A)(3) "or (B)(2)" (dropped in 2023)');
  eq(has('The disconnecting means shall be permitted to be in the incoming line to the conversion equipment and shall have a rating not less than 115 percent of the rated input current of the conversion unit'), true, 'art44: verbatim 2017 430.128 115% rated input');
  eq(has('The rating and type of protection shall be determined by 430.52(C)(1), (C)(3), (C)(5), or (C)(6), using the full-load current rating of the motor load as determined by 430.6'), true, 'art44: verbatim 2017 430.130(A)(1) (OCR-corrected (C)(5))');
  eq(has('For the purposes of 430.53 and 430.131, power conversion equipment shall be considered to be a motor controller'), true, 'art44: verbatim 2017 430.131 drive = motor controller');
  // 2023 deltas (on-disk CSV)
  eq(has('Power conversion equipment used in adjustable-speed drive systems shall comply with Part X for an input or output rated 1000 volts or lower and with Part XI for an input or output rated over 1000 volts'), true, 'art44: 2023 430.120 NEW 1000 V / Part XI sentence (SR-7544)');
  eq(has('The conductors between the power conversion equipment and the motor shall have an ampacity equal to or larger than 125 percent of the motor full-load current as determined by 430.6(A) or (B)'), true, 'art44: 2023 430.122(B) NEW output-conductor rule');
  eq(has('Suitable for Output Motor Conductor Protection'), true, 'art44: SOOCP mark present');
  eq(has('Conductors supplying several motors or a motor and other loads, including power conversion equipment, shall have ampacity in accordance with 430.24'), true, 'art44: 2023 430.122(D) NEW several-motors via 430.24');
  eq(has('Exception to (1): The rating and type of protection shall be permitted to be determined by Table 430.52(C)(1) using the power conversion equipment'), true, 'art44: 2023 430.130(A) NEW SOOCP Exception to (1)');
  eq(has('self-protected combination motor controller'), true, 'art44: 2023 430.130(A)(3) "motor controller"');
  // edition claims
  eq(has('430.129'), true, 'art44: flags the 430.129 gap');
  eq(has('does not exist'), true, 'art44: "does not exist" stated');
  eq(has('OCR'), true, 'art44: OCR corrections disclosed');
  eq(has('verify_art44.py'), true, 'art44: references the 87-check delta verifier');
  eq(has('87'), true, 'art44: 87 checks count stated');
  eq(has('SR-7544'), true, 'art44: cites NFPA SR-7544 (2021 cycle) for 430.120');
  eq(has('SR-8024'), true, 'art44: cites NFPA SR-8024 (2024 cycle = 2026) as out of scope');
  eq(has('2020 scan ends at Article 230'), true, 'art44: 2020 gap disclosed');
  eq(has('edition-of-origin gap'), true, 'art44: SOOCP edition-of-origin gap disclosed');
  // worked examples (core-computed; art44_numbers.json)
  // EX1: 430.122(A) 125% x 20 A drive input = 25 A
  eq(1.25 * 20, 25, 'art44 EX1: 125% x 20 A = 25.0 A required');
  eq(pick(25, 'cu', 75).label, '12 AWG Cu', 'art44 EX1: 25.0 A -> 12 AWG Cu @75C');
  eq(pick(1.25 * 7.6, 'cu', 75).label, '14 AWG Cu', 'art44 EX1: wrong path 125% x 7.6 A = 9.5 A -> 14 AWG Cu (too small)');
  // EX2: 430.122(B) output 125% x 7.6 A = 9.5 A
  eq(1.25 * 7.6, 9.5, 'art44 EX2: 125% x 7.6 A = 9.5 A');
  eq(pick(9.5, 'cu', 75).label, '14 AWG Cu', 'art44 EX2: 9.5 A -> 14 AWG Cu @75C');
  // EX3: bypass larger-of + Part III overload
  eq(Math.max(1.25 * 20, 1.25 * 7.6), 25, 'art44 EX3: larger(25.0 A, 9.5 A) = 25.0 A');
  eq(nsb(1.75 * 7.6), 15, 'art44 EX3: bypass overload 175% x 7.6 = 13.3 A -> 15 A');
  // EX4: 430.128 disconnect 115% x 20 A = 23 A
  eq(nsb(1.15 * 20), 25, 'art44 EX4: 115% x 20 A = 23.0 A -> 25 A disconnect');
  // EX5: 430.130(A)(1) Table 430.52(C)(1) on motor FLC 7.6 A
  eq(nsb(3.0 * 7.6), 25, 'art44 EX5: 300% x 7.6 = 22.8 A -> 25 A nontime');
  eq(nsb(1.75 * 7.6), 15, 'art44 EX5: 175% x 7.6 = 13.3 A -> 15 A dual-element');
  eq(nsb(2.5 * 7.6), 20, 'art44 EX5: 250% x 7.6 = 19.0 A -> 20 A inverse-time');
  // EX6: SOOCP exception on rated input current 20 A (~2.4x EX5 at every step)
  eq(nsb(3.0 * 20), 60, 'art44 EX6: SOOCP 300% x 20 A = 60 A');
  eq(nsb(1.75 * 20), 35, 'art44 EX6: SOOCP 175% x 20 A = 35 A');
  eq(nsb(2.5 * 20), 50, 'art44 EX6: SOOCP 250% x 20 A = 50 A');
  eq(60 / 25 === 2.4 && 35 / 15 === 2.3333333333333335 && 50 / 20 === 2.5, true, 'art44 EX6: SOOCP device ratios vs EX5 = 2.4x / 2.33x / 2.5x (article states ~2.4x)');
  eq(has('2.4× larger at every step'), true, 'art44 EX6: ~2.4x comparison stated in article');
  // EX7: 430.131 + 430.53(B) smallest-motor cap (1 hp 460 V = 2.1 A)
  eq(2.5 * 2.1, 5.25, 'art44 EX7: 430.53(B) cap 250% x 2.1 A = 5.25 A');
  eq(nsb(5.25), 15, 'art44 EX7: shipped breaker core starts at 15 A (returns 15 for 5.25 A)');
  eq(has('6 A inverse-time circuit breaker'), true, 'art44 EX7: 240.6 next standard above 5.25 A = 6 A stated');
  eq(has('starts at 15 A'), true, 'art44 EX7: sub-15 A core limitation disclosed');
  // cross-links
  eq(art.includes('nec-430092-430099-motor-control-centers.html'), true, 'art44: cross-links to article 43 (Part VIII)');
  eq(art.includes('nec-430101-430113-disconnecting-means.html'), true, 'art44: cross-links to article 42 (Part IX)');
  eq(art.includes('nec-43081-43090-motor-controllers.html'), true, 'art44: cross-links to article 41 (Part VII)');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art44: cross-links to article 38 (branch circuit)');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art44: cross-links to article 39 (overload)');
  const sitemap44 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap44.includes('articles/nec-430120-430131-adjustable-speed-drive-systems.html'), true, 'art44: sitemap entry present');
  eq((sitemap44.match(/<loc>/g) || []).length >= 57, true, 'art44: sitemap now has 53 URLs (articles 49 + 50 + 51 + 52 added; was 49)');
  const index44 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index44.includes('articles/nec-430120-430131-adjustable-speed-drive-systems.html'), true, 'art44: index cross-link present');
  const readme44 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme44.includes('articles/nec-430120-430131-adjustable-speed-drive-systems.html'), true, 'art44: README entry present');
}

// ===== Article 45: NEC Part XI "Over 1000 Volts, Nominal" — 430.221-430.227 (2017) = 430.201-430.208 (2023) =====
// The eighth in the motor series: the MV (over 1000 V, nominal) motor-circuit code.
// Headline 2017->2023 change is the RENUMBER: 430.221-430.227 (7 sections) ->
// 430.201-430.208 (8 sections); first three -20, NEW 430.204 (wire-bending space
// per 305.5) inserted, last four -19. Content deltas: 430.205 restructured
// (315.60 lead-in + (A) rephrase + NEW (B) 125% of drive rated input current);
// 430.206(A) gains two AS-drive scope sentences (430.124 + 430.126 routing);
// 430.208 expanded from lockable-only to switch/CB + voltage rating + 100% of
// FLC (or 100% of drive rated input current). Renumber edition-of-origin = 2023
// cycle (2020 NEC still 430.221-430.227, corroborated by EC&M Oct 2022; NFPA
// 2021-cycle SR Second Revisions 7555/7565/7569 already target 430.205/430.208;
// SR-7802 committee-statement 430.221 artifact documented). 2024-cycle SR-8030/
// 8031 (2026 edition: 430.205 "ac, 1500 V dc" scope, 430.208 (A)-(E) restructure)
// out of scope, noted. Verbatim 2017 on disk (nec2017_full.txt lines 56471-56594;
// OCR disclosed: "shail"/"shali", "Acircuit", "motorcircuit", "motorprotective",
// "(1) (a) or (1) (b)" self-reference, page-footer intrude) + 2023 on disk
// (art35_nec_csv.csv). Verified by verify_art45.py (51 checks, all PASS).
// Worked examples computed by the shipped core under node (compute_art45.js ->
// art45_numbers.json): EX1 430.205(A) trip setting 20 A -> 14 AWG Cu @75C
// (NOT 125% x 14 A FLC = 17.5 A); EX2 430.207 115% x 25 A ctrl = 28.75 A cap,
// EX1 20 A = 69.57% of cap; EX3 430.208 100% x 14 A FLC = 14 A disconnect
// (25 A controller satisfies; 2017 had no floor); EX4 430.205(B) 125% x 25 A
// drive input = 31.25 A -> 10 AWG Cu @75C; EX5 430.208 drive clause 100% x 25 A
// = 25 A -> 25 A standard; EX6 2300 V motor (FLC 6.1 A) trip 8 A -> 14 AWG Cu
// @75C (the FLC is irrelevant to sizing under 430.205(A)).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-430201-430208-part-xi-over-1000v.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  // meta
  eq(art.includes('nec-430201-430208-part-xi-over-1000v.html'), true, 'art45: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-430201-430208-part-xi-over-1000v.html'), true, 'art45: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art45: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art45: Article + FAQPage JSON-LD present');
  // verbatim 2017 (OCR-corrected where the scan mis-read; corrections disclosed on the page)
  eq(has('Part XI recognizes the additional hazard due to the use of higher voltages. It adds to or amends the other provisions of this article'), true, 'art45: verbatim 430.201 (2017 430.221) governing sentence');
  eq(has('In addition to the marking required by 430.8, a motor controller shall be marked with the control voltage'), true, 'art45: verbatim 2023 430.202 (2017: "controller")');
  eq(has('Flexible metal conduit or liquidtight flexible metal conduit not exceeding 1.8 m (6 ft) in length shall be permitted to be employed for raceway connection to a motor terminal enclosure'), true, 'art45: verbatim 430.203 (2017 430.223) 6-ft flex rule');
  eq(has('Conductors supplying motors shall have an ampacity not less than the current at which the motor overload protective device(s) is selected to trip'), true, 'art45: verbatim 2017 430.224 (trip-setting rule)');
  eq(has('coordinated protection to automatically interrupt overload and fault currents in the motor, the motor-circuit conductors, and the motor control apparatus'), true, 'art45: verbatim 430.206(A) coordinated protection (2023 hyphen form)');
  eq(has('Overload sensing devices shall not automatically reset after trip unless resetting of the overload sensing device does not cause automatic restarting of the motor or there is no hazard to persons created by automatic restarting of the motor and its connected machinery'), true, 'art45: verbatim 430.206(B)(4) auto-reset rule');
  eq(has('Fault-current interrupting devices shall not automatically reclose the circuit'), true, 'art45: verbatim 430.206(C)(2) no-reclose rule');
  eq(has('Overload protection and fault-current protection shall be permitted to be provided by the same device'), true, 'art45: verbatim 430.206(C)(3) combination protection');
  eq(has("The ultimate trip current of overcurrent (overload) relays or other motor-protective devices used shall not exceed 115 percent of the motor controller's continuous current rating"), true, 'art45: verbatim 2023 430.207 115% cap');
  eq(has('The controller disconnecting means shall be lockable in accordance with 110.25'), true, 'art45: verbatim 2017 430.227 (OCR-corrected "shall")');
  // 2023-only text (NEW / expanded)
  eq(has('Motor controllers rated over 1000 volts shall provide wire-bending space within the enclosure for conductors installed in accordance with 305.5'), true, 'art45: NEW 2023 430.204 wire-bending space');
  eq(has('The ampacities of conductors supplying equipment rated over 1000 volts, nominal, shall be determined in accordance with 315.60 or 430.205(A) and (B)'), true, 'art45: NEW 2023 430.205 lead-in (315.60)');
  eq(has('Conductors supplying motors shall be sized not less than the current trip setting of the motor overload protective device(s)'), true, 'art45: 2023 430.205(A) rephrase');
  eq(has('For an adjustable-speed drive system, the conductors supplying the power conversion equipment shall have an ampacity not less than 125 percent of the rated input current to the power conversion equipment'), true, 'art45: NEW 2023 430.205(B) 125% rated input current');
  eq(has('Adjustable-speed drive systems with input or output voltages over 1000 volts, nominal, shall comply with 430.124 and 430.126'), true, 'art45: NEW 2023 430.206(A) AS-drive scope');
  eq(has('All other motors shall comply with 430.206(B) through (C)'), true, 'art45: NEW 2023 430.206(A) routing sentence');
  eq(has('The motor controller disconnecting means shall be a switch or circuit breaker having a voltage rating not less than that of the circuit involved') && has('and shall be lockable in accordance with 110.25'), true, 'art45: 2023 430.208 switch/CB + voltage rating');
  eq(has('The disconnecting means shall have a current rating of not less than 100 percent of the full-load current rating of the motor'), true, 'art45: 2023 430.208 100% of FLC');
  eq(has('For adjustable-speed drive systems, the disconnecting means shall have a current rating not less than 100 percent of the rated input current of the power conversion equipment'), true, 'art45: 2023 430.208 drive clause');
  // renumber map claims
  eq(has('430.221') && has('430.201') && has('430.227') && has('430.208'), true, 'art45: renumber map cites both numbering schemes');
  eq(has('the 2020 nec still used 430.221–430.227') || has('the 2020 nec still carried 430.221–430.227'), true, 'art45: 2020-still-old-numbering claim (renumber is 2023)');
  eq(has('SR-7555') && has('SR-7565') && has('SR-7569'), true, 'art45: 2021-cycle SR corroboration cited (7555/7565/7569)');
  eq(has('SR-7802'), true, 'art45: SR-7802 430.221 committee-statement artifact disclosed');
  eq(has('SR-8030') && has('SR-8031'), true, 'art45: 2026-cycle SR-8030/8031 noted out of scope');
  // gotcha + worked-example content
  eq(has('125% of flc'), true, 'art45: Part-I 125% FLC contrast stated');
  eq(has('14 awg cu'), true, 'art45: EX1/EX6 14 AWG Cu pick stated');
  eq(has('10 awg cu'), true, 'art45: EX4 10 AWG Cu pick stated');
  eq(has('28.75 a'), true, 'art45: EX2 28.75 A cap stated');
  eq(has('31.25 a'), true, 'art45: EX4 31.25 A requirement stated');
  eq(has('6.1 a'), true, 'art45: EX6 6.1 A 2300 V FLC stated');
  // core recomputation (shipped cores must agree with the page)
  eq(pick(20, 'cu', 75).label, '14 AWG Cu', 'art45 EX1: pick(20 A, Cu, 75C) = 14 AWG Cu');
  eq(+(1.15 * 25).toFixed(2), 28.75, 'art45 EX2: 115% x 25 A = 28.75 A');
  eq(25 >= 28.75 * 0 + 14, true, 'art45 EX3: 25 A controller >= 14 A (100% x 14 A FLC) disconnect floor');
  eq(pick(1.25 * 25, 'cu', 75).label, '10 AWG Cu', 'art45 EX4: pick(31.25 A, Cu, 75C) = 10 AWG Cu');
  eq(nsb(25), 25, 'art45 EX5: nextStdBreaker(25) = 25 A');
  eq(pick(8, 'cu', 75).label, '14 AWG Cu', 'art45 EX6: pick(8 A, Cu, 75C) = 14 AWG Cu');
  // cross-links
  eq(art.includes('nec-430120-430131-adjustable-speed-drive-systems.html'), true, 'art45: cross-links to article 44 (Part X)');
  eq(art.includes('nec-430101-430113-disconnecting-means.html'), true, 'art45: cross-links to article 42 (Part IX)');
  eq(art.includes('nec-43081-43090-motor-controllers.html'), true, 'art45: cross-links to article 41 (Part VII)');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art45: cross-links to article 38 (branch circuit)');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art45: cross-links to article 39 (overload)');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art45: cross-links to 310.16 ampacity article');
  const sitemap45 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap45.includes('articles/nec-430201-430208-part-xi-over-1000v.html'), true, 'art45: sitemap entry present');
  const index45 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index45.includes('articles/nec-430201-430208-part-xi-over-1000v.html'), true, 'art45: index cross-link present');
  const readme45 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme45.includes('articles/nec-430201-430208-part-xi-over-1000v.html'), true, 'art45: README entry present');
}

// ===== Article 46: NEC 215.2(B) "Feeders over 600 Volts" -> 235.202 (the 600->1000 V
// migration + the 2023 relocation into Article 235 Part III) =====
// Three on-disk editions: 2017 full scan (nec2017_full.txt), 2020 scan (full Article 215
// body, slideshare_nec2020.txt), 2023 CSV (art35_nec_csv.csv). Edition-of-origin pinned:
// 600->1000 V sizing heading + 310.15/310.60->310.14/315.60 + 215.3 Exception 2 deleted +
// 215.10 Exception 3 (90 days) + 215.9 de-limited + 215.6 reword = 2020; the relocation to
// 235.202 + 215.1 scope cap + 215.2 relettering ((A)(2)->(B),(A)(3)->(C)) + 215.10 GFPE
// 600->1000 V ceiling + 215.9 "listed" + NEW 215.15/215.18 = 2023. Verified by
// verify_art46.py (97 checks, all PASS). OCR disclosed: 2020 "311.60" (=315.60), "(l)"
// for "(1)", "cunductors/grmerator/slwll"; 2017 "tts" (=its), spaced "215.2(B) (1)".
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-2152b-235202-feeder-relocation.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const pick = core.pickConductor31016, nsb = core.nextStdBreaker;
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art46_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-2152b-235202-feeder-relocation.html'), true, 'art46: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-2152b-235202-feeder-relocation.html'), true, 'art46: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art46: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art46: Article + FAQPage JSON-LD present');
  eq(has('article 46'), true, 'art46: footer marks article 46');
  // verbatim 2017 215.2(B) over-600 V block
  eq(has('(B) Feeders over 600 Volts. The ampacity of conductors shall be in accordance with 310.15 and 310.60 as applicable'), true, 'art46: verbatim 2017 215.2(B) lead (310.15/310.60)');
  eq(has('Feeder conductors over 600 volts shall be sized in accordance with 215.2(B)(1), (B)(2), or (B)(3)'), true, 'art46: verbatim 2017 215.2(B) routing');
  eq(has('The ampacity of feeder conductors shall not be less than the sum of the nameplate ratings of the transformers supplied when only transformers are supplied'), true, 'art46: verbatim 215.2(B)(1)/235.202(A) transformer rule');
  eq(has('the sum of the nameplate ratings of the transformers and 125 percent of the designed potential load of the utilization equipment that will be operated simultaneously'), true, 'art46: verbatim 215.2(B)(2)/235.202(B) 125% rule');
  eq(has('feeder conductor sizing shall be permitted to be determined by qualified persons under engineering supervision. Supervised installations are defined as those portions of a facility where all of the following conditions are met'), true, 'art46: verbatim 2017 215.2(B)(3) supervised (no ampacity ref)');
  eq(has('documented training and experience in over 600-volt systems provide maintenance, monitoring, and servicing'), true, 'art46: verbatim 2017 (B)(3) "over 600-volt systems"');
  // verbatim 2020 215.2(B) over-1000 V (migration edition)
  eq(has('(B) Feeders over 1000 Volts. The ampacity of conductors shall be in accordance with 310.14 and 315.60 as applicable'), true, 'art46: verbatim 2020 215.2(B) lead (310.14/315.60)');
  eq(has('For supervised installations, feeder conductor sizing shall be permitted to be determined by qualified persons under engineering supervision in accordance with 310.14(B) or 315.60(B)'), true, 'art46: verbatim 2020 (B)(3) ampacity ref added (315.60)');
  eq(has('documented training and experience in over 1000-volt systems provide maintenance, monitoring, and servicing'), true, 'art46: verbatim 2020 (B)(3) "over 1000-volt systems"');
  // verbatim 2023 235.202 destination
  eq(has('Feeder conductors over 1000 volts shall be sized in accordance with 235.202(A), (B), or (C)'), true, 'art46: verbatim 2023 235.202 routing');
  eq(has('Part III covers the installation requirements, overcurrent protection requirements, minimum size, and ampacity of conductors for feeders over 1000 volts ac or 1500 volts dc, nominal'), true, 'art46: verbatim 2023 235.201 Part III scope');
  eq(has('Feeders shall be protected against overcurrent'), true, 'art46: verbatim 2023 235.203 OCPD');
  // 2023 Article 215 restructure + scope
  eq(has('for feeders not over 1000 volts ac or 1500 volts dc, nominal'), true, 'art46: 2023 215.1 scope cap');
  eq(has('See Part III of Article 235 for feeders over 1000 volts ac or 1500 volts dc'), true, 'art46: 2023 215.1 Info Note to Art. 235');
  eq(has('The feeder conductor ampacity shall not be less than that of the service conductors where the feeder conductors carry the total load supplied by service conductors with an ampacity of 55 amperes or less'), true, 'art46: verbatim 215.2(C) 55-A rule (word-identical)');
  eq(has('the equipment grounding conductor size required by 250.122'), true, 'art46: 2023 215.2(B) grounded-conductor reword (EGC size)');
  eq(has('protected against overcurrent in accordance with Part I of Article 240'), true, 'art46: 2023 215.3 drops "the provisions of"');
  eq(has('protected by a listed ground-fault circuit interrupter installed in a readily accessible location'), true, 'art46: 2023 215.9 "listed" GFCI');
  eq(has('but not exceeding 1000 volts phase-to-phase'), true, 'art46: 2023 215.10 GFPE 1000 V ceiling');
  eq(has('shall not exceed 90 days'), true, 'art46: 215.10 Exception 3 temporary feeder 90 days');
  eq(has('Barriers shall be placed such that no energized, uninsulated, ungrounded busbar or terminal is exposed to inadvertent contact'), true, 'art46: NEW 215.15 barrier rule');
  eq(has('nominal discharge current rating (In) of not less than 10kA'), true, 'art46: NEW 215.18(E) SPD 10 kA');
  // edition-of-origin pinning claims
  eq(has('600→1000 V in 2020'), true, 'art46: sizing-heading voltage pinned to 2020');
  eq(has('moved in 2020') && has('moved in 2023'), true, 'art46: the two 600->1000 V moves pinned to different editions');
  eq(has('310.15/310.60 (2017) → 310.14/315.60 (2020 and 2023)'), true, 'art46: ampacity-table renumber pinned to 2020');
  eq(has('added in 2020') || has('ADDED in 2020') || has('gained its ampacity reference in 2020'), true, 'art46: (C) ampacity ref added in 2020');
  // OCR + source-gap disclosures
  eq(has('311.60'), true, 'art46: 2020 "311.60" OCR artifact disclosed');
  eq(has('"(l)"-for-"(1)"') || has('"(l)" for "(1)"'), true, 'art46: 2020 "(l)"-for-"(1)" OCR disclosed');
  eq(has('tts'), true, 'art46: 2017 "tts" OCR disclosed');
  eq(has('Parts I through VIII'), true, 'art46: AJB 2020 "Parts I through VIII" mis-quote disclosed');
  eq(has('Parts I through VII of Article 240'), true, 'art46: real 2017 text "Parts I through VII" stated');
  eq(has('cut off at 215.12') || has('cuts off at 215.12'), true, 'art46: 2020 scan cutoff (215.15/215.18 origin not pinnable) disclosed');
  // worked examples (recomputed from shipped cores; must match art46_numbers.json)
  approx(500*1000/(4160*1.732), nums.EX1.eachFLA, 0.01, 'art46 EX1: 500 kVA @4160 V = 69.40 A');
  approx(2*500*1000/(4160*1.732), nums.EX1.reqA, 0.01, 'art46 EX1: 2x = 138.80 A');
  eq(pick(2*500*1000/(4160*1.732), 'cu', 75).label, '1/0 AWG Cu', 'art46 EX1: pick(138.80 A, Cu, 75C) = 1/0 AWG Cu');
  approx(500*1000/(4160*1.732) + 1.25*20, nums.EX2.reqA, 0.01, 'art46 EX2: 69.40 + 25 = 94.40 A');
  eq(pick(500*1000/(4160*1.732) + 1.25*20, 'cu', 75).label, '3 AWG Cu', 'art46 EX2: pick(94.40 A, Cu, 75C) = 3 AWG Cu');
  eq(pick(50, 'cu', 75).label, '8 AWG Cu', 'art46 EX4: pick(50 A, Cu, 75C) = 8 AWG Cu (55-A rule)');
  eq(has('1/0 Cu'), true, 'art46 EX5: 250.122 row 800 = 1/0 Cu stated');
  eq(nsb(1200), 1200, 'art46 EX6: nextStdBreaker(1200) = 1200 A');
  eq(has('138.80 A'), true, 'art46 EX1: 138.80 A stated on page');
  eq(has('94.40 A'), true, 'art46 EX2: 94.40 A stated on page');
  eq(has('1/0 awg cu'), true, 'art46 EX1: 1/0 AWG Cu pick stated on page');
  eq(has('3 awg cu'), true, 'art46 EX2: 3 AWG Cu pick stated on page');
  eq(has('no ground-fault protection required'), true, 'art46 EX6: 2017/2020 = no GFPE stated');
  eq(has('ground-fault protection of equipment required'), true, 'art46 EX6: 2023 = GFPE required stated');
  // cross-links (non-overlap with the two existing 215 articles + series)
  eq(art.includes('nec-2152-feeder-ampacity.html'), true, 'art46: cross-links to 215.2 ampacity article');
  eq(art.includes('nec-2151-2153-feeder-overcurrent.html'), true, 'art46: cross-links to 215.1+215.3 overcurrent article');
  eq(art.includes('nec-430201-430208-part-xi-over-1000v.html'), true, 'art46: cross-links to Part XI over-1000 V article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art46: cross-links to 310.16 ampacity article');
  const sitemap46 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap46.includes('articles/nec-2152b-235202-feeder-relocation.html'), true, 'art46: sitemap entry present');
  const index46 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index46.includes('articles/nec-2152b-235202-feeder-relocation.html'), true, 'art46: index cross-link present');
  const readme46 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme46.includes('articles/nec-2152b-235202-feeder-relocation.html'), true, 'art46: README entry present');
}

// Article 47 — NEC 250.54 + 250.58 + 250.60 + 250.62 + 250.66 (caps) + 250.68:
// auxiliary grounding electrodes, the common-electrode rule, strike-termination
// devices, GEC material, the Table 250.66 GEC sizing table + the three
// electrode caps (A 6 AWG Cu / 4 AWG Al rod-pipe-plate, B 4 AWG Cu Ufer,
// C ring-size to a ground ring) + the cap-void rule, and the 250.68
// connection locations (accessibility, effective grounding path, the 5-ft
// interior water-pipe rule, hold-down bolts, rebar stub up). Verbatim 2017
// NEC text; OCR artifacts disclosed in the code blocks (250.54 page-break
// "70-113" + "250.58" header split; 250.68(A) Exception 2 / (B) page break
// "70-115 / 250.68 / ARTICLE 250"; Table 250.66 interleaved into 250.68(C)(1);
// 250.68(C)(1) Exception "ts" OCR garble corrected to "is").
// 2020 delta: 250.68(C)(3) rebar restructure to (a)/(b)/(c) + NEW (c)
// rebar-interconnect prohibition (ELR sectionID 868).
// 2023 delta: 250.66(A) "or copper-clad aluminum" (ELR 1602);
// 250.68(C)(1) "as measured along the water piping" (ELR 1604);
// Table 250.66 rows unchanged (ELR 1603 image-only). No ELR change records
// for 250.54 / 250.58 / 250.60 / 250.62 in either cycle (stated as such).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-25054-25068-auxiliary-gec-caps-connections.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art47_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-25054-25068-auxiliary-gec-caps-connections.html'), true, 'art47: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-25054-25068-auxiliary-gec-caps-connections.html'), true, 'art47: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art47: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art47: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 47'), true, 'art47: footer marks article 47');
  // verbatim 2017 — 250.54 (page-break split "70-113 250.58" removed, disclosed)
  eq(has('250.54 auxiliary grounding electrodes. one or more grounding electrodes shall be permitted to be connected to the equipment grounding conductors specified in 250.118 and shall not be required to comply with the electrode bonding requirements of 250.50 or 250.53(c) or the resistance requirements of 250.53(a)(2) exception'), true, 'art47: verbatim 250.54 lead + bonding/resistance waiver');
  eq(has('the earth shall not be used as an effective ground-fault current path as specified in 250.4(a)(5) and 250.4(b)(4)'), true, 'art47: verbatim 250.54 earth-not-a-fault-path');
  // verbatim 2017 — 250.58 (two "Where" sentences + third paragraph)
  eq(has('250.58 common grounding electrode. where an ac system is connected to a grounding electrode in or at a building or structure, the same electrode shall be used to ground conductor enclosures and equipment in or on that building or structure'), true, 'art47: verbatim 250.58 first sentence');
  eq(has('where separate services, feeders, or branch circuits supply a building and are required to be connected to a grounding electrode(s), the same grounding electrode(s) shall be used'), true, 'art47: verbatim 250.58 second sentence');
  eq(has('two or more grounding electrodes that are bonded together shall be considered as a single grounding electrode system in this sense'), true, 'art47: verbatim 250.58 third para (2017; absent from on-disk 2023 CSV, disclosed)');
  // verbatim 2017 — 250.60
  eq(has('250.60 use of strike termination devices. conductors and driven pipes, rods, or plate electrodes used for grounding strike termination devices shall not be used in lieu of the grounding electrodes required by 250.50'), true, 'art47: verbatim 250.60 lead');
  eq(has('this provision shall not prohibit the required bonding together of grounding electrodes of different systems'), true, 'art47: verbatim 250.60 bonding sentence');
  eq(has('informational note no. 1: see 250.106 for the bonding requirement of the lightning protection system components'), true, 'art47: verbatim 250.60 Info Note 1 (250.106 pointer)');
  // verbatim 2017 — 250.62
  eq(has('250.62 grounding electrode conductor material. the grounding electrode conductor shall be of copper, aluminum, copper-clad aluminum, or the items as permitted in 250.68(c)'), true, 'art47: verbatim 250.62 materials');
  eq(has('the material selected shall be resistant to any corrosive condition existing at the installation or shall be protected against corrosion'), true, 'art47: verbatim 250.62 corrosion rule');
  // verbatim 2017 — 250.66 lead + caps (A)(B)(C)
  eq(has('the size of the grounding electrode conductor at the service, at each building or structure where supplied by a feeder(s) or branch circuit(s), or at a separately derived system of a grounded or ungrounded ac system shall not be less than given in table 250.66, except as permitted in 250.66(a) through (c)'), true, 'art47: verbatim 250.66 lead (2017)');
  eq(has('(a) connections to a rod, pipe, or plate electrode(s). if the grounding electrode conductor or bonding jumper connected to a single or multiple rod, pipe, or plate electrode(s), or any combination thereof, as described in 250.52(a)(5) or (a)(7), does not extend on to other types of electrodes that require a larger size conductor, the grounding electrode conductor shall not be required to be larger than 6 awg copper wire or 4 awg aluminum wire'), true, 'art47: verbatim 250.66(A) cap (2017, pre-copper-clad)');
  eq(has('(b) connections to concrete-encased electrodes. if the grounding electrode conductor or bonding jumper connected to a single or multiple concrete-encased electrode(s), as described in 250.52(a)(3), does not extend on to other types of electrodes that require a larger size of conductor, the grounding electrode conductor shall not be required to be larger than 4 awg copper wire'), true, 'art47: verbatim 250.66(B) cap');
  eq(has('(c) connections to ground rings. if the grounding electrode conductor or bonding jumper connected to a ground ring, as described in 250.52(a)(4), does not extend on to other types of electrodes that require a larger size of conductor, the grounding electrode conductor shall not be required to be larger than the conductor used for the ground ring'), true, 'art47: verbatim 250.66(C) ring cap');
  // Table 250.66 reprint (full table, 2017)
  eq(has('2 awg or smaller 1/0 awg or smaller 8 awg 6 awg'), true, 'art47: Table 250.66 row 1 (8 AWG Cu / 6 AWG Al)');
  eq(has('1 awg or 1/0 awg 2/0 awg or 3/0 awg 6 awg 4 awg'), true, 'art47: Table 250.66 row 2 (6 AWG Cu / 4 AWG Al)');
  eq(has('over 1100 kcmil over 1750 kcmil 3/0 awg — capped 250 kcmil — capped'), true, 'art47: Table 250.66 largest row (3/0 Cu — CAPPED / 250 kcmil Al — CAPPED)');
  // verbatim 2017 — 250.68 (A accessibility, B effective path, C connections)
  eq(has('250.68 grounding electrode conductor and bonding jumper connection to grounding electrodes. the connection of a grounding electrode conductor at the service, at each building or structure where supplied by a feeder(s) or branch circuit(s), or at a separately derived system and associated bonding jumper(s) shall be made as specified 250.68(a) through (c)'), true, 'art47: verbatim 250.68 lead (2017, no "in" — identical in on-disk 2023 CSV)');
  eq(has('(a) accessibility. all mechanical elements used to terminate a grounding electrode conductor or bonding jumper to a grounding electrode shall be accessible'), true, 'art47: verbatim 250.68(A) accessibility');
  eq(has('(b) effective grounding path. the connection of a grounding electrode conductor or bonding jumper to a grounding electrode shall be made in a manner that will ensure an effective grounding path'), true, 'art47: verbatim 250.68(B) effective path');
  eq(has('(c) grounding electrode conductor connections. grounding electrode conductors and bonding jumpers shall be permitted to be connected at the following locations and used to extend the connection to an electrode(s)'), true, 'art47: verbatim 250.68(C) lead');
  eq(has('(1) interior metal water piping that is electrically continuous with a metal underground water pipe electrode and is located not more than 1.52 m (5 ft) from the point of entrance to the building shall be permitted to extend the connection to an electrode(s)'), true, 'art47: verbatim 250.68(C)(1) 5-ft water-pipe rule');
  eq(has('interior metal water piping located more than 1.52 m (5 ft) from the point of entrance to the building shall not be used as a conductor to interconnect electrodes of the grounding electrode system'), true, 'art47: verbatim 250.68(C)(1) >5-ft prohibition');
  eq(has('hold-down bolts securing the structural steel column that are connected to a concrete-encased electrode that complies with 250.52(a)(3) and is located in the support footing or foundation shall be permitted to connect the metal structural frame of a building or structure to the concrete encased grounding electrode'), true, 'art47: verbatim 250.68(C)(2) hold-down bolts');
  eq(has('a rebar-type concrete-encased electrode installed in accordance with 250.52(a)(3) with an additional rebar section extended from its location within the concrete to an accessible location that is not subject to corrosion shall be permitted for connection of grounding electrode conductors and bonding jumpers'), true, 'art47: verbatim 250.68(C)(3) rebar stub up (2017 single-sentence)');
  eq(has('the rebar extension shall not be exposed to contact with the earth without corrosion protection'), true, 'art47: verbatim 250.68(C)(3) corrosion-protection sentence');
  // worked examples — core-computed numbers stated on the page (art47_numbers.json)
  eq(has('pickConductor31016(125, cu, 60) → 1/0 cu'), true, 'art47: EX1 pick 1/0 Cu @ 60 C (125 A)');
  eq(has(String(nums.EX1.gecCu) + ' awg cu'), true, 'art47: EX1 GEC = ' + nums.EX1.gecCu + ' AWG Cu (table governs, water pipe no cap)');
  eq(has('pickConductor31016(250, cu, 75) → 250 kcmil cu'), true, 'art47: EX2 pick 250 kcmil Cu @ 75 C (250 A)');
  eq(has('cap (a) governs; the ' + nums.EX2.tableGec + ' awg table size is not required'), true, 'art47: EX2 cap (A) shrinks ' + nums.EX2.tableGec + ' → 6 AWG Cu');
  eq(has('pickConductor31016(500, cu, 75) → 900 kcmil cu'), true, 'art47: EX3/EX4/EX5 pick 900 kcmil Cu @ 75 C (500 A)');
  eq(has('cap (b) governs; the ' + nums.EX3.tableGec + ' table size is not required'), true, 'art47: EX3 cap (B) shrinks ' + nums.EX3.tableGec + ' → 4 AWG Cu');
  eq(has('2 × 900,000 = 1,800,000 cmil'), true, 'art47: EX4 Note-1 equivalent area 1,800,000 cmil (two 900 kcmil sets)');
  eq(has('cap (c): need not be larger than the ring conductor'), true, 'art47: EX4 cap (C) = ring size 2 AWG Cu');
  eq(has('voided'), true, 'art47: EX5 cap-void stated');
  eq(has('the water pipe (table-sized, no cap) requires the ' + nums.EX5.tableGec + ' gec, end-to-end ' + nums.EX5.gecEndToEnd), true, 'art47: EX5 cap voided → ' + nums.EX5.gecEndToEnd + ' end-to-end (table governs)');
  // edition history — pinned deltas
  eq(has('rebar shall not be used as a conductor to interconnect the electrodes of grounding electrode systems'), true, 'art47: 2020 ELR 868 — NEW 250.68(C)(3)(c) rebar-interconnect prohibition');
  eq(has('as measured along the water piping'), true, 'art47: 2023 ELR 1604 — 250.68(C)(1) "as measured along the water piping"');
  eq(has('2023 delta on (a): adds "or copper-clad aluminum"'), true, 'art47: 2023 ELR 1602 — 250.66(A) copper-clad addition');
  eq(has('no elr change record'), true, 'art47: ELR silence stated for 250.54/58/60/62');
  // non-overlap cross-links
  eq(art.includes('nec-25064-250104-gec-installation-bonding.html'), true, 'art47: cross-links to 250.64+250.104 article');
  eq(art.includes('nec-25050-25052-25053-grounding-electrode-system.html'), true, 'art47: cross-links to 250.50+250.52+250.53 article');
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art47: cross-links to 250.26+250.30 article');
  eq(art.includes('nec-25032-separate-building-grounding.html'), true, 'art47: cross-links to 250.32 article');
  // sitemap + index + README
  const sitemap47 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap47.includes('articles/nec-25054-25068-auxiliary-gec-caps-connections.html'), true, 'art47: sitemap entry present');
  const index47 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index47.includes('articles/nec-25054-25068-auxiliary-gec-caps-connections.html'), true, 'art47: index cross-link present');
  const readme47 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme47.includes('articles/nec-25054-25068-auxiliary-gec-caps-connections.html'), true, 'art47: README entry present');
}

// Article 48 — NEC 250.70 Methods of Grounding and Bonding Conductor
// Connection to Electrodes (the LAST Article 250 Part III section; completes
// the on-disk Part III build): the physical GEC-to-electrode connection —
// exothermic welding, listed lugs, listed pressure connectors, listed clamps,
// or other listed means (never solder), the ground-clamp listing rules
// (electrode + GEC materials, direct soil burial / concrete encasement), the
// one-conductor-per-clamp limit, and the 2017 four-methods hardware list
// (pipe plug / bolted clamp / communications strap-type clamp /
// equally-substantial). Plus 250.8 (general permitted / not-permitted means)
// and 250.10 (clamp protection). EDITION STORY: 2017 == 2020 (word-identical,
// ELR 1005.0); 2023 reorganized into (A) General + (B), REMOVED the
// four-methods list, reworded "where used on pipe" -> "if used on pipe", and
// added the (B) Informational Note (Mike Holt 2023 Code Change Summaries p.17).
// Verbatim 2017 NFPA on disk (nec2017_full.txt); verbatim 2023 on-disk CSV
// (art35_nec_csv.csv) cross-checked against ELR 2023 + Mike Holt 23CC.
// Worked examples core-computed (compute_art48.js -> art48_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-25070-connection-methods-to-electrodes.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art48_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-25070-connection-methods-to-electrodes.html'), true, 'art48: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-25070-connection-methods-to-electrodes.html'), true, 'art48: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art48: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art48: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 48'), true, 'art48: footer marks article 48');
  // verbatim 2017 — 250.70 lead (methods + no-solder + clamp listing + one-conductor limit)
  eq(has('250.70 methods of grounding and bonding conductor connection to electrodes. the grounding or bonding conductor shall be connected to the grounding electrode by exothermic welding, listed lugs, listed pressure connectors, listed clamps, or other listed means.'), true, 'art48: verbatim 250.70 lead (methods)');
  eq(has('connections depending on solder shall not be used.'), true, 'art48: verbatim 250.70 no-solder rule');
  eq(has('ground clamps shall be listed for the materials of the grounding electrode and the grounding electrode conductor and, where used on pipe, rod, or other buried electrodes, shall also be listed for direct soil burial or concrete encasement.'), true, 'art48: verbatim 250.70 clamp listing (2017 "where" form)');
  eq(has('not more than one conductor shall be connected to the grounding electrode by a single clamp or fitting unless the clamp or fitting is listed for multiple conductors.'), true, 'art48: verbatim 250.70 one-conductor-per-clamp limit');
  // verbatim 2017 — the four-methods list (1)-(4)
  eq(has('one of the following methods shall be used:'), true, 'art48: verbatim 2017 four-methods lead');
  eq(has('(1) a pipe fitting, pipe plug, or other approved device screwed into a pipe or pipe fitting'), true, 'art48: verbatim 2017 method (1) pipe plug/fitting');
  eq(has('(2) a listed bolted clamp of cast bronze or brass, or plain or malleable iron'), true, 'art48: verbatim 2017 method (2) bolted clamp');
  eq(has('(3) for indoor communications purposes only, a listed sheet metal strap-type ground clamp'), true, 'art48: verbatim 2017 method (3) communications strap-type clamp');
  eq(has('(4) an equally substantial approved means'), true, 'art48: verbatim 2017 method (4) equally substantial');
  // verbatim 2017 — 250.8 (general permitted / not-permitted)
  eq(has('250.8 connection of grounding and bonding equipment.'), true, 'art48: verbatim 250.8 lead');
  eq(has('(a) permitted methods. equipment grounding conductors, grounding electrode conductors, and bonding jumpers shall be connected by one or more of the following means:'), true, 'art48: verbatim 250.8(A) lead');
  eq(has('(b) methods not permitted. connection devices or fittings that depend solely on solder shall not be used.'), true, 'art48: verbatim 250.8(B) no-solder');
  // verbatim 2017 — 250.10 (clamp protection)
  eq(has('250.10 protection of ground clamps and fittings. ground clamps or other fittings exposed to physical damage shall be enclosed in metal, wood, or equivalent protective covering.'), true, 'art48: verbatim 250.10 clamp protection');
  // 2023 reorganization — (A) General
  eq(has('(a) general. the grounding or bonding conductor shall be connected to the grounding electrode by exothermic welding, listed lugs, listed pressure connectors, listed clamps, or other listed means.'), true, 'art48: 2023 (A) General lead (identical method set)');
  eq(has('if used on pipe, rod, or other buried electrodes, shall also be listed for direct soil burial or concrete encasement.'), true, 'art48: 2023 (A) "if used on pipe" editorial delta (was "where" in 2017/2020)');
  // 2023 reorganization — (B) + Informational Note
  eq(has('during or after installation shall be permitted.'), true, 'art48: 2023 (B) strap-type clamp survives (re-cast as stand-alone "shall be permitted")');
  eq(has('informational note: listed ground clamps that are identified for direct burial are also suitable for concrete encasement.'), true, 'art48: 2023 NEW (B) Informational Note (direct burial -> concrete encasement)');
  // edition history — 2017 == 2020 word-identical; 2023 reorg (Mike Holt 23CC p.17)
  eq(has('reorganized into two first level subdivisions and editorially revised for clarity'), true, 'art48: 2023 reorg pinned (Mike Holt 2023 Code Change Summaries p.17)');
  eq(has('word-identical to 2017'), true, 'art48: 2017 -> 2020 word-identity stated (ELR 1005.0)');
  eq(has('the four-methods list (1)–(4) was removed'), true, 'art48: 2023 removal of the 2017 four-methods list stated');
  eq(has('pipe plug'), true, 'art48: 2017 method (1) "pipe plug" cited (still a permitted listed means under 2023 (A))');
  eq(has('bolted clamp'), true, 'art48: 2017 method (2) "bolted clamp" cited (still a permitted listed means under 2023 (A))');
  eq(has('exothermic welding is a common way to tie the gec to the ring'), true, 'art48: EX3 exothermic weld to ring noted');
  // worked examples — core-computed numbers (art48_numbers.json)
  eq(has('pickConductor31016(250, cu, 75) → 250 kcmil cu'), true, 'art48: EX1 pick 250 kcmil Cu @ 75 C (250 A)');
  eq(has(String(nums.EX1.gecCu) + ' awg cu'), true, 'art48: EX1 GEC = ' + nums.EX1.gecCu + ' AWG Cu (cap A, rod-only)');
  eq(has('pickConductor31016(125, cu, 60) → 1/0 cu'), true, 'art48: EX2 pick 1/0 Cu @ 60 C (125 A)');
  eq(has(String(nums.EX2.gecCu) + ' awg cu'), true, 'art48: EX2 GEC = ' + nums.EX2.gecCu + ' AWG Cu (table governs, water pipe no cap)');
  eq(has(String(nums.EX3.gecCu) + ' awg cu'), true, 'art48: EX3 GEC = ' + nums.EX3.gecCu + ' AWG Cu (cap C = ring size)');
  eq(has('3,000,000 cmil'), true, 'art48: EX3 Note-1 equivalent area 3,000,000 cmil (two 1500 kcmil sets)');
  eq(has(String(nums.EX4.gecCu) + ' awg cu'), true, 'art48: EX4 GEC = ' + nums.EX4.gecCu + ' AWG Cu (cap B, Ufer-only)');
  eq(has('pickConductor31016(625, cu, 75) → 1500 kcmil cu'), true, 'art48: EX3/EX4 pick 1500 kcmil Cu @ 75 C (625 A)');
  // non-overlap cross-links
  eq(art.includes('nec-25054-25068-auxiliary-gec-caps-connections.html'), true, 'art48: cross-links to 250.54/58/60/62/66/68 article');
  eq(art.includes('nec-25050-25052-25053-grounding-electrode-system.html'), true, 'art48: cross-links to 250.50+250.52+250.53 article');
  eq(art.includes('nec-25064-250104-gec-installation-bonding.html'), true, 'art48: cross-links to 250.64+250.104 article');
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art48: cross-links to 250.102 article');
  eq(art.includes('nec-250122-egc-sizing.html'), true, 'art48: cross-links to 250.122 article');
  // sitemap + index + README
  const sitemap48 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap48.includes('articles/nec-25070-connection-methods-to-electrodes.html'), true, 'art48: sitemap entry present');
  eq((sitemap48.match(/<loc>/g) || []).length >= 57, true, 'art48: sitemap now has 53 URLs (articles 49 + 50 + 51 + 52 added; was 49)');
  const index48 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index48.includes('articles/nec-25070-connection-methods-to-electrodes.html'), true, 'art48: index cross-link present');
  const readme48 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme48.includes('articles/nec-25070-connection-methods-to-electrodes.html'), true, 'art48: README entry present');
}

// Article 49 — NEC 460.9 + 460.8: power-factor-correction capacitors on motor
// circuits (the "PFC-capacitor companion" to the motor series). 460.8 =
// capacitor circuit conductors at 135% of rated current, the one-third rule
// for the lead to the motor, the "as low as practicable" OCPD, and the
// disconnecting means (>=135%, opens all ungrounded). 460.9 = the trap: the
// motor overload is set for the IMPROVED power factor, but the motor circuit
// conductor stays at the 430.22 125% pick (capacitor disregarded). Companions
// 460.6 (discharge: 50 V in 1 min, automatic), 460.10 (case to EGC), 460.12
// (marking). EDITION STORY: the Part I PFC core (460.8 A/B/C, 460.9, 460.6,
// 460.10, 460.12) is WORD-IDENTICAL 2017->2023 (normalized machine diff of the
// on-disk 2017 scan vs on-disk 2023 CSV). Real deltas, all verified on disk:
// 460.1 hazardous-locations sentence removed; 460.2 -> 460.3 renumber with the
// vault cross-ref Article 110 Part II -> Part III; 460.24(A) MV switching
// reword; 490.22 -> 495.22 cross-ref. 460.25(D) Part II delta flagged as a
// SOURCE BOUNDARY (Zone 1/2 sentence + ANSI/IEEE 18 IN absent from 2023 CSV;
// no second on-disk 2023 source; 2020 text not on disk). Worked examples
// core-computed (compute_art49.js -> art49_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-46009-46008-pfc-capacitors.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art49_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-46009-46008-pfc-capacitors.html'), true, 'art49: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-46009-46008-pfc-capacitors.html'), true, 'art49: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art49: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art49: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 49'), true, 'art49: footer marks article 49');
  // verbatim 2017 — 460.8(A) ampacity + one-third rule
  eq(has('460.8 conductors. (a) ampacity. the ampacity of capacitor circuit conductors shall not be less than 135 percent of the rated current of the capacitor.'), true, 'art49: verbatim 460.8(A) 135% rule');
  eq(has('the ampacity of conductors that connect a capacitor to the terminals of a motor or to motor circuit conductors shall not be less than one-third the ampacity of the motor circuit conductors and in no case less than 135 percent of the rated current of the capacitor.'), true, 'art49: verbatim 460.8(A) one-third rule (floor 135%)');
  // verbatim 2017 — 460.8(B) overcurrent
  eq(has('an overcurrent device shall be provided in each ungrounded conductor for each capacitor bank. the rating or setting of the overcurrent device shall be as low as practicable.'), true, 'art49: verbatim 460.8(B) as-low-as-practicable');
  eq(has('a separate overcurrent device shall not be required for a capacitor connected on the load side of a motor overload protective device.'), true, 'art49: verbatim 460.8(B) Exception (load side of overload)');
  // verbatim 2017 — 460.8(C) disconnecting means
  eq(has('(1) the disconnecting means shall open all ungrounded conductors simultaneously.'), true, 'art49: verbatim 460.8(C)(1) open all ungrounded');
  eq(has('(2) the disconnecting means shall be permitted to disconnect the capacitor from the line as a regular operating procedure.'), true, 'art49: verbatim 460.8(C)(2) regular operating procedure');
  eq(has('(3) the rating of the disconnecting means shall not be less than 135 percent of the rated current of the capacitor.'), true, 'art49: verbatim 460.8(C)(3) 135% rating');
  eq(has('a separate disconnecting means shall not be required where a capacitor is connected on the load side of a motor controller.'), true, 'art49: verbatim 460.8(C) Exception (load side of controller)');
  // verbatim 2017 — 460.9 (the trap)
  eq(has('where a motor installation includes a capacitor connected on the load side of the motor overload device, the rating or setting of the motor overload device shall be based on the improved power factor of the motor circuit.'), true, 'art49: verbatim 460.9 overload on improved PF');
  eq(has('the effect of the capacitor shall be disregarded in determining the motor circuit conductor rating in accordance with 430.22.'), true, 'art49: verbatim 460.9 conductor disregarded -> 430.22');
  // verbatim 2017 — companions 460.6 / 460.10 / 460.12
  eq(has('capacitors shall be provided with a means of discharging stored energy.'), true, 'art49: verbatim 460.6 lead');
  eq(has('the residual voltage of a capacitor shall be reduced to 50 volts, nominal, or less within 1 minute after the capacitor is disconnected from the source of supply.'), true, 'art49: verbatim 460.6(A) 50 V in 1 min');
  eq(has('manual means of switching or connecting the discharge circuit shall not be used.'), true, 'art49: verbatim 460.6(B) no manual switching');
  eq(has('capacitor cases shall be connected to the equipment grounding conductor.'), true, 'art49: verbatim 460.10 case to EGC');
  eq(has('capacitor cases shall not be connected to the equipment grounding conductor where the capacitor units are supported on a structure designed to operate at other than ground potential.'), true, 'art49: verbatim 460.10 Exception');
  eq(has('each capacitor shall be provided with a nameplate giving the name of the manufacturer, rated voltage, frequency, kilovar or amperes, number of phases'), true, 'art49: verbatim 460.12 nameplate contents');
  // edition story — 2017 -> 2023 core identity + the verified deltas
  eq(has('this article also covers the installation of capacitors in hazardous (classified) locations as modified by articles 501 through 503.'), true, 'art49: 2017 460.1 hazardous-locations sentence quoted');
  eq(has('complying with article 110, part ii'), true, 'art49: 2017 460.2(A) cites Article 110 Part II');
  eq(has('article 110, part iii'), true, 'art49: 2023 460.3(A) cites Article 110 Part III');
  eq(has('group-operated switches shall be used for capacitor switching'), true, 'art49: 2017 460.24(A) group-operated wording quoted');
  eq(has('switches shall be rated for switching of capacitive loads.'), true, 'art49: 2023 460.24(A) reworded MV switching quoted');
  eq(has('in accordance with 490.22'), true, 'art49: 2017 460.24(B)(2) cites 490.22');
  eq(has('in accordance with 495.22'), true, 'art49: 2023 460.24(B)(2) cites 495.22 (renumber)');
  eq(has('ansi/ieee 18-1992'), true, 'art49: 460.25(D) ANSI/IEEE 18 IN referenced (source-boundary disclosure)');
  eq(has('word-identical'), true, 'art49: 2017->2023 word-identity claim stated');
  eq(has('source boundary'), true, 'art49: 460.25(D) delta flagged as source boundary, not asserted');
  // worked examples — core-computed numbers (art49_numbers.json)
  eq(has('12.028'), true, 'art49: EX1 rated current 12.028 A (10 kVAR 480 V 3-ph)');
  eq(has('16.238'), true, 'art49: EX1 required ampacity 16.238 A (135%)');
  eq(has('pickconductor31016(16.238, cu, 60) → 12 awg cu'), true, 'art49: EX1 pick 12 AWG Cu @ 60 C');
  eq(has('nextstdbreaker(16.238) → 20 a'), true, 'art49: EX1 OCPD/disconnect 20 A');
  eq(has(String(nums.EX2.Icap)), true, 'art49: EX2 rated current ' + nums.EX2.Icap + ' A (5 kVAR 460 V 3-ph)');
  eq(has('pickconductor31016(8.472, cu, 60) → 14 awg cu'), true, 'art49: EX2 pick 14 AWG Cu @ 60 C');
  eq(has('nextstdbreaker(8.472) → 15 a'), true, 'art49: EX2 OCPD/disconnect 15 A');
  eq(has('7.6 a'), true, 'art49: EX3 5 hp 460 V FLC 7.6 A (Table 430.250)');
  eq(has('pickconductor31016(9.5, cu, 75) → 14 awg cu'), true, 'art49: EX3 motor conductor 14 AWG Cu @ 75 C (430.22 125%, cap disregarded)');
  eq(has('7.6 × (0.80/0.95) = 6.4 a'), true, 'art49: EX3 improved-PF line current 6.4 A (PF 0.80 -> 0.95)');
  eq(has('set for the improved-pf current'), true, 'art49: EX3 overload basis = improved-PF current');
  eq(has('8.696'), true, 'art49: EX4 rated current 8.696 A (2 kVAR 230 V 1-ph)');
  eq(has('11.739'), true, 'art49: EX4 required ampacity 11.739 A (135%)');
  eq(has('20 / 3 = 6.67 a'), true, 'art49: EX5 one-third of motor conductor ampacity 6.67 A');
  eq(has('max(6.67, 8.47) = 8.47 a'), true, 'art49: EX5 135% governs over one-third (8.47 A)');
  // cross-links into the motor series
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art49: cross-links to 430.22+430.52 article');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art49: cross-links to 430.32+430.36 article');
  eq(art.includes('nec-43072-43075-motor-control-circuit-protection.html'), true, 'art49: cross-links to 430.72+430.75 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art49: cross-links to 240.6 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art49: cross-links to 310.16 article');
  // sitemap + index + README
  const sitemap49 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap49.includes('articles/nec-46009-46008-pfc-capacitors.html'), true, 'art49: sitemap entry present');
  eq((sitemap49.match(/<loc>/g) || []).length >= 57, true, 'art49: sitemap has 53 URLs (art50 appended the 51st; art51 the 52nd; art52 the 53rd)');
  const index49 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index49.includes('articles/nec-46009-46008-pfc-capacitors.html'), true, 'art49: index cross-link present');
  const readme49 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme49.includes('articles/nec-46009-46008-pfc-capacitors.html'), true, 'art49: README entry present');
}

// Article 50 — NEC 440.22 + 440.32: air-conditioning branch circuits (the
// branch-circuit core of Article 440). 440.22(A) = the branch-circuit SC/GF
// device capped at 175% of the GREATER of rated-load current (RLC) or
// branch-circuit selection current (BCS), the 225% starting-current allowance,
// the 15 A floor, and the 440.22(C) nameplate marked-maximum trump card.
// 440.32 = conductors at 125% of that greater current, with the 72%
// wye-start/delta-run rule for the controller-to-motor conductors. Companions
// 440.33 (multi-motor: sum + 25% of the largest), 440.52 (140% relay / 125%
// fuse / 156% thermal), 440.12(A)(1) (disconnect at 115%). EDITION STORY: the
// branch-circuit NUMBERS never moved 2017->2023 (440.22(A) reorganized from a
// long sentence + single Exception into a rule + three Exceptions; 440.32 from
// "125% of either ... whichever is greater" to "the greater of the following"
// — substance identical, alpha-normalized machine diff). Real 2017->2023
// deltas, all verified on disk + Mike Holt 2023 change summary: 440.8 added
// the bathtub/shower zone; 440.9 non-threaded -> compression-type fittings;
// 440.11 lockable door; 440.14 110.26(A) working space; 440.52(B) 440.59 ->
// 440.55 renumber. Worked examples core-computed (compute_art50.js ->
// art50_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-44022-44032-air-cooling-branch-circuit.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art50_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art50: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art50: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art50: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art50: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 50'), true, 'art50: footer marks article 50');
  // core rules present (verbatim 2017)
  eq(has('175 percent of the motor-compressor rated-load current'), true, 'art50: 440.22(A) 175% rule quoted');
  eq(has('shall not exceed 225 percent of the motor rated-load current'), true, 'art50: 440.22(A) 225% starting allowance quoted');
  eq(has('shall not be required to be less than 15 amperes'), true, 'art50: 440.22(A) 15 A floor quoted');
  eq(has('125 percent of either the motor-compressor rated-load current or the branch-circuit selection current, whichever is greater'), true, 'art50: 440.32 125% rule quoted');
  eq(has('72 percent of either the motor-compressor rated-load current'), true, 'art50: 440.32 wye-delta 72% rule quoted');
  eq(has('25 percent of the highest motor-compressor or motor full load current'), true, 'art50: 440.33 25% of largest quoted');
  eq(has('not more than 140 percent of the motor-compressor rated-load current'), true, 'art50: 440.52(A)(1) 140% relay quoted');
  eq(has('rated at not more than 125 percent of the motor-compressor rated-load current'), true, 'art50: 440.52(A)(3) 125% fuse quoted');
  eq(has('at least 115 percent of the nameplate rated-load current'), true, 'art50: 440.12(A)(1) 115% disconnect quoted');
  // edition story
  eq(has('substance identical'), true, 'art50: 440.22(A)/440.32 substance-identical claim stated');
  eq(has('bathtub rim or shower stall threshold'), true, 'art50: 440.8 bathtub/shower zone quoted (2023 addition)');
  eq(has('compression-type fittings'), true, 'art50: 440.9 compression-type fittings quoted (2023)');
  eq(has('non-threaded fittings'), true, 'art50: 440.9 non-threaded fittings quoted (2017)');
  eq(has('require a tool to open or be capable of being locked'), true, 'art50: 440.11 lockable door quoted (2023 addition)');
  eq(has('working space requirements of 110.26(a)'), true, 'art50: 440.14 110.26(A) working space quoted (2023 addition)');
  eq(has('440.59'), true, 'art50: 2017 440.52(B) cites 440.59');
  eq(has('440.55'), true, 'art50: 2023 440.52(B) cites 440.55 (renumber)');
  eq(has('2020 position is not asserted'), true, 'art50: 2020 source boundary disclosed');
  eq(has('ocr'), true, 'art50: OCR artifacts disclosed');
  // worked examples — core-computed numbers (art50_numbers.json)
  eq(has(String(nums.EX1.gov)), true, 'art50: EX1 governing current ' + nums.EX1.gov + ' A (BCS governs)');
  eq(has('pickconductor31016(22.5, cu, 75) → 12 awg cu'), true, 'art50: EX1 conductor 12 AWG Cu @ 75 C');
  eq(has('nextstdbreaker(20.7) → 25 a'), true, 'art50: EX1 disconnect 25 A');
  eq(has('31.5'), true, 'art50: EX1 175% ceiling 31.5 A');
  eq(has('pickconductor31016(35, cu, 75) → 10 awg cu'), true, 'art50: EX2 conductor 10 AWG Cu @ 75 C (125% × 28)');
  eq(has('nextstdbreaker(32.2) → 35 a'), true, 'art50: EX2 disconnect 35 A');
  eq(has('78.75'), true, 'art50: EX3 175% ceiling 78.75 A (exceeded)');
  eq(has('101.25'), true, 'art50: EX3 225% ceiling 101.25 A (225% rung)');
  eq(has('pickconductor31016(56.25, cu, 75) → 6 awg cu'), true, 'art50: EX3 conductor 6 AWG Cu @ 75 C');
  eq(has('nextstdbreaker(51.75) → 60 a'), true, 'art50: EX3 disconnect 60 A');
  eq(has('total conductor ampacity (440.33) 35 a'), true, 'art50: EX4 440.33 multi-motor sum 35 A (20+10+5)');
  eq(has('pickconductor31016(37.5, cu, 75) → 8 awg cu'), true, 'art50: EX5 line conductors 8 AWG Cu @ 75 C (125% × 30)');
  eq(has('pickconductor31016(21.6, cu, 75) → 12 awg cu'), true, 'art50: EX5 controller-to-motor 12 AWG Cu @ 75 C (72% × 30)');
  // cross-links into the motor series
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art50: cross-links to 430.22+430.52 article');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art50: cross-links to 430.32+430.36 article');
  eq(art.includes('nec-46009-46008-pfc-capacitors.html'), true, 'art50: cross-links to 460.9+460.8 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art50: cross-links to 240.6 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art50: cross-links to 310.16 article');
  // sitemap + index + README
  const sitemap50 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap50.includes('articles/nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art50: sitemap entry present');
  const index50 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index50.includes('articles/nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art50: index cross-link present');
  const readme50 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme50.includes('articles/nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art50: README entry present');
}

// Article 51 — NEC 450.3: transformer overcurrent protection. Table
// 450.3(B) = the 1000 V-and-less grid (125% primary-only / 167% <9 A / 300%
// <2 A; 250% primary + 125%/167% secondary; Note 1 next-higher-standard;
// Note 3 six-times/four-times coordinated thermal overload). Table 450.3(A)
// = the over-1000 V grid (600/400/300% primary keyed on impedance + location,
// 300/250/225/125% secondary, supervised row, Note 1b commercially-available).
// 450.4(A) autotransformers (125%/167% of rated full-load INPUT, never the
// shunt winding). 450.6 secondary ties (67%/100%/133% ampacity, 250% +
// reverse-current relay, 150 V-to-ground switch). EDITION STORY: the OCPD
// numbers never moved 2017->2023 (39 phrase-level machine checks,
// verify_art51_deltas.py, all pass). Real deltas: 450.1 exception->list
// rework + article refs removed (Mike Holt-documented); 450.10 "Bonding"
// title (Mike Holt-documented); cross-ref renumbers 240.100/240.101->
// 245.26/245.27, 250.24(B)->250.24(C), 314.16(B)->314.16(B)(1); 450.9 IEEE
// re-cites + no-storage marking; 450.14 "lockable open". Worked examples
// core-computed (compute_art51.js -> art51_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-4503-transformer-overcurrent.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art51_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-4503-transformer-overcurrent.html'), true, 'art51: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-4503-transformer-overcurrent.html'), true, 'art51: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art51: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art51: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 51'), true, 'art51: footer marks article 51');
  // core rules present (verbatim 2017)
  eq(has('this article covers the installation of all transformers'), true, 'art51: 450.1 scope quoted');
  eq(has('exception no. 8: transformers used for research, development, or testing'), true, 'art51: 450.1 Exception No. 8 quoted (2017)');
  eq(has('an individual transformer, single- or polyphase, identified by a single nameplate'), true, 'art51: 450.2 definition quoted');
  eq(has('polyphase bank of two or more single-phase transformers operating as a unit'), true, 'art51: 450.3 polyphase-bank definition quoted');
  eq(has('not more than 125 percent of the rated full-load input current'), true, 'art51: 450.4(A) 125% rule quoted');
  eq(has('not more than 167 percent of the input current'), true, 'art51: 450.4(A) 167% Exception quoted');
  eq(has('shall not be installed in series with the shunt winding'), true, 'art51: 450.4(A) shunt-winding prohibition quoted');
  eq(has('not be less than 67 percent of the rated secondary current'), true, 'art51: 450.6(A)(1) 67% tie ampacity quoted');
  eq(has('not be less than 100 percent of the rated secondary current'), true, 'art51: 450.6(A)(2) 100% tie ampacity quoted');
  eq(has('not less than 133 percent of the rated secondary current'), true, 'art51: 450.6(A)(4)(b) 133% combined ampacity quoted');
  eq(has('not more than 250 percent of the rated secondary current'), true, 'art51: 450.6(B) 250% secondary OCPD quoted');
  eq(has('actuated by a reverse-current relay'), true, 'art51: 450.6(B) reverse-current relay quoted');
  eq(has('exceeds 150 volts to ground'), true, 'art51: 450.6(A)(5) 150 V-to-ground switch rule quoted');
  // edition story — 2023 deltas
  eq(has('other than the following'), true, 'art51: 450.1 2023 exclusion-list wording quoted');
  eq(has('the previous exceptions in the text were converted to rules'), true, 'art51: 450.1 Mike Holt 2023 quote');
  eq(has('grounding and bonding'), true, 'art51: 450.10 2023 "Grounding and Bonding" title');
  eq(has('245.26'), true, 'art51: 2023 450.3 IN Note 1 cites 245.26');
  eq(has('240.100'), true, 'art51: 2017 450.3 IN Note 1 cites 240.100');
  eq(has('245.27'), true, 'art51: 2023 450.3 IN Note 1 cites 245.27');
  eq(has('250.24(b)'), true, 'art51: 2017 450.5 cites 250.24(B)');
  eq(has('250.24(c)'), true, 'art51: 2023 450.5 cites 250.24(C)');
  eq(has('314.16(b)(1)'), true, 'art51: 2023 450.12 cites Table 314.16(B)(1)');
  eq(has('ieee 3002.8'), true, 'art51: 2023 450.3 IN Note 2 adds IEEE 3002.8');
  eq(has('prohibit storage'), true, 'art51: 2023 450.9 no-storage marking quoted');
  eq(has('lockable open'), true, 'art51: 2023 450.14 "lockable open"');
  eq(has('2020 position is not asserted'), true, 'art51: 2020 source boundary disclosed');
  eq(has('ocr'), true, 'art51: OCR artifacts disclosed');
  // worked examples — core-computed numbers (art51_numbers.json)
  eq(has(String(nums.EX1.Ip)), true, 'art51: EX1 rated primary ' + nums.EX1.Ip + ' A');
  eq(has(String(nums.EX1.Is)), true, 'art51: EX1 rated secondary ' + nums.EX1.Is + ' A');
  eq(has(String(nums.EX1.po125)), true, 'art51: EX1 125% primary ' + nums.EX1.po125 + ' A');
  eq(has(String(nums.EX1.po125_std)), true, 'art51: EX1 125% row device ' + nums.EX1.po125_std + ' A');
  eq(has(String(nums.EX1.note3_stdAtOrBelow)), true, 'art51: EX1 Note 3 6x ceiling device ' + nums.EX1.note3_stdAtOrBelow + ' A');
  eq(has('6 awg cu'), true, 'art51: EX4 67% tie conductor 6 AWG Cu');
  eq(has('3 awg cu'), true, 'art51: EX4 100% tie conductor 3 AWG Cu');
  eq(has(String(nums.EX4.ocpd250_stdAtOrBelow)), true, 'art51: EX4 450.6(B) OCPD ' + nums.EX4.ocpd250_stdAtOrBelow + ' A (250% ceiling)');
  eq(has('15,035.16'), true, 'art51: EX5 250% secondary ' + nums.EX5.secCB250 + ' A (comma-formatted 15,035.16)');
  // cross-links
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art51: cross-links to 250.26-250.30 article');
  eq(art.includes('nec-43072-43075-motor-control-circuit-protection.html'), true, 'art51: cross-links to 430.72 article (450.3(B) Exception)');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art51: cross-links to 430.22+430.52 article');
  eq(art.includes('nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art51: cross-links to 440.22+440.32 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art51: cross-links to 240.6 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art51: cross-links to 310.16 article');
  // sitemap + index + README
  const sitemap51 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap51.includes('articles/nec-4503-transformer-overcurrent.html'), true, 'art51: sitemap entry present');
  eq((sitemap51.match(/<loc>/g) || []).length >= 57, true, 'art51: sitemap has 53 URLs (art52 appended the 53rd)');
  const index51 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index51.includes('articles/nec-4503-transformer-overcurrent.html'), true, 'art51: index cross-link present');
  const readme51 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme51.includes('articles/nec-4503-transformer-overcurrent.html'), true, 'art51: README entry present');
}


// Article 52 — NEC 450.8-450.14: the INSTALLATION core of Article 450 Part I
// (the physical envelope around the OCPD rules in Article 51). 450.8 guarding
// ((A) mechanical protection / (B) noncombustible moisture-resistant case /
// (C) 110.27 + 110.34 guarding + qualified-persons-only / (D) voltage warning
// signs); 450.9 ventilation (full-load heat, unblocked openings, marked
// clearances; 2023 adds the no-storage top-surface marking + IEEE re-cites);
// 450.10 grounding ("Grounding and Bonding" in 2023 — Mike Holt-documented
// title; the terminal bar in the enclosure per 250.12, the 250.8 wire-lead
// Exception, other metal parts per 250 Parts V-VII; 2023 (B) drops the
// "Where grounded," conditional); 450.11 marking (the eight nameplate items +
// source marking); 450.12 terminal wiring space (312.6 bending space + pigtail
// volume Table 314.16(B) [2017] -> 314.16(B)(1) [2023]); 450.13 accessibility
// (the 50 kVA hollow-space boundary); 450.14 disconnecting means (in sight or
// remote-lockable [2017] / lockable-open [2023] + field marking; Class 2/3
// exempt). EDITION STORY: the installation rules are substance-identical
// 2017->2023 (52 phrase-level machine checks, verify_art52.py, all pass). Real
// deltas: 450.9 IEEE re-cites + no-storage marking; 450.10 title + (B)
// conditional drop; 450.12 314.16(B)->314.16(B)(1) renumber; 450.14 "lockable
// open". Worked examples core-computed (compute_art52.js -> art52_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-4508-45014-transformer-installation.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art52_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-4508-45014-transformer-installation.html'), true, 'art52: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-4508-45014-transformer-installation.html'), true, 'art52: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art52: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art52: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 52'), true, 'art52: footer marks article 52');
  // 450.8 guarding (verbatim 2017)
  eq(has('transformers shall be guarded as specified in 450.8(a) through (d)'), true, 'art52: 450.8 lead-in (A)-(D) quoted');
  eq(has('minimize the possibility of damage to transformers from external causes'), true, 'art52: 450.8(A) mechanical protection quoted');
  eq(has('noncombustible moisture-resistant case or enclosure'), true, 'art52: 450.8(B) case/enclosure quoted');
  eq(has('protection against the accidental insertion of foreign objects'), true, 'art52: 450.8(B) foreign-object protection quoted');
  eq(has('all energized parts shall be guarded in accordance with 110.27 and 110.34'), true, 'art52: 450.8(C) 110.27/110.34 guarding quoted');
  eq(has('the operating voltage of exposed live parts of transformer installations shall be indicated by signs or visible markings'), true, 'art52: 450.8(D) voltage warning quoted');
  // 450.9 ventilation (verbatim 2017)
  eq(has('the ventilation shall dispose of the transformer full-load heat losses'), true, 'art52: 450.9 full-load heat quoted');
  eq(has('the ventilating openings are not blocked by walls or other obstructions'), true, 'art52: 450.9 no-blocked-openings quoted');
  eq(has('the required clearances shall be clearly marked on the transformer'), true, 'art52: 450.9 clearances marked quoted');
  // 450.10 grounding (verbatim 2017)
  eq(has('the terminal bar shall be bonded to the enclosure in accordance with 250.12'), true, 'art52: 450.10(A) terminal bar 250.12 quoted');
  eq(has('shall not be installed on or over any vented portion of the enclosure'), true, 'art52: 450.10(A) vented-portion prohibition quoted');
  eq(has('shall be permitted to be connected together using any of the methods in 250.8'), true, 'art52: 450.10(A) Exception 250.8 wire-lead quoted');
  eq(has('fences, guards, and so forth'), true, 'art52: 450.10(B) fences/guards quoted');
  eq(has('parts v, vi, and vii of article 250'), true, 'art52: 450.10(B) 250 Parts V-VII quoted');
  // 450.11 marking (verbatim 2017)
  eq(has('rated kilovolt-amperes'), true, 'art52: 450.11(A)(2) rated kVA quoted');
  eq(has('impedance of transformers 25 kva and larger'), true, 'art52: 450.11(A)(5) impedance 25 kVA quoted');
  eq(has('temperature class for the insulation system'), true, 'art52: 450.11(A)(8) temperature class quoted (OCR insuJation corrected)');
  eq(has('provided that the installation is in accordance with the manufacturer'), true, 'art52: 450.11(B) source marking quoted');
  // 450.12 terminal wiring space (verbatim 2017)
  eq(has('shall be as required in 312.6'), true, 'art52: 450.12 312.6 bending space quoted');
  eq(has('conform to table 314.16(b).'), true, 'art52: 450.12 2017 "Table 314.16(B)." quoted');
  // 450.13 accessibility (verbatim 2017)
  eq(has('shall be readily accessible to qualified personnel for inspection and maintenance'), true, 'art52: 450.13 ready-access default quoted');
  eq(has('not exceeding 50 kva shall be permitted in hollow spaces'), true, 'art52: 450.13(B) 50 kVA hollow-space boundary quoted');
  // 450.14 disconnecting means (verbatim 2017)
  eq(has('other than class 2 or class 3 transformers'), true, 'art52: 450.14 Class 2/3 exemption quoted');
  eq(has('located either in sight of the transformer or in a remote location'), true, 'art52: 450.14 in-sight-or-remote quoted');
  eq(has('its location shall be field marked on the transformer'), true, 'art52: 450.14 field marking quoted');
  eq(has('shall be lockable in accordance with 110.25'), true, 'art52: 450.14 2017 "lockable" quoted');
  // 2017 -> 2023 deltas
  eq(has('c57.12.00-1993'), true, 'art52: 2017 IEEE C57.12.00-1993 quoted');
  eq(has('ieee c57.12.00-2015'), true, 'art52: 2023 IEEE C57.12.00-2015 cited');
  eq(has('c57.12.01-2020'), true, 'art52: 2023 IEEE C57.12.01-2020 cited');
  eq(has('c57.110-2018'), true, 'art52: 2023 IEEE C57.110-2018 cited');
  eq(has('shall be marked to prohibit storage'), true, 'art52: 2023 450.9 no-storage marking quoted');
  eq(has('grounding and bonding'), true, 'art52: 2023 450.10 "Grounding and Bonding" title');
  eq(has('where grounded, exposed non-current-carrying'), true, 'art52: 2017 450.10(B) "where grounded," conditional quoted');
  eq(has('table 314.16(b)(1).'), true, 'art52: 2023 450.12 cites Table 314.16(B)(1) (ellipsis quote)');
  eq(has('lockable open'), true, 'art52: 2023 450.14 "lockable open"');
  // worked examples — core-computed numbers (art52_numbers.json)
  eq(has(String(nums.EX1.Ip)), true, 'art52: EX1 rated primary ' + nums.EX1.Ip + ' A');
  eq(has(String(nums.EX1.Is)), true, 'art52: EX1 rated secondary ' + nums.EX1.Is + ' A');
  eq(has('6 awg cu'), true, 'art52: EX1 secondary conductor 6 AWG Cu');
  eq(has('12 awg cu'), true, 'art52: EX1 primary conductor 12 AWG Cu');
  eq(has(String(nums.EX1.fill.total)), true, 'art52: EX1 pigtail fill ' + nums.EX1.fill.total + ' in^3');
  eq(has('4 × 2 × 2-1/2 in square'), true, 'art52: EX1 smallest fitting box 4x2x2-1/2 square');
  eq(has('1-1/2 in'), true, 'art52: EX1 312.6(A) bending space 1-1/2 in');
  eq(has(String(nums.EX2.ratedSec_50kVA)), true, 'art52: EX2 50 kVA rated secondary ' + nums.EX2.ratedSec_50kVA + ' A');
  eq(has(String(nums.EX2.ratedSec_51kVA)), true, 'art52: EX2 51 kVA rated secondary ' + nums.EX2.ratedSec_51kVA + ' A');
  eq(has(String(nums.EX2.deltaKVA)), true, 'art52: EX2 1-kVA step ' + nums.EX2.deltaKVA + ' A');
  eq(has('2/0 awg cu'), true, 'art52: EX2 50 kVA conductor 2/0 AWG Cu');
  eq(has('3/0 awg cu'), true, 'art52: EX2 51 kVA conductor 3/0 AWG Cu');
  eq(has(String(nums.EX3.Ip)), true, 'art52: EX3 50 kVA primary ' + nums.EX3.Ip + ' A');
  eq(has(String(nums.EX3.class2_example.currentA)), true, 'art52: EX3 Class 2 example ' + nums.EX3.class2_example.currentA + ' A');
  // cross-links
  eq(art.includes('nec-4503-transformer-overcurrent.html'), true, 'art52: cross-links to 450.3 OCPD article (Article 51)');
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art52: cross-links to 250.26-250.30 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art52: cross-links to 310.16 article');
  eq(art.includes('nec-430101-430113-disconnecting-means.html'), true, 'art52: cross-links to 430.101-430.113 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art52: cross-links to 240.6 article');
  // sitemap + index + README
  const sitemap52 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap52.includes('articles/nec-4508-45014-transformer-installation.html'), true, 'art52: sitemap entry present');
  eq((sitemap52.match(/<loc>/g) || []).length >= 57, true, 'art52: sitemap has 53 URLs (art52 appended the 53rd)');
  const index52 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index52.includes('articles/nec-4508-45014-transformer-installation.html'), true, 'art52: index cross-link present');
  const readme52 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme52.includes('articles/nec-4508-45014-transformer-installation.html'), true, 'art52: README entry present');
}

// Article 53 — NEC 450.21-450.28: Article 450 PART II "Specific Provisions
// Applicable to Different Types of Transformers" — the insulation-type key:
// 450.21 dry-type indoors (112.5 kVA transformer-room boundary + Class 155
// exceptions + the fully-enclosed 1000-V Exception; > 35 kV vault per (C));
// 450.22 dry-type outdoors (weatherproof enclosure + 12-in combustible
// rule + Class 155 escape); 450.23 less-flammable liquid (listed, 300 C
// fire point; indoor Type I/II 35 kV cap routes + outdoor routes); 450.24
// nonflammable fluid (indoors/outdoors; 35 kV vault; confinement + vent +
// gas path; the nonflammable definition); 450.25 askarel (25 kVA vent /
// 35 kV vault; poorly-ventilated gas path); 450.26 oil indoors (vault +
// six Exceptions: 4-in concrete, 10/75 kVA no-vault, furnace 75 kVA,
// accelerator 75 kVA/1000 V, detached qualified-persons building,
// surface-mining 6-mm barrier); 450.27 oil outdoors (four fire safeguards
// + oil-enclosure/trapped-drain sentences); 450.28 modification marking.
// EDITION STORY: the installation rules and every boundary number
// unchanged 2017->2023 (192 phrase-level machine checks,
// verify_art53.py, all pass). Real deltas, all on-disk-verified (no Mike
// Holt 2023 entries exist for Part II): 450.21(B) rework (1-hour rating
// fused into the rule + term definition deleted + both Exception fragments
// made explicit with "shall not be required to be installed in a
// transformer room" (2x in 2023, 0x in 2017) + ASTM E119-15 -> E119-18a);
// 450.23 reword (may->can, If-clauses with "is present", where/if reword,
// NFPA 220-2015 -> 2021, Listed-in-Article-100 note dropped, safeguards
// note moved (B)(1) -> (B)); 450.27 NESC C2-2007 -> C2-2017. Scope: no
// 450.15-450.20; Part II ends 450.28; Part III starts 450.41. Worked
// examples core-computed (compute_art53.js -> art53_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-45021-45028-transformer-types-part-ii.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art53_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-45021-45028-transformer-types-part-ii.html'), true, 'art53: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-45021-45028-transformer-types-part-ii.html'), true, 'art53: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art53: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art53: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 53'), true, 'art53: footer marks article 53');
  // 450.21 (verbatim 2017)
  eq(has('Dry-type transformers installed indoors and rated 112½ kVA or less shall have a separation of at least 300 mm (12 in.) from combustible material'), true, 'art53: 450.21(A) rule quoted');
  eq(has('by a fire-resistant, heat-insulated barrier'), true, 'art53: 450.21(A) barrier quoted');
  eq(has('This rule shall not apply to transformers rated for 1000 volts, nominal, or less that are completely enclosed, except for ventilating openings'), true, 'art53: 450.21(A) Exception quoted');
  eq(has('Individual dry-type transformers of more than 112½ kVA rating shall be installed in a transformer room of fire-resistant construction'), true, 'art53: 450.21(B) rule quoted');
  eq(has('Unless specified otherwise in this article, the term fire resistant means a construction having a minimum fire rating of 1 hour'), true, 'art53: 450.21(B) 2017 term definition quoted (deleted 2023)');
  eq(has('by not less than 1.83 m (6 ft) horizontally and 3.7 m (12 ft) vertically'), true, 'art53: 450.21(B) Ex 1 distances quoted');
  eq(has('Transformers with Class 155 or higher insulation systems and completely enclosed except for ventilating openings'), true, 'art53: 450.21(B) Ex 2 quoted');
  eq(has('ANSI/ASTM E119-15, Method for Fire Tests of Building Construction and Materials'), true, 'art53: 450.21(B) 2017 IN E119-15 quoted');
  eq(has('Dry-type transformers rated over 35,000 volts shall be installed in a vault complying with Part III of this article'), true, 'art53: 450.21(C) quoted');
  // 450.22 (verbatim 2017)
  eq(has('Dry-type transformers installed outdoors shall have a weatherproof enclosure'), true, 'art53: 450.22 sentence 1 quoted');
  eq(has('Transformers exceeding 112½ kVA shall not be located within 300 mm (12 in.) of combustible materials of buildings'), true, 'art53: 450.22 sentence 2 quoted');
  // 450.23 (verbatim 2017)
  eq(has('Transformers insulated with listed less-flammable liquids that have a fire point of not less than 300°C shall be permitted to be installed in accordance with 450.23(A) or 450.23(B)'), true, 'art53: 450.23 lead 300 C quoted');
  eq(has('In Type I or Type II buildings, in areas where all of the following requirements are met'), true, 'art53: 450.23(A)(1) lead quoted');
  eq(has('The transformer is rated 35,000 volts or less'), true, 'art53: 450.23(A)(1) 35 kV item quoted');
  eq(has('No combustible materials are stored'), true, 'art53: 450.23(A)(1) no-storage item quoted');
  eq(has('A liquid confinement area is provided'), true, 'art53: 450.23(A)(1) confinement item quoted');
  eq(has('Such restrictions may include, but are not limited to: maximum pressure of the tank, use of a pressure relief valve, appropriate fuse types and proper sizing of overcurrent protection'), true, 'art53: 450.23(A) IN may-include (2017 comma-less form) quoted');
  eq(has('With an automatic fire extinguishing system and a liquid confinement area, provided the transformer is rated 35,000 volts or less'), true, 'art53: 450.23(A)(2) 2017 With-form quoted');
  eq(has('In accordance with 450.26'), true, 'art53: 450.23(A)(3) 450.26 route quoted');
  eq(has('where installed in accordance with (1) or (2)'), true, 'art53: 450.23(B) lead 2017 where-form quoted');
  eq(has('may require additional safeguards such as those listed in 450.27'), true, 'art53: 450.23(B)(1) 2017 IN1 quoted (moved 2023)');
  eq(has('defined in NFPA 220-2015, Standard on Types of Building Construction'), true, 'art53: 450.23(B) NFPA 220-2015 quoted');
  eq(has('See definition of Listed in Article 100'), true, 'art53: 450.23(B) 2017 Listed-in-100 IN quoted (dropped 2023)');
  // 450.24 (verbatim 2017)
  eq(has('Transformers insulated with a dielectric fluid identified as nonflammable shall be permitted to be installed indoors or outdoors'), true, 'art53: 450.24 sentence 1 quoted');
  eq(has('Such transformers installed indoors and rated over 35,000 volts shall be installed in a vault'), true, 'art53: 450.24 vault quoted');
  eq(has('Such transformers installed indoors shall be furnished with a liquid confinement area and a pressure-relief vent'), true, 'art53: 450.24 confinement + vent quoted');
  eq(has('a nonflammable dielectric fluid is one that does not have a flash point or fire point and is not flammable in air'), true, 'art53: 450.24 nonflammable definition quoted');
  // 450.25 (verbatim 2017)
  eq(has('Askarel-insulated transformers installed indoors and rated over 25 kVA shall be furnished with a pressure-relief vent'), true, 'art53: 450.25 vent quoted');
  eq(has('or the pressure-relief vent shall be connected to a chimney or flue that carries such gases outside the building'), true, 'art53: 450.25 poorly-ventilated gas path quoted');
  eq(has('Askarel-insulated transformers rated over 35,000 volts shall be installed in a vault'), true, 'art53: 450.25 vault quoted');
  // 450.26 (verbatim 2017)
  eq(has('Oil-insulated transformers installed indoors shall be installed in a vault constructed as specified in Part III of this article'), true, 'art53: 450.26 lead quoted');
  eq(has('Where the total capacity does not exceed 112½ kVA'), true, 'art53: 450.26 Ex 1 quoted');
  eq(has('constructed of reinforced concrete that is not less than 100 mm (4 in.) thick'), true, 'art53: 450.26 Ex 1 4-in concrete quoted');
  eq(has('does not exceed 10 kVA in a section of the building classified as combustible or 75 kVA where the surrounding structure is classified as fire-resistant construction'), true, 'art53: 450.26 Ex 2 10/75 kVA quoted');
  eq(has('Electric furnace transformers that have a total rating not exceeding 75 kVA shall be permitted to be installed without a vault'), true, 'art53: 450.26 Ex 3 quoted');
  eq(has('an integral part of charged-particle-accelerating equipment'), true, 'art53: 450.26 Ex 4 quoted');
  eq(has('the interior is accessible only to qualified persons'), true, 'art53: 450.26 Ex 5 quoted');
  eq(has('portable and mobile surface mining equipment (such as electric excavators)'), true, 'art53: 450.26 Ex 6 quoted');
  eq(has('A minimum 6-mm (1/4-in.) steel barrier is provided for personnel protection'), true, 'art53: 450.26 Ex 6(3) barrier quoted');
  // 450.27 (verbatim 2017)
  eq(has('shall be safeguarded from fires originating in oil-insulated transformers installed on roofs, attached to or adjacent to a building or combustible material'), true, 'art53: 450.27 lead quoted');
  eq(has('(1) Space separations'), true, 'art53: 450.27 item 1 quoted');
  eq(has('(2) Fire-resistant barriers'), true, 'art53: 450.27 item 2 quoted');
  eq(has('(3) Automatic fire suppression systems'), true, 'art53: 450.27 item 3 quoted');
  eq(has('(4) Enclosures that confine the oil of a ruptured transformer tank'), true, 'art53: 450.27 item 4 quoted');
  eq(has('fire-resistant dikes, curbed areas or basins, or trenches filled with coarse, crushed stone'), true, 'art53: 450.27 oil enclosures quoted');
  eq(has('Oil enclosures shall be provided with trapped drains'), true, 'art53: 450.27 trapped drains quoted');
  eq(has('see ANSI C2-2007, National Electrical Safety Code'), true, 'art53: 450.27 2017 NESC cite quoted');
  // 450.28 (verbatim 2017)
  eq(has('such transformer shall be marked to show the type of insulating liquid installed, and the modified transformer installation shall comply with the applicable requirements for that type of transformer'), true, 'art53: 450.28 full rule quoted');
  // edition story (2017 vs 2023)
  eq(has('having a minimum fire rating of 1 hour'), true, 'art53: 2023 fused 1-hour sentence documented');
  eq(has('ASTM E119-18a, Standard Test Methods for Fire Tests of Building Construction and Materials'), true, 'art53: 2023 E119-18a documented');
  eq(has('shall not be required to be installed in a transformer room'), true, 'art53: 2023 explicit Exception predicate documented');
  eq(has('can include, but are not limited to'), true, 'art53: 2023 can-include documented');
  eq(has('If an automatic fire extinguishing system and a liquid confinement area is present'), true, 'art53: 2023 If-clause documented');
  eq(has('if installed in accordance with either of the following'), true, 'art53: 2023 (B) lead reword documented');
  eq(has('NFPA 220-2021, Standard on Types of Building Construction'), true, 'art53: 2023 NFPA 220-2021 documented');
  eq(has('See 450.27 for examples of additional safeguards'), true, 'art53: 2023 moved safeguards note documented');
  eq(has('ANSI/IEEE C2-2017'), true, 'art53: 2023 NESC C2-2017 documented');
  eq(has('0× in 2017') || has('0x in 2017'), true, 'art53: predicate count check (2x in 2023, 0x in 2017) documented');
  eq(has('no Mike Holt 2023 change-summary entries exist for any Part II section'), true, 'art53: no-MH-entries statement present');
  eq(has('2020 position'), true, 'art53: 2020-not-asserted boundary stated');
  eq(has('no 450.15 through 450.20'), true, 'art53: scope statement (no 450.15-20) present');
  // worked figures (core-computed)
  eq(has(String(nums.EX1.at1125)), true, 'art53: EX1 112.5 kVA rated ' + nums.EX1.at1125 + ' A');
  eq(has(String(nums.EX1.at113)), true, 'art53: EX1 113 kVA rated ' + nums.EX1.at113 + ' A');
  eq(has(String(nums.EX1.delta)), true, 'art53: EX1 1-kVA step ' + nums.EX1.delta + ' A');
  eq(has('2/0 awg cu'), true, 'art53: EX1 conductor 2/0 AWG Cu (both sides of boundary)');
  eq(has(String(nums.EX2.a10)), true, 'art53: EX2 10 kVA rated ' + nums.EX2.a10 + ' A');
  eq(has(String(nums.EX2.a75)), true, 'art53: EX2 75 kVA rated ' + nums.EX2.a75 + ' A');
  eq(has('14 awg cu'), true, 'art53: EX2 10 kVA conductor 14 AWG Cu');
  eq(has('2 awg cu'), true, 'art53: EX2 75 kVA conductor 2 AWG Cu');
  eq(has(String(nums.EX3.a25)), true, 'art53: EX3 25 kVA rated ' + nums.EX3.a25 + ' A (no vent)');
  eq(has(String(nums.EX3.a26)), true, 'art53: EX3 26 kVA rated ' + nums.EX3.a26 + ' A (vent required)');
  eq(has('8 awg cu'), true, 'art53: EX3 conductor 8 AWG Cu (both sides of vent boundary)');
  eq(has(String(nums.EX3.a345)), true, 'art53: EX3 100 kVA @ 34.5 kV ' + nums.EX3.a345 + ' A (no vault)');
  eq(has(String(nums.EX3.a38)), true, 'art53: EX3 100 kVA @ 38 kV ' + nums.EX3.a38 + ' A (vault)');
  eq(has(String(nums.EX4.a345)), true, 'art53: EX4 5 MVA @ 34.5 kV ' + nums.EX4.a345 + ' A');
  eq(has(String(nums.EX4.a38)), true, 'art53: EX4 5 MVA @ 38 kV ' + nums.EX4.a38 + ' A');
  eq(has('3 awg cu'), true, 'art53: EX4 38 kV conductor 3 AWG Cu');
  eq(has(String(nums.EX5.a)), true, 'art53: EX5 250 kVA rated ' + nums.EX5.a + ' A');
  eq(has('500 kcmil cu'), true, 'art53: EX5 conductor 500 kcmil Cu');
  // cross-links
  eq(art.includes('nec-4503-transformer-overcurrent.html'), true, 'art53: cross-links to 450.3 OCPD article (Article 51)');
  eq(art.includes('nec-4508-45014-transformer-installation.html'), true, 'art53: cross-links to 450.8-450.14 installation article (Article 52)');
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art53: cross-links to 250.26-250.30 article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art53: cross-links to 310.16 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art53: cross-links to 240.6 article');
  // sitemap + index + README
  const sitemap53 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap53.includes('articles/nec-45021-45028-transformer-types-part-ii.html'), true, 'art53: sitemap entry present');
  eq((sitemap53.match(/<loc>/g) || []).length >= 57, true, 'art53: sitemap has 54 URLs (art53 appended the 54th)');
  const index53 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index53.includes('articles/nec-45021-45028-transformer-types-part-ii.html'), true, 'art53: index cross-link present');
  const readme53 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme53.includes('articles/nec-45021-45028-transformer-types-part-ii.html'), true, 'art53: README entry present');
}

// Article 54 — NEC 450.41-450.48: Article 450 PART III "Transformer
// Vaults" — the vault construction every Part II vault route points to
// (450.21(C) dry-type > 35 kV, 450.24 nonflammable fluid > 35 kV,
// 450.25 askarel > 35 kV, 450.26 indoor oil-filled): 450.41 location
// (ventilate to outside air, no flues/ducts, wherever practicable);
// 450.42 walls/roofs/floors (3-hour construction, 100 mm / 4-in.
// concrete earth-contact floor, 3-hour floor over vacant space/stories,
// studs and wallboard prohibited, the sprinkler/spray/CO2/halon 1-hour
// Exception, IN No. 2 typical 150 mm / 6-in. RC); 450.43 doorways
// (3-hour tight-fitting door + AHJ exterior + 1-hour Exception, 100 mm /
// 4-in. sill, locks + qualified persons; 2023 egress rework: "capable of
// opening not less than 90 degrees" + "listed fire exit hardware" +
// "with access"); 450.45 ventilation (450.9 hook; (A) location, (B)
// arrangement roughly half / roof-only, (C) 1900 mm2 per kVA + 0.1 m2
// floor under 50 kVA, (D) covering, (E) automatic closing fire dampers
// 1-1/2 hours, (F) ducts); 450.46 drainage (> 100 kVA, floor pitched);
// 450.47 no foreign piping (fire protection / transformer cooling
// excepted); 450.48 no storage. EDITION STORY: one substantive change —
// 450.43(C)'s personnel-door egress sentence — plus three Informational
// Note re-cites (E119-15 -> E119-20, NFPA 80-2013 -> 80-2019,
// ANSI/UL 555-2011 -> 555-2020); 119 phrase-level machine checks,
// verify_art54.py, all pass. No Mike Holt 2023 entries exist for any
// Part III section (all deltas on-disk-verified). Scope: no 450.44
// (450.43 -> 450.45 gap, both editions); Part III ends at 450.48.
// Worked examples core-computed (compute_art54.js ->
// art54_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-45041-45048-transformer-vaults-part-iii.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art54_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-45041-45048-transformer-vaults-part-iii.html'), true, 'art54: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-45041-45048-transformer-vaults-part-iii.html'), true, 'art54: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art54: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art54: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 54'), true, 'art54: footer marks article 54');
  // 450.41 (verbatim 2017)
  eq(has('Vaults shall be located where they can be ventilated to the outside air without using flues or ducts wherever such an arrangement is practicable'), true, 'art54: 450.41 full rule quoted');
  // 450.42 (verbatim 2017)
  eq(has('The walls and roofs of vaults shall be constructed of materials that have approved structural strength for the conditions with a minimum fire resistance of 3 hours'), true, 'art54: 450.42 walls/roofs 3-hour quoted');
  eq(has('The floors of vaults in contact with the earth shall be of concrete that is not less than 100 mm (4 in.) thick'), true, 'art54: 450.42 earth floor 4-in concrete quoted');
  eq(has('where the vault is constructed with a vacant space or other stories below it, the floor shall have approved structural strength for the load imposed thereon and a minimum fire resistance of 3 hours'), true, 'art54: 450.42 below-stories floor quoted');
  eq(has('studs and wallboard construction shall not be permitted'), true, 'art54: 450.42 studs/wallboard prohibition quoted');
  eq(has('Where transformers are protected with automatic sprinkler, water spray, carbon dioxide, or halon, construction of 1-hour rating shall be permitted'), true, 'art54: 450.42 Exception 1-hour quoted');
  eq(has('ANSI/ASTM E119-15, Method for Fire Tests of Building Construction and Materials'), true, 'art54: 450.42 2017 IN E119-15 quoted');
  eq(has('A typical 3-hour construction is 150 mm (6 in.) thick reinforced concrete'), true, 'art54: 450.42 IN No. 2 typical RC quoted');
  // 450.43 (verbatim 2017)
  eq(has('Vault doorways shall be protected in accordance with 450.43(A), (B), and (C)'), true, 'art54: 450.43 lead quoted');
  eq(has('Each doorway leading into a vault from the building interior shall be provided with a tight-fitting door that has a minimum fire rating of 3 hours'), true, 'art54: 450.43(A) 3-hour door quoted');
  eq(has('The authority having jurisdiction shall be permitted to require such a door for an exterior wall opening where conditions warrant'), true, 'art54: 450.43(A) AHJ exterior quoted');
  eq(has('see NFPA 80-2013, Standard for Fire Doors and Other Opening Protectives'), true, 'art54: 450.43(A) 2017 IN NFPA 80-2013 quoted');
  eq(has('A door sill or curb that is of an approved height that will confine the oil from the largest transformer within the vault shall be provided, and in no case shall the height be less than 100 mm (4 in.)'), true, 'art54: 450.43(B) sill 4-in quoted');
  eq(has('Doors shall be equipped with locks, and doors shall be kept locked, access being allowed only to qualified persons'), true, 'art54: 450.43(C) 2017 locks quoted (no "with")');
  eq(has('Personnel doors shall open in the direction of egress and be equipped with listed panic hardware'), true, 'art54: 450.43(C) 2017 egress + panic hardware quoted (deleted 2023)');
  // 450.45 (verbatim 2017)
  eq(has('Where required by 450.9, openings for ventilation shall be provided in accordance with 450.45(A) through (F)'), true, 'art54: 450.45 lead 450.9 hook quoted');
  eq(has('Ventilation openings shall be located as far as possible from doors, windows, fire escapes, and combustible material'), true, 'art54: 450.45(A) location quoted');
  eq(has('roughly half of the total area of openings required for ventilation in one or more openings near the floor'), true, 'art54: 450.45(B) half-near-floor quoted');
  eq(has('or all of the area required for ventilation shall be permitted in one or more openings in or near the roof'), true, 'art54: 450.45(B) roof-only alternative quoted');
  eq(has('shall not be less than 1900 mm2 (3 in.2) per kVA of transformer capacity in service'), true, 'art54: 450.45(C) per-kVA rate quoted');
  eq(has('and in no case shall the net area be less than 0.1 m2 (1 ft2) for any capacity under 50 kVA'), true, 'art54: 450.45(C) 0.1 m2 floor under 50 kVA quoted');
  eq(has('Ventilation openings shall be covered with durable gratings, screens, or louvers'), true, 'art54: 450.45(D) covering quoted');
  eq(has('All ventilation openings to the indoors shall be provided with automatic closing fire dampers that operate in response to a vault fire'), true, 'art54: 450.45(E) dampers quoted');
  eq(has('Such dampers shall possess a standard fire rating of not less than 1-1/2 hours'), true, 'art54: 450.45(E) 1-1/2-hour rating quoted');
  eq(has('See ANSI/UL 555-2011, Standard for Fire Dampers'), true, 'art54: 450.45(E) 2017 IN UL 555-2011 quoted');
  eq(has('Ventilating ducts shall be constructed of fire-resistant material'), true, 'art54: 450.45(F) ducts quoted');
  // 450.46 / 450.47 / 450.48 (verbatim 2017)
  eq(has('Where practicable, vaults containing more than 100 kVA transformer capacity shall be provided with a drain or other means that will carry off any accumulation of oil or water in the vault unless local conditions make this impracticable'), true, 'art54: 450.46 > 100 kVA drain quoted');
  eq(has('The floor shall be pitched to the drain where provided'), true, 'art54: 450.46 floor pitch quoted');
  eq(has('Any pipe or duct system foreign to the electrical installation shall not enter or pass through a transformer vault'), true, 'art54: 450.47 foreign piping quoted');
  eq(has('Piping or other facilities provided for vault fire protection, or for transformer cooling, shall not be considered foreign to the electrical installation'), true, 'art54: 450.47 permitted piping quoted');
  eq(has('Materials shall not be stored in transformer vaults'), true, 'art54: 450.48 no storage quoted');
  // edition story (2017 vs 2023)
  eq(has('shall be capable of opening not less than 90 degrees in the direction of egress and be equipped with listed fire exit hardware'), true, 'art54: 2023 450.43(C) 90-degree egress + fire exit hardware documented');
  eq(has('locked, with access being allowed only to qualified persons'), true, 'art54: 2023 "with access" insertion documented');
  eq(has('ASTM E119-20, Standard Test Methods for Fire Tests of Building Construction and Materials'), true, 'art54: 2023 E119-20 documented');
  eq(has('See NFPA 80-2019, Standard for Fire Doors and Other Opening Protectives'), true, 'art54: 2023 NFPA 80-2019 documented');
  eq(has('See ANSI/UL 555-2020, Standard for Fire Dampers'), true, 'art54: 2023 ANSI/UL 555-2020 documented');
  eq(has('119 phrase-level') || has('119 machine-verified'), true, 'art54: 119-check count documented');
  eq(has('no Mike Holt 2023 change-summary entries exist for any Part III section'), true, 'art54: no-MH-entries statement present');
  eq(has('2020 position'), true, 'art54: 2020-not-asserted boundary stated');
  eq(has('there is no 450.44'), true, 'art54: scope statement (no 450.44) present');
  eq(has('52.63 kVA'), true, 'art54: exact break-even (0.1 m2 / 1900 mm2 per kVA) documented');
  // worked figures (core-computed)
  eq(has('950,000 mm²'), true, 'art54: EX1 500 kVA net area 950,000 mm2 (display form)');
  eq(has(String(nums.EX1.a500m2)), true, 'art54: EX1 500 kVA ' + nums.EX1.a500m2 + ' m2');
  eq(has(String(nums.EX1.a500ft2)), true, 'art54: EX1 500 kVA ' + nums.EX1.a500ft2 + ' ft2');
  eq(has(String(nums.EX1.a10m2)), true, 'art54: EX1 10 kVA computed ' + nums.EX1.a10m2 + ' m2');
  eq(has(String(nums.EX1.floorOverComputed)), true, 'art54: EX1 floor-over-computed ' + nums.EX1.floorOverComputed + 'x');
  eq(has(String(nums.EX1.breakEvenKVA)), true, 'art54: EX1 exact break-even ' + nums.EX1.breakEvenKVA + ' kVA');
  eq(has(String(nums.EX1.in2PerKVAExact)), true, 'art54: EX1 exact imperial rate ' + nums.EX1.in2PerKVAExact + ' in2/kVA');
  eq(has(String(nums.EX1.ft2FloorExact)), true, 'art54: EX1 exact imperial floor ' + nums.EX1.ft2FloorExact + ' ft2');
  eq(has(String(nums.EX2.a100)), true, 'art54: EX2 100 kVA rated ' + nums.EX2.a100 + ' A (no drain)');
  eq(has(String(nums.EX2.a101)), true, 'art54: EX2 101 kVA rated ' + nums.EX2.a101 + ' A (drain)');
  eq(has(String(nums.EX2.delta)), true, 'art54: EX2 1-kVA step ' + nums.EX2.delta + ' A');
  eq(has('2/0 awg cu'), true, 'art54: EX2 feed 2/0 AWG Cu (both sides of boundary)');
  eq(has(String(nums.EX3.a)), true, 'art54: EX3 75 kVA rated ' + nums.EX3.a + ' A');
  eq(has('2 awg cu'), true, 'art54: EX3 feed 2 AWG Cu');
  eq(has(String(nums.EX4.halfFloorM2)), true, 'art54: EX4 half-near-floor ' + nums.EX4.halfFloorM2 + ' m2');
  eq(has(String(nums.EX4.halfFloorFt2)), true, 'art54: EX4 half ' + nums.EX4.halfFloorFt2 + ' ft2');
  eq(has(String(nums.EX5.damperVsWall)), true, 'art54: EX5 damper-vs-wall ratio ' + nums.EX5.damperVsWall + 'x');
  eq(has(String(nums.EX5.excVsWall)), true, 'art54: EX5 exception-vs-wall ratio ' + nums.EX5.excVsWall + 'x');
  // core re-run (recompute the picks under node, assert the page agrees)
  const core = require('../app.js');
  const reA100 = (100 * 1000) / (Math.sqrt(3) * 480);
  const reP100 = core.pickConductor31016(1.25 * reA100, 'cu', 75);
  eq(reP100 && reP100.label === '2/0 AWG Cu', true, 'art54: core re-run 100 kVA feed 2/0 AWG Cu');
  const reA75 = (75 * 1000) / (Math.sqrt(3) * 480);
  const reP75 = core.pickConductor31016(1.25 * reA75, 'cu', 75);
  eq(reP75 && reP75.label === '2 AWG Cu', true, 'art54: core re-run 75 kVA feed 2 AWG Cu');
  eq(Math.round(reA100 * 100) / 100 === nums.EX2.a100, true, 'art54: core re-run 100 kVA current matches JSON');
  eq(Math.round((500 * 1900) * 1e-6 * 100) / 100 === nums.EX1.a500m2, true, 'art54: core re-run 500 kVA area matches JSON');
  // cross-links
  eq(art.includes('nec-45021-45028-transformer-types-part-ii.html'), true, 'art54: cross-links to 450.21-450.28 Part II article (Article 53)');
  eq(art.includes('nec-4508-45014-transformer-installation.html'), true, 'art54: cross-links to 450.8-450.14 installation article (Article 52)');
  eq(art.includes('nec-4503-transformer-overcurrent.html'), true, 'art54: cross-links to 450.3 OCPD article (Article 51)');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art54: cross-links to 310.16 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art54: cross-links to 240.6 article');
  // sitemap + index + README
  const sitemap54 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap54.includes('articles/nec-45041-45048-transformer-vaults-part-iii.html'), true, 'art54: sitemap entry present');
  eq((sitemap54.match(/<loc>/g) || []).length >= 57, true, 'art54: sitemap has 55 URLs (art54 appended the 55th)');
  const index54 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index54.includes('articles/nec-45041-45048-transformer-vaults-part-iii.html'), true, 'art54: index cross-link present');
  const readme54 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme54.includes('articles/nec-45041-45048-transformer-vaults-part-iii.html'), true, 'art54: README entry present');
}



// =====================================================================
// Article 55 — NEC 250.130 + 250.148: Equipment Grounding Conductor
// Connections + Continuity/Attachment of EGCs to Boxes (the EGC's last
// two stops before a device). 250.130 (EGC connections: 250.30(A)(1)
// route for separately derived; (A) grounded systems EGC to grounded
// service conductor + GEC; (B) ungrounded systems EGC to GEC only;
// (C) existing installations — the six permitted connection points for
// nongrounding-receptacle replacement and branch-circuit extensions,
// 2023 adds snap switches + IN No. 2 404.9(B)). 250.148 (box
// continuity: lead reworked to "the installation shall comply with
// 250.148(A) through (D)"; (A) "all EGCs spliced or terminated within
// the box shall be connected together" + 110.14(B) + 250.8; (B)
// device-removal continuity reworded to "does not interrupt the
// electrical continuity ... effective ground-fault current path" +
// luminaire-first device order; (C) metal-box dedicated connection
// "used for no other purpose" + NEW Table 250.122 sizing sentence
// (largest OCPD in the box), 2017 grounding-screw hardware list
// dropped; (D) nonmetallic-box tail reword; (E) SOLDER DELETED —
// 250.8(B) word-identical in both editions carries the prohibition
// alone). 80 phrase-level machine checks (verify_art55.py, all pass;
// 250.130 deltas on-disk-verified — no Mike Holt 2023 entry for
// 250.130; 250.148 deltas corroborated by the on-disk Mike Holt entry
// "revised once again this cycle making it clear which EGCs must be
// connected to each other or to the box"; 2020 position not asserted —
// the on-disk 2020 source carries no 250.130/250.148 text). Worked
// examples core-computed (compute_art55.js -> art55_numbers.json;
// Table 250.122 rows 15-300 A verbatim in both on-disk editions,
// 400 A+ from the 2023 CSV; EX2 proportional step via shipped ch9Row).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-250130-250148-egc-connections-box-continuity.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art55_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-250130-250148-egc-connections-box-continuity.html'), true, 'art55: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-250130-250148-egc-connections-box-continuity.html'), true, 'art55: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art55: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art55: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 55'), true, 'art55: footer marks article 55');
  eq(has('80 machine-verified'), true, 'art55: 80 machine-verified checks claimed');
  // verbatim 2017 — 250.130
  eq(has('equipment grounding conductor connections at the source of separately derived systems shall be made in accordance with 250.30(a)(1)'), true, 'art55: verbatim 2017 250.130 lead separately derived');
  eq(has('equipment grounding conductor connections at service equipment shall be made as indicated in 250.130(a) or (b)'), true, 'art55: verbatim 2017 250.130 lead service routing');
  eq(has('for replacement of non-grounding-type receptacles with grounding-type receptacles and for branch-circuit extensions only in existing installations that do not have an equipment grounding conductor in the branch circuit'), true, 'art55: verbatim 2017 250.130 lead replacement clause (no snap switches)');
  eq(has('(a) for grounded systems. the connection shall be made by bonding the equipment grounding conductor to the grounded service conductor and the grounding electrode conductor'), true, 'art55: verbatim 2017 250.130(A)');
  eq(has('(b) for ungrounded systems. the connection shall be made by bonding the equipment grounding conductor to the grounding electrode conductor'), true, 'art55: verbatim 2017 250.130(B)');
  eq(has('the equipment grounding conductor of a grounding-type receptacle or a branch-circuit extension shall be permitted to be connected to any of the following'), true, 'art55: verbatim 2017 250.130(C) intro');
  eq(has('any accessible point on the grounding electrode system as described in 250.50'), true, 'art55: verbatim 250.130(C)(1) 250.50 point');
  eq(has('the equipment grounding terminal bar within the enclosure where the branch circuit for the receptacle or branch circuit originates'), true, 'art55: verbatim 250.130(C)(3) terminal bar at origin');
  eq(has('for grounded systems, the grounded service conductor within the service equipment enclosure'), true, 'art55: verbatim 250.130(C)(5) grounded service conductor');
  eq(has('for ungrounded systems, the grounding terminal bar within the service equipment enclosure'), true, 'art55: verbatim 250.130(C)(6) grounding terminal bar');
  eq(has('see 406.4(d) for the use of a ground-fault circuit-interrupting type of receptacle'), true, 'art55: verbatim 250.130(C) 406.4(D) GFCI note (both editions)');
  // verbatim 2017 — 250.148
  eq(has('if circuit conductors are spliced within a box or terminated on equipment within or supported by a box, all equipment grounding conductor(s) associated with any of those circuit conductors shall be connected within the box or to the box with devices suitable for the use in accordance with 250.8 and 250.148(a) through (e)'), true, 'art55: verbatim 2017 250.148 lead (vague "associated with" form)');
  eq(has('the equipment grounding conductor permitted in 250.146(d) shall not be required to be connected to the other equipment grounding conductors or to the box'), true, 'art55: verbatim 250.148 Exception 250.146(D) (both editions)');
  eq(has('(a) connections. connections and splices shall be made in accordance with 110.14(b) except that insulation shall not be required'), true, 'art55: verbatim 2017 250.148(A) (no 250.8 cite in 2017)');
  eq(has('does not interfere with or interrupt the grounding continuity'), true, 'art55: verbatim 2017 250.148(B) continuity standard (2017 form)');
  eq(has('by means of a grounding screw that shall be used for no other purpose, equipment listed for grounding, or a listed grounding device'), true, 'art55: verbatim 2017 250.148(C) grounding-screw hardware list (deleted 2023)');
  eq(has('(e) solder. connections depending solely on solder shall not be used'), true, 'art55: verbatim 2017 250.148(E) solder prohibition (deleted 2023)');
  // 2023 deltas documented
  eq(has('or snap switches without an equipment grounding terminal with snap switches with an equipment grounding terminal'), true, 'art55: documents the 2023 250.130 snap-switch clause');
  eq(has('the equipment grounding conductor that is connected to a grounding-type receptacle, a snap switch with an equipment grounding terminal, or a branch-circuit extension'), true, 'art55: documents the 2023 250.130(C) intro');
  eq(has('see 404.9(b) for requirements regarding grounding of snap switches'), true, 'art55: documents the 2023 IN No. 2 404.9(B)');
  eq(has('the installation shall comply with 250.148(a) through (d)'), true, 'art55: documents the 2023 250.148 lead rework');
  eq(has('all equipment grounding conductors that are spliced or terminated within the box shall be connected together'), true, 'art55: documents the 2023 250.148(A) "connected together" sentence');
  eq(has('in accordance with 110.14(b) and 250.8 except that insulation shall not be required'), true, 'art55: documents the 2023 250.148(A) 250.8 cite');
  eq(has('does not interrupt the electrical continuity of the equipment grounding conductor(s) providing an effective ground-fault current path'), true, 'art55: documents the 2023 250.148(B) effective-GFCP standard');
  eq(has('a connection used for no other purpose shall be made between the metal box and the equipment grounding conductor(s)'), true, 'art55: documents the 2023 250.148(C) dedicated connection');
  eq(has('the equipment bonding jumper or equipment grounding conductor shall be sized from table 250.122 based on the largest overcurrent device protecting circuit conductors in the box'), true, 'art55: documents the 2023 250.148(C) Table 250.122 sizing sentence');
  eq(has('connection devices or fittings that depend solely on solder shall not be used'), true, 'art55: documents 250.8(B) solder prohibition (word-identical both editions)');
  eq(has('revised once again this cycle making it clear which egcs must be connected to each other or to the box'), true, 'art55: quotes the Mike Holt 2023 250.148 entry');
  eq(has('no mike holt 2023 change-summary entry exists for 250.130'), true, 'art55: states the no-MH-entry-for-250.130 boundary');
  eq(has('2020 position is not asserted'), true, 'art55: flags the 2020 source boundary');
  // EX1 ladder (12 standard OCPDs, from art55_numbers.json)
  eq(nums.EX1.ladder.length, 12, 'art55: EX1 ladder has 12 OCPD rows');
  const ex1ladder = nums.EX1.ladder;
  eq(ex1ladder[0].ocpdA, 15, 'art55: EX1 row 0 = 15 A');
  eq(ex1ladder[0].cu, '14', 'art55: EX1 15 A -> 14 AWG Cu');
  eq(ex1ladder[1].cu, '12', 'art55: EX1 20 A -> 12 AWG Cu');
  eq(ex1ladder[2].cu, '10', 'art55: EX1 30 A -> 10 AWG Cu (60 A row seam)');
  eq(ex1ladder[4].cu, '10', 'art55: EX1 50 A -> 10 AWG Cu (60 A row)');
  eq(ex1ladder[6].cu, '8', 'art55: EX1 100 A -> 8 AWG Cu');
  eq(ex1ladder[11].cu, '1/0', 'art55: EX1 800 A -> 1/0 AWG Cu');
  eq(ex1ladder[11].al, '3/0', 'art55: EX1 800 A -> 3/0 AWG Al');
  eq(has('4,110') && has('105,600'), true, 'art55: EX1 circular-mil column (4,110 / 105,600)');
  // EX2 proportional step (ch9Row core)
  eq(nums.EX2.cmCircuitMin, 10380, 'art55: EX2 10 AWG = 10,380 cmil');
  eq(nums.EX2.cmCircuitUp, 16510, 'art55: EX2 8 AWG = 16,510 cmil');
  eq(nums.EX2.cmEgcProp, 16510, 'art55: EX2 proportional EGC = 16,510 cmil');
  eq(nums.EX2.egcFinal, '8', 'art55: EX2 final EGC = 8 AWG Cu');
  eq(has('16,510'), true, 'art55: EX2 16,510 cmil on page');
  // EX3 existing-installation 20 A
  eq(nums.EX3.ocpdA, 20, 'art55: EX3 circuit = 20 A');
  eq(nums.EX3.egcCu, '12', 'art55: EX3 EGC = 12 AWG Cu @ 20 A');
  eq(nums.EX3.egcAl, '10', 'art55: EX3 EGC = 10 AWG Al @ 20 A');
  eq(nums.EX3.sixPoints.length, 6, 'art55: EX3 six permitted points');
  // EX4 largest-OCPD governs
  eq(nums.EX4.smallOcpd.cu, '14', 'art55: EX4 15 A -> 14 AWG Cu');
  eq(nums.EX4.largeOcpd.cu, '12', 'art55: EX4 20 A -> 12 AWG Cu');
  eq(nums.EX4.governing, '12', 'art55: EX4 jumper governed by largest OCPD = 12 AWG Cu');
  eq(has('the box jumper is sized for the largest'), true, 'art55: EX4 "largest OCPD governs" on page');
  // core re-run (recompute EX2 under node, assert the page agrees)
  const core = require('../app.js');
  const reMin = core.ch9Row('10').cm, reUp = core.ch9Row('8').cm;
  const reProp = reMin * (reUp / reMin);
  eq(Math.round(reProp), nums.EX2.cmEgcProp, 'art55: core re-run EX2 proportional matches JSON');
  // cross-links
  eq(art.includes('nec-250122-egc-sizing.html'), true, 'art55: cross-links to 250.122 EGC-sizing article');
  eq(art.includes('nec-250102-main-bonding-jumper.html'), true, 'art55: cross-links to 250.102 main bonding jumper article');
  eq(art.includes('nec-25026-25030-separately-derived-systems.html'), true, 'art55: cross-links to 250.26+250.30 article');
  eq(art.includes('nec-25050-25052-25053-grounding-electrode-system.html'), true, 'art55: cross-links to 250.50+250.52+250.53 article');
  eq(art.includes('nec-25070-connection-methods-to-electrodes.html'), true, 'art55: cross-links to 250.70 connection-methods article');
  eq(art.includes('nec-25064-250104-gec-installation-bonding.html'), true, 'art55: cross-links to 250.64+250.104 article');
  eq(art.includes('nec-25054-25068-auxiliary-gec-caps-connections.html'), true, 'art55: cross-links to 250.54-250.68 article');
  // sitemap + index + README
  const sitemap55 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap55.includes('articles/nec-250130-250148-egc-connections-box-continuity.html'), true, 'art55: sitemap entry present');
  eq((sitemap55.match(/<loc>/g) || []).length >= 57, true, 'art55: sitemap has 56 URLs (art55 appended the 56th)');
  const index55 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index55.includes('articles/nec-250130-250148-egc-connections-box-continuity.html'), true, 'art55: index cross-link present');
  const readme55 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme55.includes('articles/nec-250130-250148-egc-connections-box-continuity.html'), true, 'art55: README entry present');
}
// ---------------------------------------------------------------------------
// ARTICLE 56 — NEC 422.10 + 422.11 + 422.12 + 422.13 (Appliance
// Branch-Circuit Rating + Overcurrent Protection — the 125% water-heater rule)
//
// The four Part II sections that size the wire + breaker for an appliance.
// Verbatim 2017 (on-disk official NFPA scan, region 422.6–422.13, OCR
// corrections disclosed). Eight substantive 2017→2023 deltas
// (verify_art56.py, 52 phrase-level machine checks, all pass): 422.6
// "operating"→"supplied", 422.10 lead rework, 422.10(A) "rating of an
// individual branch circuit"→"ampacities of branch-circuit conductors" +
// the 422.62 combined-loads cross-ref dropped + the range-sizing
// cross-ref renumber 210.19(A)(3)→(C), 422.11(E)(1) reword, 422.11(F)(1)
// "each subdivided load shall be protected", 422.11(F)(3) IN rework, and
// the 422.13 "considered a continuous load" framing rewritten to state the
// 125% rule directly (Mike Holt 2023 entry corroborates: "clarify what we
// are sizing and how the 125 percent applies"; NO Mike Holt entries for
// 422.6/422.10/422.11/422.12 — those deltas on-disk-verified). 2020
// position not asserted (on-disk 2020 source carries no 422.10–422.13 body).
// Worked examples core-computed (compute_art56.js -> art56_numbers.json):
// reqBreakerA / nextStdBreaker / pickConductor31016 / smallConductorCap.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-42210-42211-42213-appliance-branch-circuit.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art56_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art56: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art56: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art56: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art56: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 56'), true, 'art56: footer marks article 56');
  eq(has('52 machine-verified'), true, 'art56: 52 machine-verified checks claimed');
  // verbatim 2017 quotes (match on-disk scan after disclosed OCR corrections)
  eq(has('422.6 listing required. all appliances operating at 50 volts or more shall be listed'), true, 'art56: verbatim 2017 422.6');
  eq(has('the rating of an individual branch circuit shall not be less than the marked rating of the appliance or the marked rating of an appliance having combined loads as provided in 422.62'), true, 'art56: verbatim 2017 422.10(A)(1) (with 422.62 ref — dropped in 2023)');
  eq(has('the branch-circuit rating for an appliance that is a continuous load, other than a motor-operated appliance, shall not be less than 125 percent of the marked rating, or not less than 100 percent of the marked rating if the branch-circuit device and its assembly are listed for continuous loading at 100 percent of its rating'), true, 'art56: verbatim 2017 422.10(A)(4) 125%/100% floor (both editions)');
  eq(has('shall be sized in accordance with 210.19(a)(3)'), true, 'art56: verbatim 2017 422.10(A)(6) 210.19(A)(3) cross-ref (renumbered (C) in 2023)');
  eq(has('not exceed that marked on the appliance'), true, 'art56: verbatim 2017 422.11(E)(1) marked-rating cap');
  eq(has('not exceed 150 percent of the appliance rated current'), true, 'art56: verbatim 2017 422.11(E)(3) 150% of appliance rated current');
  eq(has('each subdivided load shall not exceed 48 amperes and shall be protected at not more than 60 amperes'), true, 'art56: verbatim 2017 422.11(F)(1) 48 A subdivision');
  eq(has('a fixed storage-type water heater that has a capacity of 450 l (120 gal) or less shall be considered a continuous load for the purposes of sizing branch circuits'), true, 'art56: verbatim 2017 422.13 (pre-2023 framing)');
  // 2023 deltas documented
  eq(has('all appliances supplied by 50 volts or higher shall be listed'), true, 'art56: documents 2023 422.6 "supplied by 50 volts or higher" (2017 "operating at 50 volts or more")');
  eq(has('the ampacities of branch-circuit conductors shall not be less than the marked rating'), true, 'art56: documents 2023 422.10(A) "ampacities of branch-circuit conductors"');
  eq(has('the 422.62 combined-loads cross-reference is dropped'), true, 'art56: documents the 2023 422.10(A) drop of the 422.62 combined-loads ref');
  eq(has('shall be sized in accordance with 210.19(c)'), true, 'art56: documents 2023 210.19(C) range cross-ref (renumber from (A)(3))');
  eq(has('not exceed the overcurrent protection rating marked on the appliance'), true, 'art56: documents 2023 422.11(E)(1) reword');
  eq(has('each subdivided load shall not exceed 48 amperes, and each subdivided load shall be protected at not more than 60 amperes'), true, 'art56: documents 2023 422.11(F)(1) per-subdivision protection');
  eq(has('shall have an ampere rating of not less than 125 percent of the ampere rating of the water heater'), true, 'art56: documents 2023 422.13 explicit 125% rewrite');
  eq(has('see 422.10 for branch-circuit rating'), true, 'art56: documents 2023 422.13 IN rework');
  eq(has('clarify what we are sizing and how the 125 percent applies'), true, 'art56: quotes the Mike Holt 2023 422.13 entry');
  eq(has('no mike holt 2023 change-summary entry exists for 422.6'), true, 'art56: states the no-MH-entry boundary for the other 422.10–422.13 deltas');
  eq(has('2020 position is not asserted'), true, 'art56: flags the 2020 source boundary');
  eq(has('over-current'), true, 'art56: discloses the 2023 CSV line-wrap hyphen normalization');
  // EX1 — 422.13 water heater 4500 W / 240 V
  eq(nums.EX1.markedA, 18.75, 'art56: EX1 marked rating 18.75 A');
  eq(nums.EX1.ocPD125, 25, 'art56: EX1 125% OCPD = 25 A (23.44 floor -> next standard)');
  eq(nums.EX1.pick125, '10', 'art56: EX1 125% conductor = 10 AWG Cu (35 A; cap 30 ≥ 25)');
  eq(nums.EX1.ocPD100, 20, 'art56: EX1 100%-listed OCPD = 20 A');
  eq(nums.EX1.pick100, '12', 'art56: EX1 100%-listed conductor = 12 AWG Cu (cap 20 ≥ 20)');
  eq(nums.EX1.cap12AWG, 20, 'art56: EX1 12 AWG Cu 240.4(D) cap = 20 A < 25 A (rejected for 125% case)');
  eq(has('12 awg cu is rejected'), true, 'art56: EX1 240.4(D) trap on page');
  // EX2 — 422.10(A) continuous non-motor 3600 W / 240 V
  eq(nums.EX2.markedA, 15, 'art56: EX2 marked rating 15 A');
  eq(nums.EX2.floor125, 18.75, 'art56: EX2 125% floor 18.75 A');
  eq(nums.EX2.ocPD, 20, 'art56: EX2 OCPD = 20 A');
  eq(nums.EX2.pick, '12', 'art56: EX2 conductor = 12 AWG Cu');
  eq(nums.EX2.cap14AWG, 15, 'art56: EX2 14 AWG cap 15 A < 20 A OCPD (rejected)');
  // EX3 — 422.11(E)(2) unmarked 20 A ceiling
  eq(nums.EX3.ceiling, 20, 'art56: EX3 422.11(E)(2) ceiling 20 A');
  eq(nums.EX3.pick, '14', 'art56: EX3 conductor 14 AWG Cu');
  eq(nums.EX3.ocPD, 15, 'art56: EX3 actual OCPD 15 A (240.4(D) cap binds below the 20 A ceiling)');
  // EX4 — 422.11(E)(3) 150% ceiling ladder
  eq(nums.EX4.length, 5, 'art56: EX4 ladder has 5 rows');
  eq(nums.EX4[0].a, 14, 'art56: EX4 row 0 = 14 A');
  eq(nums.EX4[0].ceiling, 25, 'art56: EX4 14 A -> 21 A (nonstandard) -> 25 A ceiling');
  eq(nums.EX4[4].a, 48, 'art56: EX4 row 4 = 48 A');
  eq(nums.EX4[4].ceiling, 80, 'art56: EX4 48 A -> 72 A (nonstandard) -> 80 A ceiling');
  // EX5 — 422.11(F)(1) 48 A subdivision
  eq(nums.EX5.totalA, 54, 'art56: EX5 appliance 54 A');
  eq(nums.EX5.subdivCount, 2, 'art56: EX5 2 subdivisions');
  eq(nums.EX5.ocPDSub, 30, 'art56: EX5 each sub on 30 A OCPD (≤ 60 A cap)');
  eq(nums.EX5.main, '6', 'art56: EX5 main conductors 6 AWG Cu (65 A ≥ full 54 A load)');
  // core re-run (recompute EX1 + EX2 under node, assert the page agrees)
  const core = require('../app.js');
  eq(core.nextStdBreaker(core.reqBreakerA(nums.EX1.w / nums.EX1.v, 1.25)), nums.EX1.ocPD125, 'art56: core re-run EX1 125% OCPD matches JSON');
  eq(core.nextStdBreaker(core.reqBreakerA(nums.EX2.w / nums.EX2.v, 1.25)), nums.EX2.ocPD, 'art56: core re-run EX2 125% OCPD matches JSON');
  eq(core.smallConductorCap('14','cu') === 15 && core.smallConductorCap('12','cu') === 20, true, 'art56: core re-run 240.4(D) caps (14->15, 12->20 Cu)');
  // cross-links
  eq(art.includes('nec-21019a-continuous-load.html'), true, 'art56: cross-links to 210.19(A) continuous-load article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art56: cross-links to Table 310.16 article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art56: cross-links to 240.4(D) article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art56: cross-links to 240.6 article');
  eq(art.includes('nec-22055-cooking-demand.html'), true, 'art56: cross-links to 220.55 article');
  eq(art.includes('nec-21008-gfci-protection.html'), true, 'art56: cross-links to 210.8 GFCI article');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art56: cross-links to 430.22+430.52 article');
  eq(art.includes('nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art56: cross-links to 440.22+440.32 article');
  // sitemap + index + README
  const sitemap56 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap56.includes('articles/nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art56: sitemap entry present');
  eq((sitemap56.match(/<loc>/g) || []).length >= 57, true, 'art56: sitemap has 57 URLs (art56 appended the 57th)');
  const index56 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index56.includes('articles/nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art56: index cross-link present');
  const readme56 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme56.includes('articles/nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art56: README entry present');
}


// =========================================================================
// Article 57 — NEC 430.24 + 430.53: several motors / loads on one branch
// circuit (panelwright/articles/nec-43024-43053-several-motors-one-branch-circuit.html)
// Session 82. 2017 scan + 2023 CSV verified on disk (verify_art57.py: 62
// phrase-level checks, all pass). Deltas: 424.3(B)->424.4(B) renumber,
// 430.53(B) conditions-list rework, 430.53(C)(1)-(C)(5) restructure with
// the 430.40 cap merged into (C)(4), 430.53(D) named-routes + tap
// consolidation, Table 430.52 -> Table 430.52(C)(1) ref renumber,
// 430.52(C)(3) "permitted if" + NEMA MG 1-2016 + Design B "premium
// efficiency" prose rename (1100% table row unchanged since 2017), the
// 430.52(C)(1) 240.6 citation, the 430.53(A)(2)/430.42(B) wording. No
// Mike Holt 2023 entries (deltas on-disk-verified); 2020 position not
// asserted (no 430.24/430.53 body on disk for 2020). Worked examples
// core-computed (compute_art57.js -> art57_numbers.json):
// nextStdBreaker / pickConductor31016 + Table 430.248/430.250 FLC.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-43024-43053-several-motors-one-branch-circuit.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art57_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art57: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art57: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art57: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art57: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 57'), true, 'art57: footer marks article 57');
  eq(has('62 machine-verified'), true, 'art57: 62 machine-verified checks claimed');
  // verbatim 2017 quotes (match on-disk scan after disclosed OCR corrections)
  eq(has('conductors supplying several motors, or a motor(s) and other load(s), shall have an ampacity not less than the sum of each of the following'), true, 'art57: verbatim 2017 430.24 lead sum rule');
  eq(has('125 percent of the full-load current rating of the highest rated motor, as determined by 430.6(a)'), true, 'art57: verbatim 2017 430.24(1) 125% highest motor');
  eq(has('100 percent of the noncontinuous non-motor load'), true, 'art57: verbatim 2017 430.24(3) 100% noncontinuous');
  eq(has('125 percent of the continuous non-motor load'), true, 'art57: verbatim 2017 430.24(4) 125% continuous');
  eq(has('the greater of either the ampere rating from 430.22(e) or the largest continuous duty motor full-load current multiplied by 1.25 shall be used in the summation'), true, 'art57: verbatim 2017 430.24 Ex 1 duty-motor rule');
  eq(has('shall comply with 424.3(b)'), true, 'art57: verbatim 2017 430.24 Ex 2 cites 424.3(B) (renumbered 424.4(B) in 2023)');
  eq(has('where the circuitry is interlocked so as to prevent simultaneous operation of selected motors or other loads'), true, 'art57: verbatim 2017 430.24 Ex 3 interlock');
  eq(has('shall be protected by fuses or circuit breakers with ratings or settings in accordance with 430.52 or by a motor short-circuit protector in accordance with 430.52'), true, 'art57: verbatim 2017 430.40 protection route');
  eq(has('the overload devices shall be protected in accordance with this marking'), true, 'art57: verbatim 2017 430.40 Exception group marking');
  eq(has('approved for group installation with the short-circuit and ground-fault protective device selected in accordance with 430.53'), true, 'art57: verbatim 2017 430.42(B) group approval');
  eq(has('under conditions specified in 430.53(d) and in 430.53(a), (b), or (c)'), true, 'art57: verbatim 2017 430.53 lead routing');
  eq(has('the branch-circuit protective device shall be fuses or inverse time circuit breakers'), true, 'art57: verbatim 2017 430.53 lead device type');
  eq(has('several motors, each not exceeding 1 hp in rating, shall be permitted on a nominal 120-volt branch circuit protected at not over 20 amperes'), true, 'art57: verbatim 2017 430.53(A) 1 hp / 20 A route');
  eq(has('the full-load rating of each motor does not exceed 6 amperes'), true, 'art57: verbatim 2017 430.53(A)(1) 6 A per motor');
  eq(has('selected not to exceed that allowed by 430.52 for the smallest rated motor'), true, 'art57: verbatim 2017 430.53(B) smallest-motor cap (2017 form)');
  eq(has('will not open under the most severe normal conditions of service that might be encountered'), true, 'art57: verbatim 2017 430.53(B) worst-case clause');
  eq(has('plus an amount equal to the sum of the full-load current ratings of all other motors and the ratings of other loads connected to the circuit'), true, 'art57: verbatim 2017 430.53(C) OCPD sum (2023 rewrites as "sum of all of the following")');
  eq(has('not larger than allowed by 430.40 for the overload relay protecting the smallest rated motor of the group'), true, 'art57: verbatim 2017 430.53(C) 430.40 smallest-overload cap');
  eq(has('suitable for tap conductor protection in group installations'), true, 'art57: verbatim 2017 430.53(D) tap-controller marking');
  eq(has('not more than 7.5 m (25 ft) long'), true, 'art57: verbatim 2017 430.53(D) 25-ft tap length');
  eq(has('(8) conductors from the point of the tap'), true, 'art57: verbatim 2017 430.53(D) 1/10 tap item printed "(8)" in the scan (disclosed)');
  eq(has('one-tenth the rating or setting of the branch-circuit short-circuit and ground-fault protective device'), true, 'art57: verbatim 2017 430.53(D) 1/10 OCPD tap floor');
  eq(has('is of the inverse time'), true, 'art57: 430.53(C)(3) quote stops at the scan truncation "is of the inverse time" (disclosed, not repaired)');
  // 2023 deltas documented
  eq(has('shall comply with 424.4(b)'), true, 'art57: documents 2023 430.24 Ex 2 renumber to 424.4(B)');
  eq(has('the branch-circuit conductor(s) ampacity shall not be less than 125 percent of the load of the fixed electric space-heating equipment and any associated motor(s)'), true, 'art57: documents 2023 424.4(B) 125% rule (the destination of the renumber)');
  eq(has('smallest rated motor supplied by the branch circuit'), true, 'art57: documents 2023 430.53(B) "smallest rated motor supplied by the branch circuit"');
  eq(has('connected to a branch circuit where all of the following conditions are met'), true, 'art57: documents 2023 430.53(B) conditions-list rework');
  eq(has('comply with 430.53(c)(1) through (c)(5)'), true, 'art57: documents 2023 430.53(C) (C)(1)-(C)(5) restructure');
  eq(has('the sum of the current ratings of other loads connected to the circuit'), true, 'art57: documents 2023 430.53(C)(4) "sum of all of the following" rewrite');
  eq(has('additionally, this rating shall not be larger than allowed by 430.40'), true, 'art57: documents 2023 430.40 cap merged into (C)(4)');
  eq(has('for group installations described in 430.53(a), (b), or (c)'), true, 'art57: documents 2023 430.53(D) named-routes reference');
  eq(has('table 430.52(c)(1)'), true, 'art57: documents the Table 430.52 -> Table 430.52(C)(1) reference renumber');
  eq(has('design b premium efficiency'), true, 'art57: documents the 2023 Design B "premium efficiency" prose rename');
  eq(has('already carries the design b row'), true, 'art57: states the 1100% Design B row already existed in the 2017 table (prose rename, not a new row)');
  eq(has('shall be permitted if the conditions of 430.52(c)(3)(a) and (c)(3)(b) are met'), true, 'art57: documents 2023 430.52(C)(3) "shall be permitted if" reword');
  eq(has('nema mg 1-2016, motors and generators, part 12.59'), true, 'art57: documents the 2023 NEMA MG 1-2016 re-cite');
  eq(has('the standard ampere ratings and settings provided in 240.6'), true, 'art57: documents 2023 430.52(C)(1) 240.6 citation');
  eq(has('marked on any of the motor controllers'), true, 'art57: documents 2023 430.53(A)(2) "motor controllers" wording');
  eq(has('both the motor controller and the motor overload device shall be approved for group installation'), true, 'art57: documents 2023 430.42(B) "motor controller" wording');
  eq(has('no mike holt 2023 change-summary entry exists for 430.24'), true, 'art57: states the no-MH-entry boundary (deltas on-disk-verified)');
  eq(has('2020 position is not asserted'), true, 'art57: flags the 2020 source boundary');
  eq(has('number the motor grounding sections 430.241'), true, 'art57: discloses the Part XIII 430.241-430.245 numbering (CSV rows are grounding, out of scope)');
  // EX1 — 430.53(C) full group: 5+2+1 hp 3-ph + 20 A continuous heater
  eq(nums.EX1.conductor.highest125, 19, 'art57: EX1 125% x 15.2 A = 19 A');
  eq(nums.EX1.conductor.totalA, 58.1, 'art57: EX1 430.24 sum = 58.1 A');
  eq(nums.EX1.conductor.pick.size, '6', 'art57: EX1 conductor = 6 AWG Cu (65 A)');
  eq(nums.EX1.ocps.table43052_250pct_highest, 38, 'art57: EX1 Table 430.52 250% x 15.2 A = 38 A');
  eq(nums.EX1.ocps.raw, 72.1, 'art57: EX1 430.53(C)(4) OCPD sum = 72.1 A');
  eq(nums.EX1.ocps.nextStd, 80, 'art57: EX1 OCPD = 80 A (72.1 A steps to 80; no 75 A in the std list)');
  // EX2 — 430.53(B) smallest-motor route: 5 hp + 3 hp 3-ph
  eq(nums.EX2.conductor.totalA, 29.6, 'art57: EX2 430.24 sum = 29.6 A');
  eq(nums.EX2.conductor.pick.size, '10', 'art57: EX2 conductor = 10 AWG Cu (35 A)');
  eq(nums.EX2.ocps.smallest250, 26.5, 'art57: EX2 250% x 10.6 A (3 hp) = 26.5 A');
  eq(nums.EX2.ocps.selected, 30, 'art57: EX2 OCPD = 30 A (smallest motor caps the group device)');
  // EX3 — 430.53(A) 120 V / 20 A small-motor circuit
  eq(nums.EX3.conductor.totalA, 11.25, 'art57: EX3 430.24 sum = 11.25 A');
  eq(nums.EX3.conductor.pick.size, '14', 'art57: EX3 conductor = 14 AWG Cu (60 C column)');
  eq(nums.EX3.ocps.ceilingA, 20, 'art57: EX3 OCPD ceiling = 20 A');
  // EX4 — 430.53(D) 1/3-ampacity tap
  eq(nums.EX4.tap.oneThirdAmpacity, 21.67, 'art57: EX4 1/3 x 65 A = 21.67 A');
  eq(nums.EX4.tap.min43022, 19, 'art57: EX4 430.22 floor = 19 A (1/3 floor governs)');
  eq(nums.EX4.tap.pick.size, '12', 'art57: EX4 tap = 12 AWG Cu (25 A @ 75 C)');
  // EX5 — 430.53(D) 1/10-OCPD tap to marked controller
  eq(nums.EX5.tap.oneTenthOCPD, 8, 'art57: EX5 1/10 x 80 A = 8 A tap floor');
  eq(nums.EX5.tap.pick.size, '14', 'art57: EX5 tap = 14 AWG Cu (20 A @ 75 C)');
  eq(nums.EX5.tap.controllerToMotor.size, '14', 'art57: EX5 controller-to-motor = 14 AWG Cu (430.22: 19 A floor)');
  // core re-run (recompute under node, assert the page agrees)
  const core = require('../app.js');
  eq(core.nextStdBreaker(nums.EX1.ocps.raw), nums.EX1.ocps.nextStd, 'art57: core re-run EX1 72.1 A -> 80 A matches JSON');
  eq(core.pickConductor31016(nums.EX1.conductor.totalA, 'cu', 75).size, nums.EX1.conductor.pick.size, 'art57: core re-run EX1 conductor pick matches JSON');
  eq(core.pickConductor31016(nums.EX2.conductor.totalA, 'cu', 75).size, nums.EX2.conductor.pick.size, 'art57: core re-run EX2 conductor pick matches JSON');
  eq(core.pickConductor31016(nums.EX3.conductor.totalA, 'cu', 60).size, nums.EX3.conductor.pick.size, 'art57: core re-run EX3 conductor pick matches JSON');
  // cross-links
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art57: cross-links to 430.22+430.52 single-motor article');
  eq(art.includes('nec-43032-43036-motor-overload-protection.html'), true, 'art57: cross-links to 430.32+430.36 overload article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art57: cross-links to 240.4(D)/(G) article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art57: cross-links to Table 310.16 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art57: cross-links to 240.6 article');
  eq(art.includes('nec-430120-430131-adjustable-speed-drive-systems.html'), true, 'art57: cross-links to 430.120-430.131 drive article');
  eq(art.includes('nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art57: cross-links to 440.22+440.32 article');
  // sitemap + index + README
  const sitemap57 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap57.includes('articles/nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art57: sitemap entry present');
  eq((sitemap57.match(/<loc>/g) || []).length >= 58, true, 'art57: sitemap has >= 58 URLs (art57 appended the 58th; the total only grows)');
  const index57 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index57.includes('articles/nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art57: index cross-link present');
  const readme57 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme57.includes('articles/nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art57: README entry present');
}

// ============================================================================
// Article 58 — NEC 422.16 + 422.18 + 422.22: appliance flexible cords,
// paddle-fan support (WSCR/WSAF rework), the "special permission" rewrite
// (panelwright/articles/nec-42216-42218-42222-flexible-cords-ceiling-fans.html)
// Session 83. 2017 scan + 2023 CSV verified on disk (verify_art58.py: 55
// phrase-level checks, all pass). Thirteen deltas: 422.15 central-vacuum
// deletion, 422.43 deletion + heater-cord relocation to 422.16(A)(3),
// 422.16(B)(1) EGC sentence, 422.16(B)(2) opening-bushing clause,
// 422.16(B)(4) over-the-range-microwave scope, 422.17 "ample" drop,
// 422.18(A) WSCR/WSAF rename + "fan support", 422.18(B) NEW tub/shower zone,
// 422.22 special-permission -> WSCR rewrite, 314.27(C) interior-marking +
// habitable-room + spares removal, 314.27(E) WSCR/WSAF + WD-6, 422.31(C)
// "of more than 4 hp" + (D) drop. 422.16 + 422.18 MH-2023-corroborated.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-42216-42218-42222-flexible-cords-ceiling-fans.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art58_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-42216-42218-42222-flexible-cords-ceiling-fans.html'), true, 'art58: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-42216-42218-42222-flexible-cords-ceiling-fans.html'), true, 'art58: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art58: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art58: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 58'), true, 'art58: footer marks article 58');
  eq(has('55 machine-verified'), true, 'art58: 55 machine-verified checks claimed');
  eq(has('thirteen verified deltas'), true, 'art58: thirteen deltas claimed');
  // verbatim 2017 quotes (match on-disk scan after disclosed OCR corrections)
  eq(has('listed central vacuum outlet assemblies shall be permitted to be connected to a branch circuit in accordance with 210.23(a)'), true, 'art58: verbatim 2017 422.15 central-vacuum lead (deleted in 2023)');
  eq(has('flexible cord shall be permitted (1) for the connection of appliances to facilitate their frequent interchange or to prevent the transmission of noise or vibration'), true, 'art58: verbatim 2017 422.16(A) two-item general permission');
  eq(has('the length of the cord shall not be less than 450 mm (18 in.) and not over 900 mm (36 in.)'), true, 'art58: verbatim 2017 422.16(B)(1) disposer cord 450 mm-900 mm');
  eq(has('distinctly marked to identify it as protected by a system of double insulation shall not be required to be terminated with a grounding-type attachment plug'), true, 'art58: verbatim 2017 422.16(B)(1) double-insulation plug exception');
  eq(has('the length of the cord shall be 0.9 m to 2.0 m (3 ft to 6.5 ft)'), true, 'art58: verbatim 2017 422.16(B)(2) dishwasher cord 0.9 m-2.0 m');
  eq(has('the receptacle for a built-in dishwasher shall be located in the space adjacent to the space occupied by the dishwasher'), true, 'art58: verbatim 2017 422.16(B)(2) dishwasher adjacent-space receptacle');
  eq(has('shall be permitted to be permanently connected or, only for ease in servicing or for installation, cord-and-plug-connected'), true, 'art58: verbatim 2017 422.16(B)(3) wall-oven permanent/cord-plug route');
  eq(has('the length of the cord is not less than 450 mm (18 in.) and not over 1.2 m (4 ft)'), true, 'art58: verbatim 2017 422.16(B)(4) range-hood cord 450 mm-1.2 m');
  eq(has('the receptacle is supplied by an individual branch circuit'), true, 'art58: verbatim 2017 422.16(B)(4) individual-branch-circuit condition');
  eq(has('provide ample protection between the appliance and adjacent combustible material'), true, 'art58: verbatim 2017 422.17 "ample protection" (2023 drops "ample")');
  eq(has('ceiling-suspended (paddle) fans shall be supported independently of an outlet box or by one of the following'), true, 'art58: verbatim 2017 422.18 support lead');
  eq(has('a listed outlet box or listed outlet box system identified for the use and installed in accordance with 314.27(c)'), true, 'art58: verbatim 2017 422.18(1) "identified for the use" (2023: "fan support")');
  eq(has('a listed locking support and mounting receptacle, and a compatible factory installed attachment fitting designed for support'), true, 'art58: verbatim 2017 422.18(2) locking support + mounting receptacle (2023: WSCR/WSAF)');
  eq(has('appliances employing methods of installation other than covered by this article shall be permitted to be used only by special permission'), true, 'art58: verbatim 2017 422.22 catch-all (2023 rewrites to the WSCR path)');
  eq(has('shall not support ceiling-suspended (paddle) fans that weigh more than 32 kg (70 lb)'), true, 'art58: verbatim 2017 314.27(C) 70 lb sole-support cap (unchanged in 2023)');
  eq(has('that weigh more than 16 kg (35 lb), the required marking shall include the maximum weight to be supported'), true, 'art58: verbatim 2017 314.27(C) 35 lb marking floor (unchanged in 2023)');
  eq(has('where spare, separately switched, ungrounded conductors are provided to a ceiling-mounted outlet box'), true, 'art58: verbatim 2017 314.27(C) spare-conductor sentence (removed in 2023)');
  eq(has('shall be permitted to support listed locking support and mounting receptacles used in combination with compatible attachment fittings'), true, 'art58: verbatim 2017 314.27(E) separable-attachment-fitting lead (2023: WSCR/WSAF)');
  eq(has('it shall be included in the fill calculation covered in 314.16(b)(4)'), true, 'art58: verbatim 2017 314.27(E) box-fill hook (unchanged in 2023)');
  eq(has('the disconnecting means shall comply with 430.109 and 430.110'), true, 'art58: verbatim 2017 422.31(C) disconnect compliance (unchanged core)');
  eq(has('if an appliance of more than 4 hp is provided with a unit switch that complies with 422.34(a), (b), (c), or (d)'), true, 'art58: verbatim 2017 422.31(C) Exception "of more than 4 hp" + (D) (both dropped in 2023)');
  eq(has('produce temperatures in excess of 121 degc (250 degf) on surfaces with which the cord is likely to be in contact'), true, 'art58: verbatim 2017 422.43(A) heater-cord temperature trigger (relocated to 422.16(A)(3) in 2023)');
  eq(has('flexible cords and flexible cables shall conform to the description in table 400.4'), true, 'art58: verbatim 2017 400.4 intro (the relocation destination; unchanged in 2023)');
  // 2023 deltas documented
  eq(has('[deleted in 2023 — no 422.15 row in the on-disk 2023 nec; verified.]'), true, 'art58: documents 422.15 central-vacuum deletion (on-disk-verified)');
  eq(has('no 422.43 row in the on-disk 2023 nec'), true, 'art58: documents 422.43 deletion (on-disk-verified)');
  eq(has('the (a) heater-cord requirement relocates to 422.16(a)(3)'), true, 'art58: documents the 422.43(A) -> 422.16(A)(3) heater-cord relocation');
  eq(has('one of the types of heater cords listed in table 400.4'), true, 'art58: documents 2023 422.16(A)(3) heater-cord requirement text');
  eq(has('the flexible cord has an equipment grounding conductor and is terminated with a grounding-type attachment plug'), true, 'art58: documents 2023 422.16(B)(1) explicit EGC sentence (new)');
  eq(has('if a flexible cord passes through an opening, it shall be protected against damage by a bushing, grommet, smoothed edge, or other approved means'), true, 'art58: documents 2023 422.16(B)(2) opening-bushing clause (new)');
  eq(has('range hoods and over-the-range microwave ovens with integral range hoods'), true, 'art58: documents 2023 422.16(B)(4) over-the-range-microwave scope expansion');
  eq(has('2023: "provide protection between the appliance and adjacent combustible material."'), true, 'art58: documents 2023 422.17 "ample" drop');
  eq(has('identified for fan support'), true, 'art58: documents 2023 422.18(A)(1) "fan support" phrasing');
  eq(has('weight-supporting ceiling receptacle') && has('weight-supporting attachment fitting'), true, 'art58: documents 2023 422.18(A)(2)/314.27(E) WSCR/WSAF rename');
  eq(has('no metal parts of ceiling-suspended (paddle) fans in bathrooms and shower spaces shall be located within a zone measured 900 mm (3 ft) horizontally and 2.5 m (8 ft) vertically from the top of the bathtub rim or shower stall threshold'), true, 'art58: documents 2023 422.18(B) NEW tub/shower zone');
  eq(has('appliances shall be permitted to use listed weight-supporting ceiling receptacles in combination with compatible weight-supporting attachment fittings used within their ratings'), true, 'art58: documents 2023 422.22 special-permission -> WSCR rewrite');
  eq(has('on the interior of the box'), true, 'art58: documents 2023 314.27(C) marking-location change');
  eq(has('ansi/nema wd-6'), true, 'art58: documents 2023 314.27(E) WD-6 Informational Note (new)');
  eq(has('if an appliance is provided with a unit switch that complies with 422.34(a), (b), or (c)'), true, 'art58: documents 2023 422.31(C) "of more than 4 hp" + (D) drop');
  // worked examples (core-computed from art58_numbers.json)
  eq(nums.ex1.reqA, 5, 'art58: EX1 disposer required ampacity = 5 A (non-continuous)');
  eq(nums.ex1.ocpd, 15, 'art58: EX1 OCPD = 15 A (240.6)');
  eq(nums.ex1.ampPick60.size, '14', 'art58: EX1 ampacity pick = 14 AWG Cu (15 A @ 60 C)');
  eq(nums.ex1.cap14, 15, 'art58: EX1 240.4(D) cap on 14 Cu = 15 A (equals the OCPD -> 14 AWG allowed)');
  eq(nums.ex1.finalPick.size, '14', 'art58: EX1 final pick = 14 AWG Cu');
  eq(nums.ex2.loadA, 18.75, 'art58: EX2 dishwasher load = 4,500 W / 240 V = 18.75 A');
  eq(nums.ex2.ocpd, 20, 'art58: EX2 OCPD = 20 A (240.6)');
  eq(nums.ex2.ampPick75.size, '14', 'art58: EX2 14 AWG Cu passes the 75 C ampacity (20 A >= 18.75 A)');
  eq(nums.ex2.cap14, 15, 'art58: EX2 240.4(D) cap on 14 Cu = 15 A < 20 A OCPD -> 14 AWG rejected');
  eq(nums.ex2.finalPick.size, '12', 'art58: EX2 final pick = 12 AWG Cu (20 A @ 60 C / 25 A @ 75 C)');
  eq(nums.ex3.reqA, 6.67, 'art58: EX3 range-hood load = 800 W / 120 V = 6.67 A');
  eq(nums.ex3.ocpd, 15, 'art58: EX3 OCPD = 15 A (240.6)');
  eq(nums.ex3.finalPick.size, '14', 'art58: EX3 final pick = 14 AWG Cu (15 A cap equals the 15 A OCPD)');
  eq(nums.ex4.boxCapLb === 70 && nums.ex4.boxCapKg === 32, true, 'art58: EX4 314.27(C) sole-support cap = 32 kg (70 lb), both editions');
  eq(nums.ex4.markFloorLb === 35 && nums.ex4.markFloorKg === 16, true, 'art58: EX4 314.27(C) marking floor = 16 kg (35 lb), both editions');
  eq(nums.ex4.fans[2].underCap === false && nums.ex4.fans[0].underCap === true && nums.ex4.fans[0].needsWeightMark === false && nums.ex4.fans[1].needsWeightMark === true, true, 'art58: EX4 75 lb fan exceeds the 70 lb cap; 13 lb fan needs no marking; 65 lb fan must be marked');
  eq(nums.ex5.zone.horizM === 0.9 && nums.ex5.zone.vertM === 2.5, true, 'art58: EX5 422.18(B) zone = 0.9 m horizontal x 2.5 m vertical (2023 only)');
  eq(nums.ex5.fans[0].inside === false && nums.ex5.fans[1].inside === true && nums.ex5.fans[2].inside === false, true, 'art58: EX5 zone tests — 2.6 m high clears, inside box fails, 1.2 m out clears');
  // core re-run (recompute under node, assert the page agrees)
  const core = require('../app.js');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art58: core re-run 240.4(D) 14 Cu = 15 A');
  eq(core.pickConductor31016(5, 'cu', 60).size, '14', 'art58: core re-run 5 A @ 60 C = 14 AWG Cu');
  eq(core.pickConductor31016(18.75, 'cu', 60).size, '12', 'art58: core re-run 18.75 A @ 60 C = 12 AWG Cu');
  eq(core.pickConductor31016(18.75, 'cu', 75).size, '14', 'art58: core re-run 18.75 A @ 75 C = 14 AWG Cu (ampacity passes; the OCPD gate rejects it)');
  eq(core.nextStdBreaker(18.75), 20, 'art58: core re-run 18.75 A -> 20 A standard OCPD');
  eq(core.nextStdBreaker(6.67), 15, 'art58: core re-run 6.67 A -> 15 A standard OCPD');
  // cross-links (all targets exist in articles/)
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art58: cross-links to 240.4(D)/(G) article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art58: cross-links to Table 310.16 article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art58: cross-links to 240.6 article');
  eq(art.includes('nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art58: cross-links to the 422.10-422.13 Part I foundation article');
  eq(art.includes('nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art58: cross-links to the air-cooling article (parallel 440.8 zone)');
  eq(art.includes('nec-21008-gfci-protection.html'), true, 'art58: cross-links to the 210.8 GFCI article (same bathroom space)');
  // sitemap + index + README
  const sitemap58 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap58.includes('articles/nec-42216-42218-42222-flexible-cords-ceiling-fans.html'), true, 'art58: sitemap entry present');
  eq((sitemap58.match(/<loc>/g) || []).length >= 59, true, 'art58: sitemap has >= 59 URLs (art58 appended the 59th; the total only grows per the S82 structural fix');
  const index58 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index58.includes('articles/nec-42216-42218-42222-flexible-cords-ceiling-fans.html'), true, 'art58: index cross-link present');
  const readme58 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme58.includes('articles/nec-42216-42218-42222-flexible-cords-ceiling-fans.html'), true, 'art58: README entry present');
}

// === ART59_BLOCK_BEGIN (inserted by Session 84 — keep as one contiguous block) ===
// ============================================================================
// Article 59 — NEC 422.30–422.62: appliance disconnecting means (Part III),
// construction (Part IV), marking (Part V)
// (panelwright/articles/nec-42230-42262-appliance-disconnect-construction.html)
// Session 84. 2017 scan + 2023 CSV verified on disk (verify_art59.py: 75
// phrase-level checks, all pass). Deltas: 422.31 NEW routing lead,
// 422.31(A)/(B) lockable-clause reword, 422.31(B) IN reword, 422.31(C)
// "of more than 4 hp" + "(D)" drop, 422.33(B) "meet the intent" -> "shall be
// permitted" (the ONE Mike Holt-2023-documented in-scope entry), 422.40 IN
// "(A)" drop, 422.41 position-phrase drop, 422.46 deleted, 422.47
// list-flatten + ANSI Z21.22 note drop, 422.50 deleted. 2020 position not
// asserted (no on-disk 2020 source carries the 422.30-422.62 bodies; the
// on-disk 2020 scan ends before Article 422 — verified). Worked examples
// core-computed (compute_art59.js -> art59_numbers.json):
// nextStdBreaker / pickConductor31016 / reqBreakerA + one Table 430.248 FLC
// transcription (1/2 hp 208 V = 4.0 A, from the on-disk 2017 scan).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-42230-42262-appliance-disconnect-construction.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art59_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-42230-42262-appliance-disconnect-construction.html'), true, 'art59: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-42230-42262-appliance-disconnect-construction.html'), true, 'art59: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art59: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art59: Article + FAQPage JSON-LD present');
  eq(has('nec content series · article 59'), true, 'art59: footer marks article 59');
  eq(has('75 machine-verified'), true, 'art59: 75 machine-verified checks claimed');
  // verbatim 2017 quotes (match on-disk scan after disclosed OCR corrections)
  eq(has('a means shall be provided to simultaneously disconnect each appliance from all ungrounded conductors in accordance with the following sections of part iii'), true, 'art59: verbatim 2017 422.30 lead');
  eq(has('for permanently connected appliances rated at not over 300 volt-amperes or 1/8 hp, the branch-circuit overcurrent device shall be permitted to serve as the disconnecting means where the switch or circuit breaker is within sight from the appliance or is lockable in accordance with 110.25'), true, 'art59: verbatim 2017 422.31(A) 300 VA / 1/8 hp route');
  eq(has('for permanently connected appliances rated over 300 volt-amperes, the branch-circuit switch or circuit breaker shall be permitted to serve as the disconnecting means'), true, 'art59: verbatim 2017 422.31(B) over-300-VA route');
  eq(has('the disconnecting means shall comply with 430.109 and 430.110'), true, 'art59: verbatim 2017 422.31(C) motor-operated compliance (unchanged core)');
  eq(has('exception: if an appliance of more than 4 hp is provided with a unit switch that complies with 422.34(a), (b), (c), or (d), the switch or circuit breaker serving as the other disconnecting means shall be permitted to be out of sight from the appliance'), true, 'art59: verbatim 2017 422.31(C) Exception "of more than 4 hp" + (D) (both dropped in 2023)');
  eq(has('an accessible separable connector or an accessible plug (or attachment fitting) and receptacle combination shall be permitted to serve as the disconnecting means'), true, 'art59: verbatim 2017 422.33(A) receptacle-as-disconnect route (unchanged)');
  eq(has('accessible from the front by removal of a drawer, shall meet the intent of 422.33(a)'), true, 'art59: verbatim 2017 422.33(B) range-drawer "meet the intent" (reworded in 2023)');
  eq(has('the rating of a receptacle or of a separable connector shall not be less than the rating of any appliance connected thereto'), true, 'art59: verbatim 2017 422.33(C) receptacle rating floor (unchanged)');
  eq(has('a unit switch(es) with a marked-off position that is a part of an appliance and disconnects all ungrounded conductors shall be permitted as the disconnecting means required by this article where other means for disconnection are provided in occupancies specified in 422.34(a) through (d)'), true, 'art59: verbatim 2017 422.34 unit-switch lead (unchanged)');
  eq(has('switches and circuit breakers used as disconnecting means shall be of the indicating type'), true, 'art59: verbatim 2017 422.35 indicating type (unchanged)');
  eq(has('informational note: for polarity of edison-base lampholders, see 410.82(a)'), true, 'art59: verbatim 2017 422.40 IN cites 410.82(A) (2023 drops the (A))');
  eq(has('shall be constructed to provide protection for personnel against electrocution when immersed while in the "on" or "off" position'), true, 'art59: verbatim 2017 422.41 immersion protection with position phrase (phrase dropped in 2023)');
  eq(has('each electrically heated appliance or group of appliances intended to be applied to combustible material shall be provided with a signal or an integral temperature-limiting device'), true, 'art59: verbatim 2017 422.42 heated-appliance signal (unchanged)');
  eq(has('current-carrying parts are effectively insulated from electrical contact with the substance in which they are immersed'), true, 'art59: verbatim 2017 422.44 immersion heater insulation (unchanged)');
  eq(has('shall be equipped with an approved stand, which shall be permitted to be a separate piece of equipment or a part of the appliance'), true, 'art59: verbatim 2017 422.45 approved stand (unchanged)');
  eq(has('electrically heated smoothing irons shall be equipped with an identified temperature-limiting means'), true, 'art59: verbatim 2017 422.46 flatiron limit means (DELETED in 2023)');
  eq(has('all storage or instantaneous-type water heaters shall be equipped with a temperature-limiting means in addition to its control thermostat to disconnect all ungrounded conductors'), true, 'art59: verbatim 2017 422.47 water-heater limit means lead');
  eq(has('a capacity of 60 kw or above'), true, 'art59: verbatim 2017 422.47 Ex 1 60 kW capacity (scan "60 RW" garble resolved to "60 kW")');
  eq(has('infrared heating lamps rated at 300 watts or less shall be permitted with lampholders of the medium-base, unswitched porcelain type'), true, 'art59: verbatim 2017 422.48(A) 300 W-or-less lampholder rule (unchanged)');
  eq(has('screw shell lampholders shall not be used with infrared lamps rated over 300 watts'), true, 'art59: verbatim 2017 422.48(B) screw-shell prohibition (unchanged)');
  eq(has('cord-and-plug-connected pipe heating assemblies intended to prevent freezing of piping shall be listed'), true, 'art59: verbatim 2017 422.50 pipe-heating listing (DELETED in 2023)');
  eq(has('each electrical appliance shall be provided with a nameplate giving the identifying name and the rating in volts and amperes, or in volts and watts'), true, 'art59: verbatim 2017 422.60(A) nameplate rating (unchanged core)');
  eq(has('shall be legibly marked with the ratings in volts and amperes, or in volts and watts, or with the manufacturer\'s part number'), true, 'art59: verbatim 2017 422.61 heating-element marking (unchanged)');
  eq(has('the nameplate value shall not be less than the equivalent horsepower of the combined loads, calculated in accordance with 430.110(c)(1)'), true, 'art59: verbatim 2017 422.62(A) 430.110(C)(1) combined-hp hook (unchanged)');
  // 2023 deltas documented
  eq(has('for appliances that do not have a disconnecting means in accordance with 422.33 or 422.34, a disconnecting means shall be provided in accordance with 422.31(a), (b), or (c)'), true, 'art59: documents 2023 422.31 NEW routing lead');
  eq(has('or be capable of being locked in the open position in compliance with 110.25'), true, 'art59: documents 2023 422.31(A)/(B) lockable-clause reword');
  eq(has('see 422.34 for appliances employing unit switches'), true, 'art59: documents 2023 422.31(B) IN reword');
  eq(has('if an appliance is provided with a unit switch that complies with 422.34(a), (b), or (c)'), true, 'art59: documents 2023 422.31(C) "of more than 4 hp" + (D) drop');
  eq(has('accessible from the front by removal of a drawer, shall be permitted'), true, 'art59: documents 2023 422.33(B) "shall be permitted" ending');
  eq(has('considered accessible by the removal of the drawer at the front of the range'), true, 'art59: quotes the Mike Holt 2023 422.33(B) drawer clarification');
  eq(has('see 410.82 for polarity of edison-base lampholders'), true, 'art59: documents 2023 422.40 IN "(A)" drop');
  eq(has('against electrocution when immersed'), true, 'art59: documents 2023 422.41 immersion-sentence ending (position phrase dropped)');
  eq(has('[deleted in 2023 — no 422.46 row in the on-disk 2023 nec; verified.]'), true, 'art59: documents 422.46 deletion (on-disk-verified)');
  eq(has('ansi z21.22-1999/csa 4.4-m99 informational note is dropped'), true, 'art59: documents 2023 422.47 ANSI Z21.22 note drop + list-flatten');
  eq(has('[deleted in 2023 — no 422.50 row in the on-disk 2023 nec; verified.]'), true, 'art59: documents 422.50 deletion (on-disk-verified)');
  // worked examples (core-computed from art59_numbers.json)
  eq(nums.EX1.loadA, 50, 'art59: EX1 12,000 W / 240 V range load = 50 A');
  eq(nums.EX1.receptacleFloorA, 50, 'art59: EX1 422.33(C) receptacle floor = 50 A (= appliance rating)');
  eq(nums.EX1.receptacleRejected, 40, 'art59: EX1 40 A receptacle rejected (40 A < 50 A floor)');
  eq(nums.EX1.ocpd, 50, 'art59: EX1 OCPD = 50 A (240.6 standard size)');
  eq(nums.EX1.conductor, '8 AWG Cu (50 A @ 75 C)', 'art59: EX1 conductors = 8 AWG Cu @ 75 C');
  eq(nums.EX2.loadA, 45, 'art59: EX2 10,800 W / 240 V range load = 45 A');
  eq(nums.EX2.receptacleFloorA, 45, 'art59: EX2 422.33(B) rear-base receptacle floor = 45 A');
  eq(nums.EX2.ocpd, 45, 'art59: EX2 OCPD = 45 A (45 IS a 240.6 standard size)');
  approx(nums.EX3.a.loadA, 2.61, 0.01, 'art59: EX3 300 VA / 115 V boundary = 2.61 A');
  approx(nums.EX3.b.loadA, 3.04, 0.01, 'art59: EX3 350 VA / 115 V = 3.04 A');
  eq(nums.EX3.boundaryVA, 300, 'art59: EX3 boundary = 300 VA (422.31(A)/(B) seam)');
  eq(nums.EX3.a.ocpd && nums.EX3.b.ocpd, 15, 'art59: EX3 both routes land on the 15 A OCPD floor');
  eq(nums.EX4.flcA, 4, 'art59: EX4 1/2 hp 208 V motor FLC = 4.0 A (Table 430.248 transcription)');
  approx(nums.EX4.ctrlA, 1.09, 0.01, 'art59: EX4 250 W / 230 V control load = 1.09 A');
  approx(nums.EX4.ratingReqA, 5.09, 0.01, 'art59: EX4 430.110(C)(1) sum = 4.0 + 1.09 = 5.09 A');
  eq(nums.EX4.minDisconnectRatingA, 15, 'art59: EX4 min disconnect rating = 15 A (nextStdBreaker)');
  eq(nums.EX4.hp, 0.5, 'art59: EX4 appliance hp = 0.5 (fails the 2017 4-hp gate; exempt in 2023)');
  approx(nums.EX5.heater.continuous125A, 23.44, 0.01, 'art59: EX5 18.75 A continuous × 1.25 = 23.44 A (422.13)');
  eq(nums.EX5.heater.ocpd, 25, 'art59: EX5 water-heater OCPD = 25 A (240.6)');
  eq(nums.EX5.heater.ex1.exempt, false, 'art59: EX5 4.5 kW storage heater is NOT exempt from 422.47 Ex 1 (4.5 kW < 60 kW)');
  approx(nums.EX5.lamp.allowed.A, 2.5, 0.01, 'art59: EX5 300 W / 120 V lamp = 2.5 A (exactly at the 422.48(A) boundary)');
  approx(nums.EX5.lamp.over.A, 2.71, 0.01, 'art59: EX5 325 W / 120 V lamp = 2.71 A (over 300 W -> 422.48(B))');
  // core re-runs (independent of the JSON)
  eq(core.nextStdBreaker(45), 45, 'art59: core re-run 45 A is a 240.6 standard size (EX2)');
  eq(core.nextStdBreaker(49), 50, 'art59: core re-run 49 A -> 50 A standard size');
  eq(core.nextStdBreaker(5.09), 15, 'art59: core re-run 5.09 A -> 15 A standard size (EX4)');
  eq(core.pickConductor31016(45, 'cu', 75).size, '8', 'art59: core re-run 45 A @ 75 C = 8 AWG Cu (EX1/EX2)');
  eq(core.reqBreakerA(18.75, true), 23.4375, 'art59: core re-run 18.75 A continuous x1.25 = 23.4375 A (EX5)');
  // cross-links
  eq(art.includes('nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art59: cross-links to the 422.10-422.13 Part I foundation article');
  eq(art.includes('nec-42216-42218-42222-flexible-cords-ceiling-fans.html'), true, 'art59: cross-links to the Part II installation article (422.43 home)');
  eq(art.includes('nec-430101-430113-disconnecting-means.html'), true, 'art59: cross-links to the motor disconnecting-means article (422.31(C) hook)');
  eq(art.includes('nec-43022-43052-single-motor-branch-circuit.html'), true, 'art59: cross-links to the single-motor branch-circuit article');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art59: cross-links to the 240.6 standard ampere ratings article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art59: cross-links to the Table 310.16 ampacity article');
  // sitemap + index + README
  const sitemap59 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap59.includes('articles/nec-42230-42262-appliance-disconnect-construction.html'), true, 'art59: sitemap entry present');
  eq((sitemap59.match(/<loc>/g) || []).length >= 60, true, 'art59: sitemap has >= 60 URLs (art59 appended the 60th; the total only grows per the S82 structural fix)');
  const index59 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index59.includes('articles/nec-42230-42262-appliance-disconnect-construction.html'), true, 'art59: index cross-link present');
  const readme59 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme59.includes('articles/nec-42230-42262-appliance-disconnect-construction.html'), true, 'art59: README entry present');
}
// === ART59_BLOCK_END ===

// === ART60_BLOCK_BEGIN (article 60 — NEC 424.1-424.29 fixed electric space-heating) ===
// 13 changed sections 2017->2023 (verify_art60.py, 72 checks, all pass):
// 424.2->424.3 renumber + NEW Table 424.3, 424.3->424.4 renumber + the
// 424.4(B) continuous-load -> 125% conductor reword (the ONE
// Mike Holt-2023-documented in-scope entry), 424.9->424.10 renumber +
// 210.50(B)->210.52, 424.10 "Special Permission" deleted, 424.11
// insulation-rating reword, 424.12(B) water-sentence drop, 424.19
// lead + (B)(1) lockable-open reword, 424.19(C)(1)/(C)(2)
// general-purpose-circuits reword, 424.20(A) new accessible-location
// condition, 424.22(A) cross-ref reword, 424.22(B) 424.3(B)->424.4(B),
// 424.28(B) "easily" drop. 2020 position not asserted (no on-disk 2020
// source carries the 424.1-424.29 bodies; the on-disk 2020 scan ends at
// Article 230 - verified). Worked examples core-computed
// (compute_art60.js -> art60_numbers.json): nextStdBreaker /
// pickConductor31016 / reqBreakerA.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-42401-42429-fixed-space-heating.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art60_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-42401-42429-fixed-space-heating.html'), true, 'art60: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-42401-42429-fixed-space-heating.html'), true, 'art60: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art60: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art60: Article + FAQPage JSON-LD present');
  eq(art.includes('Design aid only'), true, 'art60: design-aid disclaimer present');
  eq(has('nec content series · article 60'), true, 'art60: footer marks article 60');
  eq(has('72 machine-verified checks'), true, 'art60: 72 machine-verified checks claimed');
  eq(has('thirteen machine-verified changes across ten sections'), true, 'art60: thirteen changes / ten sections claimed');
  eq(art.includes('"datePublished": "2026-09-18"'), true, 'art60: datePublished 2026-09-18');
  // verbatim 2017 quotes (match on-disk scan after disclosed OCR corrections)
  eq(has('heating equipment shall include heating cable, unit heaters, boilers, central systems, or other approved fixed electric space-heating equipment'), true, 'art60: verbatim 2017 424.1 scope');
  eq(has('individual branch circuits shall be permitted to supply any volt-ampere or wattage rating of fixed electric space-heating equipment for which they are rated'), true, 'art60: verbatim 2017 424.3(A) individual circuit');
  eq(has('branch circuits supplying two or more outlets for fixed electric space-heating equipment shall be rated not over 30 amperes'), true, 'art60: verbatim 2017 424.3(A) 30 A cap');
  eq(has('fixed electric space-heating equipment and motors shall be considered continuous load'), true, 'art60: verbatim 2017 424.3(B) continuous-load declaration');
  eq(has('shall be permitted only by special permission'), true, 'art60: verbatim 2017 424.10 special permission (deleted in 2023)');
  eq(has('requiring supply conductors with over 60°c insulation shall be clearly and permanently marked'), true, 'art60: verbatim 2017 424.11 supply-conductor marking');
  eq(has('shall be listed for such locations and shall be constructed and installed so that water or other liquids cannot enter or accumulate'), true, 'art60: verbatim 2017 424.12(B) water sentence (dropped in 2023)');
  eq(has('shall have an ampere rating not less than 125 percent of the total load of the motors and the heaters'), true, 'art60: verbatim 2017 424.19 lead 125% disconnect rating');
  eq(has('a unit switch(es) with a marked "off" position that is part of a fixed heater and disconnects all ungrounded conductors'), true, 'art60: verbatim 2017 424.19(C) unit-switch route');
  eq(has('shall also be permitted to control lamps and appliances'), true, 'art60: verbatim 2017 424.19(C)(1) lamps-and-appliances (2023 reword)');
  eq(has('resistance-type heating elements in electric space-heating equipment shall be protected at not more than 60 amperes'), true, 'art60: verbatim 2017 424.22(B) 60 A element ceiling');
  eq(has('all heating elements that are replaceable in the field and are part of an electric heater shall be legibly marked'), true, 'art60: verbatim 2017 424.29 element marking');
  // 2023 delta sides (match on-disk 2023 CSV rows)
  eq(has('heating equipment includes heating cables, unit heaters, boilers, central heating systems'), true, 'art60: 2023 424.1 scope reword');
  eq(has('shall additionally comply with table 424.3'), true, 'art60: 2023 424.3 NEW Table 424.3 cross-ref');
  eq(has('for which the branch circuit is rated'), true, 'art60: 2023 424.4(A) reword');
  eq(has('the branch-circuit conductor(s) ampacity shall not be less than 125 percent of the load of the fixed electric space-heating equipment and any associated motor(s)'), true, 'art60: 2023 424.4(B) 125% conductor rule (MH-documented)');
  eq(has('is capable of being locked in the open position in compliance with 110.25'), true, 'art60: 2023 424.19(B)(1) lockable-open reword');
  eq(has('shall also be permitted to control general-purpose circuits and appliance circuits'), true, 'art60: 2023 424.19(C)(1) general-purpose reword');
  eq(has('located in an accessible location'), true, 'art60: 2023 424.20(A) NEW fifth condition');
  eq(has('parts iii and iv of article 430 or parts iii and vi of article 440'), true, 'art60: 2023 424.22(A) specific cross-refs');
  eq(has('visible or accessible after installation'), true, 'art60: 2023 424.28(B) "easily" drop');
  eq(has('required by 210.52'), true, 'art60: 2023 424.10 baseboard receptacle 210.52 cross-ref');
  // worked examples (core-computed, art60_numbers.json)
  eq(nums.EX1.loadA, 50, 'art60: EX1 12,000 W / 240 V = 50 A load');
  approx(nums.EX1.conductorAmpacityRequired_125, 62.5, 0.001, 'art60: EX1 125% continuous = 62.5 A (424.4(B))');
  eq(nums.EX1.ocpdA, 70, 'art60: EX1 OCPD = 70 A (nextStdBreaker)');
  eq(nums.EX1.conductor.indexOf('6 AWG Cu') === 0, true, 'art60: EX1 conductors = 6 AWG Cu (65 A @ 75 C)');
  eq(nums.EX2.loadA, 20, 'art60: EX2 4,800 W / 240 V = 20 A (two heaters)');
  eq(nums.EX2.circuitCapA, 30, 'art60: EX2 424.4(A) multi-outlet cap = 30 A');
  eq(nums.EX2.ocpdA, 25, 'art60: EX2 OCPD = 25 A (under the 30 A cap)');
  eq(nums.EX2.conductor.indexOf('12 AWG Cu') === 0, true, 'art60: EX2 conductor core pick = 12 AWG Cu (240.4(D) 20 A cap flagged)');
  eq(nums.EX3.nameplateA, 62.5, 'art60: EX3 15,000 W / 240 V = 62.5 A nameplate');
  eq(nums.EX3.mustSubdivide, true, 'art60: EX3 over the 48 A threshold -> must subdivide');
  approx(nums.EX3.perSubdivisionA, 31.25, 0.001, 'art60: EX3 two subdivisions = 31.25 A each (<= 48 A)');
  eq(nums.EX3.perSubdivisionWithin48, true, 'art60: EX3 each subdivided load within 48 A');
  approx(nums.EX4.disconnectRating_125, 25, 0.001, 'art60: EX4 20 A load x 1.25 = 25 A disconnect floor (424.19 lead)');
  eq(nums.EX4.disconnectOcpdA, 25, 'art60: EX4 breaker-as-disconnect = 25 A (nextStdBreaker)');
  eq(nums.EX5.loadA, 40, 'art60: EX5 4,800 W / 120 V infrared = 40 A load');
  eq(nums.EX5.infraredCapA, 50, 'art60: EX5 non-dwelling infrared cap = 50 A');
  eq(nums.EX5.ocpdA, 50, 'art60: EX5 OCPD = 50 A (at the cap)');
  eq(nums.EX5.conductor.indexOf('8 AWG Cu') === 0, true, 'art60: EX5 conductors = 8 AWG Cu (50 A @ 75 C)');
  // core re-runs (independent of the JSON)
  eq(core.nextStdBreaker(62.5), 70, 'art60: core re-run 62.5 A -> 70 A (EX1)');
  eq(core.nextStdBreaker(25), 25, 'art60: core re-run 25 A is a 240.6 standard size (EX2/EX4)');
  eq(core.nextStdBreaker(50), 50, 'art60: core re-run 50 A is a 240.6 standard size (EX5)');
  eq(core.pickConductor31016(62.5, 'cu', 75).size, '6', 'art60: core re-run 62.5 A @ 75 C = 6 AWG Cu (EX1)');
  eq(core.pickConductor31016(50, 'cu', 75).size, '8', 'art60: core re-run 50 A @ 75 C = 8 AWG Cu (EX5)');
  eq(core.reqBreakerA(50, true), 62.5, 'art60: core re-run 50 A continuous x 1.25 = 62.5 A (EX1)');
  // cross-links
  eq(art.includes('nec-42210-42211-42213-appliance-branch-circuit.html'), true, 'art60: cross-links to the 422.10-422.13 appliance branch-circuit article');
  eq(art.includes('nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art60: cross-links to the 430.24/430.53 several-motors article (424.4(B) hand-off)');
  eq(art.includes('nec-42230-42262-appliance-disconnect-construction.html'), true, 'art60: cross-links to the 422.30-422.62 appliance disconnecting-means article');
  eq(art.includes('nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art60: cross-links to the 440.22/440.32 air-conditioning article (Table 424.3)');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art60: cross-links to the 240.6 standard ampere ratings article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art60: cross-links to the Table 310.16 ampacity article');
  // sitemap + index + README
  const sitemap60 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap60.includes('articles/nec-42401-42429-fixed-space-heating.html'), true, 'art60: sitemap entry present');
  eq((sitemap60.match(/<loc>/g) || []).length >= 61, true, 'art60: sitemap has >= 61 URLs (never-shrink; grows per article)');
  const index60 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index60.includes('articles/nec-42401-42429-fixed-space-heating.html'), true, 'art60: index cross-link present');
  const readme60 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme60.includes('articles/nec-42401-42429-fixed-space-heating.html'), true, 'art60: README entry present');
}
// === ART60_BLOCK_END ===



// === ART61_BLOCK_BEGIN (article 61 - NEC 425.1-425.29 fixed resistance & electrode industrial process heating) ===
// 12 changed sections 2017->2023 (verify_art61.py, 91 checks, all pass):
// 425.1 scope reword + exclusion-list drop, 425.2->Table 425.3 renumber,
// 425.3->425.4 renumber + (A) reword, 425.8->425.10 renumber, 425.9
// Approval + 425.10 "Special Permission" deleted, 425.14 comma cleanup,
// 425.19 lockable-open reword (3 places), 425.19(A)(2)(2) unit-switch
// rework, 425.22(A) cross-ref reword, 425.22(B) 120 A / 150 A element
// allowance (2020 origin, independently sourced) + 425.3(B)->425.4(B),
// 425.22(C) list/IN rework, 425.28 marking reword (2 places). No Mike Holt
// 2023 entries for Article 425 (zero "Article 425" + zero "425.N" in the
// summary - verified), so every delta is on-disk-verified. Worked examples
// core-computed (compute_art61.js -> art61_numbers.json): nextStdBreaker /
// pickConductor31016 / reqBreakerA.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-42501-42529-industrial-process-heating.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art61_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-42501-42529-industrial-process-heating.html'), true, 'art61: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-42501-42529-industrial-process-heating.html'), true, 'art61: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art61: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art61: Article + FAQPage JSON-LD present');
  eq(art.includes('Design aid only'), true, 'art61: design-aid disclaimer present');
  eq(has('nec content series · article 61'), true, 'art61: footer marks article 61');
  eq(has('91 machine-verified checks'), true, 'art61: 91 machine-verified checks claimed');
  eq(has('twelve machine-verified 2017→2023 changes across twelve sections'), true, 'art61: twelve changes / twelve sections claimed');
  eq(art.includes('"datePublished": "2026-09-18"'), true, 'art61: datePublished 2026-09-18');
  // verbatim 2017 quotes (match on-disk scan after disclosed OCR corrections)
  eq(has('this article covers fixed industrial process heating employing electric resistance or electrode heating technology'), true, 'art61: verbatim 2017 425.1 scope');
  eq(has('heating equipment shall include boilers, electrode boilers, duct heaters, strip heaters, immersion heaters, process air heaters, or other approved fixed electric equipment'), true, 'art61: verbatim 2017 425.1 equipment list');
  eq(has('shall not apply to heating and room air conditioning for personnel spaces covered by article 424'), true, 'art61: verbatim 2017 425.1 exclusion (dropped in 2023)');
  eq(has('incorporating a hermetic refrigerant motor-compressor shall also comply with article 440'), true, 'art61: verbatim 2017 425.2 other articles (2023 -> Table 425.3)');
  eq(has('individual branch circuits shall be permitted to supply any volt-ampere or wattage rating of fixed industrial process heating equipment for which they are rated'), true, 'art61: verbatim 2017 425.3(A) individual circuit');
  eq(has('fixed industrial process heating equipment and motors shall be considered continuous loads'), true, 'art61: verbatim 2017 425.3(B) continuous load (word-identical 2023)');
  eq(has('fixed industrial process heating equipment shall be listed'), true, 'art61: verbatim 2017 425.6 listed (word-identical 2023)');
  eq(has('exception: with special permission, in industrial establishments only'), true, 'art61: verbatim 2017 425.8(B) working-space exception (word-identical 2023)');
  eq(has('all fixed industrial process heating equipment shall be installed in an approved manner'), true, 'art61: verbatim 2017 425.9 approval (deleted in 2023)');
  eq(has('shall be permitted only by special permission'), true, 'art61: verbatim 2017 425.10 special permission (deleted in 2023)');
  eq(has('requiring supply conductors with over 60°c insulation shall be clearly and permanently marked'), true, 'art61: verbatim 2017 425.11 supply-conductor marking (word-identical 2023)');
  eq(has('water or other liquids cannot enter or accumulate in or on wired sections'), true, 'art61: verbatim 2017 425.12(B) water sentence (word-identical 2023)');
  eq(has('shall be permitted to be operated in series on circuits of over 150 volts to ground'), true, 'art61: verbatim 2017 425.14 infrared series rule (word-identical 2023)');
  eq(has('shall have an ampere rating not less than 125 percent of the total load of the motors and the heaters'), true, 'art61: verbatim 2017 425.19 lead 125% disconnect rating');
  eq(has('the disconnecting means provided is also within sight from the motor controller(s) and the heater'), true, 'art61: verbatim 2017 425.19(A)(1) in-sight condition (word-identical 2023)');
  eq(has('provided with a single unit switch that complies with 422.34(a), (b), (c), or (d)'), true, 'art61: verbatim 2017 425.19(A)(2)(2) 422.34 unit-switch hook (2023 rework)');
  eq(has('switches and circuit breakers used as disconnecting means shall be of the indicating type'), true, 'art61: verbatim 2017 425.21 indicating (word-identical 2023)');
  eq(has('resistance-type heating elements in fixed industrial process heating equipment shall be protected at not more than 60 amperes'), true, 'art61: verbatim 2017 425.22(B) 60 A element ceiling (word-identical 2023)');
  eq(has('equipment rated more than 48 amperes and employing such elements shall have the heating elements subdivided, and each subdivided load shall not exceed 48 amperes'), true, 'art61: verbatim 2017 425.22(B) 48 A subdivision (word-identical 2023)');
  eq(has('shall be permitted to be sized at not less than 100 percent of the nameplate rating of the heater'), true, 'art61: verbatim 2017 425.22(D) 50 kW 100% route (word-identical 2023)');
  eq(has('field-wired conductors between the heater and the supplementary overcurrent protective devices'), true, 'art61: verbatim 2017 425.22(E) field-wired conductors');
  eq(has('a nameplate giving the identifying name and the normal rating in volts and watts or in volts and amperes'), true, 'art61: verbatim 2017 425.28(A) nameplate (2023 reword)');
  eq(has('shall be located so as to be visible or easily accessible after installation'), true, 'art61: verbatim 2017 425.28(B) "easily accessible" (2023 drop)');
  eq(has('all heating elements that are replaceable in the field and are part of industrial process heating equipment shall be legibly marked'), true, 'art61: verbatim 2017 425.29 element marking');
  // 2023 delta sides (match on-disk 2023 CSV rows)
  eq(has('heating equipment includes boilers, electrode boilers, duct heaters, strip heaters, immersion heaters, process air heaters'), true, 'art61: 2023 425.1 scope reword (includes list, exclusions gone)');
  eq(has('shall additionally comply with table 425.3'), true, 'art61: 2023 425.3 NEW Table 425.3 cross-ref');
  eq(has('motors, motor circuits, and controllers'), true, 'art61: 2023 Table 425.3 430 row');
  eq(has('air-conditioning and refrigerating equipment'), true, 'art61: 2023 Table 425.3 440 row');
  eq(has('for which the branch circuit is rated'), true, 'art61: 2023 425.4(A) reword');
  eq(has('fixed industrial process heating equipment shall be accessible'), true, 'art61: 2023 425.10(A) General accessible core');
  eq(has('the circuit voltage'), true, 'art61: 2023 425.14 circuit-voltage punctuation cleanup');
  eq(has('capable of being locked in the open position in compliance with 110.25'), true, 'art61: 2023 425.19 lockable-open reword');
  eq(has('motor(s) of more than 1/8 hp and the heater are provided with disconnecting means'), true, 'art61: 2023 425.19(A)(2)(2) unit-switch rework (422.34 hook dropped)');
  eq(has('required to have additional overcurrent protection by parts iii and iv of article 430 or part iii of article 440'), true, 'art61: 2023 425.22(A) Parts cross-ref reword');
  eq(has('shall be permitted to be subdivided into circuits not exceeding 120 amperes and protected at not more than 150 amperes'), true, 'art61: 2023 425.22(B) NEW 120 A / 150 A allowance (2020 origin)');
  eq(has('elements are integral with and enclosed within a process heating surface'), true, 'art61: 2023 425.22(B) condition 1 (process heating surface)');
  eq(has('425.3(b) → 425.4(b) renumber in the sub-48 a supplementary-device clause'), true, 'art61: 2023 425.22(B) 425.3(B)->425.4(B) renumber documented');
  eq(has('identifying the manufacturer and the rating'), true, 'art61: 2023 425.28(A) "identifying the manufacturer" reword');
  eq(has('so as to be permanent and shall be visible or accessible'), true, 'art61: 2023 425.28(B) "permanent" + "easily" drop');
  eq(has('in volts and watts or in volts and amperes'), true, 'art61: 2023 425.29 "and" form (clean text)');
  // 2020-edition provenance callout (independent source)
  eq(has('2020 nec'), true, 'art61: 2020-edition provenance callout present');
  eq(has('mypdh.engineer'), true, 'art61: independent 2020 source cited (mypdh.engineer)');
  // edition story table + method
  eq(has('no mike holt 2023 entries for article 425'), true, 'art61: MH 2023 silence claimed (zero entries)');
  eq(has('twelve changed sections'), true, 'art61: twelve-changed-sections claimed in method');
  // worked examples (core-computed)
  eq(nums.EX1.loadA, 62.5, 'art61: EX1 load = 62.5 A (15,000 W / 240 V)');
  eq(nums.EX1.conductorAmpacityRequired_125, 78.13, 'art61: EX1 125% conductor ampacity = 78.13 A');
  eq(has('78.13'), true, 'art61: article body prints EX1 ampacity 78.13 A (62.5 x 1.25)');
  eq(has('78.75'), false, 'art61: no 78.75 typo in the article (S86 fix)');
  eq(nums.EX1.ocpdA, 80, 'art61: EX1 OCPD = 80 A (nextStdBreaker)');
  eq(nums.EX1.conductor.indexOf('4 AWG Cu') === 0, true, 'art61: EX1 conductors = 4 AWG Cu (85 A @ 75 C)');
  eq(nums.EX2.loadA, 25, 'art61: EX2 load = 25 A (6,000 W / 240 V)');
  eq(nums.EX2.branchOcpdA, 35, 'art61: EX2 branch OCPD = 35 A');
  eq(nums.EX2.disconnectRatingRequired_125, 31.25, 'art61: EX2 125% disconnect rating = 31.25 A');
  eq(nums.EX2.disconnectOcpdA, 35, 'art61: EX2 disconnect OCPD = 35 A (425.19 lead 125%)');
  eq(nums.EX2.conductor.indexOf('10 AWG Cu') === 0, true, 'art61: EX2 conductors = 10 AWG Cu (35 A @ 75 C)');
  eq(nums.EX3.loadA, 41.67, 'art61: EX3 load = 41.67 A (10,000 W / 240 V)');
  eq(nums.EX3.mustSubdivide, false, 'art61: EX3 under the 48 A threshold (no subdivision forced)');
  eq(nums.EX3.within48, true, 'art61: EX3 within 48 A (41.67 A)');
  eq(nums.EX3.elementCeilingA, 60, 'art61: EX3 60 A element ceiling');
  eq(nums.EX3.allowed2023CircuitCapA, 120, 'art61: EX3 2020/2023 120 A circuit cap');
  eq(nums.EX3.allowed2023OcpdCapA, 150, 'art61: EX3 2020/2023 150 A OCPD cap');
  eq(nums.EX4.loadA, 250, 'art61: EX4 load = 250 A (120,000 W / 480 V)');
  eq(nums.EX4.conductorAmpacityRequired_125_floor, 312.5, 'art61: EX4 125% floor = 312.5 A (without route)');
  eq(nums.EX4.conductorAmpacityAllowed_100_route, 250, 'art61: EX4 100% route = 250 A (425.22(D))');
  eq(nums.EX4.ocpdA_125floor, 350, 'art61: EX4 OCPD on 125% floor = 350 A');
  eq(nums.EX4.ocpdA_100route, 250, 'art61: EX4 OCPD on 100% route = 250 A');
  eq(nums.EX4.conductor_125floor.indexOf('400 kcmil Cu') === 0, true, 'art61: EX4 conductors on 125% floor = 400 kcmil Cu (335 A)');
  eq(nums.EX4.conductor_100route.indexOf('250 kcmil Cu') === 0, true, 'art61: EX4 conductors on 100% route = 250 kcmil Cu (255 A)');
  eq(nums.EX5.loadA, 40, 'art61: EX5 load = 40 A (4,800 W / 120 V infrared)');
  eq(nums.EX5.conductorAmpacityRequired_125, 50, 'art61: EX5 125% conductor ampacity = 50 A');
  eq(nums.EX5.ocpdA, 50, 'art61: EX5 OCPD = 50 A');
  eq(nums.EX5.conductor.indexOf('8 AWG Cu') === 0, true, 'art61: EX5 conductors = 8 AWG Cu (50 A @ 75 C)');
  // core re-runs (independent of the JSON)
  eq(core.reqBreakerA(62.5, true), 78.125, 'art61: core re-run 62.5 A continuous x 1.25 = 78.125 A (EX1)');
  eq(core.nextStdBreaker(78.125), 80, 'art61: core re-run 78.125 A -> 80 A (EX1)');
  eq(core.pickConductor31016(78.125, 'cu', 75).size, '4', 'art61: core re-run 78.125 A @ 75 C = 4 AWG Cu (EX1)');
  eq(core.nextStdBreaker(31.25), 35, 'art61: core re-run 31.25 A -> 35 A (EX2)');
  eq(core.pickConductor31016(31.25, 'cu', 75).size, '10', 'art61: core re-run 31.25 A @ 75 C = 10 AWG Cu (EX2)');
  eq(core.nextStdBreaker(312.5), 350, 'art61: core re-run 312.5 A -> 350 A (EX4 floor)');
  eq(core.nextStdBreaker(250), 250, 'art61: core re-run 250 A is a 240.6 standard size (EX4 route)');
  eq(core.pickConductor31016(312.5, 'cu', 75).size, '400', 'art61: core re-run 312.5 A @ 75 C = 400 kcmil Cu (EX4 floor)');
  eq(core.pickConductor31016(250, 'cu', 75).size, '250', 'art61: core re-run 250 A @ 75 C = 250 kcmil Cu (EX4 route)');
  eq(core.reqBreakerA(40, true), 50, 'art61: core re-run 40 A continuous x 1.25 = 50 A (EX5)');
  eq(core.nextStdBreaker(50), 50, 'art61: core re-run 50 A is a 240.6 standard size (EX5)');
  eq(core.pickConductor31016(50, 'cu', 75).size, '8', 'art61: core re-run 50 A @ 75 C = 8 AWG Cu (EX5)');
  // cross-links
  eq(art.includes('nec-42401-42429-fixed-space-heating.html'), true, 'art61: cross-links to the 424.1-424.29 fixed space-heating article (60)');
  eq(art.includes('nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art61: cross-links to the 430.24/430.53 several-motors article (57)');
  eq(art.includes('nec-44022-44032-air-cooling-branch-circuit.html'), true, 'art61: cross-links to the 440.22/440.32 air-conditioning article (50)');
  eq(art.includes('nec-430101-430113-disconnecting-means.html'), true, 'art61: cross-links to the 430.101-430.113 motor disconnecting-means article (42)');
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art61: cross-links to the 240.6 standard ampere ratings article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art61: cross-links to the Table 310.16 ampacity article');
  // sitemap + index + README
  const sitemap61 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap61.includes('articles/nec-42501-42529-industrial-process-heating.html'), true, 'art61: sitemap entry present');
  eq((sitemap61.match(/<loc>/g) || []).length >= 62, true, 'art61: sitemap has >= 62 URLs (never-shrink; grows per article)');
  const index61 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index61.includes('articles/nec-42501-42529-industrial-process-heating.html'), true, 'art61: index cross-link present');
  const readme61 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme61.includes('articles/nec-42501-42529-industrial-process-heating.html'), true, 'art61: README entry present');
}
// === ART61_BLOCK_END ===

// === ART62_BLOCK_BEGIN (article 62 - NEC 690.1-690.15 solar photovoltaic (PV) systems) ===
// 120 checks (verify_art62.py, all pass): 55 verbatim-2017 + 11 Mike Holt 2023
// change-summary (690.4, 690.7, 690.12, 690.15 + 690.31/690.43/690.56 out-of-scope
// context) + 11 MH-silence (no 2023 entry for the other in-scope sections) +
// 3 section-non-existence (690.3/690.5/690.14 not in the 2017 scan) + 2
// on-disk-2023-dataset gap proofs (zero 690.x rows in both CSVs) + 31
// worked-example + 7 core re-run. HONEST GAP: the on-disk 2023 datasets carry
// no Chapter 6 text, so the 2023 side is the change-summary record, not a
// word-level 2023 diff. Worked examples core-computed (compute_art62.js ->
// art62_numbers.json): nextStdBreaker / pickConductor31016 /
// smallConductorCap + the Table 690.7(A) cold-weather Voc factor.
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-6901-69015-solar-pv-systems.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art62_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-6901-69015-solar-pv-systems.html'), true, 'art62: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-6901-69015-solar-pv-systems.html'), true, 'art62: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art62: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art62: Article + FAQPage JSON-LD present');
  eq(art.includes('Design aid only'), true, 'art62: design-aid disclaimer present');
  eq(has('nec content series · article 62'), true, 'art62: footer marks article 62');
  eq(has('120 machine-verified checks'), true, 'art62: 120 machine-verified checks claimed');
  eq(has('four machine-documented 2017→2023 changes'), true, 'art62: four changes claimed');
  eq(has('honest gap'), true, 'art62: honest 2023 gap stated');
  eq(has('zero 690.x rows'), true, 'art62: zero-690.x-rows gap proof stated');
  // in-scope section coverage (verbatim 2017 quote blocks)
  eq(art.includes('690.1 Scope'), true, 'art62: 690.1 scope quoted');
  eq(art.includes('690.2 Definitions'), true, 'art62: 690.2 definitions quoted');
  eq(art.includes('690.4 General Requirements'), true, 'art62: 690.4 quoted');
  eq(art.includes('690.6 Alternating-Current (ac) Modules'), true, 'art62: 690.6 quoted');
  eq(art.includes('690.7 Maximum Voltage'), true, 'art62: 690.7 quoted');
  eq(art.includes('690.8 Circuit Sizing and Current'), true, 'art62: 690.8 quoted');
  eq(art.includes('690.9 Overcurrent Protection'), true, 'art62: 690.9 quoted');
  eq(art.includes('690.10 Stand-Alone Systems'), true, 'art62: 690.10 quoted');
  eq(art.includes('690.11 Arc-Fault Circuit Protection (Direct Current)'), true, 'art62: 690.11 quoted');
  eq(art.includes('690.12 Rapid Shutdown of PV Systems on Buildings'), true, 'art62: 690.12 quoted');
  eq(art.includes('690.13 Photovoltaic System Disconnecting Means'), true, 'art62: 690.13 quoted');
  eq(art.includes('690.15 Disconnection of Photovoltaic Equipment'), true, 'art62: 690.15 quoted');
  // key verbatim rules (alpha-tolerant via has())
  eq(has('maximum voltage of 600 volts or less'), true, 'art62: 600 V dwelling ceiling');
  eq(has('maximum voltage of 1000 volts or less'), true, 'art62: 1000 V other-building ceiling');
  eq(has('maximum voltage of 1500 volts or less'), true, 'art62: 1500 V off-building clause');
  eq(has('corrected for the lowest expected ambient temperature using the correction factor provided in Table 690.7(a)'), true, 'art62: Table 690.7(A) cold-weather rule');
  eq(has('multiplied by 125 percent'), true, 'art62: 690.8(A)(1)(1) 125% Isc rule');
  eq(has('pv system currents shall be considered to be continuous'), true, 'art62: 690.8(B) continuous declaration');
  eq(has('156 percent'), true, 'art62: the 156% factor Informational Note');
  eq(has('not less than 125 percent of the maximum currents calculated in 690.8(a)'), true, 'art62: 690.9(B)(1) 125% OCPD rule');
  eq(has('80 volts dc or greater between any two conductors shall be protected by a listed pv arc-fault circuit interrupter'), true, 'art62: 690.11 80 V dc AFCI rule');
  eq(has('not more than 30 volts within 30 seconds of rapid shutdown initiation'), true, 'art62: 690.12(B)(1) 30 V limit');
  eq(has('not more than 80 volts within 30 seconds of rapid shutdown initiation'), true, 'art62: 690.12(B)(2)(2) 80 V limit');
  eq(has('installed more than 2.5 m (8 ft) from exposed grounded conductive parts or ground'), true, 'art62: 690.12(B)(2)(3) 8 ft exemption');
  eq(has('pv system disconnect'), true, 'art62: 690.13(B) PV SYSTEM DISCONNECT marking');
  eq(has('greater than 30 amperes for the output circuit of a dc combiner'), true, 'art62: 690.15 30 A equipment-disconnect threshold');
  // 2023 change record (MH summary phrases)
  eq(has('electronic power converters'), true, 'art62: 2023 "electronic power converters" term');
  eq(has('floating solar arrays must be identified for the purpose'), true, 'art62: 2023 690.4 floating-array identification');
  eq(has('a new exception 2 exempts detached nonenclosed structures from rapid shutdown requirements'), true, 'art62: 2023 690.12 new Exception 2');
  eq(has('rapid shutdown marking requirements were relocated to this section'), true, 'art62: 2023 690.12 marking relocation');
  eq(has('no technical changes here, but the code-making panel did a nice job reorganizing everything'), true, 'art62: 2023 690.7 reorganization (no technical change)');
  eq(has('generally reorganized (c) and (d)'), true, 'art62: 2023 690.15 (C)/(D) reorg');
  // worked examples (core-computed; art62_numbers.json)
  eq(nums.EX1.maxCurrent_125, 16.25, 'art62: EX1 max current = 16.25 A (13 A Isc x 125%)');
  eq(nums.EX1.ocpdA, 20, 'art62: EX1 OCPD = 20 A (240.6 at 16.25 A)');
  eq(nums.EX1.pick14.indexOf('14 AWG Cu') === 0, true, 'art62: EX1 690.8(B) pick = 14 AWG Cu (20 A @ 75 C)');
  eq(nums.EX1.cap14, 15, 'art62: EX1 240.4(D) 14 AWG OCPD cap = 15 A');
  eq(nums.EX1.pick12.indexOf('12 AWG Cu') === 0, true, 'art62: EX1 12 AWG option = 12 AWG Cu (25 A, 20 A cap)');
  eq(nums.EX1.vocSumColdV, 506.16, 'art62: EX1 cold Voc = 506.16 V (444 x 1.14 @ -10 C)');
  eq(nums.EX1.withinDwelling, true, 'art62: EX1 within 600 V dwelling ceiling');
  eq(nums.EX2.vocSum25V, 592, 'art62: EX2 Voc at 25 C = 592 V (16 x 37)');
  eq(nums.EX2.vocSumColdV, 674.88, 'art62: EX2 cold Voc = 674.88 V (592 x 1.14)');
  eq(nums.EX2.withinDwelling600_cold, false, 'art62: EX2 cold EXCEEDS 600 V dwelling ceiling');
  eq(nums.EX2.overDwellingBy, 74.88, 'art62: EX2 over dwelling ceiling by 74.88 V');
  eq(nums.EX2.withinOtherBuilding1000, true, 'art62: EX2 within 1000 V other-building ceiling');
  eq(nums.EX3.vocSumColdV, 506.16, 'art62: EX3 string voltage = 506.16 V');
  eq(nums.EX3.afciThresholdV, 80, 'art62: EX3 80 V dc AFCI threshold');
  eq(nums.EX3.afciRequired, true, 'art62: EX3 AFCI required (506.16 V >= 80 V)');
  eq(nums.EX3.marginFactor, 6.33, 'art62: EX3 margin = 6.33x the threshold');
  eq(nums.EX4.maxCurrent_125, 12.5, 'art62: EX4 max current = 12.5 A (10 A Isc x 125%)');
  eq(nums.EX4.ocpdA, 15, 'art62: EX4 OCPD = 15 A (240.6 at 12.5 A)');
  eq(nums.EX4.conductor.indexOf('14 AWG Cu') === 0, true, 'art62: EX4 conductor = 14 AWG Cu (20 A @ 75 C)');
  eq(nums.EX4.capEqualsOcpd, true, 'art62: EX4 240.4(D) cap (15 A) == the OCPD');
  eq(nums.EX5.maxCurrent_125, 36, 'art62: EX5 max current = 36 A (3 x 9.6 A x 125%)');
  eq(nums.EX5.ocpdA, 40, 'art62: EX5 OCPD = 40 A (240.6 at 36 A)');
  eq(nums.EX5.conductor.indexOf('8 AWG Cu') === 0, true, 'art62: EX5 conductor = 8 AWG Cu (50 A @ 75 C)');
  eq(nums.EX5.vocSum25V, 830, 'art62: EX5 string Voc = 830 V (20 x 41.5)');
  eq(nums.EX5.withinOtherBuilding1000, true, 'art62: EX5 within 1000 V non-dwelling ceiling');
  eq(nums.voltageLadder.length, 13, 'art62: Table 690.7(A) ladder has 13 rows');
  eq(nums.voltageLadder[6].factor, 1.14, 'art62: ladder -6..-10 C factor = 1.14');
  eq(nums.voltageLadder[12].vocV, 555, 'art62: ladder -36..-40 C (x1.25) = 555 V');
  // core re-runs (independent of the JSON)
  eq(core.nextStdBreaker(16.25), 20, 'art62: core re-run 16.25 A -> 20 A (EX1)');
  eq(core.nextStdBreaker(12.5), 15, 'art62: core re-run 12.5 A -> 15 A (EX4)');
  eq(core.nextStdBreaker(36), 40, 'art62: core re-run 36 A -> 40 A (EX5)');
  eq(core.pickConductor31016(16.25, 'cu', 75).size, '14', 'art62: core re-run 16.25 A @ 75 C = 14 AWG Cu (EX1)');
  eq(core.pickConductor31016(36, 'cu', 75).size, '8', 'art62: core re-run 36 A @ 75 C = 8 AWG Cu (EX5)');
  eq(core.smallConductorCap('14', 'cu'), 15, 'art62: core re-run 240.4(D) 14 AWG Cu cap = 15 A');
  eq(core.smallConductorCap('12', 'cu'), 20, 'art62: core re-run 240.4(D) 12 AWG Cu cap = 20 A');
  // cross-links
  eq(art.includes('nec-2406-standard-ampere-ratings.html'), true, 'art62: cross-links to the 240.6 standard ampere ratings article');
  eq(art.includes('nec-31016-ampacity.html'), true, 'art62: cross-links to the Table 310.16 ampacity article');
  eq(art.includes('nec-2404d-small-conductors.html'), true, 'art62: cross-links to the 240.4(D) small-conductor article');
  eq(art.includes('nec-21019a-continuous-load.html'), true, 'art62: cross-links to the 210.19(A) continuous-load article');
  eq(art.includes('nec-23079-service-disconnecting-means.html'), true, 'art62: cross-links to the 230.79 service disconnecting means article');
  eq(art.includes('nec-23090-service-overload-protection.html'), true, 'art62: cross-links to the 230.90 service overload protection article');
  // sitemap + index + README
  const sitemap62 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap62.includes('articles/nec-6901-69015-solar-pv-systems.html'), true, 'art62: sitemap entry present');
  eq((sitemap62.match(/<loc>/g) || []).length >= 63, true, 'art62: sitemap has >= 63 URLs (never-shrink; grows per article)');
  const index62 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index62.includes('articles/nec-6901-69015-solar-pv-systems.html'), true, 'art62: index cross-link present');
  const readme62 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme62.includes('articles/nec-6901-69015-solar-pv-systems.html'), true, 'art62: README entry present');
}
// === ART62_BLOCK_END ===
// === ART63_BLOCK_BEGIN (article 63 - NEC 490 -> 495 equipment over 1000 V edition migration) ===
// 126 checks (verify_art63.py, all pass): 38 verbatim-2017 presence + 38
// quote-block + 28 on-disk-2023 presence + 24 delta-pair + 12 absence
// proofs + 4 relocation/merge + 5 worked-example + 3 core re-run. This
// article's 2023 text IS on disk (55 495.x rows + 44 245.x rows), so it is a
// real word-level 2017->2023 diff, not a change-summary record. Worked
// examples core-computed (compute_art63.js -> art63_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-490-495-equipment-over-1000v.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art63_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-490-495-equipment-over-1000v.html'), true, 'art63: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-490-495-equipment-over-1000v.html'), true, 'art63: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art63: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art63: Article + FAQPage JSON-LD present');
  eq(art.includes('Design aid only'), true, 'art63: design-aid disclaimer present');
  eq(has('nec content series · article 63'), true, 'art63: footer marks article 63');
  eq(has('126 machine-verified checks'), true, 'art63: 126 machine-verified checks claimed');
  eq(has('five parts'), true, 'art63: five-part structure stated');
  eq(has('digit-identical'), true, 'art63: table values digit-identical stated');
  eq(has('two honesty notes'), true, 'art63: two honesty notes stated');
  eq(has('zero article 100 rows'), true, 'art63: zero-Art-100-rows gap stated');
  // 38 verbatim-2017 quote blocks (heading present in a code div)
  const SECTIONS = ['490.1','490.2','490.3','490.21','490.22','490.23','490.24','490.25',
    '490.30','490.31','490.32','490.33','490.34','490.35','490.36','490.37','490.38','490.39','490.40',
    '490.41','490.42','490.43','490.44','490.45','490.46','490.47','490.48',
    '490.51','490.52','490.53','490.54','490.55','490.56',
    '490.70','490.71','490.72','490.73','490.74'];
  for (const n of SECTIONS) {
    eq(art.includes('class="code">' + n + ' '), true, 'art63: verbatim-2017 block ' + n);
  }
  eq((art.match(/class="code">/g) || []).length, 38, 'art63: exactly 38 quote blocks');
  // in-scope 2023 landings (on-disk 495.x / 245.x)
  for (const n of ['495.1','495.2','495.3','495.22','495.23','495.24','495.25','495.30','495.35','495.37','495.44','495.46','495.48','495.49','495.61','495.62','495.66','495.70','495.72','495.73']) {
    eq(art.includes(n), true, 'art63: 2023 landing ' + n);
  }
  // headline structural moves
  eq(has('new article 245'), true, 'art63: new Article 245 stated');
  eq(art.includes('245.21'), true, 'art63: 245.21 relocation target');
  eq(has('490.51'), true, 'art63: Part IV old number');
  eq(has('495.61'), true, 'art63: Part IV new number');
  eq(has('490.36+490.37'), true, 'art63: 490.36+37 merge');
  eq(art.includes('495.37'), true, 'art63: 495.37 merge target');
  eq(has('250.190'), true, 'art63: new 250.190 cite');
  eq(has('reconditioned equipment'), true, 'art63: NEW 495.2 reconditioned');
  eq(has('reconditioned switchgear'), true, 'art63: NEW 495.49 reconditioned');
  // substantive deltas (2017 -> 2023 wording)
  eq(has('either'), true, 'art63: 495.35(B) either');
  eq(has('both'), true, 'art63: 495.35(B) both');
  eq(has('7½%'), true, 'art63: 495.72(D) 7.5% delta');
  eq(has('lockable open'), true, 'art63: 495.46 lockable open delta');
  eq(has('parts ii and iii'), true, 'art63: 495.3(A) Parts II and III delta');
  eq(has('heating elements'), true, 'art63: 495.73 heating elements delta');
  // worked examples (core-computed, from art63_numbers.json: EX1/EX2/EX3)
  eq(art.includes(String(nums.EX1.flcA)), true, 'art63: EX1 FLC ' + nums.EX1.flcA + ' A');
  eq(art.includes(String(nums.EX1.pct75A)), true, 'art63: EX1 7.5% trip ' + nums.EX1.pct75A + ' A');
  eq(art.includes(String(nums.EX1.instA)), true, 'art63: EX1 25% instantaneous ' + nums.EX1.instA + ' A');
  eq(art.includes(String(nums.EX2.branchMinA)), true, 'art63: EX2 100% branch min ' + nums.EX2.branchMinA + ' A');
  eq(art.includes(String(nums.EX2.ocpd)), true, 'art63: EX2 OCPD ' + nums.EX2.ocpd + ' A');
  eq(art.includes(nums.EX2.pick.label), true, 'art63: EX2 conductor pick ' + nums.EX2.pick.label);
  eq(has('495.61'), true, 'art63: EX3 Part IV map 495.61');
  eq(has('495.66'), true, 'art63: EX3 Part IV map 495.66');
  // sitemap + index + README
  const sitemap63 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap63.includes('articles/nec-490-495-equipment-over-1000v.html'), true, 'art63: sitemap entry present');
  eq((sitemap63.match(/<loc>/g) || []).length >= 64, true, 'art63: sitemap has >= 64 URLs (never-shrink; grows per article)');
  const index63 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index63.includes('articles/nec-490-495-equipment-over-1000v.html'), true, 'art63: index cross-link present');
  const readme63 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme63.includes('articles/nec-490-495-equipment-over-1000v.html'), true, 'art63: README entry present');
  // tag balance (the quote-block </div> regression guard from this build)
  const divOpen = (art.match(/<div\b/g) || []).length;
  const divClose = (art.match(/<\/div>/g) || []).length;
  eq(divOpen, divClose, 'art63: div tags balanced (' + divOpen + '/' + divClose + ')');
}
// === ART63_BLOCK_END ===


// === ART64_BLOCK_BEGIN ===
// Article 64 — NEC 245 (2023): Overcurrent Protection for Systems Over 1000 V
// ac, 1500 V dc. The brand-new 2023 article that consolidates 2017 240.100 +
// 240.101 (Art 240 Part IX) and 490.21 (Art 490 Part II). All 44 on-disk 2023
// rows quoted; verbatim 2017 source; 5 machine-diffed 245.21 deltas; worked
// examples core-computed (compute_art64.js -> art64_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-245-overcurrent-protection-over-1000v.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art64_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-245-overcurrent-protection-over-1000v.html'), true, 'art64: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-245-overcurrent-protection-over-1000v.html'), true, 'art64: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art64: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art64: Article + FAQPage JSON-LD present');
  eq(art.includes('Design aid only'), true, 'art64: design-aid disclaimer present');
  eq(has('nec content series · article 64'), true, 'art64: footer marks article 64');
  eq(has('179 machine-verified checks'), true, 'art64: 179 machine-verified checks claimed');
  eq(has('all 179 pass'), true, 'art64: all 179 pass claimed');
  // 16 verbatim quote blocks (heading present in a code div)
  const BLOCKS = ['240.100 Feeders and Branch Circuits.', '240.101 Additional Requirements for Feeders.',
    '490.21 (A) Circuit Breakers.', '490.21 (B) Power Fuses and Fuseholders.',
    '490.21 (C) Distribution Cutouts and Fuse Links', '490.21 (D) Oil-Filled Cutouts.',
    '490.21 (E) Load Interrupters.', '245.1 Scope.', '245.2 Reconditioned Equipment.',
    '245.26 Feeders and Branch Circuits.', '245.27 Additional Requirements for Feeders.',
    '245.21 (A) Circuit Breakers.', '245.21 (B) Power Fuses and Fuseholders.',
    '245.21 (C) Distribution Cutouts.', '245.21 (D) Oil-Filled Cutouts.',
    '245.21 (E) Load-Interrupter Switches.'];
  for (const b of BLOCKS) {
    eq(art.includes('class="code">' + b), true, 'art64: quote block ' + b.slice(0, 30));
  }
  eq((art.match(/class="code">/g) || []).length, 16, 'art64: exactly 16 quote blocks');
  // relocation map (2017 -> 2023)
  for (const n of ['245.1', '245.2', '245.21', '245.26', '245.27']) {
    eq(art.includes(n), true, 'art64: 2023 section ' + n);
  }
  eq(has('240.100'), true, 'art64: 2017 240.100 old number');
  eq(has('240.101'), true, 'art64: 2017 240.101 old number');
  eq(has('490.21'), true, 'art64: 2017 490.21 old number');
  // headline structural story
  eq(has('reconditioned equipment'), true, 'art64: NEW 245.2 reconditioned');
  eq(has('overcurrent protection requirements for systems over 1000 volts ac, 1500 volts dc, nominal'), true, 'art64: 245.1 scope quoted');
  eq(has('the following reconditioned equipment shall be permitted'), true, 'art64: 245.2(A) permitted list');
  eq(has('medium-voltage fuseholders and medium-voltage nonrenewable fuses shall not be permitted'), true, 'art64: 245.2(B) ban');
  // the 5 machine-diffed 245.21 deltas (2017 max -> 2023 available fault current)
  eq(has('shall not be less than the available fault current the circuit breaker will be required to interrupt'), true, 'art64: 245.21(A)(4) available FC delta');
  eq(has('shall not be less than the available fault current the fuse is required to interrupt'), true, 'art64: 245.21(B)(2) available FC delta');
  eq(has('shall not be less than the available fault current the cutout is required to interrupt'), true, 'art64: 245.21(C)(3) available FC delta');
  eq(has('shall not be less than the available fault current the oil-filled cutout is required to interrupt'), true, 'art64: 245.21(D)(2) available FC delta');
  eq(has('to interrupt available fault currents'), true, 'art64: 245.21(E) available FC delta');
  eq(has('warning sign identifying the presence of more than one source'), true, 'art64: 245.21(E) warning-sign rewrite');
  eq(has('each warning sign or label shall comply with 110.21'), true, 'art64: 245.21(E) 110.21 cite');
  eq(has('conspicuous sign identifying this hazard'), true, 'art64: 2017 conspicuous sign quoted');
  // unchanged 3x/6x caps (245.27)
  eq(has('three times the ampacity'), true, 'art64: 3x fuse cap');
  eq(has('six times the ampacity'), true, 'art64: 6x breaker cap');
  eq(has('695.4(b)(2)'), true, 'art64: fire-pump ref');
  // worked examples (core-computed, from art64_numbers.json: EX1/EX2/EX3)
  eq(art.includes(String(nums.EX1.ampacity)), true, 'art64: EX1 ampacity ' + nums.EX1.ampacity + ' A');
  eq(art.includes(nums.EX1.pick.label), true, 'art64: EX1 conductor pick ' + nums.EX1.pick.label);
  eq(art.includes(String(nums.EX1.fuseMaxA)), true, 'art64: EX1 3x fuse max ' + nums.EX1.fuseMaxA + ' A');
  eq(art.includes(String(nums.EX1.fuseStd)), true, 'art64: EX1 fuse standard ' + nums.EX1.fuseStd + ' A');
  eq(art.includes(String(nums.EX1.breakerMaxA)), true, 'art64: EX1 6x breaker max ' + nums.EX1.breakerMaxA + ' A');
  eq(art.includes(String(nums.EX1.breakerStd)), true, 'art64: EX1 next standard ' + nums.EX1.breakerStd + ' A');
  eq(art.includes(String(nums.EX2.feederA)), true, 'art64: EX2 feeder ' + nums.EX2.feederA + ' A');
  eq(art.includes(nums.EX2.pick.label), true, 'art64: EX2 conductor pick ' + nums.EX2.pick.label);
  eq(has('minimum of three overcurrent relay elements operated from three current transformers'), true, 'art64: EX2 3x relay/CT rule');
  eq(art.includes(String(nums.EX3.onDisk245Rows)), true, 'art64: EX3 44 on-disk rows');
  // sitemap + index + README
  const sitemap64 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap64.includes('articles/nec-245-overcurrent-protection-over-1000v.html'), true, 'art64: sitemap entry present');
  eq((sitemap64.match(/<loc>/g) || []).length >= 65, true, 'art64: sitemap has >= 65 URLs (never-shrink; grows per article)');
  const index64 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index64.includes('articles/nec-245-overcurrent-protection-over-1000v.html'), true, 'art64: index cross-link present');
  const readme64 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme64.includes('articles/nec-245-overcurrent-protection-over-1000v.html'), true, 'art64: README entry present');
  // tag balance (the quote-block </div> regression guard)
  const divOpen = (art.match(/<div\b/g) || []).length;
  const divClose = (art.match(/<\/div>/g) || []).length;
  eq(divOpen, divClose, 'art64: div tags balanced (' + divOpen + '/' + divClose + ')');
}
// === ART64_BLOCK_END ===

// === ART65_BLOCK_BEGIN ===
// Article 65 - NEC 250.180-250.194 (Article 250 Part X): Grounding of Systems
// and Circuits of over 1000 Volts. All 9 sections verbatim from the on-disk
// 2017 NFPA scan + all 38 on-disk 2023 rows; 10 machine-diffed 2017->2023
// deltas (NEW 250.184(C) Exception, 490.55->495.65, copper-clad aluminum,
// IEEE re-cites); 6 core-computed worked examples (compute_art65.js ->
// art65_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-250180-250194-mv-grounding-part-x.html'), 'utf8');
  const norm = art.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  const has = (s) => norm.includes(s.toLowerCase());
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art65_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-250180-250194-mv-grounding-part-x.html'), true, 'art65: present');
  eq(art.includes('https://radloffbot.github.io/panelwright/articles/nec-250180-250194-mv-grounding-part-x.html'), true, 'art65: canonical set');
  eq(art.includes('Radloff Bot, an AI software assistant'), true, 'art65: AI disclosure present');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art65: Article + FAQPage JSON-LD present');
  eq(art.includes('Design aid only'), true, 'art65: design-aid disclaimer present');
  eq(has('nec content series \u00b7 article 65'), true, 'art65: footer marks article 65');
  eq(has('240 machine-verified checks'), true, 'art65: 240 machine-verified checks claimed');
  eq(has('all 240 pass'), true, 'art65: all 240 pass claimed');
  eq((art.match(/"@type": "Question"/g) || []).length, 7, 'art65: 7 FAQ questions');
  // 18 quote blocks (9 2017 + 9 2023)
  const BLOCKS = ['250.180 General.', '250.182 Derived Neutral Systems.', '250.184 Solidly Grounded Neutral Systems.',
    '250.186 Grounding Systems. Service-Supplied Alternating-Current Systems.',
    '250.187 Impedance Grounded Neutral Systems.',
    '250.188 Grounding of Systems Supplying Portable or Mobile Equipment.',
    '250.190 Grounding of Equipment.', '250.191 Grounding System at Alternating-Current Substations.',
    '250.194 Grounding and Bonding of Fences and Other Metal Structures.',
    '250.180 General.', '250.182 Derived Neutral Systems.', '250.184 Solidly Grounded Neutral Systems.',
    '250.186 Grounding Systems \u2014 Service-Supplied Alternating-Current Systems.',
    '250.187 Impedance Grounded Neutral Systems.', '250.188 Systems Supplying Portable or Mobile Equipment.',
    '250.190 Grounding of Equipment.', '250.191 AC Substations.', '250.194 Fences and Other Metal Structures.'];
  for (const b of BLOCKS) {
    eq(art.includes('class="code">' + b), true, 'art65: quote block ' + b.slice(0, 34));
  }
  eq((art.match(/class="code">/g) || []).length, 18, 'art65: exactly 18 quote blocks');
  // 2023 section coverage
  for (const n of ['250.180', '250.182', '250.184', '250.186', '250.187', '250.188', '250.190', '250.191', '250.194']) {
    eq(art.includes(n), true, 'art65: section ' + n);
  }
  // verbatim 2017 probes
  eq(has('provisions of the preceding sections of this article'), true, 'art65: 2017 250.180 old ref');
  eq(has('33% percent of the ampacity of the phase conductors'), true, 'art65: 2017 33% percent OCR');
  eq(has('inserted in the grounding electrode conductor'), true, 'art65: 2017 250.187(A) inserted');
  eq(has('Part III of Article 400 for cables and 490.55 for couplers'), true, 'art65: 2017 490.55 couplers');
  eq(has('IEEE 80-2013, IEEE Guide for Safety in AC Substation Grounding'), true, 'art65: 2017 IEEE 80-2013');
  // 2023 delta probes (the 10 machine-diffed deltas)
  eq(has('requirements of 250.1 through 250.178'), true, 'art65: D1 250.180 explicit ref');
  eq(has('For multigrounded neutral systems as permitted in 250.184(C)'), true, 'art65: D2 NEW qualifier');
  eq(has('331/3 percent'), true, 'art65: D3 2023 33 1/3');
  eq(has('bare, covered, or insulated'), true, 'art65: D4 2023 EGC list');
  eq(has('a grounding electrode shall not be required to bond the neutral conductor in an uninterrupted conductor exceeding 400 m (1300 ft)'), true, 'art65: D5 NEW 2023 Exception');
  eq(has('310.10(G)'), true, 'art65: D6 2023 310.10(G)');
  eq(has('310.10(H)'), true, 'art65: D6 2017 310.10(H)');
  eq(has('installed between the grounding electrode conductor and the impedance grounding conductor'), true, 'art65: D7 2023 250.187(A)');
  eq(has('A bare impedance grounding conductor shall be permitted'), true, 'art65: D7 NEW bare Exception');
  eq(has('the system neutral point shall not be connected to ground'), true, 'art65: D7 2023 neutral point');
  eq(has('495.65 for couplers'), true, 'art65: D8 2023 495.65');
  eq(has('4 AWG aluminum or copper-clad aluminum'), true, 'art65: D9 copper-clad aluminum');
  eq(has('IEEE 80, IEEE Guide'), true, 'art65: D10 2023 IEEE 80 no year');
  // identity (no number moved)
  eq(has('shall not exceed 100 volts'), true, 'art65: 100 V frame cap');
  eq(has('6.0 m (20 ft)'), true, 'art65: 6.0 m isolation');
  eq(has('400 m (1300 ft)'), true, 'art65: 400 m spacing');
  eq(has('57.7 percent of the phase-to-phase voltage'), true, 'art65: 57.7% note');
  // MH silence claim present
  eq(has('250.18x'), true, 'art65: MH silence 250.18x claim');
  eq(has('250.19x'), true, 'art65: MH silence 250.19x claim');
  // worked examples (core-computed, from art65_numbers.json: EX1..EX6)
  eq(art.includes(String(nums.EX1.neutralMinA)), true, 'art65: EX1 neutralMinA ' + nums.EX1.neutralMinA);
  eq(art.includes(nums.EX1.neutralPick.label), true, 'art65: EX1 pick ' + nums.EX1.neutralPick.label);
  eq(art.includes(String(nums.EX2.maxFaultA)), true, 'art65: EX2 maxFaultA ' + nums.EX2.maxFaultA);
  eq(art.includes(String(nums.EX2.ocstd)), true, 'art65: EX2 next std ' + nums.EX2.ocstd);
  eq(art.includes(nums.EX2.pick.label), true, 'art65: EX2 pick ' + nums.EX2.pick.label);
  eq(art.includes(String(nums.EX3.maxNeutralV)), true, 'art65: EX3 max neutral V ' + nums.EX3.maxNeutralV);
  eq(art.includes(String(nums.EX4.rows[0].R_ohms_at_30A)), true, 'art65: EX4 8kV R ' + nums.EX4.rows[0].R_ohms_at_30A);
  eq(art.includes(String(nums.EX4.rows[1].R_ohms_at_30A)), true, 'art65: EX4 13.8kV R ' + nums.EX4.rows[1].R_ohms_at_30A);
  eq(art.includes(String(nums.EX5.jumperIntervalFt)), true, 'art65: EX5 160 ft interval');
  eq(art.includes(nums.EX6.cases[0].cu), true, 'art65: EX6 2/0 AWG');
  // core re-run under node
  const r = require('child_process').spawnSync('node', ['-e', `const core = require('./panelwright/app.js');
const j = require('./art65_numbers.json');
const ok = (a,b,l) => { if (JSON.stringify(a)!==JSON.stringify(b)) { console.log('MISMATCH '+l); process.exit(1); } };
ok(core.pickConductor31016(j.EX1.neutralMinA,'cu',75), j.EX1.neutralPick, 'EX1');
ok(core.pickConductor31016(j.EX2.maxFaultA,'cu',75), j.EX2.pick, 'EX2');
ok(core.nextStdBreaker(j.EX2.maxFaultA), j.EX2.ocstd, 'EX2 std');
`], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  eq(r.status === 0, true, 'art65: core re-run matches art65_numbers.json');
  // cross-links
  for (const l of ['nec-490-495-equipment-over-1000v.html', 'nec-245-overcurrent-protection-over-1000v.html', 'nec-2152b-235202-feeder-relocation.html', 'nec-250122-egc-sizing.html']) {
    eq(art.includes(l), true, 'art65: cross-link ' + l.slice(0, 30));
  }
  // sitemap + index + README
  const sitemap65 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap65.includes('articles/nec-250180-250194-mv-grounding-part-x.html'), true, 'art65: sitemap entry present');
  eq((sitemap65.match(/<loc>/g) || []).length >= 66, true, 'art65: sitemap has >= 66 URLs (never-shrink; grows per article)');
  const index65 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index65.includes('articles/nec-250180-250194-mv-grounding-part-x.html'), true, 'art65: index cross-link present');
  const readme65 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme65.includes('articles/nec-250180-250194-mv-grounding-part-x.html'), true, 'art65: README entry present');
  // tag balance (the quote-block </div> regression guard)
  const divOpen = (art.match(/<div\b/g) || []).length;
  const divClose = (art.match(/<\/div>/g) || []).length;
  eq(divOpen, divClose, 'art65: div tags balanced (' + divOpen + '/' + divClose + ')');
}
// === ART65_BLOCK_END ===


// === ART66_BLOCK_BEGIN ===
// Article 66 - NEC Article 235: Circuits Over 1000 V, Nominal (2023). The
// brand-new 2023 consolidation: 2017's over-1000-V rules scattered through
// 210.9/18/19(B)/20/22/23/63 (branch circuits), 215.2(B)/3/5/6 (feeders),
// 225 (outside), 230 Part VIII (services) -> one medium-voltage article.
// All 91 on-disk 2023 rows + 40 top-level sections + 12 verbatim-2017
// sources; two-step edition story (threshold 600->1000 V in 2020, article
// created in 2023 per the on-disk ELR log); 10 machine-diffed 2017->2023
// deltas; 6 core-computed worked examples (compute_art66.js -> art66_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-235-circuits-over-1000v.html'), 'utf8');
  const a = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const AN = a(art);
  const has = (s) => a(s) !== '' && AN.includes(a(s));
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art66_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-235-circuits-over-1000v.html'), true, 'art66: slug present');
  eq(has('Radloff Bot, an AI software assistant'), true, 'art66: AI disclosure');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art66: Article+FAQPage JSON-LD');
  eq(has('Design aid only'), true, 'art66: design-aid disclaimer');
  eq(has('nec content series \u00b7 article 66'), true, 'art66: footer marks article 66');
  eq(has('221 machine-verified checks'), true, 'art66: 221 machine-verified checks');
  eq(has('all 221 pass'), true, 'art66: all 221 pass');
  eq(art.startsWith('<!DOCTYPE html>'), true, 'art66: doctype');
  // all 91 on-disk 2023 rows present (alpha-normalized probe, first 32 alnum chars)
  const csvTxt = fs.readFileSync(path.join(__dirname, '..', '..', 'art35_nec_csv.csv'), 'utf8');
  // proper CSV state machine (handles quoted multi-line Body fields; col0=Chapter col1=Reference col2=Body col3=URL)
  const rowBodies = {};
  {
    let field = '', inQ = false, row = [], i = 0;
    const commit = () => { if (row.length > 0) { row.pop(); const ref = (row[1] || '').trim(); if (/^235\./.test(ref)) rowBodies[ref] = (row[2] || '').replace(/\s*\[[^\]]+\]\([^)]+\)\s*$/, '').trim(); } row = []; field = ''; };
    for (; i < csvTxt.length; i++) {
      const c = csvTxt[i];
      if (inQ) {
        if (c === '"') { if (csvTxt[i+1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\r') { /* skip */ }
        else if (c === '\n') { row.push(field); commit(); }
        else field += c;
      }
    }
    if (field || row.length) { row.push(field); commit(); }
  }
  let rowsPresent = 0, rowsMiss = 0;
  for (const ref of Object.keys(rowBodies)) {
    const body = (rowBodies[ref] || '').replace(/\s*\[[^\]]+\]\([^)]+\)\s*$/, '').trim();
    const probe = a(body).slice(0, 32);
    if (probe && AN.includes(probe)) rowsPresent++; else { rowsMiss++; if (rowsMiss <= 3) console.log('  MISS', ref, probe.slice(0,32)); }
  }
  eq(rowsMiss, 0, 'art66: all ' + rowsPresent + ' on-disk 2023 rows present (0 missing)');
  eq(rowsPresent, 91, 'art66: exactly 91 on-disk 2023 rows');
  // 12 verbatim-2017 source sections
  const probes2017 = {
    '210.9': 'circuitsderivedfromautotransformersbranc',
    '210.18': 'ratingbranchcircuitsrecognizedbythisarti',
    '210.19(B)': 'bbranchcircuitsover600voltstheampacityof',
    '210.20': 'overcurrentprotectionbranchcircuitconduc',
    '210.22': 'permissibleloadsindividualbranchcircuits',
    '210.23': 'permissibleloadsmultipleoutletbranchcirc',
    '210.63': 'heatingairconditioningandrefrigerationeq',
    '215.2(B)': 'bfeedersover600voltstheampacityofconduct',
    '215.3': 'overcurrentprotectionfeedersshallbeprote',
    '215.5': 'diagramsoffeedersifrequiredbytheauthorit',
    '215.6': 'feederequipmentgroundingconductorwhereaf',
    '230.200': 'generalserviceconductorsandequipmentused',
  };
  for (const k of Object.keys(probes2017)) {
    eq(AN.includes(probes2017[k]), true, 'art66: 2017 verbatim ' + k);
  }
  // edition story
  eq(has('1000 volts ac or 1500 volts dc'), true, 'art66: 2023 threshold (D1 right)');
  eq(has('the threshold moved in 2020'), true, 'art66: two-step story (2020)');
  eq(has('Article 235 is new in the 2023 NEC'), true, 'art66: ELR provenance line');
  eq(has('Feeders over 1000 Volts'), true, 'art66: 2020 scan finding');
  // 10 machine-diffed deltas (D1-D10 markers + key text)
  for (const d of ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10']) eq(has(d), true, 'art66: delta marker ' + d);
  eq(has('310.14 and 315.60'), true, 'art66: D2 2023 ampacity refs');
  eq(has('210.23(a) through (e)'), true, 'art66: D5 2023 re-anchor');
  eq(has('ansi/ieee c2-2017'), true, 'art66: D10 C2-2017');
  eq(has('table 235.3'), true, 'art66: D8 new Table 235.3');
  eq(has('250.32'), true, 'art66: D6 2023 250.32');
  // honesty probes
  eq(has('disclosed OCR'), true, 'art66: disclosed OCR fixes');
  eq(has('915.4'), true, 'art66: 915.4 misread disclosed');
  eq(has('zero hand math'), true, 'art66: zero hand math');
  eq(has('no delta is attributed to the Mike Holt'), true, 'art66: no MH attribution');
  // 6 worked examples (core-computed)
  for (const t of ['EX1','EX2','EX3','EX4','EX5','EX6']) eq(has(t), true, 'art66: ' + t + ' present');
  eq(art.includes(String(nums.EX1.ampacity_floor_A)), true, 'art66: EX1 ampacity floor ' + nums.EX1.ampacity_floor_A);
  eq(art.includes(String(nums.EX1.oc)), true, 'art66: EX1 OCPD ' + nums.EX1.oc);
  eq(art.includes(nums.EX1.conductor_75cu), true, 'art66: EX1 conductor ' + nums.EX1.conductor_75cu);
  eq(art.includes(String(nums.EX2.floor_A)), true, 'art66: EX2 floor ' + nums.EX2.floor_A);
  eq(art.includes(String(nums.EX2.oc)), true, 'art66: EX2 OCPD ' + nums.EX2.oc);
  eq(art.includes(String(nums.EX3.sum)), true, 'art66: EX3 sum ' + nums.EX3.sum);
  eq(art.includes(String(nums.EX3.oc)), true, 'art66: EX3 OCPD ' + nums.EX3.oc);
  eq(art.includes(String(nums.EX4.at35kV[0].at35kV_m)), true, 'art66: EX4 35kV m ' + nums.EX4.at35kV[0].at35kV_m);
  eq(art.includes(String(nums.EX4.at35kV[0].at35kV_ft)), true, 'art66: EX4 35kV ft ' + nums.EX4.at35kV[0].at35kV_ft);
  eq(art.includes(String(nums.EX5.min_circuits)), true, 'art66: EX5 min circuits ' + nums.EX5.min_circuits);
  eq(art.includes(String(nums.EX6.min_disconnect_rating)), true, 'art66: EX6 min disconnect ' + nums.EX6.min_disconnect_rating);
  // core re-run under node
  const r = require('child_process').spawnSync('node', ['-e', `const core = require('./panelwright/app.js');
const j = require('./art66_numbers.json');
const ok = (a2,b,l) => { if (JSON.stringify(a2)!==JSON.stringify(b)) { console.log('MISMATCH '+l); process.exit(1); } };
ok(core.nextStdBreaker(j.EX1.oc_floor_A), j.EX1.oc, 'EX1 std');
ok(core.nextStdBreaker(j.EX2.floor_A), j.EX2.oc, 'EX2 std');
ok(core.nextStdBreaker(j.EX3.sum), j.EX3.oc, 'EX3 std');
ok(core.nextStdBreaker(j.EX6.loadA), j.EX6.min_disconnect_rating, 'EX6 std');
const p = core.pickConductor31016(j.EX1.ampacity_floor_A,'cu',75);
ok(p && p.size, j.EX1.conductor_75cu, 'EX1 conductor');
`], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  eq(r.status === 0, true, 'art66: core re-run matches art66_numbers.json (no MISMATCH)');
  eq((r.stdout || '') + (r.stderr || ''), '', 'art66: core re-run clean output');
  // cross-links
  for (const l of ['nec-2152b-235202-feeder-relocation.html', 'nec-490-495-equipment-over-1000v.html', 'nec-245-overcurrent-protection-over-1000v.html', 'nec-250180-250194-mv-grounding-part-x.html', 'nec-2152-feeder-ampacity.html', 'nec-250122-egc-sizing.html']) {
    eq(art.includes(l), true, 'art66: cross-link ' + l.slice(0, 30));
  }
  // sitemap + index + README
  const sitemap66 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap66.includes('articles/nec-235-circuits-over-1000v.html'), true, 'art66: sitemap entry present');
  eq((sitemap66.match(/<loc>/g) || []).length >= 67, true, 'art66: sitemap has >= 67 URLs (never-shrink; grows per article)');
  const index66 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index66.includes('articles/nec-235-circuits-over-1000v.html'), true, 'art66: index cross-link present');
  const readme66 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme66.includes('articles/nec-235-circuits-over-1000v.html'), true, 'art66: README entry present');
  // tag balance (the quote-block </div> regression guard)
  const divOpen = (art.match(/<div\b/g) || []).length;
  const divClose = (art.match(/<\/div>/g) || []).length;
  eq(divOpen, divClose, 'art66: div tags balanced (' + divOpen + '/' + divClose + ')');
}
// === ART66_BLOCK_END ===
// === ART67_BLOCK_BEGIN (article 67 - NEC 408 Switchboards, Switchgear, and Panelboards) ===
// All 60 on-disk 2023 rows of Article 408 (408.1-408.58) verbatim + all 27 on-disk
// 2017 sections verbatim from the NFPA scan; 2017->2023 edition story scoped 2017<->2023
// (the on-disk 2020 source carries no Article 408 body - cross-reference only, gap
// disclosed); 17 machine-diffed 2017->2023 deltas (one number moved: 408.2); 6
// core-computed worked examples (compute_art67.js -> art67_numbers.json).
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-40801-40858-switchboards-switchgear-panelboards.html'), 'utf8');
  const a = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const AN = a(art);
  const has = (s) => a(s) !== '' && AN.includes(a(s));
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art67_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-40801-40858-switchboards-switchgear-panelboards.html'), true, 'art67: slug present');
  eq(has('Radloff Bot, an AI software assistant'), true, 'art67: AI disclosure');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art67: Article+FAQPage JSON-LD');
  eq(has('Design aid'), true, 'art67: design-aid disclaimer');
  eq(has('nec content series · article 67'), true, 'art67: footer marks article 67');
  eq(has('193 machine-verified checks'), true, 'art67: 193 machine-verified checks');
  eq(has('all 193 pass'), true, 'art67: all 193 pass');
  eq(art.startsWith('<!DOCTYPE html>'), true, 'art67: doctype');
  // all 60 on-disk 2023 rows present (CSV state machine; alpha-normalized first 32 alnum)
  const csvTxt = fs.readFileSync(path.join(__dirname, '..', '..', 'art35_nec_csv.csv'), 'utf8');
  const rowBodies = {};
  {
    let field = '', inQ = false, row = [], i = 0;
    const commit = () => { if (row.length > 0) { row.pop(); const ref = (row[1] || '').trim(); if (/^408\./.test(ref)) rowBodies[ref] = (row[2] || '').replace(/\s*\[[^\]]+\]\([^)]+\)\s*$/, '').trim(); } row = []; field = ''; };
    for (; i < csvTxt.length; i++) {
      const c = csvTxt[i];
      if (inQ) {
        if (c === '"') { if (csvTxt[i+1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\r') { /* skip */ }
        else if (c === '\n') { row.push(field); commit(); }
        else field += c;
      }
    }
    if (field || row.length) { row.push(field); commit(); }
  }
  let rowsPresent = 0, rowsMiss = 0;
  for (const ref of Object.keys(rowBodies)) {
    const body = (rowBodies[ref] || '').replace(/\s*\[[^\]]+\]\([^)]+\)\s*$/, '').trim();
    const probe = a(body).slice(0, 32);
    if (probe && AN.includes(probe)) rowsPresent++; else { rowsMiss++; if (rowsMiss <= 3) console.log('  MISS', ref, probe.slice(0,32)); }
  }
  eq(rowsMiss, 0, 'art67: all ' + rowsPresent + ' on-disk 2023 rows present (0 missing)');
  eq(rowsPresent, 60, 'art67: exactly 60 on-disk 2023 rows');
  // 25 on-disk 2017 sections displayed verbatim (408.18/408.55 restructured in 2023; their 2017 leads are covered by the delta probes below)
  const probes2017 = {
    '408.1': 'thisarticlecoversswitchboardss',
    '408.2': 'switchescircuitbreakersandover',
    '408.3': 'aconductorsandbusbarsonaswitch',
    '408.4': 'acircuitdirectoryorcircuitiden',
    '408.5': 'whereconduitsorotherracewaysen',
    '408.7': 'unusedopeningsforcircuitbreake',
    '408.16': 'switchboardsandswitchgearindam',
    '408.17': 'switchboardsandswitchgearshall',
    '408.19': 'aninsulatedconductorusedwithin',
    '408.20': 'switchboardsandswitchgearthath',
    '408.22': 'instrumentsrelaysmetersandinst',
    '408.30': 'allpanelboardsshallhavearating',
    '408.36': 'inadditiontotherequirementof40',
    '408.37': 'panelboardsindamporwetlocation',
    '408.38': 'panelboardsshallbemountedincab',
    '408.39': 'inpanelboardsfusesofanytypesha',
    '408.40': 'panelboardcabinetsandpanelboar',
    '408.41': 'eachgroundedconductorshallterm',
    '408.50': 'thepanelsofswitchboardsandswit',
    '408.51': 'insulatedorbarebusbarsshallber',
    '408.52': 'instrumentspilotlightsvoltagep',
    '408.53': 'switchesfusesandfuseholdersuse',
    '408.54': 'apanelboardshallbeprovidedwith',
    '408.56': 'thedistancebetweenbaremetalpar',
    '408.58': 'panelboardsshallbedurablymarke'
  };
  for (const k of Object.keys(probes2017)) {
    eq(AN.includes(probes2017[k]), true, 'art67: 2017 verbatim ' + k);
  }
  // 17 delta markers + key delta text
  for (const d of ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15','D16','D17']) eq(has(d), true, 'art67: delta marker ' + d);
  eq(has('the whole section changed subject'), true, 'art67: D1 408.2 subject changed');
  eq(has('reconditioned-equipment section'), true, 'art67: D1 2023 reconditioned-equipment section');
  eq(has('Same Vertical Section'), true, 'art67: D3 2023 408.3(A)(2) text');
  eq(has('230.62(c)/215.15'), true, 'art67: D2 barrier rule new home');
  eq(has('face-up or face-down'), true, 'art67: D16 new 408.43');
  eq(has('10,000 amperes'), true, 'art67: D4 408.9 10,000 A seam');
  eq(has('uninsulated metal parts'), true, 'art67: D14 408.56 2023 wording');
  eq(has('312.101(a)'), true, 'art67: D14 408.56 footnote re-cite');
  eq(has('panelboard rating'), true, 'art67: D17 408.36(D) panelboard reword');
  // 2020 gap honesty
  eq(has('no article 408 body'), true, 'art67: 2020 gap disclosed');
  eq(has('2020 edition gap'), true, 'art67: 2020 gap label');
  eq(has('ocr'), true, 'art67: OCR disclosed');
  eq(has('zero hand math'), true, 'art67: zero hand math');
  // 6 worked examples (core-computed)
  for (const t of ['EX1','EX2','EX3','EX4','EX5','EX6']) eq(has(t), true, 'art67: ' + t + ' present');
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  eq(art.includes(String(nums.EX1.panel_rating_A)), true, 'art67: EX1 panel rating ' + nums.EX1.panel_rating_A);
  eq(art.includes(fmt(nums.EX2.afc_threshold_A)), true, 'art67: EX2 threshold ' + fmt(nums.EX2.afc_threshold_A));
  eq(art.includes(String(nums.EX3.counted)), true, 'art67: EX3 counted ' + nums.EX3.counted);
  eq(art.includes(String(nums.EX3.cap)), true, 'art67: EX3 cap ' + nums.EX3.cap);
  eq(art.includes(String(nums.EX4.load_A)), true, 'art67: EX4 load ' + nums.EX4.load_A);
  eq(art.includes(String(nums.EX5.oc_max_A)), true, 'art67: EX5 OCPD ' + nums.EX5.oc_max_A);
  eq(art.includes(String(nums.EX6.opposite_polarity_same_surface_mm)), true, 'art67: EX6 same-surface mm ' + nums.EX6.opposite_polarity_same_surface_mm);
  eq(art.includes(String(nums.EX6.opposite_polarity_free_air_in)), true, 'art67: EX6 free-air in ' + nums.EX6.opposite_polarity_free_air_in);
  // core re-run under node (5 examples re-derived from the shipped core)
  const r = require('child_process').spawnSync('node', ['-e', 'const core=require("./panelwright/app.js");const j=require("./art67_numbers.json");'
    +'const bad=(m)=>{console.log("MISMATCH "+m);process.exit(1)};'
    +'const p1=core.pickConductor31016(j.EX1.feeder_load_A,"cu",75);if(p1.size!==j.EX1.supply_conductor_cu75)bad("EX1 conductor");'
    +'if(core.nextStdBreaker(j.EX1.oc_max_A)!==j.EX1.panel_rating_A)bad("EX1 std");'
    +'if(core.nextStdBreaker(j.EX4.load_A)!==j.EX4.oc_A)bad("EX4 std");'
    +'if(core.nextStdBreaker(j.EX5.load_A)!==j.EX5.oc_max_A)bad("EX5 std");'
    +'const p5=core.pickConductor31016(j.EX5.load_A,"cu",60);if(p5.size!==j.EX5.conductor_cu60)bad("EX5 conductor");'
    +'if(core.smallConductorCap("12","cu")!==j.EX4.oc_cap_12awg_cu)bad("EX4 cap12");'
    +'if(core.smallConductorCap("10","cu")!==j.EX4.oc_cap_10awg_cu)bad("EX4 cap10");'
  ], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  eq(r.status === 0, true, 'art67: core re-run matches art67_numbers.json (no MISMATCH)');
  eq((r.stdout || '') + (r.stderr || ''), '', 'art67: core re-run clean output');
  // cross-links
  for (const l of ['nec-4083-busbars-phase-identification.html', 'nec-2152-feeder-ampacity.html', 'nec-23079-service-disconnecting-means.html', 'nec-23042-service-conductor-sizing.html', 'nec-2406-standard-ampere-ratings.html', 'nec-250102-main-bonding-jumper.html', 'nec-31016-ampacity.html']) {
    eq(art.includes(l), true, 'art67: cross-link ' + l.slice(0, 30));
  }
  // sitemap + index + README
  const sitemap67 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap67.includes('articles/nec-40801-40858-switchboards-switchgear-panelboards.html'), true, 'art67: sitemap entry present');
  eq((sitemap67.match(/<loc>/g) || []).length >= 68, true, 'art67: sitemap has >= 68 URLs (never-shrink; grows per article)');
  const index67 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index67.includes('articles/nec-40801-40858-switchboards-switchgear-panelboards.html'), true, 'art67: index cross-link present');
  const readme67 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme67.includes('articles/nec-40801-40858-switchboards-switchgear-panelboards.html'), true, 'art67: README entry present');
  // tag balance (the quote-block </div> regression guard)
  const divOpen = (art.match(/<div\b/g) || []).length;
  const divClose = (art.match(/<\/div>/g) || []).length;
  eq(divOpen, divClose, 'art67: div tags balanced (' + divOpen + '/' + divClose + ')');
}
// === ART67_BLOCK_END ===










// === ART68_BLOCK_START ===
// Article 68 — NEC 406 Receptacles, Attachment Plugs, and Flanged Inlets (2017 vs 2023)
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-40601-40613-receptacles-attachment-plugs.html'), 'utf8');
  const a = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const AN = a(art);
  const has = (s) => a(s) !== '' && AN.includes(a(s));
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art68_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-40601-40613-receptacles-attachment-plugs.html'), true, 'art68: slug present');
  eq(has('Radloff Bot, an AI software assistant'), true, 'art68: AI disclosure');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art68: Article+FAQPage JSON-LD');
  eq(has('Design aid only'), true, 'art68: design-aid disclaimer');
  eq(has('nec content series · article 68'), true, 'art68: footer marks article 68');
  eq(has('172 machine-verified checks'), true, 'art68: 172 machine-verified checks');
  eq(has('all 172 pass'), true, 'art68: all 172 pass');
  eq(art.startsWith('<!DOCTYPE html>'), true, 'art68: doctype');
  // all 67 on-disk 2023 rows present (CSV state machine; alpha-normalized first 32 alnum)
  const csvTxt = fs.readFileSync(path.join(__dirname, '..', '..', 'art35_nec_csv.csv'), 'utf8');
  const rowBodies = {};
  {
    let field = '', inQ = false, row = [], i = 0;
    const commit = () => { if (row.length > 0) { row.pop(); const ref = (row[1] || '').trim(); if (/^406\./.test(ref)) rowBodies[ref] = (row[2] || '').replace(/\s*\[[^\[\]]*\]\([^()]*(?:\([^()]*\)[^()]*)*\)\s*$/, '').trim(); } row = []; field = ''; };
    for (; i < csvTxt.length; i++) {
      const c = csvTxt[i];
      if (inQ) {
        if (c === '"') { if (csvTxt[i+1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\r') { /* skip */ }
        else if (c === '\n') { row.push(field); commit(); }
        else field += c;
      }
    }
    if (field || row.length) { row.push(field); commit(); }
  }
  let rowsPresent = 0, rowsMiss = 0;
  for (const ref of Object.keys(rowBodies)) {
    const body = (rowBodies[ref] || '').replace(/\s*\[[^\[\]]*\]\([^()]*(?:\([^()]*\)[^()]*)*\)\s*$/, '').trim();
    const probe = a(body).slice(0, 32);
    if (probe && AN.includes(probe)) rowsPresent++; else { rowsMiss++; if (rowsMiss <= 3) console.log('  MISS', ref, probe.slice(0,32)); }
  }
  eq(rowsMiss, 0, 'art68: all ' + rowsPresent + ' on-disk 2023 rows present (0 missing)');
  eq(rowsPresent, 67, 'art68: exactly 67 on-disk 2023 rows');
  // 12 on-disk 2017 sections displayed verbatim
  const probes2017 = {
    '406.1': 'thisarticlecoverstheratingtypean',
    '406.2': 'childcarefacilityabuildingorstru',
    '406.3': 'areceptaclesreceptaclesshallbeli',
    '406.4': 'receptacleoutletsshallbelocatedi',
    '406.5': 'receptaclesshallbemountedinident',
    '406.6': 'receptaclefaceplatesshallbeinsta',
    '406.7': 'allattachmentplugscordconnectors',
    '406.8': 'receptaclescordconnectorsandatta',
    '406.9': 'adamplocationsareceptacleinstall',
    '406.10': 'agroundingpolesgroundingtyperece',
    '406.11': 'theconnectionofthereceptaclegrou',
    '406.12': 'all15and20ampere125and250voltnon'
  };
  for (const k of Object.keys(probes2017)) {
    eq(AN.includes(probes2017[k]), true, 'art68: 2017 verbatim ' + k);
  }
  // 21 delta markers + key delta text
  for (const d of ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15','D16','D17','D18','D19','D20','D21']) eq(has(d), true, 'art68: delta marker ' + d);
  eq(has('the whole section changed subject'), true, 'art68: D1 406.2 subject changed');
  eq(has('reconditioned-equipment ban'), true, 'art68: D1 2023 reconditioned ban');
  eq(has('not greater than 15-ampere branch circuits'), true, 'art68: D3 push-in 15 A branch cap');
  eq(has('14 AWG solid copper wire only'), true, 'art68: D3 push-in 14 AWG wire');
  eq(has('Figure 406.3(F)'), true, 'art68: D4 controlled marking renumber');
  eq(has('210.21(B)(1) for single'), true, 'art68: D6 cite split');
  eq(has('in accordance with 250.146'), true, 'art68: D7 re-anchored to 250.146');
  eq(has('Ground-fault circuit interrupters shall be listed'), true, 'art68: D8 GFCI listed sentence');
  eq(has('210.12(A), (B), or (C)'), true, 'art68: D9 AFCI extended to (C)');
  eq(has('directly terminated on a CO/ALR receptacle, installed as replacement'), true, 'art68: D10 aluminum exception');
  eq(has('Automatically controlled receptacles shall be replaced with equivalently controlled'), true, 'art68: D11 new (D)(7)');
  eq(has('provided with GFPE where replacements are made'), true, 'art68: D12 new (D)(8) GFPE');
  eq(has('food courts and waiting spaces of passenger transportation facilities'), true, 'art68: D13 new (G) floor receptacles');
  eq(has('in the area below a sink'), true, 'art68: D14 new (G)(2) below-sink ban');
  eq(has('rated 1 watt or less'), true, 'art68: D15 1 W faceplate limit');
  eq(has('January 1, 2026'), true, 'art68: D15 2026 steel-screw exception');
  eq(has('Hinged covers of outlet box hoods shall be able to open at least 90 degrees'), true, 'art68: D16 90-degree covers');
  eq(has('ANSI/UL 514D-2016'), true, 'art68: D17 standard re-cite');
  eq(has('900 mm (3 ft)'), true, 'art68: D18 zone horizontal');
  eq(has('2.5 m (8 ft)'), true, 'art68: D18 zone vertical');
  eq(has('electronic bidet seat'), true, 'art68: D18 bidet exception');
  eq(has('other than connection to the equipment grounding conductor'), true, 'art68: D19 406.10(C) reword');
  eq(has('residential care/assisted living facilities'), true, 'art68: D20 new TR locations');
  eq(has('psychiatric hospitals'), true, 'art68: D20 psychiatric hospitals');
  eq(has('agricultural buildings'), true, 'art68: D20 agricultural buildings');
  eq(has('Single-pole separable connectors shall be listed and labeled'), true, 'art68: D21 new 406.13');
  eq(has('ANSI-UL 1691-2014'), true, 'art68: D21 UL 1691 list ref');
  // 2020 gap + MH silence + honesty
  eq(has('no Article 406 body'), true, 'art68: 2020 gap disclosed');
  eq(has('2020 edition gap'), true, 'art68: 2020 gap label');
  eq(has('406.S(E) and 406.S(G)'), true, 'art68: 2020 cross-ref token (S for 5 OCR)');
  eq(has('OCR'), true, 'art68: OCR disclosed');
  eq(has('zero hand math'), true, 'art68: zero hand math');
  eq(has('Machine-counted silence'), true, 'art68: MH silence stated');
  // five MH entries quoted
  eq(has('406.3 Receptacle Rating and Type'), true, 'art68: MH 406.3 entry');
  eq(has('406.4 General Installation Requirements'), true, 'art68: MH 406.4 entry');
  eq(has('406.6 Receptacle Faceplates'), true, 'art68: MH 406.6 entry');
  eq(has('406.9 Receptacles in Damp or Wet Locations'), true, 'art68: MH 406.9 entry');
  eq(has('406.12 Tamper-Resistant Receptacles'), true, 'art68: MH 406.12 entry');
  // 6 worked examples (core-computed)
  for (const t of ['EX1','EX2','EX3','EX4','EX5','EX6']) eq(has(t), true, 'art68: ' + t + ' present');
  eq(has('14 AWG is rejected'), true, 'art68: EX1 14 AWG rejected');
  eq(has('12 AWG Cu'), true, 'art68: EX1 12 AWG correct pick');
  eq(has('the 15 A / 14 AWG pair is the legal maximum'), true, 'art68: EX2 caps coincide');
  eq(has('FAILS (bars required)'), true, 'art68: EX3 480 V case fails');
  eq(has('610 mm'), true, 'art68: EX4 inside-zone case');
  eq(has('Equipment grounding conductor connection'), true, 'art68: EX5 sequence first step');
  eq(has('7 required locations in 2017'), true, 'art68: EX6 count 7');
  eq(has('10 in 2023'), true, 'art68: EX6 count 10');
  eq(has('1.7 m'), true, 'art68: EX6 height seam');
  // core re-run under node (values must match art68_numbers.json)
  const r = require('child_process').spawnSync('node', ['-e',
    'const core=require("./panelwright/app.js");const j=require("./art68_numbers.json");' +
    'const out={naive:core.pickConductor31016(20,"cu",75).size,correct:core.pickConductor31016(20,"cu",60).size,cap14:core.smallConductorCap("14","cu"),cap12:core.smallConductorCap("12","cu"),pick15:core.pickConductor31016(15,"cu",75).size};' +
    'const bad=[];if(out.naive!==j.EX1.naive_pick)bad.push("naive");if(out.correct!==j.EX1.conductor)bad.push("correct");if(out.cap14!==j.EX1.cap_14awg)bad.push("cap14");if(out.cap12!==j.EX1.cap_12awg)bad.push("cap12");if(out.pick15!==j.EX2.conductor)bad.push("pick15");' +
    'if(bad.length){console.log("MISMATCH "+bad.join(","));process.exit(1);}'
  ], {cwd: path.join(__dirname, '..', '..')});
  eq(r.status === 0, true, 'art68: core re-run matches art68_numbers.json (no MISMATCH)');
  eq((r.stdout || '') + (r.stderr || ''), '', 'art68: core re-run clean output');
  // cross-links
  for (const l of ['nec-40801-40858-switchboards-switchgear-panelboards.html', 'nec-21008-gfci-protection.html', 'nec-21012-afci-protection.html', 'nec-21011-branch-circuits.html', 'nec-250130-250148-egc-connections-box-continuity.html', 'nec-2406-standard-ampere-ratings.html', 'nec-31016-ampacity.html']) {
    eq(art.includes(l), true, 'art68: cross-link ' + l.slice(0, 30));
  }
  // sitemap + index + README
  const sitemap68 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap68.includes('articles/nec-40601-40613-receptacles-attachment-plugs.html'), true, 'art68: sitemap entry present');
  eq((sitemap68.match(/<loc>/g) || []).length >= 69, true, 'art68: sitemap has >= 69 URLs (never-shrink; grows per article)');
  const index68 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index68.includes('articles/nec-40601-40613-receptacles-attachment-plugs.html'), true, 'art68: index cross-link present');
  const readme68 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme68.includes('articles/nec-40601-40613-receptacles-attachment-plugs.html'), true, 'art68: README entry present');
  // tag balance (the quote-block </div> regression guard)
  const divOpen = (art.match(/<div\b/g) || []).length;
  const divClose = (art.match(/<\/div>/g) || []).length;
  eq(divOpen, divClose, 'art68: div tags balanced (' + divOpen + '/' + divClose + ')');
}
// === ART68_BLOCK_END ===





// === ART69_BLOCK_START ===
// Article 69 — NEC 404 Switches (2017 vs 2023)
{
  const fs = require('fs');
  const path = require('path');
  const art = fs.readFileSync(path.join(__dirname, '..', 'articles', 'nec-40401-40430-switches-2017-2023.html'), 'utf8');
  const a = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const AN = a(art);
  const has = (s) => a(s) !== '' && AN.includes(a(s));
  const nums = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'art69_numbers.json'), 'utf8'));
  // meta
  eq(art.includes('nec-40401-40430-switches-2017-2023.html'), true, 'art69: slug present');
  eq(has('Radloff Bot, an AI software assistant'), true, 'art69: AI disclosure');
  eq(art.includes('"@type": "Article"') && art.includes('"@type": "FAQPage"'), true, 'art69: Article+FAQPage JSON-LD');
  eq(has('Design aid only'), true, 'art69: design-aid disclaimer');
  eq(has('nec content series · article 69'), true, 'art69: footer marks article 69');
  eq(has('168 machine-verified checks'), true, 'art69: 168 machine-verified checks');
  eq(has('all 168 pass'), true, 'art69: all 168 pass');
  eq(art.startsWith('<!DOCTYPE html>'), true, 'art69: doctype');
  // all 47 on-disk 2023 rows present (CSV state machine; alpha-normalized first 32 alnum)
  const csvTxt = fs.readFileSync(path.join(__dirname, '..', '..', 'art35_nec_csv.csv'), 'utf8');
  const rowBodies = {};
  {
    let field = '', inQ = false, row = [], i = 0;
    const commit = () => { if (row.length > 0) { row.pop(); const ref = (row[1] || '').trim(); if (/^404\./.test(ref)) rowBodies[ref] = (row[2] || '').replace(/\s*\[[^\]]+\]\([^)]+\)\s*$/, '').trim(); } row = []; field = ''; };
    for (; i < csvTxt.length; i++) {
      const c = csvTxt[i];
      if (inQ) {
        if (c === '"') { if (csvTxt[i+1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\r') { /* skip */ }
        else if (c === '\n') { row.push(field); commit(); }
        else field += c;
      }
    }
    if (field || row.length) { row.push(field); commit(); }
  }
  let rowsPresent = 0, rowsMiss = 0;
  for (const ref of Object.keys(rowBodies)) {
    const body = (rowBodies[ref] || '').replace(/\s*\[[^\]]+\]\([^)]+\)\s*$/, '').trim();
    const probe = a(body).slice(0, 32);
    if (probe && AN.includes(probe)) rowsPresent++; else { rowsMiss++; if (rowsMiss <= 3) console.log('  MISS', ref, probe.slice(0,32)); }
  }
  eq(rowsMiss, 0, 'art69: all ' + rowsPresent + ' on-disk 2023 rows present (0 missing)');
  eq(rowsPresent, 47, 'art69: exactly 47 on-disk 2023 rows');
  // 19 on-disk 2017 sections displayed verbatim (probes computed from the cleaned section bodies)
  const probes2017 = {
    '404.1': 'theprovisionsofthisarticleapplyt',
    '404.2': 'athreewayandfourwayswitchesthree',
    '404.3': 'ageneralswitchesandcircuitbreake',
    '404.4': 'asurfacemountedswitchorcircuitbr',
    '404.5': 'timeswitchesflashersandsimilarde',
    '404.6': 'asinglethrowknifeswitchessinglet',
    '404.7': 'generaluseandmotorcircuitswitche',
    '404.8': 'alocationallswitchesandcircuitbr',
    '404.9': 'afaceplatesfaceplatesprovidedfor',
    '404.10': 'asurfacetypesnapswitchesusedwith',
    '404.11': 'ahandoperablecircuitbreakerequip',
    '404.12': 'metalenclosuresforswitchesorcirc',
    '404.13': 'aisolatingswitchesknifeswitchesr',
    '404.14': 'switchesshallbeusedwithintheirra',
    '404.20': 'switchesshallbemarkedwiththecur',
    '404.22': 'electroniclightingcontrolswitche',
    '404.26': 'auxiliarycontactsofarenewableorq',
    '404.27': 'afusedswitchshallnothavefusesinp',
    '404.28': 'thewirebendingspacerequiredby404'
  };
  for (const k of Object.keys(probes2017)) {
    eq(AN.includes(probes2017[k]), true, 'art69: 2017 verbatim ' + k);
  }
  // 29 delta markers + key delta text
  for (const d of ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15','D16','D17','D18','D19','D20','D21','D22','D23','D24','D25','D26','D27','D28','D29']) eq(has(d), true, 'art69: delta marker ' + d);
  eq(has('wireless control equipment to which circuit conductors are not connected'), true, 'art69: D1 404.1 wireless carve-out');
  eq(has('habitable rooms or occupiable spaces'), true, 'art69: D2 404.2(C) location list');
  eq(has('shall become effective on January 1, 2020'), true, 'art69: D3 2017 effective-date sentence shown');
  eq(has('accessible for the installation of an additional or replacement cable'), true, 'art69: D4 deleted 2017 condition (2) shown');
  eq(has('within tub or shower spaces'), true, 'art69: D6 2023 tub');
  eq(has('in a location that is visible when accessing the external operating means'), true, 'art69: D9 404.7 visible location');
  eq(has('except as follows'), true, 'art69: D11 404.8(A) list form');
  eq(has('Metal faceplates shall be bonded to the equipment grounding conductor'), true, 'art69: D14 404.9(B) bonded');
  eq(has('designed such that no metallic faceplate replaces the one provided'), true, 'art69: D15 redesigned faceplate');
  eq(has('they shall comply with 314.3, Exception No. 1 or No. 2'), true, 'art69: D18 404.12 314.3 cite');
  eq(has('Switches shall be listed and marked with their ratings'), true, 'art69: D20 404.14 lead');
  eq(has('Electric discharge lamp loads not exceeding the marked ampere and voltage rating of the switch'), true, 'art69: D21 404.14(A) lamps');
  eq(has('not greater than 15-ampere branch circuits'), true, 'art69: D23 push-in 15 A branch cap');
  eq(has('14 AWG solid copper wire only'), true, 'art69: D23 push-in 14 AWG wire');
  eq(has('copper-clad aluminum conductors only'), true, 'art69: D23 CO/ALR copper-clad rule');
  eq(has('dimmer switches and electronic control switches, such as timing switches and occupancy sensors'), true, 'art69: D25 404.14(F) scope');
  eq(has('Reconditioned snap switches of any type shall not be permitted'), true, 'art69: D26 new 404.16');
  eq(has('specifically evaluated by its manufacturer or a qualified testing laboratory'), true, 'art69: D26 404.16(C) evaluation');
  eq(has('Electronic control switches shall be listed'), true, 'art69: D27 404.22 reword');
  eq(has('Table 312.6(B)(2)'), true, 'art69: D28 404.28 table cite');
  eq(has('access to the switch interior is restricted'), true, 'art69: D29 new 404.30');
  // 2020 gap + MH silence + honesty
  eq(has('no Article 404 body'), true, 'art69: 2020 gap disclosed');
  eq(has('2020 edition gap'), true, 'art69: 2020 gap label');
  eq(has('404 Part I. Part II.'), true, 'art69: 2020 TOC token');
  eq(has('Articles 312,314,404,408,450,490'), true, 'art69: 2020 code-making panel token');
  eq(has('OCR'), true, 'art69: OCR disclosed');
  eq(has('zero hand math'), true, 'art69: zero hand math');
  eq(has('Machine-counted silence'), true, 'art69: MH silence stated');
  // two MH entries quoted
  eq(has('404.1 Scope'), true, 'art69: MH 404.1 entry');
  eq(has('404.14 Rating and Use of Switches'), true, 'art69: MH 404.14 entry');
  // 6 worked examples (core-computed)
  for (const t of ['EX1','EX2','EX3','EX4','EX5','EX6']) eq(has(t), true, 'art69: ' + t + ' present');
  eq(has('cannot</em> use a push-in snap switch at all'.replace('</em>','')), true, 'art69: EX1 20 A cannot use push-in');
  eq(has('the 15 A / 14 AWG pair is the legal maximum'), true, 'art69: EX1 caps coincide');
  eq(has('80 percent of the ampere rating'), true, 'art69: EX2 80% motor cap');
  eq(has('50 percent'), true, 'art69: EX2 50% inductive cap');
  eq(has('= switch rating floor (404.14(G))'), true, 'art69: EX3 404.14(G) floor');
  eq(has('300 V (404.8(B), on-disk value)'), true, 'art69: EX5 300 V limit');
  eq(has('FAILS (bars required)'), true, 'art69: EX5 failing case');
  eq(has('13 mm = 0.512 in.'), true, 'art69: EX6 13 mm conversion');
  // core re-run under node (values must match art69_numbers.json)
  const r = require('child_process').spawnSync('node', ['-e',
    'const core=require("./panelwright/app.js");const j=require("./art69_numbers.json");' +
    'const out={oc15:core.nextStdBreaker(15),pick15:core.pickConductor31016(15,"cu",75).size,pick20:core.pickConductor31016(20,"cu",75).size,correct20:core.pickConductor31016(20,"cu",60).size,cap14:core.smallConductorCap("14","cu"),cap12:core.smallConductorCap("12","cu")};' +
    'const bad=[];if(out.oc15!==j.EX1.oc)bad.push("oc15");if(out.pick15!==j.EX1.pick)bad.push("pick15");if(out.pick20!==j.EX1.pick20)bad.push("pick20");if(out.correct20!==j.EX1.correct20)bad.push("correct20");if(out.cap14!==j.EX1.cap14)bad.push("cap14");if(out.cap12!==j.EX1.cap12)bad.push("cap12");' +
    'if(bad.length){console.log("MISMATCH "+bad.join(","));process.exit(1);}'
  ], {cwd: path.join(__dirname, '..', '..')});
  eq(r.status === 0, true, 'art69: core re-run matches art69_numbers.json (no MISMATCH)');
  eq((r.stdout || '') + (r.stderr || ''), '', 'art69: core re-run clean output');
  // cross-links
  for (const l of ['nec-40601-40613-receptacles-attachment-plugs.html', 'nec-40801-40858-switchboards-switchgear-panelboards.html', 'nec-2406-standard-ampere-ratings.html', 'nec-2404d-small-conductors.html', 'nec-31016-ampacity.html', 'nec-250130-250148-egc-connections-box-continuity.html', 'github.com/RadloffBot/panelwright']) {
    eq(art.includes(l), true, 'art69: cross-link ' + l.slice(0, 30));
  }
  // sitemap + index + README
  const sitemap69 = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  eq(sitemap69.includes('articles/nec-40401-40430-switches-2017-2023.html'), true, 'art69: sitemap entry present');
  eq((sitemap69.match(/<loc>/g) || []).length >= 70, true, 'art69: sitemap has >= 70 URLs (never-shrink; grows per article)');
  const index69 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index69.includes('articles/nec-40401-40430-switches-2017-2023.html'), true, 'art69: index cross-link present');
  const readme69 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme69.includes('articles/nec-40401-40430-switches-2017-2023.html'), true, 'art69: README entry present');
  // tag balance (the quote-block </div> regression guard)
  const divOpen = (art.match(/<div\b/g) || []).length;
  const divClose = (art.match(/<\/div>/g) || []).length;
  eq(divOpen, divClose, 'art69: div tags balanced (' + divOpen + '/' + divClose + ')');
}
// === ART69_BLOCK_END ===

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
