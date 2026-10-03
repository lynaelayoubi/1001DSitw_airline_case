// SPEC §2.1 — project forward. Every expectation is arithmetic on the fixture a reader can
// redo by hand: 275 FH and 100 FC a month for 16 months (exactly 487 days).

import { describe, expect, it } from 'vitest';

import { DAYS_PER_MONTH } from './constants';
import { AS_OF, MONTHS, aircraft, assumptions, component, conditions } from './fixtures.test-helpers';
import { addMonths, monthsBetween, monthlyRate, projectUsage, projectedUse, readClock } from './projection';

describe('calendar', () => {
  it('counts months at 30.4375 days', () => {
    expect(DAYS_PER_MONTH).toBe(30.4375);
    expect(addMonths(AS_OF, MONTHS)).toBe('2028-02-02'); // 487 days on
    expect(monthsBetween(AS_OF, addMonths(AS_OF, MONTHS))).toBeCloseTo(16, 9);
    expect(monthsBetween('2026-01-01', '2026-01-31')).toBeCloseTo(30 / 30.4375, 9);
  });

  it('rounds a date to the nearest day', () => {
    expect(addMonths('2026-01-01', 1)).toBe('2026-01-31'); // 30.4375 → 30 days
    expect(addMonths('2026-01-01', 2)).toBe('2026-03-03'); // 60.875 → 61 days
    expect(addMonths('2026-03-03', -2)).toBe('2026-01-01');
  });
});

describe('projectUsage', () => {
  const ac = aircraft();

  it('multiplies monthly use by months to return', () => {
    const p = projectUsage(ac, AS_OF, assumptions());
    expect(p.monthsToReturn).toBeCloseTo(16, 9);
    expect(p.hours).toBeCloseTo(4_400, 6);
    expect(p.cycles).toBeCloseTo(1_600, 6);
    expect(p.apuHours).toBeCloseTo(1_280, 6); // 1,600 FC × 0.8 APU hours per cycle
    expect(p.months).toBeCloseTo(16, 9);
    expect(p.fhFc).toBe(2.75);
  });

  it('applies the utilisation multiplier to hours and cycles alike', () => {
    const p = projectUsage(ac, AS_OF, assumptions({ utilisationMultiplier: 1.1 }));
    expect(p.hours).toBeCloseTo(4_840, 6);
    expect(p.cycles).toBeCloseTo(1_760, 6);
    expect(p.trace).toContain('utilisation 1.10');
  });

  it('extends the lease per tail, in months', () => {
    const p = projectUsage(ac, AS_OF, assumptions({ leaseExtensionMonths: { 'T-TEST': 6 } }));
    expect(p.monthsToReturn).toBeCloseTo(22, 9);
    expect(p.effectiveLeaseEnd).toBe(addMonths(ac.leaseEnd, 6));
    expect(p.hours).toBeCloseTo(6_050, 6);
    expect(p.trace).toContain('+ 6 months extension');
    const other = projectUsage(ac, AS_OF, assumptions({ leaseExtensionMonths: { 'X-OTHER': 6 } }));
    expect(other.monthsToReturn).toBeCloseTo(16, 9);
  });

  it('books the shop slot a lead time before handback', () => {
    const p = projectUsage(ac, AS_OF, assumptions({ shopSlotLeadTimeMonths: 4 }));
    expect(p.shopSlotDeadline).toBe(addMonths(ac.leaseEnd, -4));
    expect(monthsBetween(p.shopSlotDeadline, p.effectiveLeaseEnd)).toBeCloseTo(4, 1);
    expect(p.trace).toContain('book by ' + p.shopSlotDeadline);
  });

  it('never projects backwards for a lease already ended', () => {
    const p = projectUsage(aircraft({ leaseEnd: '2026-01-01' }), AS_OF, assumptions());
    expect(p.monthsToReturn).toBe(0);
    expect(p.hours).toBe(0);
  });

  it('answers in each currency', () => {
    const p = projectUsage(ac, AS_OF, assumptions());
    expect(projectedUse(p, 'FH')).toBe(p.hours);
    expect(projectedUse(p, 'FC')).toBe(p.cycles);
    expect(projectedUse(p, 'APU-FH')).toBe(p.apuHours);
    expect(projectedUse(p, 'months')).toBe(p.months);
    expect(monthlyRate(p, 'FH')).toBe(275);
    expect(monthlyRate(p, 'FC')).toBe(100);
    expect(monthlyRate(p, 'APU-FH')).toBeCloseTo(80, 9);
    expect(monthlyRate(p, 'months')).toBe(1);
  });
});

describe('readClock', () => {
  const ac = aircraft();
  const rcs = conditions();
  const engHours = rcs[0]!;
  const engCycles = rcs[1]!;
  const llp = rcs[2]!;
  const gearMonths = rcs[3]!;
  const gearCycles = rcs[4]!;
  const afMonths = rcs[5]!;
  const apuHours = rcs[6]!;
  const eng1 = ac.components[0]!;
  const eng2 = ac.components[1]!;

  it('reads a first-run engine against its first-run time on wing', () => {
    // LEAP-1A26 first-run, temperate: 12,500 FC × 1.0 = 12,500 FC; × 2.75 reference FH:FC = 34,375 FH.
    const h = readClock(ac, eng1, engHours, 'as-recorded');
    expect(h.limit).toBeCloseTo(34_375, 6);
    expect(h.remainingToday).toBeCloseTo(6_375, 6);
    const c = readClock(ac, eng1, engCycles, 'as-recorded');
    expect(c.limit).toBeCloseTo(12_500, 6);
    expect(c.remainingToday).toBeCloseTo(2_000, 6);
    expect(readClock(ac, eng1, llp, 'as-recorded').remainingToday).toBe(9_000);
  });

  it('reads a mature-run engine against its shorter mature-run time on wing', () => {
    // 10,000 FC × 1.0; × 2.75 = 27,500 FH.
    expect(readClock(ac, eng2, engHours, 'as-recorded').remainingToday).toBeCloseTo(2_000, 6);
    expect(readClock(ac, eng2, engCycles, 'as-recorded').remainingToday).toBeCloseTo(500, 6);
  });

  it('quotes the hours interval at the reference flight leg, whatever the tail flies', () => {
    const longLegs = aircraft({ hoursPerMonth: 400, cyclesPerMonth: 100 });
    const h = readClock(longLegs, eng1, engHours, 'as-recorded');
    expect(h.limit).toBeCloseTo(34_375, 6);
    expect(h.trace).toContain('this tail flies 4.00');
  });

  it('shortens time on wing in a harsh environment', () => {
    const harsh = aircraft({ environment: 'harsh-high' });
    // 12,500 × 0.64 = 8,000 FC; 8,000 − 10,500 = −2,500: already past the interval.
    expect(readClock(harsh, eng1, engCycles, 'as-recorded').remainingToday).toBeCloseTo(-2_500, 6);
    expect(readClock(harsh, eng1, engCycles, 'as-recorded').trace).toContain('× 0.64');
  });

  it('reads the lease position when asked', () => {
    const c = component('engine', 'ENG2', { ...eng2, qmeStatus: 'not-evidenced', asLeaseAllows: { tso: 40_000, cso: 13_000, llpMinCyclesRemaining: 4_000 } });
    expect(readClock(ac, c, engHours, 'as-recorded').remainingToday).toBeCloseTo(2_000, 6);
    const lease = readClock(ac, c, engHours, 'as-lease-allows');
    expect(lease.remainingToday).toBeCloseTo(-12_500, 6);
    expect(lease.trace).toContain('not evidenced as a QME');
    expect(readClock(ac, c, llp, 'as-lease-allows').remainingToday).toBe(4_000);
  });

  it('infers months since overhaul from cycles for gear and airframe', () => {
    // MLG: 2,400 FC ÷ 100 FC a month = 24 months of a 144-month interval → 120 left.
    const g = readClock(ac, ac.components[2]!, gearMonths, 'as-recorded');
    expect(g.limit).toBe(144);
    expect(g.used).toBeCloseTo(24, 9);
    expect(g.remainingToday).toBeCloseTo(120, 9);
    expect(readClock(ac, ac.components[2]!, gearCycles, 'as-recorded').remainingToday).toBe(17_600);
    // AIRFRAME: 6,000 FC ÷ 100 = 60 months of the 72-month 6Y check → 12 left.
    const a = readClock(ac, ac.components[3]!, afMonths, 'as-recorded');
    expect(a.limit).toBe(72);
    expect(a.remainingToday).toBeCloseTo(12, 9);
  });

  it('reads the APU in APU hours', () => {
    const r = readClock(ac, ac.components[4]!, apuHours, 'as-recorded');
    expect(r.limit).toBe(8_000);
    expect(r.remainingToday).toBe(500);
  });

  it('refuses a metric the component has no clock for', () => {
    expect(() => readClock(ac, ac.components[4]!, engCycles, 'as-recorded')).toThrow(/No clock/);
  });
});
