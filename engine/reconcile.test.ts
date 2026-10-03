// SPEC §2.9: the generated fleet's aggregate maintenance cost must land inside a sensible
// band of the IATA MCX FY2024 panel once mix-adjusted. Run with `npm test`.
//
// The test reads the generated dataset. The engine module it exercises does not.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { IATA_MCX_FY2024, RECONCILIATION_BAND } from './constants';
import { reconcileFleet } from './reconcile';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const result = reconcileFleet(data.aircraft);
const panel = result.panelEquivalent;
const actual = result.asGenerated;
const { min, max } = RECONCILIATION_BAND;

describe('reconciliation against the IATA MCX FY2024 panel', () => {
  it('prints the arithmetic', () => {
    console.log('\n' + result.trace + '\n');
    expect(result.trace.length).toBeGreaterThan(0);
  });

  it('uses the panel figures as published', () => {
    expect(IATA_MCX_FY2024.costPerFlightHour).toBe(1_522);
    expect(IATA_MCX_FY2024.costPerFlightCycle).toBe(3_758);
    expect(IATA_MCX_FY2024.costPerAircraftPerYear).toBe(5_050_000);
  });

  it('is a fleet of the size the customer described', () => {
    expect(actual.fleet.count).toBeGreaterThanOrEqual(260);
    expect(actual.fleet.count).toBeLessThanOrEqual(280);
  });

  describe('at panel conditions (temperate, panel utilisation) — this validates the cost tables', () => {
    it('lands inside the band on cost per aircraft, mix-adjusted for the narrowbody/widebody split', () => {
      expect(panel.ratios.perAircraft).toBeGreaterThanOrEqual(min);
      expect(panel.ratios.perAircraft).toBeLessThanOrEqual(max);
      expect(panel.withinBand).toBe(true);
    });

    it('lands inside the band on cost per flight hour and per flight cycle', () => {
      expect(panel.ratios.perFlightHour).toBeGreaterThanOrEqual(min);
      expect(panel.ratios.perFlightHour).toBeLessThanOrEqual(max);
      expect(panel.ratios.perFlightCycle).toBeGreaterThanOrEqual(min);
      expect(panel.ratios.perFlightCycle).toBeLessThanOrEqual(max);
    });

    it('keeps the unadjusted cost per flight hour inside the band of the raw panel figure', () => {
      // Hours are the currency least sensitive to body-class mix: widebodies cost more per
      // aircraft but also fly more hours. Cycles are not — widebodies burn few of them — so
      // the raw per-cycle figure is reported in the trace but not asserted.
      expect(panel.ratios.rawPerFlightHour).toBeGreaterThanOrEqual(min);
      expect(panel.ratios.rawPerFlightHour).toBeLessThanOrEqual(max);
    });

    it('costs a widebody roughly as many narrowbodies as the panel does', () => {
      // Panel: 42% of cost on 20.3% of the fleet → a widebody costs 2.84 narrowbodies.
      // The generated fleet lands near the bottom of this band, for two reasons that are
      // fleet traits rather than cost-table errors: half its narrowbodies fly a short-dense
      // profile (engine cost accrues per cycle), and its widebody arm is young A350/787 on
      // first-run engines where the panel's is older A330/777-era metal on mature engines.
      expect(panel.ratios.widebodyToNarrowbody).toBeGreaterThanOrEqual(0.6);
      expect(panel.ratios.widebodyToNarrowbody).toBeLessThanOrEqual(1.4);
    });

    it('puts most of the money on the engines, as the panel does', () => {
      // IATA: engines are 50% of total spend; of the ~56% the model covers, that is ~89%.
      // ASSUMPTIONS §11: >80% of direct maintenance cost on an A320, >90% on a 777-300ER.
      expect(panel.fleet.engineShare).toBeGreaterThanOrEqual(0.75);
      expect(panel.fleet.engineShare).toBeLessThanOrEqual(0.95);
    });
  });

  describe('as generated — a Gulf/Europe operator, deliberately not the panel average', () => {
    it('flies the fleet at a utilisation close to the panel', () => {
      expect(actual.ratios.flightHoursPerDay).toBeGreaterThanOrEqual(0.75);
      expect(actual.ratios.flightHoursPerDay).toBeLessThanOrEqual(1.25);
    });

    it('costs more than the panel average, for the two reasons the trace names, and not absurdly more', () => {
      // Harsh-high environment (+78% engine $/FH) and short-dense cycles both push cost up.
      // Below 1.0 would mean those effects are missing; above 2.0 would mean a cost table is wrong.
      expect(actual.ratios.perAircraft).toBeGreaterThanOrEqual(1.0);
      expect(actual.ratios.perAircraft).toBeLessThanOrEqual(2.0);
    });

    it('still puts most of the money on the engines', () => {
      expect(actual.fleet.engineShare).toBeGreaterThanOrEqual(0.75);
      expect(actual.fleet.engineShare).toBeLessThanOrEqual(0.95);
    });
  });
});
