// Hand-built fixtures for the calc tests. Nothing here is read from the dataset: the tests
// must say what they expect in numbers a reader can check by hand.

import { DEFAULT_ASSUMPTIONS } from './constants';
import { addMonths } from './projection';
import type { Aircraft, Assumptions, Component, ComponentKind, Lessor, Metric, ReturnCondition } from './types';

export const AS_OF = '2026-10-03';

/** 16 model-months is exactly 487 days, so the fixture's months to return are a whole number. */
export const MONTHS = 16;

export function component(kind: ComponentKind, position: Component['position'], over: Partial<Component> = {}): Component {
  const base: Component = {
    id: `${position}-id`,
    serial: `${position}-serial`,
    kind,
    model: kind === 'engine' ? 'LEAP-1A26' : 'A320neo',
    position,
    dateOfManufacture: '2018-01-01',
    tsn: 0,
    csn: 0,
    tso: 0,
    cso: 0,
    llpMinCyclesRemaining: 0,
    lastShopVisit: null,
    lastWorkscope: 'none',
    shopVisitCount: 0,
    derate: 10,
    qmeStatus: 'verified',
    asLeaseAllows: { tso: 0, cso: 0, llpMinCyclesRemaining: 0 },
    onTailSince: '2018-01-01',
    installedOn: 'T-TEST',
  };
  const c = { ...base, ...over };
  if (!over.asLeaseAllows) c.asLeaseAllows = { tso: c.tso, cso: c.cso, llpMinCyclesRemaining: c.llpMinCyclesRemaining };
  return c;
}

/**
 * An A320neo, temperate, 275 FH and 100 FC a month — 2.75 FH:FC, the narrowbody reference
 * flight leg, so hours and cycles read the same interval — lease ending exactly 16
 * model-months after AS_OF. LEAP-1A26 first-run time on wing is 12,500 FC = 34,375 FH;
 * mature-run 10,000 FC = 27,500 FH. Sixteen months fly 4,400 FH, 1,600 FC, 1,280 APU hours.
 */
export function aircraft(over: Partial<Aircraft> = {}, components?: Component[]): Aircraft {
  return {
    tail: 'T-TEST',
    msn: '1',
    type: 'A320neo',
    bodyClass: 'narrowbody',
    engineModel: 'LEAP-1A26',
    lessorId: 'L00',
    lessor: 'Test Lessor',
    leaseStart: '2018-01-01',
    leaseEnd: addMonths(AS_OF, MONTHS),
    status: 'returning',
    routeProfile: 'mixed',
    hoursPerMonth: 275,
    cyclesPerMonth: 100,
    base: 'VIE',
    environment: 'temperate',
    ageYears: 8,
    components: components ?? [
      // ENG1: first-run, 6,375 FH / 2,000 FC / 9,000 LLP FC left today. Nothing short at 16 months.
      component('engine', 'ENG1', { tso: 28_000, cso: 10_500, llpMinCyclesRemaining: 9_000 }),
      // ENG2: one build-for-interval visit, 2,000 FH / 500 FC left today → short on both; LLP 19,500 → surplus.
      component('engine', 'ENG2', {
        tso: 25_500,
        cso: 9_500,
        llpMinCyclesRemaining: 19_500,
        lastShopVisit: '2024-01-01',
        lastWorkscope: 'build-for-interval',
        shopVisitCount: 1,
      }),
      // MLG: overhauled once; 2,400 FC since → 24 months since; 17,600 FC to next as carried.
      component('landing-gear', 'MLG', { cso: 2_400, tso: 6_600, llpMinCyclesRemaining: 17_600, lastWorkscope: 'build-for-interval', shopVisitCount: 1, derate: 0 }),
      // AIRFRAME: 6Y check done; 6,000 FC since = 60 months → 12 months left today.
      component('airframe', 'AIRFRAME', { cso: 6_000, tso: 16_500, llpMinCyclesRemaining: 1_200, lastWorkscope: 'build-for-interval', shopVisitCount: 1, derate: 0 }),
      // APU: never overhauled, 7,500 APU hours used of 8,000.
      component('apu', 'APU', { tso: 7_500, cso: 9_375, llpMinCyclesRemaining: 625, derate: 0 }),
    ],
    ...over,
  };
}

export function condition(
  componentKind: ComponentKind,
  metric: Metric,
  threshold: number,
  unit: ReturnCondition['unit'],
  compensationRate: number,
  n: number,
  tail = 'T-TEST',
): ReturnCondition {
  return {
    id: `${tail}-RC${n}`,
    tail,
    componentKind,
    metric,
    threshold,
    unit,
    compensationRate,
    rateTrace: 'fixture',
    clauseRef: `Schedule 3, para ${n}`,
    clauseText: 'fixture',
    qmeClauseRef: 'Clause 14.1',
  };
}

/** The seven conditions a generated tail carries, with round-number rates. */
export function conditions(tail = 'T-TEST'): ReturnCondition[] {
  return [
    condition('engine', 'hoursRemaining', 500, 'FH', 600, 1, tail),
    condition('engine', 'cyclesRemaining', 200, 'FC', 1_800, 2, tail),
    condition('engine', 'llpCyclesRemaining', 500, 'FC', 330, 3, tail),
    condition('landing-gear', 'monthsRemaining', 6, 'months', 5_000, 4, tail),
    condition('landing-gear', 'cyclesRemaining', 1_000, 'FC', 40, 5, tail),
    condition('airframe', 'monthsRemaining', 4, 'months', 20_000, 6, tail),
    condition('apu', 'hoursRemaining', 200, 'APU-FH', 70, 7, tail),
  ];
}

export function assumptions(over: Partial<Assumptions> = {}): Assumptions {
  return { ...DEFAULT_ASSUMPTIONS, ...over };
}

/** No-reserve by default, so no reserve balance enters the arithmetic unless a test asks for one. */
export function lessor(over: Partial<Lessor> = {}): Lessor {
  return {
    id: 'L00',
    name: 'Test Lessor',
    architecture: 'no-reserve',
    negotiationMultiplier: 1.25,
    qmeClauseRef: 'Clause 14.1',
    qmeClauseText: 'fixture',
    ...over,
  };
}

/**
 * Spare LEAP-1A26s for lever 3, all mature-run (10,000 FC / 27,500 FH on wing) unless said
 * otherwise. Over the fixture's 16 months they fly 1,600 FC and 4,400 FH.
 */
export function spare(id: string, serial: string, over: Partial<Component> = {}): Component {
  return component('engine', 'POOL', {
    id,
    serial,
    lastWorkscope: 'build-for-interval',
    shopVisitCount: 1,
    installedOn: 'POOL',
    ...over,
  });
}
