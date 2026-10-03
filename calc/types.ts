// Data model. See SPEC.md §1. The engine is pure: these types are shared by data/ and ui/,
// but nothing in calc/ imports from either.

export type AircraftType =
  | 'A320neo'
  | 'A321neo'
  | 'A350-900'
  | 'B777-300ER'
  | 'B787-9'
  | 'B737-8';

export type BodyClass = 'narrowbody' | 'widebody';

export type EngineModel =
  | 'LEAP-1A26'
  | 'LEAP-1A33'
  | 'CFM56-7B26E'
  | 'Trent XWB-84'
  | 'GEnx-1B76'
  | 'GE90-115B';

/** Sets the hours/cycles mix. ASSUMPTIONS §9 — four profiles, each with a published source. */
export type RouteProfile = 'short-dense' | 'mixed' | 'long-haul' | 'ultra-long';

export type Environment = 'temperate' | 'harsh-mild' | 'harsh-high';

export type AircraftStatus = 'in-service' | 'returning';

export type ComponentKind = 'engine' | 'landing-gear' | 'airframe' | 'apu';

export type Position = 'ENG1' | 'ENG2' | 'MLG' | 'AIRFRAME' | 'APU';

/** Two tiers only. ASSUMPTIONS §2. */
export type Workscope = 'none' | 'build-for-cash' | 'build-for-interval';

export type QmeStatus = 'verified' | 'not-evidenced';

export type Derate = 0 | 5 | 10;

/** Reserve leases: thin thresholds, monthly accrual. No-reserve: fat thresholds, cash settlement. ASSUMPTIONS §7. */
export type LeaseArchitecture = 'reserve' | 'no-reserve';

/** ISO date, YYYY-MM-DD. */
export type ISODate = string;

export interface Lessor {
  id: string;
  name: string;
  architecture: LeaseArchitecture;
  /** compensationRate = reserveRate × negotiationMultiplier. ASSUMPTIONS §7. Range 1.0–1.5. */
  negotiationMultiplier: number;
  /** The clause in this lessor's lease template that defines a qualified maintenance event. */
  qmeClauseRef: string;
  qmeClauseText: string;
}

export interface Component {
  id: string;
  serial: string;
  kind: ComponentKind;
  /** Engine model for engines; aircraft type family for gear, airframe and APU. Decides which tails it can go on. */
  model: EngineModel | AircraftType;
  position: Position | 'POOL';
  dateOfManufacture: ISODate;
  /** Hours since new. For the APU these are APU hours, not aircraft hours. */
  tsn: number;
  /** Cycles since new. */
  csn: number;
  /** Hours since last shop visit (or since new if none). */
  tso: number;
  /** Cycles since last shop visit (or since new if none). */
  cso: number;
  /** The worst part sets the component's life. Engines only; others carry their interval remaining here. */
  llpMinCyclesRemaining: number;
  lastShopVisit: ISODate | null;
  lastWorkscope: Workscope;
  /** 0 = first-run, ≥1 = mature-run. */
  shopVisitCount: number;
  derate: Derate;
  qmeStatus: QmeStatus;
  /**
   * Position as the lease would allow it: measured from the last *verified* qualified
   * maintenance event. Equal to tso/cso/llpMinCyclesRemaining when qmeStatus is 'verified'.
   * When 'not-evidenced', the last shop visit did not legally reset the clock. SPEC §2.5.
   */
  asLeaseAllows: { tso: number; cso: number; llpMinCyclesRemaining: number };
  onTailSince: ISODate;
  /** Current tail registration, or 'POOL' for spares. */
  installedOn: string;
}

export interface Aircraft {
  tail: string;
  msn: string;
  type: AircraftType;
  bodyClass: BodyClass;
  engineModel: EngineModel;
  lessorId: string;
  lessor: string;
  leaseStart: ISODate;
  leaseEnd: ISODate;
  status: AircraftStatus;
  routeProfile: RouteProfile;
  hoursPerMonth: number;
  cyclesPerMonth: number;
  base: string;
  environment: Environment;
  ageYears: number;
  components: Component[];
}

export type Metric =
  | 'hoursRemaining'
  | 'cyclesRemaining'
  | 'monthsRemaining'
  | 'timeSinceOverhaul'
  | 'llpCyclesRemaining'
  | 'condition';

export interface ReturnCondition {
  id: string;
  tail: string;
  componentKind: ComponentKind;
  metric: Metric;
  /** What the lease demands at handback, in the metric's unit. */
  threshold: number;
  /** FH, FC, months, APU-FH. */
  unit: 'FH' | 'FC' | 'months' | 'APU-FH';
  /** USD per unit of shortfall. Derived: reserveRate × negotiationMultiplier. ASSUMPTIONS §7. */
  compensationRate: number;
  /** How compensationRate was derived — the arithmetic, as a string. */
  rateTrace: string;
  clauseRef: string;
  clauseText: string;
  /** Points at the lessor's QME definition; the text lives on the Lessor. */
  qmeClauseRef: string;
}

/** The scenario panel. SPEC §1. */
export interface Assumptions {
  maintenanceCostMultiplier: number;
  utilisationMultiplier: number;
  /** Per tail. */
  leaseExtensionMonths: Record<string, number>;
  shopSlotLeadTimeMonths: number;
  countOverDeliveryAsLoss: boolean;
  reservesReclaimPct: number;
  /** Lost contribution per aircraft day out of service, by body class. ASSUMPTIONS §13. */
  downtimeCostPerDay: Record<BodyClass, number>;
}

export interface Dataset {
  generatedAt: string;
  /** All counters (tsn, csn, …) are as of this date. */
  asOf: ISODate;
  seed: number;
  lessors: Lessor[];
  aircraft: Aircraft[];
  /** Unattached components. installedOn === 'POOL'. */
  pool: Component[];
  returnConditions: ReturnCondition[];
}
