// ASSUMPTIONS §11b — locks the scale of the exposure in, against two things the model did not
// produce itself. Each band carries its reason; the trace prints every tail.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { DEFAULT_ASSUMPTIONS, EOL_SETTLEMENT_NARROWBODY, SCALE_BANDS, SCENARIO_CONTROLS, SCENARIO_PRESETS, WIDEBODY_EVENT_VALUE_RATIO } from './constants';
import { assessFleet } from './exposure';
import { checkScale } from './scale';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const fleet = assessFleet(data);
const s = checkScale(data.aircraft, fleet);

describe('the scale of the exposure', () => {
  it('scales the widebody benchmark by total maintenance event value', () => {
    // 777-300ER $60.4–75.8M against A320-200 $17.7–19.2M: 68.1 ÷ 18.45 = 3.69.
    expect(WIDEBODY_EVENT_VALUE_RATIO).toBeCloseTo(68.1 / 18.45, 9);
    expect(s.benchmark.widebody).toBeCloseTo(EOL_SETTLEMENT_NARROWBODY * 3.691, -4);
  });

  it('is no more than the maintenance the returning tails accrue before handback, and not trivially less', () => {
    // Upper 1.0: a handback that costs more than all the maintenance it takes to get there is
    // counting something twice — before the over-delivery and cap fix this stood at 1.45.
    // Lower 0.2: four of the seven lessors write fat-threshold no-reserve leases; return
    // conditions that bite on almost nothing would be the opposite error.
    expect(s.accrualRatio).toBeGreaterThanOrEqual(SCALE_BANDS.accrualRatio.min);
    expect(s.accrualRatio).toBeLessThanOrEqual(SCALE_BANDS.accrualRatio.max);
  });

  it("puts no tail above twice its body class's published settlement", () => {
    // The benchmark is one settlement, on a smaller and older engine than the A320neo family.
    // Twice it leaves room for a fat-threshold lease with an engine past its limit; more than
    // that on any one aircraft is the overstatement this test exists to catch.
    for (const t of s.tails) expect(t.multiple, `${t.tail} at ${t.multiple.toFixed(2)} × benchmark`).toBeLessThanOrEqual(SCALE_BANDS.perTailMaxMultiple);
  });

  it('averages between 0.3 and 1.5 times the benchmark over the tails with any exposure', () => {
    // Centred on a real settlement: a fleet averaging well below it has thresholds that do not
    // bite; well above it is the error this test exists for. Tails owing nothing are left out —
    // a tail that clears every clause is not evidence about the size of a claim.
    expect(s.averageMultiple).toBeGreaterThanOrEqual(SCALE_BANDS.averageMultiple.min);
    expect(s.averageMultiple).toBeLessThanOrEqual(SCALE_BANDS.averageMultiple.max);
    expect(s.withinBands).toBe(true);
  });

  it('prints the arithmetic', () => {
    console.log('\n' + s.trace + '\n');
    expect(s.trace).toContain('accrual to handback');
  });
});

describe('the scenario controls', () => {
  it('start at the defaults, inside their declared ranges', () => {
    const c = SCENARIO_CONTROLS;
    const inside = (v: number, r: { min: number; max: number }) => v >= r.min && v <= r.max;
    expect(inside(DEFAULT_ASSUMPTIONS.maintenanceCostMultiplier, c.maintenanceCost)).toBe(true);
    expect(inside(DEFAULT_ASSUMPTIONS.utilisationMultiplier, c.utilisation)).toBe(true);
    expect(inside(DEFAULT_ASSUMPTIONS.downtimeCostPerDay.narrowbody, c.downtimeCostPerDay.narrowbody)).toBe(true);
    expect(inside(DEFAULT_ASSUMPTIONS.downtimeCostPerDay.widebody, c.downtimeCostPerDay.widebody)).toBe(true);
  });

  it('stop where the evidence stops: shop costs −9% to +50%, flying −13% to +20%', () => {
    expect(SCENARIO_CONTROLS.maintenanceCost).toMatchObject({ min: 0.91, max: 1.5 });
    expect(SCENARIO_CONTROLS.utilisation).toMatchObject({ min: 0.87, max: 1.2 });
  });

  it('offer presets that sit inside those ranges, each naming its basis', () => {
    const c = SCENARIO_CONTROLS;
    const inside = (v: number | undefined, r: { min: number; max: number }) => v === undefined || (v >= r.min && v <= r.max);
    for (const p of SCENARIO_PRESETS) {
      expect(inside(p.maintenanceCostMultiplier, c.maintenanceCost), p.id).toBe(true);
      expect(inside(p.utilisationMultiplier, c.utilisation), p.id).toBe(true);
      expect(inside(p.leaseExtensionMonths, c.leaseExtensionMonths), p.id).toBe(true);
      expect(p.basis.length, p.id).toBeGreaterThan(20);
    }
    expect(SCENARIO_PRESETS.find((p) => p.id === 'shop-overrun')!.basis).toContain('Oliver Wyman');
  });
});
