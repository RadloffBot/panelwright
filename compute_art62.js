#!/usr/bin/env node
/* Article 62 worked examples — every number from the REAL shipped PanelWright cores
 * under node (zero hand math). Writes art62_numbers.json.
 *
 * Scope: NEC 690.1-690.15 (Solar PV systems — Part I General 690.1-690.6,
 * Part II Circuit Requirements 690.7-690.11, Part III Disconnecting Means
 * 690.13-690.15, plus 690.12 Rapid Shutdown).
 *
 * Series strings do NOT multiply Isc (one string = one Isc); parallel
 * strings DO (690.8(A)(2): output = sum of source-circuit max currents).
 *
 * EX1  690.7(A) + 690.8(A)(1)(1) + 690.8(B)(1) + 690.9(B)(1) + 240.4(D):
 *      ONE residential string, 12 modules in series (Voc 37 V @25 C,
 *      Isc 13 A). Maximum current = 13 x 125% = 16.25 A; 20 A OCPD;
 *      pickConductor31016 lands on 14 AWG Cu (20 A @75 C) but 240.4(D)
 *      caps a 14 AWG OCPD at 15 A (< 16.25 A required) -> 12 AWG Cu
 *      (25 A @75 C, cap 20 A). Cold voltage -10 C x 1.14 = 506.16 V,
 *      under the 600 V dwelling ceiling.
 * EX2  690.7 lead: 600 V dwelling ceiling TRAP — a 16-module string at
 *      37 V: 592 V at 25 C (looks fine) but 674.88 V at -10 C (x 1.14)
 *      EXCEEDS 600 V -> not permitted on a dwelling; permitted on an
 *      other building (1000 V ceiling).
 * EX3  690.11: the 80 V dc AFCI threshold — the EX1 string (506.16 V cold)
 *      is 6.33x over 80 V -> listed PV AFCI required; the not-on-a-building
 *      exception (direct buried / metallic raceway / enclosed metallic tray)
 *      does not apply to a rooftop install.
 * EX4  690.8(A)(1)(1) single-module case: one 400 W module (Isc 10 A):
 *      max current 12.5 A; 15 A OCPD (next standard); 14 AWG Cu (20 A @75 C)
 *      conductors, and the 240.4(D) 14 AWG cap is exactly 15 A = the OCPD.
 * EX5  690.8(A)(2) + 690.9(B)(1) + 690.7 lead (1000 V): commercial — 3
 *      PARALLEL strings of 20 series modules (Voc 41.5 V, Isc 9.6 A):
 *      max current = 3 x 9.6 x 1.25 = 36 A; 40 A OCPD; 8 AWG Cu (50 A @75 C);
 *      string voltage 830 V (25 C) < 1000 V non-dwelling ceiling but >
 *      600 V dwelling ceiling.
 */
const core = require('./app.js');
const r2 = (x) => Math.round(x * 100) / 100;
const out = { meta: { generated: new Date().toISOString(), cores: 'PanelWright v1.16 app.js' } };

// Table 690.7(A) on-disk 2017 (OCR-garbled cells normalized; disclosed in article)
const TABLE_690_7_A = {
  '24..20': 1.02, '19..15': 1.04, '14..10': 1.06, '9..5': 1.08,
  '4..0': 1.10, '-1..-5': 1.12, '-6..-10': 1.14, '-11..-15': 1.16,
  '-16..-20': 1.18, '-21..-25': 1.20, '-26..-30': 1.21, '-31..-35': 1.23,
  '-36..-40': 1.25
};

// ---------------------------------------------------------------- EX1
{
  const voc = 37, isc = 13, n = 12;
  const maxI = isc * 1.25;                          // ONE string: 16.25 A
  const ocpd = core.nextStdBreaker(maxI);           // 20 A (690.9(B)(1) 125%, 240.6)
  const pick14 = core.pickConductor31016(maxI, 'cu', 75); // 14 AWG Cu (20 A @75 C) — the 690.8(B) ampacity minimum
  const cap14 = core.smallConductorCap('14', 'cu'); // 240.4(D): 14 AWG branch OCPD cap = 15 A
  const pick12 = core.pickConductor31016(25, 'cu', 75);   // 12 AWG Cu (25 A @75 C) — the next size up
  const cap12 = core.smallConductorCap('12', 'cu'); // 240.4(D): 12 AWG branch OCPD cap = 20 A
  const vocSum25 = n * voc;                         // 444 V
  const fM10 = TABLE_690_7_A['-6..-10'];            // 1.14
  const vocSumCold = r2(vocSum25 * fM10);           // 506.16 V
  out.EX1 = {
    rule: '690.7(A) + 690.8(A)(1)(1) 125% + 690.8(B)(1) + 690.9(B)(1) + 240.4(D) note',
    modulesInSeries: n, voc25: voc, isc: isc,
    maxCurrent_125: r2(maxI),
    ocpdA: ocpd,
    pick14: pick14.label, pick14Amp: pick14.amp, cap14,
    trap: cap14 < maxI,                              // 15 A 240.4(D) OCPD cap < 20 A required OCPD
    pick12: pick12.label, pick12Amp: pick12.amp, cap12,   // 12 AWG option when a 20 A OCPD is required
    conductorFinal: pick14.label,                    // 690.8(B) ampacity minimum (20 A >= 16.25 A)
    vocSum25V: vocSum25,
    coldTempC: -10, tableFactor: fM10,
    vocSumColdV: vocSumCold,
    dwellingLimitV: 600, withinDwelling: vocSumCold <= 600
  };
}

// ---------------------------------------------------------------- EX2
{
  const n = 16, voc = 37;
  const vocSum25 = n * voc;                         // 592 V
  const fM10 = TABLE_690_7_A['-6..-10'];            // 1.14
  const vocSumCold = r2(vocSum25 * fM10);           // 674.88 V
  out.EX2 = {
    rule: '690.7 lead: 600 V (1-2 family dwelling) / 1000 V (other buildings) dc ceilings',
    modulesInSeries: n, voc25: voc,
    vocSum25V: vocSum25,
    withinDwelling600: vocSum25 <= 600,             // 592 <= 600 (25 C look)
    coldTempC: -10, tableFactor: fM10,
    vocSumColdV: vocSumCold,
    withinDwelling600_cold: vocSumCold <= 600,      // 674.88 > 600 -> dwelling FAIL
    withinOtherBuilding1000: vocSumCold <= 1000,    // other building OK
    overDwellingBy: r2(vocSumCold - 600)            // 74.88 V
  };
}

// ---------------------------------------------------------------- EX3
{
  const vocSumCold = r2(12 * 37 * TABLE_690_7_A['-6..-10']); // 506.16 V
  const threshold = 80;
  out.EX3 = {
    rule: '690.11: dc systems at 80 V or greater between any two conductors need listed PV AFCI',
    vocSumColdV: vocSumCold,
    afciThresholdV: threshold,
    afciRequired: vocSumCold >= threshold,
    marginFactor: r2(vocSumCold / threshold),       // 6.33
    rooftopException: false                          // exception is NOT on/in buildings only
  };
}

// ---------------------------------------------------------------- EX4
{
  const isc = 10;
  const maxI = isc * 1.25;                          // 12.5 A
  const ocpd = core.nextStdBreaker(maxI);           // 15 A
  const pick = core.pickConductor31016(maxI, 'cu', 75); // 14 AWG Cu (20 A)
  const cap14 = core.smallConductorCap('14', 'cu'); // 15 A
  out.EX4 = {
    rule: '690.8(A)(1) single module + 690.9(B)(1) 125% OCPD + 310.16 pick + 240.4(D) cap note',
    moduleIsc: isc,
    maxCurrent_125: r2(maxI),
    ocpdA: ocpd,
    conductor: pick.label, conductorAmp: pick.amp,
    cap2404D_14AWG: cap14,
    capEqualsOcpd: cap14 === ocpd                   // 15 == 15
  };
}

// ---------------------------------------------------------------- EX5
{
  const strings = 3, per = 20, isc = 9.6, voc = 41.5;
  const maxI = strings * isc * 1.25;                // 36 A (parallel strings sum)
  const ocpd = core.nextStdBreaker(maxI);           // 40 A
  const pick = core.pickConductor31016(maxI, 'cu', 75); // 6 AWG Cu (65 A)
  const vocSum25 = per * voc;                       // 830 V
  out.EX5 = {
    rule: '690.8(A)(2) 3 parallel strings + 690.9(B)(1) + 690.7 lead 1000 V ceiling (non-dwelling)',
    strings, modulesPerString: per, voc25: voc, isc: isc,
    maxCurrent_125: r2(maxI),
    ocpdA: ocpd,
    conductor: pick.label, conductorAmp: pick.amp,
    vocSum25V: vocSum25,
    withinOtherBuilding1000: vocSum25 <= 1000,      // 830 < 1000 OK
    overDwelling600: vocSum25 > 600                 // not a dwelling system
  };
}

// Cold-weather voltage ladder for the EX1 12-module string (the Table 690.7(A) sweep)
{
  const rows = [];
  for (const [k, f] of Object.entries(TABLE_690_7_A)) {
    rows.push({ band: k, factor: f, vocV: r2(444 * f) });
  }
  out.voltageLadder = rows;
}

require('fs').writeFileSync(__dirname + '/../art62_numbers.json', JSON.stringify(out, null, 2));
console.log('EX1', JSON.stringify(out.EX1));
console.log('EX2', JSON.stringify(out.EX2));
console.log('EX3', JSON.stringify(out.EX3));
console.log('EX4', JSON.stringify(out.EX4));
console.log('EX5', JSON.stringify(out.EX5));
