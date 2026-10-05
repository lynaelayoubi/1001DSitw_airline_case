// SPEC §2.2–§2.5 — gap, pricing, the binding clock, over-delivery and the QME adjustment.
// Fixture arithmetic (see fixtures.test-helpers.ts): 275 FH / 100 FC a month for 16 months,
// so 4,400 FH, 1,600 FC and 1,280 APU hours are flown before handback.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { RETURNING_WINDOW_MONTHS } from './constants';
import { assessComponent, assessFleet, assessRequirement, assessTail, bindingClock, unitCostOfLife } from './exposure';
import { AS_OF, aircraft, assumptions, component, conditions } from './fixtures.test-helpers';
import { projectUsage } from './projection';
import type { Dataset } from './types';

const ac = aircraft();
const rcs = conditions();
const engHours = rcs[0]!;
const engCycles = rcs[1]!;
const llp = rcs[2]!;
const gearMonths = rcs[3]!;
const afMonths = rcs[5]!;
const apuHours = rcs[6]!;
const eng1 = ac.components[0]!;
const eng2 = ac.components[1]!;
const mlg = ac.components[2]!;
const airframe = ac.components[3]!;
const apu = ac.components[4]!;
const a = assumptions();
const p = projectUsage(ac, AS_OF, a);

describe('§2.2 gap per requirement', () => {
  it('is threshold minus what is left at return; negative is over-delivery', () => {
    // ENG1 hours: 6,375 today − 4,400 flown = 1,975 at return; lease wants 500 → gap −1,475.
    const r = assessRequirement(ac, eng1, engHours, p, 'as-recorded', a);
    expect(r.remainingToday).toBeCloseTo(6_375, 6);
    expect(r.projectedUse).toBeCloseTo(4_400, 6);
    expect(r.remainingAtReturn).toBeCloseTo(1_975, 6);
    expect(r.gap).toBeCloseTo(-1_475, 6);
    expect(r.shortfallUnits).toBe(0);
    expect(r.surplusUnits).toBeCloseTo(1_475, 6);
    expect(r.compensation).toBe(0);
    expect(r.slackMonths).toBeCloseTo(1_475 / 275, 9);
  });

  it('is positive when short', () => {
    // ENG2 hours: 2,000 − 4,400 = −2,400 at return; wants 500 → gap 2,900 FH.
    const r = assessRequirement(ac, eng2, engHours, p, 'as-recorded', a);
    expect(r.gap).toBeCloseTo(2_900, 6);
    expect(r.shortfallUnits).toBeCloseTo(2_900, 6);
    expect(r.surplusUnits).toBe(0);
    expect(r.slackMonths).toBeCloseTo(-2_900 / 275, 9);
  });
});

describe('§2.3 price the shortfall', () => {
  it('is shortfall units × the clause rate', () => {
    const h = assessRequirement(ac, eng2, engHours, p, 'as-recorded', a);
    expect(h.compensation).toBeCloseTo(2_900 * 600, 3); // $1,740,000
    // ENG2 cycles: 500 − 1,600 = −1,100; wants 200 → gap 1,300 FC × $1,800.
    const c = assessRequirement(ac, eng2, engCycles, p, 'as-recorded', a);
    expect(c.gap).toBeCloseTo(1_300, 6);
    expect(c.compensation).toBeCloseTo(1_300 * 1_800, 3); // $2,340,000
    expect(c.trace).toContain('shortfall 1,300 FC × $1800.00/FC = $2,340,000');
  });

  it('the binding clock is whichever produces the larger compensation', () => {
    const r = assessComponent(ac, eng2, rcs, p, 'as-recorded', a);
    expect(r.binding.metric).toBe('cyclesRemaining');
    expect(r.binding.unit).toBe('FC');
    expect(r.binding.how).toBe('shortfall');
    // Cycles ($2.34M) counted, hours ($1.74M) not: one engine, one shop visit.
    expect(r.compensation).toBeCloseTo(2_340_000, 3);
    expect(r.trace).toContain('FC binds');
    expect(r.trace).toContain('The other clock is not counted');
  });

  it('when nothing is short, the binding clock is the one that runs out first', () => {
    // ENG1: hours slack 1,475 FH = 5.4 months; cycles 400 − 200 = 200 FC = 2.0 months → cycles.
    const r = assessComponent(ac, eng1, rcs, p, 'as-recorded', a);
    expect(r.compensation).toBe(0);
    expect(r.binding.metric).toBe('cyclesRemaining');
    expect(r.binding.how).toBe('tightest');
  });

  it('hours versus cycles, made executable: the same engine binds differently on a different route', () => {
    // 3,850 FH and 1,400 FC left today on a first-run engine (34,375 FH / 12,500 FC interval).
    const eng = component('engine', 'ENG1', { tso: 30_525, cso: 11_100, llpMinCyclesRemaining: 15_000 });
    const short = aircraft({ routeProfile: 'short-dense', hoursPerMonth: 291, cyclesPerMonth: 151 }, [eng]);
    const long = aircraft({ routeProfile: 'long-haul', hoursPerMonth: 350, cyclesPerMonth: 44 }, [eng]);
    const on = (tail: typeof short) => assessComponent(tail, eng, rcs, projectUsage(tail, AS_OF, a), 'as-recorded', a);
    // Short legs: 151 × 16 = 2,416 FC against 1,400 → 1,216 short on cycles ($2.19M); 291 × 16 = 4,656 FH against 3,850 → 1,306 short ($0.78M).
    expect(on(short).binding).toMatchObject({ unit: 'FC', how: 'shortfall' });
    expect(on(short).compensation).toBeCloseTo(1_216 * 1_800, 3);
    // Long legs: 44 × 16 = 704 FC leaves 696, clear; 350 × 16 = 5,600 FH against 3,850 → 2,250 short on hours.
    expect(on(long).binding).toMatchObject({ unit: 'FH', how: 'shortfall' });
    expect(on(long).compensation).toBeCloseTo(2_250 * 600, 3);
  });

  it('bindingClock only ever picks an interval clock, never the LLP clause', () => {
    const reqs = assessComponent(ac, eng2, rcs, p, 'as-recorded', a).requirements;
    expect(bindingClock(reqs).metric).not.toBe('llpCyclesRemaining');
    expect(reqs.find((r) => r.metric === 'llpCyclesRemaining')!.group).toBe('llp');
  });

  it('counts the LLP clause on top of the binding clock', () => {
    const eng = component('engine', 'ENG1', { ...eng2, llpMinCyclesRemaining: 1_000 });
    // LLP: 1,000 − 1,600 = −600 at return; wants 500 → 1,100 FC × $330 = $363,000, on top of $2.34M.
    const r = assessComponent(ac, eng, rcs, p, 'as-recorded', a);
    expect(r.compensationUncapped).toBeCloseTo(2_340_000 + 363_000, 3);
  });

  it("caps compensation at the cheapest work that would put it right, at the lessor's provider's rates", () => {
    // A $50,000/FC rate makes the linear figure $65M. Only a restoration clock is short, so the
    // work is a restoration at the build-for-cash price (both workscopes buy the same time on
    // wing): visit 2, mature-run going in, $6.5M × 3.10 ÷ 3.88 = $5,193,299 to us — and × 1.25
    // at the commercial rates of the lessor's chosen provider, the lease's own remedy.
    const dear = rcs.map((rc) => (rc.metric === 'cyclesRemaining' && rc.componentKind === 'engine' ? { ...rc, compensationRate: 50_000 } : rc));
    const r = assessComponent(ac, eng2, dear, p, 'as-recorded', a);
    expect(r.compensationUncapped).toBeCloseTo(1_300 * 50_000, 3);
    expect(r.rectificationCost).toBeCloseTo(6_500_000 * (3.1 / 3.88) * 1.25, 3);
    expect(r.compensation).toBeCloseTo(r.rectificationCost, 3);
    expect(r.trace).toContain('cheapest work that would put it right');
    expect(r.trace).toContain("lessor's chosen provider's commercial rates");
    const normal = assessComponent(ac, eng2, rcs, p, 'as-recorded', a);
    expect(normal.compensation).toBe(normal.compensationUncapped);
    expect(normal.trace).not.toContain('capped');
  });

  it('adds an LLP replacement to the cap only when the LLP clause is short', () => {
    // 1,000 FC of LLP life: 1,100 FC short of the clause. Cap = (restoration + a build-for-cash
    // LLP replacement, $6.6M × 2.40 ÷ 3.88 = $4,082,474) × 1.25.
    const eng = component('engine', 'ENG1', { ...eng2, llpMinCyclesRemaining: 1_000 });
    const dear = rcs.map((rc) => (rc.metric === 'cyclesRemaining' && rc.componentKind === 'engine' ? { ...rc, compensationRate: 50_000 } : rc));
    const r = assessComponent(ac, eng, dear, p, 'as-recorded', a);
    expect(r.rectificationCost).toBeCloseTo((6_500_000 * (3.1 / 3.88) + 6_600_000 * (2.4 / 3.88)) * 1.25, 3);
    expect(r.trace).toContain('an LLP replacement');
  });
});

describe('§2.4 price the over-delivery', () => {
  it('costs nothing where no shop visit was paid for during the lease', () => {
    const r = assessRequirement(ac, eng1, llp, p, 'as-recorded', a);
    expect(r.surplusUnits).toBeCloseTo(6_900, 6); // 9,000 − 1,600 − 500
    expect(r.unitCostOfLife).toBe(0);
    expect(r.overDelivery).toBe(0);
    expect(unitCostOfLife(ac, eng1, llp, a).trace).toContain('no shop visit');
  });

  it('counts only the LLP life a build-for-interval visit bought beyond a build-for-cash one', () => {
    // Surplus 19,500 − 1,600 − 500 = 17,400 FC. Build-for-interval bought a 20,000 FC bucket where
    // build-for-cash would have bought 8,000 and still cleared the clause: 12,000 FC × ($6.6M ÷
    // 20,000 FC = $330) = $3,960,000 was avoidable. The other 5,400 FC are the remainder of a
    // visit that had to happen.
    const r = assessRequirement(ac, eng2, llp, p, 'as-recorded', a);
    expect(r.surplusUnits).toBeCloseTo(17_400, 6);
    expect(r.avoidableSurplusUnits).toBe(12_000);
    expect(r.unitCostOfLife).toBeCloseTo(330, 9);
    expect(r.overDelivery).toBeCloseTo(12_000 * 330, 3);
    expect(r.trace).toContain('were avoidable');
  });

  it('counts none of it when the cheapest workscope bought it', () => {
    const cash = component('engine', 'ENG2', { ...eng2, lastWorkscope: 'build-for-cash' });
    expect(assessRequirement(ac, cash, llp, p, 'as-recorded', a).overDelivery).toBe(0);
  });

  it('counts none of it when the cheaper bucket would have left the clause short', () => {
    // 13,000 FC of LLP life: 10,900 FC surplus, less than the 12,000 FC a build-for-cash visit
    // would have saved — so it would have been short, and build-for-interval was needed.
    const tight = component('engine', 'ENG2', { ...eng2, llpMinCyclesRemaining: 13_000 });
    const r = assessRequirement(ac, tight, llp, p, 'as-recorded', a);
    expect(r.surplusUnits).toBeCloseTo(10_900, 6);
    expect(r.overDelivery).toBe(0);
    expect(r.trace).toContain('was needed');
  });

  it('counts no restoration surplus: both workscopes buy the same time on wing, and the visit had to happen', () => {
    // Fresh mature-run engine: 27,500 FH / 10,000 FC left — a surplus, but not an avoidable one.
    const fresh = component('engine', 'ENG2', { ...eng2, tso: 0, cso: 0 });
    const h = assessRequirement(ac, fresh, engHours, p, 'as-recorded', a);
    expect(h.surplusUnits).toBeCloseTo(27_500 - 4_400 - 500, 6);
    expect(h.overDelivery).toBe(0);
    expect(h.trace).toContain('unavoidable remainder of a restoration');
    // The price of that life is still known — the swap lever uses it for a spare.
    expect(unitCostOfLife(ac, fresh, engCycles, a).rate).toBeCloseTo(5_400_000 / 10_000, 9); // $540/FC
  });

  it('the cheap visit costs more per cycle of life it buys', () => {
    const cash = component('engine', 'ENG2', { ...eng2, lastWorkscope: 'build-for-cash' });
    const interval = unitCostOfLife(ac, eng2, llp, a).rate;
    const cashRate = unitCostOfLife(ac, cash, llp, a).rate;
    // build-for-cash LLP: $6.6M × (2.4 ÷ 3.88) ÷ 8,000 FC ≈ $510/FC against $330/FC.
    expect(cashRate).toBeGreaterThan(interval * 1.5);
  });

  it('counts no check or overhaul surplus, and prices shortfalls at the clause rate', () => {
    // MLG months: 120 − 16 = 104 at return; wants 6 → 98 months over, the remainder of an overhaul that had to happen.
    const g = assessRequirement(ac, mlg, gearMonths, p, 'as-recorded', a);
    expect(g.surplusUnits).toBeCloseTo(98, 9);
    expect(g.overDelivery).toBe(0);
    expect(unitCostOfLife(ac, mlg, gearMonths, a).rate).toBeCloseTo(680_000 / 144, 9);
    // AIRFRAME: 12 − 16 = −4 at return; wants 4 → short 8 months × $20,000.
    const f = assessRequirement(ac, airframe, afMonths, p, 'as-recorded', a);
    expect(f.gap).toBeCloseTo(8, 9);
    expect(f.compensation).toBeCloseTo(160_000, 3);
    // APU: 500 − 1,280 = −780; wants 200 → short 980 × $70.
    const u = assessRequirement(ac, apu, apuHours, p, 'as-recorded', a);
    expect(u.compensation).toBeCloseTo(980 * 70, 3);
  });

  it('scales with the maintenance cost multiplier', () => {
    const r = assessRequirement(ac, eng2, llp, p, 'as-recorded', assumptions({ maintenanceCostMultiplier: 2 }));
    expect(r.unitCostOfLife).toBeCloseTo(660, 9);
  });

  it('is left out of exposure when the scenario says not to count it', () => {
    const counted = assessComponent(ac, eng2, rcs, p, 'as-recorded', a);
    const not = assessComponent(ac, eng2, rcs, p, 'as-recorded', assumptions({ countOverDeliveryAsLoss: false }));
    expect(counted.exposure).toBeCloseTo(counted.compensation + counted.overDelivery, 3);
    expect(not.exposure).toBeCloseTo(not.compensation, 3);
    expect(not.overDelivery).toBeCloseTo(counted.overDelivery, 3);
  });
});

describe('§2.5 the QME adjustment', () => {
  // ENG2's visit not evidenced: the lease measures from the previous event, 8,000 FC earlier.
  const unevidenced = component('engine', 'ENG2', {
    ...eng2,
    qmeStatus: 'not-evidenced',
    asLeaseAllows: { tso: 25_500 + 22_000, cso: 9_500 + 8_000, llpMinCyclesRemaining: 19_500 - 8_000 },
  });
  const tail = aircraft({}, [eng1, unevidenced, mlg, airframe, apu]);
  const t = assessTail(tail, rcs, AS_OF, a);

  it('shows two numbers side by side', () => {
    expect(t.asRecorded.basis).toBe('as-recorded');
    expect(t.asLeaseAllows.basis).toBe('as-lease-allows');
    expect(t.asLeaseAllows.compensation).toBeGreaterThan(t.asRecorded.compensation);
    expect(t.qmeFlag).toBe(true);
    expect(t.qmePositions).toEqual(['ENG2']);
  });

  it('the lease position is capped like any other', () => {
    const lease = t.asLeaseAllows.components[1]!;
    expect(lease.compensation).toBeCloseTo(lease.rectificationCost, 3);
    expect(lease.compensationUncapped).toBeGreaterThan(lease.rectificationCost);
  });

  it('keeps over-delivery at the recorded figure: the visit was paid for either way', () => {
    expect(t.asLeaseAllows.overDelivery).toBeCloseTo(t.asRecorded.overDelivery, 3);
    expect(t.asLeaseAllows.components[1]!.trace).toContain('held at the recorded');
    expect(t.qmeDelta).toBeCloseTo(t.asLeaseAllows.compensation - t.asRecorded.compensation, 3);
    expect(t.qmeDelta).toBeGreaterThan(0);
  });

  it('is a no-op when everything is evidenced', () => {
    const clean = assessTail(ac, rcs, AS_OF, a);
    expect(clean.qmeFlag).toBe(false);
    expect(clean.qmeDelta).toBe(0);
    expect(clean.asLeaseAllows.exposure).toBeCloseTo(clean.asRecorded.exposure, 3);
  });
});

describe('a tail, end to end', () => {
  const t = assessTail(ac, rcs, AS_OF, a);

  it('adds up', () => {
    const sum = t.asRecorded.components.reduce((s, c) => s + c.exposure, 0);
    expect(t.asRecorded.exposure).toBeCloseTo(sum, 3);
    const kinds = Object.values(t.asRecorded.byKind).reduce((s, k) => s + k.exposure, 0);
    expect(kinds).toBeCloseTo(sum, 3);
    expect(t.asRecorded.byKind.engine.compensation).toBeCloseTo(2_340_000, 3);
  });

  it('names the clock that costs the most on the tail', () => {
    expect(t.binding).toMatchObject({ position: 'ENG2', unit: 'FC', how: 'shortfall' });
    expect(t.binding.compensation).toBeCloseTo(2_340_000, 3);
  });

  it('carries a trace on every result', () => {
    expect(t.trace).toContain('Binding clock: ENG2 FC');
    for (const c of t.asRecorded.components) {
      expect(c.trace.length).toBeGreaterThan(40);
      for (const r of c.requirements) expect(r.trace).toContain('Lease demands');
    }
  });

  it('keeps a returning tail in the window when a scenario extends its lease past it', () => {
    const extended = assessTail(ac, rcs, AS_OF, assumptions({ leaseExtensionMonths: { 'T-TEST': 12 } }));
    expect(extended.projection.monthsToReturn).toBeCloseTo(28, 9);
    expect(extended.withinHorizon).toBe(true);
  });

  it('flags tails beyond the window the model is built for', () => {
    expect(t.withinHorizon).toBe(true);
    const far = assessTail(aircraft({ leaseEnd: '2035-01-01', status: 'in-service' }), rcs, AS_OF, a);
    expect(far.projection.monthsToReturn).toBeGreaterThan(RETURNING_WINDOW_MONTHS);
    expect(far.withinHorizon).toBe(false);
  });
});

describe('the generated fleet', () => {
  const data = dataset as unknown as Dataset;
  const fleet = assessFleet(data);

  it('assesses every tail and ranks by exposure', () => {
    expect(fleet.tails).toHaveLength(data.aircraft.length);
    expect(fleet.returning).toHaveLength(10);
    for (let i = 1; i < fleet.tails.length; i++) expect(fleet.tails[i]!.asRecorded.exposure).toBeLessThanOrEqual(fleet.tails[i - 1]!.asRecorded.exposure);
    for (const t of fleet.returning) expect(t.withinHorizon).toBe(true);
  });

  it('lands the ten returning tails in the tens of millions, as ASSUMPTIONS §7 expects', () => {
    expect(fleet.totals.compensation).toBeGreaterThan(10e6);
    expect(fleet.totals.compensation).toBeLessThan(100e6);
    expect(fleet.totals.doNothing).toBeCloseTo(fleet.totals.compensation + fleet.totals.overDelivery, 3);
  });

  it('binds on hours for some tails and cycles for others', () => {
    const units = new Set(fleet.returning.map((t) => t.binding.unit));
    expect(units.has('FH')).toBe(true);
    expect(units.has('FC')).toBe(true);
  });

  it('never claims more on a component than putting it right would cost', () => {
    for (const t of fleet.tails)
      for (const basis of [t.asRecorded, t.asLeaseAllows])
        for (const c of basis.components) expect(c.compensation).toBeLessThanOrEqual(c.rectificationCost + 1e-6);
  });

  it('the lease never sees less than the maintenance system', () => {
    for (const t of fleet.tails) expect(t.qmeDelta).toBeGreaterThanOrEqual(-1e-6);
    expect(fleet.totals.qmeTails).toBeGreaterThan(0);
    expect(fleet.totals.qmeDelta).toBeGreaterThan(0);
  });

  it('prints the headline arithmetic', () => {
    console.log('\n' + fleet.trace + '\n');
    expect(fleet.trace).toContain('tails returning');
  });
});

describe('the fleet total, by kind of money', () => {
  const t = assessFleet(dataset as unknown as Dataset).totals;

  it('splits doing nothing into cash out at handback and life already spent, and says what share is cash', () => {
    expect(t.compensation + t.overDelivery).toBeCloseTo(t.doNothing, 2);
    expect(t.cashShare).toBeCloseTo(t.compensation / t.doNothing, 12);
    // On this fleet, slightly under half: $32.3M of $68.8M.
    expect(t.cashShare).toBeGreaterThan(0.45);
    expect(t.cashShare).toBeLessThan(0.5);
  });
});
