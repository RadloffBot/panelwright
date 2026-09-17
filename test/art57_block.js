
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
  eq(has('selected not to exceed that allowed by 430.52 for the smallest rated motor'), true, 'art57: verbatim 2017 430.53(B) smallest-motor cap');
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
  eq(has('marked on any of the motor controllers is not exceeded'), true, 'art57: documents 2023 430.53(A)(2) "motor controllers" wording');
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
  eq((sitemap57.match(/<loc>/g) || []).length, 58, 'art57: sitemap has 58 URLs (art57 appended the 58th)');
  const index57 = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  eq(index57.includes('articles/nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art57: index cross-link present');
  const readme57 = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
  eq(readme57.includes('articles/nec-43024-43053-several-motors-one-branch-circuit.html'), true, 'art57: README entry present');
}
