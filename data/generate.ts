// The synthetic fleet. Run with `npm run generate`; writes data/fleet.json.
//
// Everything here is invented, deterministically, from a seed. No real customer data. Every
// rate and cost comes from calc/constants.ts (documented in ASSUMPTIONS.md); this file only
// decides *who* gets *what*. If a figure in fleet.json looks wrong, the fix is here or there.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AIRFRAME,
  APU,
  APU_HOURS_PER_FLIGHT_CYCLE,
  BODY_CLASS,
  DATA_AS_OF,
  ENGINE_BY_TYPE,
  ENGINE_SPECS,
  ENVIRONMENT_EFFECT,
  LANDING_GEAR,
  NEGOTIATION_MULTIPLIER,
  PROFILES_BY_TYPE,
  RETURNING_WINDOW_MONTHS,
  THRESHOLD_RANGES,
  THRESHOLD_REFERENCE_FHFC,
  UTILISATION,
  UTILISATION_NOISE,
} from '../calc/constants';
import {
  airframeReservePerMonth,
  apuReservePerApuHour,
  compensationRate,
  engineReserveRatePerEfh,
  gearReserve,
  llpReservePerFC,
  phaseOf,
  workscopeBucketCycles,
} from '../calc/rates';
import type {
  Aircraft,
  AircraftType,
  Component,
  ComponentKind,
  Dataset,
  Derate,
  Environment,
  ISODate,
  LeaseArchitecture,
  Lessor,
  Metric,
  ReturnCondition,
  Workscope,
} from '../calc/types';

// ---------------------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------------------

const SEED = 20261003;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);
const between = (a: number, b: number) => a + rand() * (b - a);
const randInt = (a: number, b: number) => Math.floor(between(a, b + 1));
const chance = (p: number) => rand() < p;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const roundTo = (x: number, step: number) => Math.round(x / step) * step;
function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r <= 0) return v;
  }
  return entries[entries.length - 1]![0];
}

// ---------------------------------------------------------------------------------------
// Dates — fractional months, good enough for synthetic counters
// ---------------------------------------------------------------------------------------

const MS_PER_MONTH = 30.4375 * 86_400_000;
const TODAY = new Date(DATA_AS_OF + 'T00:00:00Z');
const addMonths = (d: Date, m: number) => new Date(d.getTime() + m * MS_PER_MONTH);
const iso = (d: Date): ISODate => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------------------
// The operator: a Gulf/Europe group with two AOCs
// ---------------------------------------------------------------------------------------

interface Base { code: string; registry: string; environment: Environment; }

const BASES: Base[] = [
  { code: 'DXB', registry: 'A6-', environment: 'harsh-high' },
  { code: 'AUH', registry: 'A6-', environment: 'harsh-high' },
  { code: 'MLA', registry: '9H-', environment: 'harsh-mild' },
  { code: 'VIE', registry: '9H-', environment: 'temperate' },
  { code: 'LGW', registry: '9H-', environment: 'temperate' },
];

const BASE_WEIGHTS = {
  narrowbody: [['DXB', 22], ['AUH', 10], ['MLA', 16], ['VIE', 26], ['LGW', 26]],
  widebody: [['DXB', 50], ['AUH', 25], ['MLA', 0], ['VIE', 10], ['LGW', 15]],
} as const;

/** ~270 aircraft. Mostly narrowbody, a widebody long-haul arm. */
const FLEET_PLAN: { type: AircraftType; count: number; returning: number; maxAgeYears: number }[] = [
  { type: 'A320neo', count: 90, returning: 4, maxAgeYears: 10 },
  { type: 'A321neo', count: 60, returning: 2, maxAgeYears: 9 },
  { type: 'B737-8', count: 40, returning: 1, maxAgeYears: 9 },
  { type: 'A350-900', count: 32, returning: 1, maxAgeYears: 11 },
  { type: 'B787-9', count: 28, returning: 1, maxAgeYears: 12 },
  { type: 'B777-300ER', count: 20, returning: 1, maxAgeYears: 15 },
];

const MSN_RANGES: Record<AircraftType, [number, number]> = {
  'A320neo': [7_000, 12_500],
  'A321neo': [8_000, 12_500],
  'B737-8': [42_000, 65_000],
  'A350-900': [50, 700],
  'B787-9': [36_000, 66_000],
  'B777-300ER': [32_000, 66_000],
};

// ---------------------------------------------------------------------------------------
// Lessors — invented. Two lease architectures. ASSUMPTIONS §7.
// ---------------------------------------------------------------------------------------

const LESSOR_NAMES = [
  'Meridian Aviation Capital',
  'Northgate Leasing',
  'Halcyon Aircraft Finance',
  'Kestrel Air Leasing',
  'Orin Capital Partners',
  'Sable Aviation Leasing',
  'Tamar Leasing Company',
];

function makeLessors(): Lessor[] {
  return LESSOR_NAMES.map((name, i) => ({
    id: 'L' + String(i + 1).padStart(2, '0'),
    name,
    architecture: (i % 2 === 0 ? 'reserve' : 'no-reserve') as LeaseArchitecture,
    negotiationMultiplier: Math.round(roundTo(between(NEGOTIATION_MULTIPLIER.min, NEGOTIATION_MULTIPLIER.max), 0.05) * 100) / 100,
    qmeClauseRef: '',
    qmeClauseText: '',
  }));
}

// ---------------------------------------------------------------------------------------
// Registrations and serials
// ---------------------------------------------------------------------------------------

const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'.split('');
const usedTails = new Set<string>();
const usedMsns = new Set<string>();
let serialCounter = 1000;

function makeTail(registry: string): string {
  for (;;) {
    const t = registry + pick(LETTERS) + pick(LETTERS) + pick(LETTERS);
    if (!usedTails.has(t)) {
      usedTails.add(t);
      return t;
    }
  }
}

function makeMsn(type: AircraftType): string {
  const [lo, hi] = MSN_RANGES[type];
  for (;;) {
    const m = String(randInt(lo, hi));
    if (!usedMsns.has(type + m)) {
      usedMsns.add(type + m);
      return m;
    }
  }
}

const SERIAL_PREFIX: Record<ComponentKind, string> = {
  engine: 'ESN',
  'landing-gear': 'LG',
  airframe: 'MSN',
  apu: 'APU',
};

function makeSerial(kind: ComponentKind): string {
  serialCounter += randInt(1, 9);
  return `${SERIAL_PREFIX[kind]}-${serialCounter}`;
}

// ---------------------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------------------

/** What a component generator needs to know about the tail it sits on. */
interface Host {
  tail: string;
  type: AircraftType;
  environment: Environment;
  hoursPerMonth: number;
  cyclesPerMonth: number;
  delivery: Date;
  ageMonths: number;
  msn: string;
}

const derateFor = (type: AircraftType): Derate =>
  BODY_CLASS[type] === 'narrowbody'
    ? weighted<Derate>([[10, 70], [5, 20], [0, 10]])
    : weighted<Derate>([[0, 50], [5, 30], [10, 20]]);

interface EngineOpts {
  csn?: number;
  freshFromShop?: boolean;
  swapped?: boolean;
}

function makeEngine(host: Host, position: 'ENG1' | 'ENG2' | 'POOL', opts: EngineOpts = {}): Component {
  const model = ENGINE_BY_TYPE[host.type];
  const spec = ENGINE_SPECS[model];
  const env = ENVIRONMENT_EFFECT[host.environment];
  const fhFc = host.hoursPerMonth / host.cyclesPerMonth;
  const tailFC = Math.round(host.cyclesPerMonth * host.ageMonths);

  const swapped = opts.swapped ?? chance(0.2);
  const csn = opts.csn ?? (swapped ? Math.round(tailFC * between(0.4, 1.6)) : tailFC);
  const tsn = Math.round(csn * fhFc);
  const monthsSinceNew = csn / host.cyclesPerMonth;
  const dateOfManufacture = swapped || opts.csn !== undefined ? addMonths(TODAY, -monthsSinceNew) : host.delivery;

  // Walk the shop-visit history. The engine comes off at whichever is shorter: its
  // time-on-wing or its remaining LLP life. A build-for-cash visit buys a small bucket.
  let remaining = csn;
  let count = 0;
  let tow = spec.towFirstRunFC * env.towMultiplier;
  let llpBucket = spec.llpCertifiedLifeFC;
  let workscope: Workscope = 'none';
  const segments: number[] = [];
  for (;;) {
    const limit = Math.min(tow, llpBucket);
    const removalPoint = Math.round(limit * between(0.85, 1.0));
    if (remaining <= removalPoint) break;
    remaining -= removalPoint;
    segments.push(removalPoint);
    count++;
    workscope = chance(0.65) ? 'build-for-interval' : 'build-for-cash';
    llpBucket = workscopeBucketCycles(model, workscope);
    tow = spec.towMatureRunFC * env.towMultiplier;
  }
  if (opts.freshFromShop) {
    const cso = randInt(50, 600);
    if (count === 0) segments.push(csn - cso);
    else segments[segments.length - 1] = segments[segments.length - 1]! + remaining - cso;
    count = Math.max(count, 1);
    workscope = chance(0.65) ? 'build-for-interval' : 'build-for-cash';
    llpBucket = workscopeBucketCycles(model, workscope);
    remaining = cso;
  }

  const cso = remaining;
  const tso = Math.round(cso * fhFc);
  const llpMinCyclesRemaining = llpBucket - cso;
  const lastShopVisit = count > 0 ? iso(addMonths(TODAY, -cso / host.cyclesPerMonth)) : null;
  const notEvidenced = count > 0 && chance(0.12);
  const lastSegment = segments[segments.length - 1] ?? 0;

  const onTailSince = swapped
    ? addMonths(TODAY, -between(1, Math.min(36, monthsSinceNew)))
    : position === 'POOL'
      ? addMonths(TODAY, -between(0.5, 18))
      : host.delivery;

  return {
    id: '',
    serial: makeSerial('engine'),
    kind: 'engine',
    model,
    position,
    dateOfManufacture: iso(dateOfManufacture),
    tsn,
    csn,
    tso,
    cso,
    llpMinCyclesRemaining,
    lastShopVisit,
    lastWorkscope: workscope,
    shopVisitCount: count,
    derate: derateFor(host.type),
    qmeStatus: notEvidenced ? 'not-evidenced' : 'verified',
    asLeaseAllows: notEvidenced
      ? { tso: Math.round((cso + lastSegment) * fhFc), cso: cso + lastSegment, llpMinCyclesRemaining: Math.max(0, llpMinCyclesRemaining - lastSegment) }
      : { tso, cso, llpMinCyclesRemaining },
    onTailSince: iso(onTailSince),
    installedOn: position === 'POOL' ? 'POOL' : host.tail,
  };
}

function makeLandingGear(host: Host, position: 'MLG' | 'POOL', opts: { monthsSinceNew?: number } = {}): Component {
  const spec = LANDING_GEAR[host.type];
  const fhFc = host.hoursPerMonth / host.cyclesPerMonth;
  const original = opts.monthsSinceNew === undefined && position !== 'POOL' && !chance(0.1);
  const monthsSinceNew = opts.monthsSinceNew ?? (original ? host.ageMonths : between(12, 140));
  const cpm = host.cyclesPerMonth * (original ? 1 : between(0.8, 1.2));
  const csn = Math.round(monthsSinceNew * cpm);
  const tsn = Math.round(csn * fhFc);

  // Calendar or cycles, whichever binds first. ASSUMPTIONS §3.
  const limitMonths = Math.min(spec.intervalMonths, spec.intervalFC / cpm);
  let remM = monthsSinceNew;
  let count = 0;
  const segments: number[] = [];
  for (;;) {
    const point = limitMonths * between(0.85, 1.0);
    if (remM <= point) break;
    remM -= point;
    segments.push(point);
    count++;
  }
  const cso = Math.round(remM * cpm);
  const tso = Math.round(cso * fhFc);
  const cyclesToNext = Math.round(Math.min(spec.intervalFC - cso, (spec.intervalMonths - remM) * cpm));
  const notEvidenced = count > 0 && chance(0.08);
  const lastSegCycles = Math.round((segments[segments.length - 1] ?? 0) * cpm);

  return {
    id: '',
    serial: makeSerial('landing-gear'),
    kind: 'landing-gear',
    model: host.type,
    position,
    dateOfManufacture: iso(addMonths(TODAY, -monthsSinceNew)),
    tsn,
    csn,
    tso,
    cso,
    llpMinCyclesRemaining: cyclesToNext,
    lastShopVisit: count > 0 ? iso(addMonths(TODAY, -remM)) : null,
    lastWorkscope: count > 0 ? 'build-for-interval' : 'none',
    shopVisitCount: count,
    derate: 0,
    qmeStatus: notEvidenced ? 'not-evidenced' : 'verified',
    asLeaseAllows: notEvidenced
      ? { tso: Math.round((cso + lastSegCycles) * fhFc), cso: cso + lastSegCycles, llpMinCyclesRemaining: Math.max(0, cyclesToNext - lastSegCycles) }
      : { tso, cso, llpMinCyclesRemaining: cyclesToNext },
    onTailSince: iso(original ? host.delivery : addMonths(TODAY, -between(0.5, Math.min(36, monthsSinceNew)))),
    installedOn: position === 'POOL' ? 'POOL' : host.tail,
  };
}

function makeAirframe(host: Host): Component {
  const checks = AIRFRAME[host.type].checks;
  const interval = Math.min(...checks.map((c) => c.intervalMonths));
  const count = Math.floor(host.ageMonths / interval);
  const monthsSince = host.ageMonths - count * interval;
  const tailFC = Math.round(host.cyclesPerMonth * host.ageMonths);
  const tailFH = Math.round(host.hoursPerMonth * host.ageMonths);
  const cso = Math.round(monthsSince * host.cyclesPerMonth);
  const tso = Math.round(monthsSince * host.hoursPerMonth);
  const cyclesToNext = Math.round((interval - monthsSince) * host.cyclesPerMonth);
  const notEvidenced = count > 0 && chance(0.04);
  const lastSegCycles = Math.round(interval * host.cyclesPerMonth);

  return {
    id: '',
    serial: 'MSN-' + host.msn,
    kind: 'airframe',
    model: host.type,
    position: 'AIRFRAME',
    dateOfManufacture: iso(host.delivery),
    tsn: tailFH,
    csn: tailFC,
    tso,
    cso,
    llpMinCyclesRemaining: cyclesToNext,
    lastShopVisit: count > 0 ? iso(addMonths(TODAY, -monthsSince)) : null,
    lastWorkscope: count > 0 ? 'build-for-interval' : 'none',
    shopVisitCount: count,
    derate: 0,
    qmeStatus: notEvidenced ? 'not-evidenced' : 'verified',
    asLeaseAllows: notEvidenced
      ? { tso: tso + Math.round(interval * host.hoursPerMonth), cso: cso + lastSegCycles, llpMinCyclesRemaining: 0 }
      : { tso, cso, llpMinCyclesRemaining: cyclesToNext },
    onTailSince: iso(host.delivery),
    installedOn: host.tail,
  };
}

function makeApu(host: Host, position: 'APU' | 'POOL', opts: { csn?: number } = {}): Component {
  const spec = APU[host.type];
  const tailFC = Math.round(host.cyclesPerMonth * host.ageMonths);
  const original = opts.csn === undefined && position !== 'POOL' && !chance(0.1);
  const csn = opts.csn ?? (original ? tailFC : Math.round(tailFC * between(0.5, 1.5)));
  const apuHoursPerCycle = APU_HOURS_PER_FLIGHT_CYCLE * between(0.9, 1.1);
  const tsn = Math.round(csn * apuHoursPerCycle);

  let rem = tsn;
  let count = 0;
  const segments: number[] = [];
  for (;;) {
    const point = Math.round(spec.intervalApuHours * between(0.85, 1.0));
    if (rem <= point) break;
    rem -= point;
    segments.push(point);
    count++;
  }
  const tso = rem;
  const cso = Math.round(tso / apuHoursPerCycle);
  const cyclesToNext = Math.round((spec.intervalApuHours - tso) / apuHoursPerCycle);
  const monthsSinceOverhaul = cso / host.cyclesPerMonth;
  const monthsSinceNew = csn / host.cyclesPerMonth;
  const notEvidenced = count > 0 && chance(0.08);
  const lastSeg = segments[segments.length - 1] ?? 0;

  return {
    id: '',
    serial: makeSerial('apu'),
    kind: 'apu',
    model: host.type,
    position,
    dateOfManufacture: iso(original ? host.delivery : addMonths(TODAY, -monthsSinceNew)),
    tsn,
    csn,
    tso,
    cso,
    llpMinCyclesRemaining: cyclesToNext,
    lastShopVisit: count > 0 ? iso(addMonths(TODAY, -monthsSinceOverhaul)) : null,
    lastWorkscope: count > 0 ? 'build-for-interval' : 'none',
    shopVisitCount: count,
    derate: 0,
    qmeStatus: notEvidenced ? 'not-evidenced' : 'verified',
    asLeaseAllows: notEvidenced
      ? { tso: tso + lastSeg, cso: cso + Math.round(lastSeg / apuHoursPerCycle), llpMinCyclesRemaining: Math.max(0, cyclesToNext - Math.round(lastSeg / apuHoursPerCycle)) }
      : { tso, cso, llpMinCyclesRemaining: cyclesToNext },
    onTailSince: iso(original ? host.delivery : addMonths(TODAY, -between(0.5, Math.min(36, monthsSinceNew)))),
    installedOn: position === 'POOL' ? 'POOL' : host.tail,
  };
}

// ---------------------------------------------------------------------------------------
// Aircraft
// ---------------------------------------------------------------------------------------

function makeAircraft(
  type: AircraftType,
  maxAgeYears: number,
  lessor: Lessor,
  returningInMonths: number | null,
): Aircraft {
  const bodyClass = BODY_CLASS[type];
  const baseCode = weighted(BASE_WEIGHTS[bodyClass]);
  const base = BASES.find((b) => b.code === baseCode)!;
  const tail = makeTail(base.registry);
  const msn = makeMsn(type);

  const routeProfile = pick(PROFILES_BY_TYPE[type]);
  const u = UTILISATION[routeProfile];
  const hoursPerMonth = Math.round(u.hoursPerMonth * (1 + between(-UTILISATION_NOISE, UTILISATION_NOISE)));
  const cyclesPerMonth = Math.round(u.cyclesPerMonth * (1 + between(-UTILISATION_NOISE, UTILISATION_NOISE)));

  // Lease term and where we are in it. Delivery = lease start (all tails leased new).
  let termYears: number;
  let monthsToEnd: number;
  if (returningInMonths !== null) {
    monthsToEnd = returningInMonths;
    const minTerm = Math.max(6, Math.ceil(monthsToEnd / 12) + 5);
    const maxTerm = Math.min(12, Math.floor(maxAgeYears + monthsToEnd / 12));
    termYears = randInt(minTerm, Math.max(minTerm, maxTerm));
  } else {
    termYears = randInt(8, 12);
    const minM = Math.max(RETURNING_WINDOW_MONTHS + 1, (termYears - maxAgeYears) * 12);
    monthsToEnd = Math.round(between(minM, termYears * 12 - 6));
  }
  const leaseEnd = addMonths(TODAY, monthsToEnd);
  const leaseStart = addMonths(leaseEnd, -termYears * 12);
  const ageMonths = termYears * 12 - monthsToEnd;

  const host: Host = { tail, type, environment: base.environment, hoursPerMonth, cyclesPerMonth, delivery: leaseStart, ageMonths, msn };

  const components: Component[] = [
    makeEngine(host, 'ENG1'),
    makeEngine(host, 'ENG2'),
    makeLandingGear(host, 'MLG'),
    makeAirframe(host),
    makeApu(host, 'APU'),
  ];

  return {
    tail,
    msn,
    type,
    bodyClass,
    engineModel: ENGINE_BY_TYPE[type],
    lessorId: lessor.id,
    lessor: lessor.name,
    leaseStart: iso(leaseStart),
    leaseEnd: iso(leaseEnd),
    status: monthsToEnd <= RETURNING_WINDOW_MONTHS ? 'returning' : 'in-service',
    routeProfile,
    hoursPerMonth,
    cyclesPerMonth,
    base: base.code,
    environment: base.environment,
    ageYears: Math.round((ageMonths / 12) * 10) / 10,
    components,
  };
}

// ---------------------------------------------------------------------------------------
// Spare pool — ~14 unattached units. Lever 3 needs this to exist.
// ---------------------------------------------------------------------------------------

function poolHost(type: AircraftType): Host {
  const profile = PROFILES_BY_TYPE[type][0]!;
  const u = UTILISATION[profile];
  return {
    tail: 'POOL',
    type,
    environment: 'temperate',
    hoursPerMonth: u.hoursPerMonth,
    cyclesPerMonth: u.cyclesPerMonth,
    delivery: TODAY,
    ageMonths: 0,
    msn: '',
  };
}

function makePool(): Component[] {
  const engines: [AircraftType, EngineOpts][] = [
    ['A320neo', { csn: randInt(3_000, 9_000), freshFromShop: true }],
    ['A320neo', { csn: randInt(9_000, 16_000) }],
    ['A320neo', { csn: randInt(1_000, 4_000) }],
    ['A321neo', { csn: randInt(6_000, 14_000), freshFromShop: true }],
    ['B737-8', { csn: randInt(8_000, 18_000) }],
    ['A350-900', { csn: randInt(1_500, 5_000), freshFromShop: true }],
    ['B787-9', { csn: randInt(2_000, 6_000) }],
  ];
  const gears: [AircraftType, number][] = [
    ['A320neo', between(20, 60)],
    ['A320neo', between(100, 140)],
    ['B737-8', between(60, 110)],
    ['B787-9', between(30, 80)],
  ];
  const apus: [AircraftType, number][] = [
    ['A320neo', randInt(2_000, 6_000)],
    ['A321neo', randInt(6_000, 12_000)],
    ['A350-900', randInt(1_000, 5_000)],
  ];
  return [
    ...engines.map(([t, o]) => makeEngine(poolHost(t), 'POOL', { ...o, swapped: false })),
    ...gears.map(([t, m]) => makeLandingGear(poolHost(t), 'POOL', { monthsSinceNew: m })),
    ...apus.map(([t, c]) => makeApu(poolHost(t), 'POOL', { csn: c })),
  ];
}

// ---------------------------------------------------------------------------------------
// Return conditions — several per tail per component kind, thresholds varying by lessor
// ---------------------------------------------------------------------------------------

interface LeaseTemplate {
  thresholds: Record<keyof typeof THRESHOLD_RANGES.reserve, number>;
  schedule: string;
  qmeClauseRef: string;
  qmeClauseText: string;
  evidenceDays: number;
}

const SCHEDULE_NAMES = ['Schedule 3', 'Schedule 4', 'Annex D', 'Part 2 of Schedule 2', 'Schedule 5'];

function makeTemplate(lessor: Lessor, index: number): LeaseTemplate {
  const ranges = THRESHOLD_RANGES[lessor.architecture];
  const step = (key: string) => (key.includes('Months') ? 1 : 50);
  const thresholds = Object.fromEntries(
    Object.entries(ranges).map(([k, [lo, hi]]) => [k, Math.max(roundTo(between(lo, hi), step(k)), step(k))]),
  ) as LeaseTemplate['thresholds'];
  const evidenceDays = pick([30, 45, 60]);
  const schedule = SCHEDULE_NAMES[index % SCHEDULE_NAMES.length]!;
  const clauseNo = 14 + (index % 4);
  return {
    thresholds,
    schedule,
    evidenceDays,
    qmeClauseRef: `Clause ${clauseNo}.${1 + (index % 3)} (Qualified Maintenance Event)`,
    qmeClauseText:
      `"Qualified Maintenance Event" means, in respect of an Engine, a Performance Restoration Shop Visit performed by a ` +
      `maintenance facility approved in writing by Lessor, in accordance with the Manufacturer's Workscope Planning Guide at the ` +
      `Titled Thrust Rating, in respect of which Lessee has delivered to Lessor (i) an EASA Form 1 or FAA Form 8130-3 release ` +
      `certificate, (ii) the complete shop visit report including back-to-birth trace for each Life Limited Part, and (iii) the ` +
      `test cell acceptance run record, in each case within ${evidenceDays} days of release. In respect of the Landing Gear, APU ` +
      `and Airframe, the corresponding overhaul or structural inspection evidenced in the same manner. Maintenance not so ` +
      `evidenced shall not reset the relevant interval for the purposes of ${schedule}.`,
  };
}

function settlementText(arch: LeaseArchitecture): string {
  return arch === 'reserve'
    ? 'Any shortfall shall first be settled from the Supplemental Rent then held by Lessor in respect of the relevant item, with any balance payable by Lessee in cash within ten Business Days of Redelivery.'
    : 'Any shortfall shall be paid by Lessee to Lessor in cash on the Redelivery Date, at the rate set out in this paragraph, pro-rated for any part unit.';
}

function makeReturnConditions(ac: Aircraft, lessor: Lessor, tpl: LeaseTemplate): ReturnCondition[] {
  const arch = lessor.architecture;
  const neg = lessor.negotiationMultiplier;
  const fhFc = ac.hoursPerMonth / ac.cyclesPerMonth;
  const eng1 = ac.components.find((c) => c.position === 'ENG1')!;
  const jitter = between(0.9, 1.2);
  const th = (key: keyof LeaseTemplate['thresholds'], step: number) => Math.max(step, roundTo(tpl.thresholds[key] * jitter, step));
  const settle = settlementText(arch);
  const s = tpl.schedule;
  let n = 0;
  const row = (
    componentKind: ComponentKind,
    metric: Metric,
    threshold: number,
    unit: ReturnCondition['unit'],
    rated: { rate: number; trace: string },
    para: string,
    clauseText: string,
  ): ReturnCondition => ({
    id: `${ac.tail}-RC${++n}`,
    tail: ac.tail,
    componentKind,
    metric,
    threshold,
    unit,
    compensationRate: Math.round(rated.rate * 100) / 100,
    rateTrace: rated.trace,
    clauseRef: `${s}, para ${para}`,
    clauseText,
    qmeClauseRef: tpl.qmeClauseRef,
  });

  const engHours = th('engineHoursRemaining', 50);
  // Engine cycle thresholds anchor on an A320 lease; scale to this engine's flight leg so the
  // cycle clause is as strict relative to the hours clause as it is on the executed lease.
  const legScale = THRESHOLD_REFERENCE_FHFC / ENGINE_SPECS[ac.engineModel].referenceFhFc;
  const engCycles = Math.max(50, roundTo(th('engineCyclesRemaining', 50) * legScale, 50));
  const llp = th('llpCyclesRemaining', 50);
  const gearMonths = th('gearMonthsRemaining', 1);
  const gearCycles = th('gearCyclesRemaining', 50);
  const afMonths = th('airframeMonthsRemaining', 1);
  const apuHours = th('apuHoursRemaining', 50);

  const prRate = engineReserveRatePerEfh(ac.engineModel, phaseOf(eng1.shopVisitCount), ac.environment, eng1.derate, fhFc);
  const prRatePerFC = { rate: prRate.rate * fhFc, trace: `${prRate.trace}; × ${fhFc.toFixed(2)} FH:FC = $${(prRate.rate * fhFc).toFixed(2)}/FC` };
  const gear = gearReserve(ac.type);
  const af = airframeReservePerMonth(ac.type);
  const apu = apuReservePerApuHour(ac.type);
  const checkName = AIRFRAME[ac.type].checks[0]!.name;

  return [
    row('engine', 'hoursRemaining', engHours, 'FH', compensationRate(prRate, neg, 'FH'), '4.1(a)',
      `At Redelivery each Engine shall have not less than ${engHours.toLocaleString('en-US')} Flight Hours remaining until the next ` +
      `scheduled Performance Restoration Shop Visit, calculated by reference to the Manufacturer's recommended removal interval at the ` +
      `Titled Thrust Rating and the Engine's operating environment. ${settle}`),
    row('engine', 'cyclesRemaining', engCycles, 'FC', compensationRate(prRatePerFC, neg, 'FC'), '4.1(b)',
      `At Redelivery each Engine shall have not less than ${engCycles.toLocaleString('en-US')} Flight Cycles remaining until the next ` +
      `scheduled Performance Restoration Shop Visit. Where both the Flight Hour and Flight Cycle conditions of this paragraph 4.1 ` +
      `are not met, the greater of the two amounts shall be payable. ${settle}`),
    row('engine', 'llpCyclesRemaining', llp, 'FC', compensationRate(llpReservePerFC(ac.engineModel), neg, 'FC'), '4.2(b)',
      `Each Life Limited Part installed in each Engine shall have not less than ${llp.toLocaleString('en-US')} Flight Cycles remaining ` +
      `to its life limit as specified in Chapter 5 (Airworthiness Limitations) of the Engine Manual at the Titled Thrust Rating. ` +
      `Compensation for any shortfall shall be calculated pro rata by reference to the Manufacturer's then-current catalogue list ` +
      `price for the relevant part divided by its total certified life. ${settle}`),
    row('landing-gear', 'monthsRemaining', gearMonths, 'months', compensationRate(gear.perMonth, neg, 'month'), '5.1',
      `The Landing Gear shall have not less than ${gearMonths} months remaining to the next scheduled overhaul under the Maintenance ` +
      `Programme, measured from the Redelivery Date. ${settle}`),
    row('landing-gear', 'cyclesRemaining', gearCycles, 'FC', compensationRate(gear.perFC, neg, 'FC'), '5.2',
      `The Landing Gear shall have not less than ${gearCycles.toLocaleString('en-US')} Flight Cycles remaining to the next scheduled ` +
      `overhaul, whichever of the calendar and cycle limits of paragraphs 5.1 and 5.2 is the more restrictive to apply. ${settle}`),
    row('airframe', 'monthsRemaining', afMonths, 'months', compensationRate(af, neg, 'month'), '3.2',
      `The Airframe shall be fresh from, or have not less than ${afMonths} months remaining to, the next ${checkName} structural ` +
      `inspection under the Maintenance Programme, with all deferred items cleared. ${settle}`),
    row('apu', 'hoursRemaining', apuHours, 'APU-FH', compensationRate(apu, neg, 'APU-FH'), '6.1',
      `The APU shall have not less than ${apuHours.toLocaleString('en-US')} APU Hours remaining to the next scheduled performance ` +
      `restoration, as determined by the APU Manufacturer's recommended interval and the APU hour meter. ${settle}`),
  ];
}

// ---------------------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------------------

function generate(): Dataset {
  const lessors = makeLessors();
  const templates = lessors.map((l, i) => makeTemplate(l, i));
  lessors.forEach((l, i) => {
    l.qmeClauseRef = templates[i]!.qmeClauseRef;
    l.qmeClauseText = templates[i]!.qmeClauseText;
  });

  const aircraft: Aircraft[] = [];
  let returningIdx = 0;
  for (const plan of FLEET_PLAN) {
    // Spread the returning tails across the window and across lessors.
    const returningSlots = new Set<number>();
    while (returningSlots.size < plan.returning) returningSlots.add(randInt(0, plan.count - 1));
    for (let i = 0; i < plan.count; i++) {
      const isReturning = returningSlots.has(i);
      const lessor = isReturning ? lessors[returningIdx % lessors.length]! : pick(lessors);
      const monthsToEnd = isReturning ? between(4, RETURNING_WINDOW_MONTHS - 1) : null;
      if (isReturning) returningIdx++;
      aircraft.push(makeAircraft(plan.type, plan.maxAgeYears, lessor, monthsToEnd));
    }
  }

  // Stable ids for components.
  let cid = 1;
  for (const ac of aircraft) for (const c of ac.components) c.id = 'C' + String(cid++).padStart(4, '0');
  const pool = makePool();
  for (const c of pool) c.id = 'C' + String(cid++).padStart(4, '0');

  const returnConditions = aircraft.flatMap((ac) => {
    const li = lessors.findIndex((l) => l.id === ac.lessorId);
    return makeReturnConditions(ac, lessors[li]!, templates[li]!);
  });

  return {
    generatedAt: new Date().toISOString(),
    asOf: DATA_AS_OF,
    seed: SEED,
    lessors,
    aircraft,
    pool,
    returnConditions,
  };
}

const dataset = generate();
const outDir = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'fleet.json');
writeFileSync(outPath, JSON.stringify(dataset, null, 2) + '\n');

// Summary
const returning = dataset.aircraft.filter((a) => a.status === 'returning');
const byType = (list: Aircraft[]) =>
  Object.entries(list.reduce<Record<string, number>>((m, a) => ((m[a.type] = (m[a.type] ?? 0) + 1), m), {}))
    .map(([t, n]) => `${t} ${n}`)
    .join(', ');
console.log(`Wrote ${outPath}`);
console.log(`Aircraft: ${dataset.aircraft.length} (${byType(dataset.aircraft)})`);
console.log(`Returning within ${RETURNING_WINDOW_MONTHS} months: ${returning.length}`);
for (const a of returning.sort((x, y) => x.leaseEnd.localeCompare(y.leaseEnd))) {
  const qme = a.components.filter((c) => c.qmeStatus === 'not-evidenced').map((c) => c.position);
  console.log(`  ${a.tail}  ${a.type.padEnd(10)} ${a.lessor.padEnd(26)} ${a.leaseEnd}  ${a.routeProfile.padEnd(11)} ${a.base} ${qme.length ? 'QME? ' + qme.join(',') : ''}`);
}
console.log(`Pool: ${dataset.pool.length} (${dataset.pool.map((c) => c.kind + ':' + c.model).join(', ')})`);
console.log(`Return conditions: ${dataset.returnConditions.length}`);
console.log(`Lessors: ${dataset.lessors.map((l) => `${l.name} [${l.architecture}, ×${l.negotiationMultiplier}]`).join('; ')}`);
