// S91: Article 66 (NEC Article 235) worked-example numbers — from the shipped cores, zero hand math.
const core = require('./panelwright/app.js');

function pick31016(requiredA, mat, temp) {
  const r = core.pickConductor31016(requiredA, mat, temp);
  return r && r.size ? r.size : null;
}
const mvaToA = (kV, mva, threePhase) => +(mva * 1000 / (kV * (threePhase ? Math.sqrt(3) : 1))).toFixed(2);
// three-phase current from kW (kV units): I = kW / (sqrt3 * kV)
const kwToA = (kV, kw, threePhase) => +(kw / (kV * (threePhase ? Math.sqrt(3) : 1))).toFixed(2);

const out = {};

// EX1 — 235.19(A) + 235.20(A) branch circuit, 480 V 3-phase, 18 kW designed potential load (12 kW noncontinuous + 6 kW continuous)
{
  const totalKW = 18, contKW = 6, noncontKW = 12, kV = 0.48;
  const I = kwToA(kV, totalKW, true);             // total load current
  const Icont = kwToA(kV, contKW, true);          // continuous portion
  const Inon = kwToA(kV, noncontKW, true);        // noncontinuous portion
  const ampFloor = +(1.25 * I).toFixed(2);        // 235.19(A): 125% of designed potential load (all of it)
  const ocFloor = +(Inon + 1.25 * Icont).toFixed(2); // 235.20(A): noncontinuous + 125% continuous
  const oc = core.nextStdBreaker(ocFloor);
  out.EX1 = {
    V: 480, totalKW, contKW, noncontKW,
    I_total: I, I_cont: Icont, I_non: Inon,
    ampacity_floor_A: ampFloor, oc_floor_A: ocFloor, oc,
    conductor_75cu: pick31016(ampFloor, 'cu', 75),
  };
}

// EX2 — 235.202(B) feeder: 100 kVA transformer (13.8 kV/480 V) + 10 kW utilization equipment, secondary side
{
  const kVA = 100, kVp = 13.8, kVs = 0.48, utilKW = 10;
  const tfA = +(kVA / (kVs * Math.sqrt(3))).toFixed(2);  // secondary-side nameplate current
  const utilI = kwToA(kVs, utilKW, true);                // utilization current
  // 235.202(B): sum of nameplate ratings of transformers + 125% of utilization load (same side)
  const floor = +(tfA + 1.25 * utilI).toFixed(2);
  out.EX2 = {
    kVA, kVp, kVs, utilKW,
    tf_A: tfA, util_A: utilI,
    floor_A: floor, oc: core.nextStdBreaker(floor),
  };
}

// EX3 — 235.202(A) feeder supplying only transformers, 480 V, 2 x 100 kVA
{
  const kVA_each = 100, n = 2, V = 0.48;
  const A_each = +(kVA_each * 1000 / (V * 1000 * Math.sqrt(3))).toFixed(2); // V in kV
  const sum = A_each * n;
  out.EX3 = { kVA_each, n, V, A_each, sum, oc: core.nextStdBreaker(sum) };
}

// EX4 — 235.360(B) clearance increase above 22 kV (per kV or major fraction, +10 mm / 0.4 in)
{
  const rows = [
    { loc: "Open land (22 kV base)", base_m: 5.6, base_ft: 18.5 },
    { loc: "Roadways (22 kV base)", base_m: 5.6, base_ft: 18.5 },
    { loc: "Rails (22 kV base)", base_m: 8.1, base_ft: 26.5 },
  ];
  // 235.360(B): +10 mm (0.4 in) per kV, or major fraction, more than 22 kV. 35 kV = 13 kV above base.
  const dKV = 35 - 22;
  const addM = +(10 * dKV / 1000).toFixed(3);      // 0.13 m
  const addFt = +(0.4 * dKV / 12).toFixed(3);      // 0.433 ft (0.4 in/kV, converted)
  const for35kV = rows.map(r => ({
    loc: r.loc,
    at35kV_m: +(r.base_m + addM).toFixed(3),
    at35kV_ft: +(r.base_ft + addFt).toFixed(2),
  }));
  out.EX4 = { base_table_rows: rows, at35kV: for35kV, per_kV_mm: 10, per_kV_in: 0.4, addM, addFt };
}

// EX5 — 235.11 minimum number of branch circuits: 480 V, 100 A circuits for a 400 A load
{
  const loadA = 400, circuitA = 100;
  out.EX5 = { loadA, circuitA, min_circuits: Math.ceil(loadA / circuitA), conductor_75cu: pick31016(circuitA, 'cu', 75) };
}

// EX6 — 235.339 disconnect rating floor for a 480 V feeder, 150 A calculated load
{
  const loadA = 150;
  out.EX6 = { V: 480, loadA, min_disconnect_rating: core.nextStdBreaker(loadA) };
}

require('fs').writeFileSync(require('path').join(__dirname, 'art66_numbers.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
