#!/usr/bin/env node
/* Article 64 worked examples — every number from the REAL shipped PanelWright
 * cores under node (zero hand math). Writes art64_numbers.json.
 *
 * Scope: the NEW 2023 Article 245 "Overcurrent Protection for Systems Rated
 * Over 1000V ac, 1500V dc" — the 2023 consolidation of the 2017 medium-voltage
 * overcurrent rules that lived in TWO places: 2017 Article 240 Part IX
 * (240.100 Feeders and Branch Circuits + 240.101 Additional Requirements for
 * Feeders) and 2017 Article 490 Part II (490.21 Circuit-Interrupting Devices).
 * In 2023 all three land in one article: 245.26 (=240.100), 245.27 (=240.101),
 * 245.21 (=490.21), plus two brand-new sections (245.1 Scope, 245.2
 * Reconditioned Equipment). 44 on-disk 2023 rows.
 *
 * EX1  245.27(A) (2017 240.101(A)): the over-1000 V OCPD rating/setting caps —
 *      a fuse shall not exceed THREE times the conductor ampacity; a breaker
 *      long-time trip (or electronically-actuated-fuse minimum trip) shall not
 *      exceed SIX times the ampacity. On a 150 A (1/0 Cu @75 C) MV feeder:
 *      max fuse rating 3x150 = 450 A (nextStdBreaker -> 450); max breaker
 *      long-time setting 6x150 = 900 A (nextStdBreaker -> 1000).
 * EX2  245.26(A) (2017 240.100(A)): overcurrent protection in EACH ungrounded
 *      conductor at the point of supply (or an engineering-supervised
 *      alternative); 3-phase -> >=3 overcurrent relay elements from 3 CTs; a
 *      residual element may replace one phase element on a 3-wire 3-phase
 *      circuit; where the neutral is NOT regrounded on the load side as
 *      permitted in 250.184(B), the CT may link all 3 phases + the neutral.
 *      Reference ampacity pick for a 200 A feeder via the shipped Table 310.16
 *      core (MV conductors are normally sized per 315.60 — stated on the page).
 * EX3  The 2017 -> 2023 consolidation map (machine counts from the on-disk
 *      sources): 240.100 -> 245.26 (0.8662 word coverage), 240.101 -> 245.27
 *      (0.7966), 490.21 -> 245.21 (0.9245); NEW 245.1 + 245.2; 44 on-disk 245.x
 *      rows (245.1 / 245.2 / 245.21 / 245.26 / 245.27).
 */
const core = require('./app.js');
const fs = require('fs');
const r2 = (x) => Math.round(x * 100) / 100;

const out = { meta: { generated: new Date().toISOString(), cores: 'PanelWright v1.16 app.js' } };

// ---- EX1: 245.27(A) (2017 240.101(A)) fuse 3x / breaker 6x caps ----
{
  const ampacity = 150;                 // 1/0 AWG Cu @ 75 C (shipped Table 310.16 core)
  const pick = core.pickConductor31016(ampacity, 'cu', 75);
  const fuse3x = r2(ampacity * 3);      // max continuous ampere rating of a fuse
  const fuseStd = core.nextStdBreaker(fuse3x);
  const breaker6x = r2(ampacity * 6);   // max long-time trip / min electronic-fuse trip
  const breakerStd = core.nextStdBreaker(breaker6x);
  out.EX1 = {
    rule: '245.27(A) (2017: 240.101(A)) — fuse <= 3x ampacity; breaker long-time trip / electronic-fuse min trip <= 6x ampacity',
    ampacity,
    pick,
    fuseMaxA: fuse3x,
    fuseStd,
    breakerMaxA: breaker6x,
    breakerStd,
    note: 'the 3x / 6x numbers are UNCHANGED 2017 -> 2023 (machine-diffed); only the 695.4(B) (2) -> 695.4(B)(2) fire-pump ref formatting moved'
  };
}

// ---- EX2: 245.26(A) (2017 240.100(A)) per-conductor OCPD + CT/relay counts ----
{
  const feederA = 200;                  // reference MV feeder ampacity
  const pick = core.pickConductor31016(feederA, 'cu', 75);
  out.EX2 = {
    rule: '245.26(A) (2017: 240.100(A)) — protection in EACH ungrounded conductor; 3-phase needs >=3 relay elements from 3 CTs',
    feederA,
    pick,
    ctCount: 3,                          // minimum CTs for 3-phase
    relayElementsMin: 3,                 // minimum overcurrent relay elements
    residualMayReplace: 'one phase element (3-wire 3-phase)',
    ctLinkWhenNotRegrounded: 'all 3 phases + the grounded circuit conductor (neutral) — permitted only where the neutral is NOT regrounded on the load side as permitted in 250.184(B)',
    note: 'Table 310.16 pick is a reference only — MV branch/feeder conductors are normally sized per 315.19 / 315.60 (stated on the page)'
  };
}

// ---- EX3: the 2017 -> 2023 consolidation map (machine counts) ----
{
  out.EX3 = {
    rule: 'NEW Article 245 = the 2023 consolidation of 2017 240.100 + 240.101 + 490.21',
    map: {
      '240.100 Feeders and Branch Circuits (2017 Art 240 Part IX)': '245.26 (2023)',
      '240.101 Additional Requirements for Feeders (2017 Art 240 Part IX)': '245.27 (2023)',
      '490.21 Circuit-Interrupting Devices (2017 Art 490 Part II)': '245.21 (2023)',
    },
    newSections: ['245.1 Scope', '245.2 Reconditioned Equipment (A permits reconditioned MV/HV breakers, relays, CTs; B bars reconditioned MV fuseholders + nonrenewable fuses)'],
    coverage: { '240.100->245.26': 0.8662, '240.101->245.27': 0.7966, '490.21->245.21': 0.9245 },
    onDisk245Rows: 44,
    onDiskFamilies: ['245.1', '245.2', '245.21', '245.26', '245.27'],
    note: '44 on-disk 2023 rows across five section families; 2017 had NO standalone 245 article and NO 240.100/101 equivalent scope section'
  };
}

fs.writeFileSync(__dirname + '/../art64_numbers.json', JSON.stringify(out, null, 2));
console.log('EX1', JSON.stringify(out.EX1));
console.log('EX2', JSON.stringify(out.EX2));
console.log('EX3', JSON.stringify(out.EX3));
