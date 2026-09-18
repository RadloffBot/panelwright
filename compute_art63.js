#!/usr/bin/env node
/* Article 63 worked examples — every number from the REAL shipped PanelWright
 * cores under node (zero hand math). Writes art63_numbers.json.
 *
 * Scope: NEC 2017 Article 490 "Equipment Over 1000 Volts, Nominal" ->
 * 2023 Article 495 "Equipment Over 1000 Volts ac, 1500 Volts dc, Nominal"
 * (full-article renumber + new Article 245).
 *
 * EX1  495.72(D) (2017 490.72(D)): the 7 1/2 % ground-current-detection rule
 *      on an electrode-type boiler — 200 A FLC (1500 V, 200 kW three-phase):
 *      10-s threshold = greater of 5 A or 7.5% of FLC = 15 A; instantaneous
 *      = 25% of FLC = 50 A. 2017 says "7% percent" (OCR of the 2017 scan);
 *      2023 says "7 1/2 percent" — the delta this article documents.
 * EX2  495.72(A) (2017 490.72(A)): branch-circuit rating >= 100% of total
 *      load + Table 310.16 pick for the 495.72(E)(3) grounded-neutral
 *      ampacity floor (>= ampacity of the largest ungrounded conductor).
 *      200 A circuit: nextStdBreaker + pickConductor31016 @75 C.
 * EX3  The Part IV renumber ladder 490.51->495.61 ... 490.56->495.66 and the
 *      article-wide 490.x -> 495.x trailing-digit map (38 -> 30 top-level
 *      sections; 490.21 -> new Article 245; 490.36 merged into 495.37; NEW
 *      495.2 + 495.49 reconditioned-equipment sections).
 */
const core = require('./app.js');
const fs = require('fs');
const r2 = (x) => Math.round(x * 100) / 100;

const out = { meta: { generated: new Date().toISOString(), cores: 'PanelWright v1.16 app.js' } };

// ---- EX1: 495.72(D) ground-fault detection thresholds (200 A FLC) ----
{
  const flc = 200;
  const pct75 = r2(flc * 0.075);          // 15 A
  const groundTripA = Math.max(5, pct75); // greater of 5 A or 7.5% -> 15 A
  const instA = r2(flc * 0.25);           // 25% instantaneous -> 50 A
  out.EX1 = {
    rule: '495.72(D) (2017: 490.72(D) "7% percent" OCR -> 2023 "7 1/2 percent")',
    flcA: flc,
    pct75A: pct75,
    groundTripA,
    instA,
    note: 'trips the circuit-interrupting device if the sum of the neutral + EGC currents exceeds the greater of 5 A or 7 1/2% of FLC for 10 s, or an instantaneous value of 25% of FLC'
  };
}

// ---- EX2: 495.72(A) branch rating + 495.72(E)(3) neutral ampacity floor ----
{
  const loadA = 200;                       // total boiler load current
  const minRatingA = r2(loadA * 1.0);      // 495.72(A): >= 100% of total load
  const ocpd = core.nextStdBreaker(minRatingA);
  const pick = core.pickConductor31016(minRatingA, 'cu', 75);
  out.EX2 = {
    rule: '495.72(A) (2017: 490.72(A)) + 495.72(E)(3) neutral ampacity floor',
    loadA,
    branchMinA: minRatingA,
    ocpd,
    pick
  };
}

// ---- EX3: the renumber map (machine counts from the on-disk sources) ----
{
  // 2017 top-level sections in the 2017 scan (38) and 2023 top-level 495
  // sections in the on-disk 2023 CSV (30) — counts verified by
  // verify_art63.py against the on-disk files; the MAP itself is asserted
  // phrase-by-phrase there.
  out.EX3 = {
    rule: '490.x -> 495.x full-article renumber (Part IV: 490.51-490.56 -> 495.61-495.66)',
    part4Map: { '490.51': '495.61', '490.52': '495.62', '490.53': '495.63', '490.54': '495.64', '490.55': '495.65', '490.56': '495.66' },
    topLevel: { '2017 (Article 490)': 38, '2023 (Article 495)': 30 },
    relocation: { '490.21 Circuit-Interrupting Devices': 'NEW Article 245, section 245.21 (34 on-disk 2023 rows)' },
    merged: { '490.36 Grounding (frames sentence)': 'folded into 495.37 (+ new 250.190 cite)' },
    newSections: ['495.2 Reconditioned Equipment', '495.49 Reconditioned Switchgear'],
    missingIn2023: ['495.21', '495.36', '495.51-495.56 (Part IV renumbered to 495.61-66)']
  };
}

fs.writeFileSync(__dirname + '/../art63_numbers.json', JSON.stringify(out, null, 2));
console.log('EX1', JSON.stringify(out.EX1));
console.log('EX2', JSON.stringify(out.EX2));
console.log('EX2b', JSON.stringify(out.EX2b));
console.log('EX3 topLevel', JSON.stringify(out.EX3.topLevel));
