// Every rate, cost and assumption the model uses. Each has a line in ASSUMPTIONS.md with its
// source. Nothing numeric is inlined anywhere else. All money in 2026 USD unless stated.

import type {
  AircraftType,
  Assumptions,
  BodyClass,
  Derate,
  EngineModel,
  Environment,
  RouteProfile,
} from './types';

/** All counters in the generated dataset are as of this date. */
export const DATA_AS_OF = '2026-10-03';

/** SPEC §1: a tail is `returning` when leaseEnd falls within this many months. */
export const RETURNING_WINDOW_MONTHS = 24;

// ---------------------------------------------------------------------------------------
// §0 Escalation 2018 → 2026 USD. Already applied to every figure below; recorded so the
// base-year arithmetic can be shown if asked.
// ---------------------------------------------------------------------------------------
export const ESCALATION_2018_TO_2026 = {
  enginePR: 1.55,
  engineLLP: 1.6,
  landingGear: 1.45,
  apu: 1.45,
  airframe: 1.4,
} as const;

// ---------------------------------------------------------------------------------------
// §2 Engine shop visit — two tiers. Narrowbody reference, Ackert Fig. 48 escalated.
// ---------------------------------------------------------------------------------------
export const WORKSCOPE_TIERS = {
  'build-for-interval': { restoration: 3_880_000, llp: 3_880_000, total: 7_750_000, buysCycles: 20_000 },
  'build-for-cash': { restoration: 3_100_000, llp: 2_400_000, total: 5_500_000, buysCycles: 8_000 },
} as const;

export interface EngineSpec {
  aircraft: AircraftType;
  /** Performance restoration cost, first-run and mature-run. */
  prCostFirstRun: number;
  prCostMatureRun: number;
  /** Full LLP stack, OEM list. */
  llpStackCost: number;
  /** Time on wing in cycles, first-run / mature-run, at 10% derate, temperate. */
  towFirstRunFC: number;
  towMatureRunFC: number;
  /** Certified life of the limiting LLP (usually the HPT disc). Declared — see ASSUMPTIONS §2. */
  llpCertifiedLifeFC: number;
  /** Appraiser flight-leg convention the TOW tables assume. Ackert App. A. */
  referenceFhFc: number;
}

export const ENGINE_SPECS: Record<EngineModel, EngineSpec> = {
  'LEAP-1A26': {
    aircraft: 'A320neo', prCostFirstRun: 5_400_000, prCostMatureRun: 6_500_000, llpStackCost: 6_600_000,
    towFirstRunFC: 12_500, towMatureRunFC: 10_000, llpCertifiedLifeFC: 20_000, referenceFhFc: 2.75,
  },
  'LEAP-1A33': {
    aircraft: 'A321neo', prCostFirstRun: 5_400_000, prCostMatureRun: 6_500_000, llpStackCost: 6_600_000,
    towFirstRunFC: 10_000, towMatureRunFC: 8_000, llpCertifiedLifeFC: 20_000, referenceFhFc: 2.75,
  },
  'CFM56-7B26E': {
    aircraft: 'B737-8', prCostFirstRun: 5_100_000, prCostMatureRun: 5_400_000, llpStackCost: 6_400_000,
    towFirstRunFC: 15_000, towMatureRunFC: 10_000, llpCertifiedLifeFC: 20_000, referenceFhFc: 2.75,
  },
  'Trent XWB-84': {
    aircraft: 'A350-900', prCostFirstRun: 10_200_000, prCostMatureRun: 12_300_000, llpStackCost: 13_100_000,
    towFirstRunFC: 3_500, towMatureRunFC: 3_000, llpCertifiedLifeFC: 15_000, referenceFhFc: 7.0,
  },
  'GEnx-1B76': {
    aircraft: 'B787-9', prCostFirstRun: 9_800_000, prCostMatureRun: 12_000_000, llpStackCost: 14_000_000,
    towFirstRunFC: 3_400, towMatureRunFC: 2_900, llpCertifiedLifeFC: 15_000, referenceFhFc: 7.0,
  },
  'GE90-115B': {
    aircraft: 'B777-300ER', prCostFirstRun: 15_500_000, prCostMatureRun: 17_800_000, llpStackCost: 14_700_000,
    towFirstRunFC: 3_200, towMatureRunFC: 2_550, llpCertifiedLifeFC: 15_000, referenceFhFc: 7.0,
  },
};

// ---------------------------------------------------------------------------------------
// §3 Landing gear. Limited by calendar OR cycles, whichever binds first.
// ---------------------------------------------------------------------------------------
export interface GearSpec { overhaulCost: number; intervalMonths: number; intervalFC: number; exchangeFee: number }

export const LANDING_GEAR: Record<AircraftType, GearSpec> = {
  'A320neo': { overhaulCost: 680_000, intervalMonths: 144, intervalFC: 20_000, exchangeFee: 87_000 },
  'A321neo': { overhaulCost: 690_000, intervalMonths: 144, intervalFC: 20_000, exchangeFee: 87_000 },
  'B737-8': { overhaulCost: 610_000, intervalMonths: 120, intervalFC: 20_000, exchangeFee: 87_000 },
  'A350-900': { overhaulCost: 1_600_000, intervalMonths: 144, intervalFC: 16_700, exchangeFee: 290_000 },
  'B787-9': { overhaulCost: 1_300_000, intervalMonths: 144, intervalFC: 21_000, exchangeFee: 290_000 },
  'B777-300ER': { overhaulCost: 1_600_000, intervalMonths: 120, intervalFC: 17_000, exchangeFee: 290_000 },
};

// ---------------------------------------------------------------------------------------
// §4 APU. APU hours are their own clock.
// ---------------------------------------------------------------------------------------
export interface ApuSpec { overhaulCost: number; intervalApuHours: number }

export const APU: Record<AircraftType, ApuSpec> = {
  'A320neo': { overhaulCost: 493_000, intervalApuHours: 8_000 },
  'A321neo': { overhaulCost: 493_000, intervalApuHours: 8_000 },
  'B737-8': { overhaulCost: 493_000, intervalApuHours: 8_000 },
  'A350-900': { overhaulCost: 725_000, intervalApuHours: 6_000 },
  'B787-9': { overhaulCost: 725_000, intervalApuHours: 6_000 },
  'B777-300ER': { overhaulCost: 870_000, intervalApuHours: 6_000 },
};

/** Declared assumption, not sourced. ASSUMPTIONS §4. */
export const APU_HOURS_PER_FLIGHT_CYCLE = 0.8;

// ---------------------------------------------------------------------------------------
// §5 Airframe heavy structural checks. Two check lines per type (the 12Y line is the
// *incremental* cost of the heavier check, per ASSUMPTIONS §5 table).
// ---------------------------------------------------------------------------------------
export interface AirframeSpec {
  checks: { name: string; cost: number; intervalMonths: number }[];
}

export const AIRFRAME: Record<AircraftType, AirframeSpec> = {
  'A320neo': { checks: [{ name: '6Y SC', cost: 1_190_000, intervalMonths: 72 }, { name: '12Y SC', cost: 1_260_000, intervalMonths: 144 }] },
  'A321neo': { checks: [{ name: '6Y SC', cost: 1_220_000, intervalMonths: 72 }, { name: '12Y SC', cost: 1_290_000, intervalMonths: 144 }] },
  'B737-8': { checks: [{ name: '8Y SC', cost: 980_000, intervalMonths: 96 }, { name: '12Y SC', cost: 1_290_000, intervalMonths: 144 }] },
  'A350-900': { checks: [{ name: '12Y SI', cost: 4_000_000, intervalMonths: 144 }] },
  'B787-9': { checks: [{ name: '12Y SI', cost: 3_570_000, intervalMonths: 144 }] },
  'B777-300ER': { checks: [{ name: '8Y SI', cost: 5_040_000, intervalMonths: 96 }] },
};

// ---------------------------------------------------------------------------------------
// §6 Maintenance reserves — executed 2026 A320 / V2527E-A5 lease (SEC filing).
// ---------------------------------------------------------------------------------------

/** Engine PR reserve, $/EFH at 10% derate, by FH:FC band. The 3.9× swing. */
export const ENGINE_RESERVE_GRID: { maxFhFc: number; ratePerEfh: number }[] = [
  { maxFhFc: 1.0, ratePerEfh: 722.52 },
  { maxFhFc: 1.5, ratePerEfh: 435.38 },
  { maxFhFc: 2.0, ratePerEfh: 319.44 },
  { maxFhFc: 2.5, ratePerEfh: 260.85 },
  { maxFhFc: 3.0, ratePerEfh: 228.0 },
  { maxFhFc: 3.5, ratePerEfh: 208.33 },
  { maxFhFc: 4.0, ratePerEfh: 195.38 },
  { maxFhFc: Infinity, ratePerEfh: 184.64 },
];

/** The grid's contract base: $228/EFH in the 2.5–3.0 band. */
export const ENGINE_RESERVE_GRID_BASE_RATE = 228.0;
export const ENGINE_RESERVE_GRID_BASE_FHFC = 2.75;

/**
 * The grid is for a V2527 whose pure cost accrual at 2.75 FH:FC is
 * $5.1M ÷ (12,500 FC × 2.75) = $148/EFH. The lease charges $228. The ratio, 1.54, is the
 * lessor's margin over pure accrual. Declared calibration — ASSUMPTIONS §6.
 */
export const RESERVE_MARKUP_OVER_ACCRUAL = 228.0 / (5_100_000 / (12_500 * 2.75));

export const OTHER_RESERVE_RATES = {
  apuPerApuHour: 55,
  airframe6YPerMonth: 14_500,
  airframe12YPerMonth: 6_500,
  landingGearPerMonth: 4_750,
} as const;

// ---------------------------------------------------------------------------------------
// §7 Return-condition thresholds and the compensation rate.
// ---------------------------------------------------------------------------------------

/**
 * Held at 1.0: the compensation rate is the lease's own reserve rate, which already carries the
 * lessor's margin over accrual (RESERVE_MARKUP_OVER_ACCRUAL); multiplying again would count it twice.
 * min and max are only the range the generator still draws from and discards, so that every later
 * draw is unchanged. ASSUMPTIONS §7.
 */
export const NEGOTIATION_MULTIPLIER = { default: 1.0, min: 1.0, max: 1.5 } as const;

/**
 * The executed lease's remedy is indemnity "at commercial rates then charged" by the lessor's
 * chosen provider — not at the airline's own cost. Declared, no public figure: the ceiling is
 * the executed lease's own lessor premium over pure cost accrual (RESERVE_MARKUP_OVER_ACCRUAL,
 * 1.54). ASSUMPTIONS §7.
 */
export const LESSOR_RECTIFICATION_MARKUP = { default: 1.25, min: 1.0, max: 1.54 } as const;

/**
 * The executed lease the threshold ranges anchor on is an A320 at the narrowbody reference
 * flight leg. A cycle threshold carried unscaled onto a widebody at 7 FH:FC would demand more
 * cycles than a mature engine has between shop visits, so engine cycle thresholds scale by
 * (this ÷ the engine's own reference FH:FC). ASSUMPTIONS §13.
 */
export const THRESHOLD_REFERENCE_FHFC = 2.75;

/**
 * Threshold ranges per lease architecture, in each metric's unit. Reserve-lease figures
 * anchor on the executed lease (engines ≥100 FH / ≥50 FC, LLP ≥50 FC, gear ≥2 months).
 * No-reserve "fat" thresholds anchor on the same contract's *delivery* condition
 * (LLP ≥2,500 FC, gear ≥24 months, ≥5,000 FH expected remaining). ASSUMPTIONS §7.
 */
export const THRESHOLD_RANGES = {
  reserve: {
    engineHoursRemaining: [100, 500],
    engineCyclesRemaining: [50, 250],
    llpCyclesRemaining: [50, 500],
    gearMonthsRemaining: [2, 6],
    gearCyclesRemaining: [200, 1_000],
    airframeMonthsRemaining: [2, 6],
    apuHoursRemaining: [100, 300],
  },
  'no-reserve': {
    engineHoursRemaining: [2_500, 5_000],
    engineCyclesRemaining: [1_000, 2_500],
    llpCyclesRemaining: [2_500, 5_000],
    gearMonthsRemaining: [12, 36],
    gearCyclesRemaining: [2_000, 6_000],
    airframeMonthsRemaining: [12, 36],
    apuHoursRemaining: [1_000, 2_000],
  },
} as const;

// ---------------------------------------------------------------------------------------
// §8 Removal and installation — declared assumption.
// ---------------------------------------------------------------------------------------
export const LABOUR_RATE_PER_MH = 95;
export const REMOVAL_INSTALL_MAN_HOURS = { engine: 300, 'landing-gear': 180, apu: 60, airframe: 0 } as const;
export const ENGINE_SHOP_TURNAROUND_DAYS = { min: 180, max: 200 } as const;

// ---------------------------------------------------------------------------------------
// §9 Utilisation — the master variable.
// ---------------------------------------------------------------------------------------
export interface UtilisationProfile { hoursPerMonth: number; cyclesPerMonth: number; fhFc: number; source: string }

export const UTILISATION: Record<RouteProfile, UtilisationProfile> = {
  'short-dense': { hoursPerMonth: 291, cyclesPerMonth: 151, fhFc: 1.93, source: 'Ryanair 20-F, FY to 31 Mar 2025' },
  'mixed': { hoursPerMonth: 301, cyclesPerMonth: 107, fhFc: 2.81, source: 'FAA/BTS, US NB ≥165k lb MTOW, YE Jun 2023' },
  'long-haul': { hoursPerMonth: 350, cyclesPerMonth: 44, fhFc: 7.9, source: 'FAA/BTS, US WB <580k lb' },
  'ultra-long': { hoursPerMonth: 322, cyclesPerMonth: 40, fhFc: 7.99, source: 'FAA/BTS, US WB ≥580k lb' },
};

/** ±10% per-tail noise so no two aircraft are identical. ASSUMPTIONS §9. */
export const UTILISATION_NOISE = 0.1;

/**
 * How often a component's last recorded shop visit is not evidenced the way the lease's QME clause
 * requires, so the lease does not count its clock reset. The customer: it happens "sometimes"
 * (discovery call, 04:45) — read as one or two tails in ten among those handing back, a per-tail
 * chance of 10–20%. Per component, scaled together from the earlier ordering (an engine shop visit
 * has the longest paper trail) to the low end of that band: a tail whose five components all carry
 * a recorded visit has at least one unevidenced 1 − 0.97² × 0.98² × 0.99 ≈ 10.5% of the time.
 * Drawn only for a component with a recorded visit. The band's middle (≈15%) drew five of the ten
 * returning tails on this seed; the low end draws two. Replaces 12% / 8% / 4%, which had no source
 * and drew six. ASSUMPTIONS, QME incidence.
 */
export const QME_INCIDENCE = { engine: 0.03, landingGear: 0.02, apu: 0.02, airframe: 0.01 } as const;

/**
 * Who owns each kind of readiness item (calc/readiness.ts). The customer: return conditions are
 * owned by the leasing team, shared with legal; maintenance people are told return dates late.
 * Declared roles, not names.
 */
export const READINESS_OWNERS = {
  maintenance: 'Maintenance',
  planning: 'Maintenance planning',
  leasing: 'Leasing team',
  records: 'Technical records',
  finance: 'Finance',
} as const;

/**
 * The standard items every return carries, beside the ones the model derives, each due a fixed
 * time before the return date. Declared — ASSUMPTIONS §17 — except where a basis is named.
 */
export const READINESS_TEMPLATE = [
  {
    id: 'records',
    title: 'Records review: back-to-birth traces, LLP sheets, AD and modification status',
    owner: READINESS_OWNERS.records,
    monthsBefore: 6,
    basis: 'the customer reconciles in the last six months today (discovery call); the review starts there',
  },
  { id: 'manuals', title: 'Manuals and the records transfer pack, to the return standard', owner: READINESS_OWNERS.records, monthsBefore: 3, basis: 'declared' },
  { id: 'cabin', title: 'Cabin condition against the return conditions', owner: READINESS_OWNERS.maintenance, monthsBefore: 2, basis: 'declared' },
  { id: 'inspection', title: 'Final inspection with the lessor', owner: READINESS_OWNERS.leasing, monthsBefore: 1, basis: 'declared' },
] as const;

/**
 * An item is "due soon" inside this many days, and the digest counts the items due inside it. The
 * longest notice the lease asks of any step (clause 12.3(b), 90 days): an item due inside it has to
 * be started now to be on time.
 */
export const READINESS_WINDOW_DAYS = 90;

/**
 * "Check before acting": a recommendation is listed when an assumption would flip it within the
 * first half of the range its evidence supports (reach under this share). Beyond it, the move needed
 * is as large as the evidence allows at all, and the answer is not one to check first.
 */
export const CHECK_BEFORE_ACTING_REACH = 0.5;

/** Which profiles each type can fly. */
export const PROFILES_BY_TYPE: Record<AircraftType, RouteProfile[]> = {
  'A320neo': ['short-dense', 'mixed'],
  'A321neo': ['short-dense', 'mixed'],
  'B737-8': ['short-dense', 'mixed'],
  'A350-900': ['long-haul'],
  'B787-9': ['long-haul'],
  'B777-300ER': ['ultra-long'],
};

export const ENGINE_BY_TYPE: Record<AircraftType, EngineModel> = {
  'A320neo': 'LEAP-1A26',
  'A321neo': 'LEAP-1A33',
  'B737-8': 'CFM56-7B26E',
  'A350-900': 'Trent XWB-84',
  'B787-9': 'GEnx-1B76',
  'B777-300ER': 'GE90-115B',
};

export const BODY_CLASS: Record<AircraftType, BodyClass> = {
  'A320neo': 'narrowbody',
  'A321neo': 'narrowbody',
  'B737-8': 'narrowbody',
  'A350-900': 'widebody',
  'B787-9': 'widebody',
  'B777-300ER': 'widebody',
};

// ---------------------------------------------------------------------------------------
// §10 Environment, derate, phase.
// ---------------------------------------------------------------------------------------

/** Ackert Fig. 71: temperate → harsh-high is cost +13% and time-on-wing −36%. harsh-mild is the midpoint (declared). */
export const ENVIRONMENT_EFFECT: Record<Environment, { costMultiplier: number; towMultiplier: number }> = {
  'temperate': { costMultiplier: 1.0, towMultiplier: 1.0 },
  'harsh-mild': { costMultiplier: 1.065, towMultiplier: 0.82 },
  'harsh-high': { costMultiplier: 1.13, towMultiplier: 0.64 },
};

/** Executed lease grid: 0% → 10% derate moves the engine reserve by −21%. 5% is the midpoint (declared). */
export const DERATE_RESERVE_MULTIPLIER: Record<Derate, number> = {
  10: 1.0,
  5: 1 + 0.21 / 2 / 0.79,
  0: 1 / 0.79,
};

// ---------------------------------------------------------------------------------------
// §11 The reconciliation benchmark — IATA MCX FY2024 panel.
// ---------------------------------------------------------------------------------------
export const IATA_MCX_FY2024 = {
  source: 'IATA Maintenance Cost Data eXchange FY2024 Executive Report (public)',
  airlines: 28,
  aircraft: 2_703,
  averageAgeYears: 10.6,
  flightHoursPerDay: 9.06,
  costPerFlightHour: 1_522,
  costPerFlightCycle: 3_758,
  costPerAircraftPerYear: 5_050_000,
  /** Widebodies are 20.3% of the active fleet and 42% of MRO cost. */
  widebodyShareOfFleet: 0.203,
  widebodyShareOfCost: 0.42,
  /** Engine share of total MRO spend, 2024 (from 41% in 2019). */
  engineShareOfSpend: 0.5,
  /** Cross-check, global all-fleet (Cirium): FH and FC per aircraft per month. */
  globalFleetHoursPerMonth: 238,
  globalFleetCyclesPerMonth: 107,
} as const;

/**
 * The model prices four components only. The IATA figure is *total* MRO spend, including
 * line maintenance, rotables and overhead the model does not carry. Coverage is derived:
 *   engine events are 50% of total MRO spend (IATA) and >80–90% of Ackert's direct
 *   maintenance cost (DMC), so DMC ≈ 50% ÷ 0.85 ≈ 59% of total; the four components are
 *   ~95% of DMC (engines 80–90%, airframe 4–6%, gear 2–3%, APU 1–2%) → ≈ 56% of total.
 * Declared — ASSUMPTIONS §11.
 */
export const ACKERT_ENGINE_SHARE_OF_DMC = 0.85;
export const FOUR_COMPONENT_SHARE_OF_DMC = 0.95;
export const MODEL_COVERAGE_OF_TOTAL_MRO =
  (IATA_MCX_FY2024.engineShareOfSpend / ACKERT_ENGINE_SHARE_OF_DMC) * FOUR_COMPONENT_SHARE_OF_DMC;

/** The test passes when the generated fleet lands inside this band of the adjusted benchmark. */
export const RECONCILIATION_BAND = { min: 0.65, max: 1.35 } as const;

// ---------------------------------------------------------------------------------------
// §11b The scale check — is the exposure the right size? ASSUMPTIONS §11b gives the reasons.
// ---------------------------------------------------------------------------------------

/** One 737-800 returned off lease, full settlement ≈ $6.7M (Sun Country 10-Q, Q2 2025, audited). ASSUMPTIONS §7. */
export const EOL_SETTLEMENT_NARROWBODY = 6_700_000;

/**
 * Widebody to narrowbody, by total maintenance event value: 777-300ER $60.4–75.8M ÷ A320-200
 * $17.7–19.2M, at the midpoints (Ackert / ISTAT 2020, ASSUMPTIONS §7) = 3.69.
 */
export const WIDEBODY_EVENT_VALUE_RATIO = (60.4 + 75.8) / 2 / ((17.7 + 19.2) / 2);

export const SCALE_BANDS = {
  /** Exposure on the returning tails ÷ their four-component maintenance accrual over the rest of the lease. */
  accrualRatio: { min: 0.2, max: 1.0 },
  /** No returning tail above this multiple of its body class's settlement benchmark. */
  perTailMaxMultiple: 2,
  /** The average multiple, over the tails with any exposure. */
  averageMultiple: { min: 0.3, max: 1.5 },
} as const;

// ---------------------------------------------------------------------------------------
// §13 Downtime — aircraft days out of service, and the declared cost per day.
// ---------------------------------------------------------------------------------------
export const DOWNTIME_DAYS = {
  engineSwapWithSpare: 1,
  engineShopVisitNoSpare: 14,
  landingGearChange: 10,
  landingGearInsidePlannedCheck: 0,
  apuChange: 1,
  routeReassignment: 0,
  doNothing: 0,
} as const;

/** Lost contribution, not revenue. Declared, exposed as a scenario control. */
export const DOWNTIME_COST_PER_DAY: Record<BodyClass, number> = {
  narrowbody: 45_000,
  widebody: 130_000,
};

// ---------------------------------------------------------------------------------------
// Calendar convention and the scenario panel's defaults.
// ---------------------------------------------------------------------------------------

/** One month, for every months↔days conversion in the model (365.25 ÷ 12). */
export const DAYS_PER_MONTH = 30.4375;

/** Shop slots need 3–6 months of lead time (customer, ASSUMPTIONS §1). Default the midpoint. */
export const SHOP_SLOT_LEAD_TIME_MONTHS = { default: 4, min: 3, max: 6 } as const;

/**
 * How the returning tails' engines are placed (data/generate.ts; ASSUMPTIONS, "How the returning ten
 * are drawn"). For each engine that has been to the shop, the date it first falls short of a handback
 * threshold — on any clock: hours or cycles to its next shop visit, LLP life — is drawn evenly from
 * dueFromMonths after the data's date to dueAfterReturnMonths after its return. From: the top of the
 * evidenced shop-slot lead time, so whatever comes due can still be slotted and its removal noticed.
 * To: a year past return, so some engines clear handback and need no decision. A tool used ahead of
 * handback sees engines coming due, not engines already gone.
 */
export const RETURNING_DRAW = { dueFromMonths: SHOP_SLOT_LEAD_TIME_MONTHS.max, dueAfterReturnMonths: 12 } as const;

/**
 * The budget year for return-related maintenance: the next twelve months from the data's date. An
 * action's spend counts against it when its work falls inside — a shop visit in its induction
 * month, a swap now. Declared. ASSUMPTIONS §15.
 */
export const BUDGET_WINDOW_MONTHS = 12;

/** The one control the screen keeps: extending a named lease is the customer's own decision and example. ASSUMPTIONS §14. */
export const LEASE_EXTENSION_CONTROL = { min: 0, max: 12, step: 1 } as const;

export type AssumptionInputId =
  | 'maintenanceCost'
  | 'utilisation'
  | 'downtimeNarrowbody'
  | 'downtimeWidebody'
  | 'lessorMarkup'
  | 'reservesReclaim'
  | 'shopSlotLead';

/**
 * Every assumption a recommendation rests on, stated with its provenance and swept by the
 * robustness check (calc/robustness.ts). The range is the plausible one — where the evidence
 * stops — and the step is the sweep's resolution. ASSUMPTIONS §14.
 */
export interface AssumptionInput {
  id: AssumptionInputId;
  label: string;
  unit: 'multiplier' | 'usd-per-day' | 'share' | 'months';
  range: { min: number; max: number; step: number };
  /** Why the range stops where it does. */
  basis: string;
  /** Where the real number would come from in deployment. */
  source: string;
}

export const ASSUMPTION_INPUTS: AssumptionInput[] = [
  {
    id: 'maintenanceCost',
    label: 'Shop costs',
    unit: 'multiplier',
    range: { min: 0.91, max: 1.5, step: 0.01 },
    basis: '−9%: the low end of the published escalation behind the 2026 factors (§0). +50%: a quarter of MROs report next-gen shop costs more than 50% over expectation (Oliver Wyman, Apr 2026).',
    source: 'MRO contract rates and shop-visit quotes, from engineering and procurement',
  },
  {
    id: 'utilisation',
    label: 'Utilisation',
    unit: 'multiplier',
    range: { min: 0.87, max: 1.2, step: 0.01 },
    basis: '−13%: the share of the fleet parked in 2024 (IATA MCX). +20%: Cathay Pacific, 9.4 to 11.3 hours a day in a year.',
    source: 'the published schedule and flying-hour plan, from network planning',
  },
  {
    id: 'downtimeNarrowbody',
    label: 'Narrowbody day on the ground',
    unit: 'usd-per-day',
    range: { min: 0, max: 100_000, step: 5_000 },
    basis: 'Declared, not sourced (§13): from zero (a spare aircraft) to a little over twice the default.',
    source: "finance's lost contribution per aircraft day",
  },
  {
    id: 'downtimeWidebody',
    label: 'Widebody day on the ground',
    unit: 'usd-per-day',
    range: { min: 0, max: 300_000, step: 10_000 },
    basis: 'Declared, not sourced (§13): from zero (a spare aircraft) to a little over twice the default.',
    source: "finance's lost contribution per aircraft day",
  },
  {
    id: 'lessorMarkup',
    label: "Lessor's provider over our cost",
    unit: 'multiplier',
    range: { min: LESSOR_RECTIFICATION_MARKUP.min, max: LESSOR_RECTIFICATION_MARKUP.max, step: 0.02 },
    basis: "1.0: our own cost. 1.54: the executed lease's own lessor premium over pure cost accrual, a ceiling (§7).",
    source: "the leasing team's settlement history with each lessor",
  },
  {
    id: 'reservesReclaim',
    label: 'Share of reserves reclaimable',
    unit: 'share',
    range: { min: 0, max: 1, step: 0.05 },
    basis: 'Negotiated, not assumed (CLAUDE.md): from none of the balance to all of it.',
    source: 'the reserve terms in each lease, from the leasing team and legal',
  },
  {
    id: 'shopSlotLead',
    label: 'Shop-slot lead time',
    unit: 'months',
    range: { min: SHOP_SLOT_LEAD_TIME_MONTHS.min, max: SHOP_SLOT_LEAD_TIME_MONTHS.max, step: 1 },
    basis: 'Three to six months, as the customer gave it (§1).',
    source: 'MRO slot availability, from engineering planning',
  },
];

/**
 * How good the cost estimates are (ASSUMPTIONS §0). Every cost in the model is a 2018 appraiser
 * figure escalated to 2026, so each carries two errors:
 *   escalation — §0's factor sits inside the published annual range for its event type; compounded
 *                over the eight years, that range is ± this much around the factor used;
 *   appraiser  — the 2018 figure is itself published as a range (Ackert); half its width over its
 *                midpoint, averaged over the types this fleet flies. LLPs are OEM list: no range.
 * The two are independent, so they combine in quadrature, and the event types are weighted by
 * their share of direct maintenance cost (§11–§12). The result is COST_ESTIMATE_UNCERTAINTY.
 */
export const COST_ESTIMATE_QUALITY = {
  years: 8,
  eventTypes: [
    {
      id: 'enginePR',
      label: 'Engine performance restoration',
      factor: ESCALATION_2018_TO_2026.enginePR,
      annual: [0.045, 0.065],
      // CFM56-7B26E, LEAP-1A26/33, GEnx-1B76, Trent XWB-84, GE90-115B, first- and mature-run ($M, 2018)
      appraiserRanges: [[3.2, 3.4], [3.4, 3.6], [3.3, 3.6], [4.0, 4.4], [3.3, 3.6], [4.0, 4.4], [6.1, 6.5], [7.5, 8.0], [6.4, 6.8], [7.7, 8.2], [9.5, 10.5], [11.0, 12.0]],
      share: 0.375,
    },
    { id: 'engineLLP', label: 'Engine LLPs', factor: ESCALATION_2018_TO_2026.engineLLP, annual: [0.05, 0.08], appraiserRanges: [], share: 0.525 },
    {
      id: 'landingGear',
      label: 'Landing gear',
      factor: ESCALATION_2018_TO_2026.landingGear,
      annual: [0.035, 0.055],
      // A320neo, 737NG, A350, 777, 787 overhaul ($K, 2018)
      appraiserRanges: [[450, 490], [400, 440], [1050, 1150], [1000, 1200], [850, 950]],
      share: 0.025,
    },
    {
      id: 'apu',
      label: 'APU',
      factor: ESCALATION_2018_TO_2026.apu,
      annual: [0.045, 0.065],
      // A320/737NG, A350/787, 777 ($K, 2018)
      appraiserRanges: [[320, 360], [450, 550], [550, 650]],
      share: 0.015,
    },
    {
      id: 'airframe',
      label: 'Airframe heavy check',
      factor: ESCALATION_2018_TO_2026.airframe,
      annual: [0.025, 0.035],
      // A320 6Y/12Y, A321 6Y/12Y, 737-800 8Y ($K), A350 12Y, 787-9 12Y, 777-300 8Y ($M), 2018
      appraiserRanges: [[800, 900], [850, 950], [825, 925], [875, 975], [650, 750], [2.7, 3.0], [2.4, 2.7], [3.4, 3.8]],
      share: 0.05,
    },
  ],
} as const;

export function costEstimateQuality() {
  const { years } = COST_ESTIMATE_QUALITY;
  const types = COST_ESTIMATE_QUALITY.eventTypes.map((t) => {
    const low = (1 + t.annual[0]) ** years;
    const high = (1 + t.annual[1]) ** years;
    const escalation = (high - low) / 2 / t.factor;
    const r = t.appraiserRanges as readonly (readonly [number, number])[];
    const appraiser = r.length ? r.reduce((s, [x, y]) => s + (y - x) / (x + y), 0) / r.length : 0;
    return { ...t, low, high, escalation, appraiser, combined: Math.hypot(escalation, appraiser), factorInsideRange: t.factor >= low && t.factor <= high };
  });
  const weight = types.reduce((s, t) => s + t.share, 0);
  return { types, uncertainty: types.reduce((s, t) => s + t.share * t.combined, 0) / weight };
}

/**
 * ±10.1%: how far the costs behind a recommendation could be off (costEstimateQuality). A
 * recommendation stands only if its advantage over the next best option is larger than this share
 * of the estimated money on which the two options differ. ASSUMPTIONS §0.
 */
export const COST_ESTIMATE_UNCERTAINTY = costEstimateQuality().uncertainty;

/**
 * The scenario panel at rest: every multiplier at 1, no extensions. Over-delivery bought at past shop
 * visits is not counted: it is sunk, so it is reported on its own line rather than in forward-looking
 * money (ASSUMPTIONS §8). A spare's life handed over still counts — that life leaves going forward.
 */
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  maintenanceCostMultiplier: 1,
  utilisationMultiplier: 1,
  leaseExtensionMonths: {},
  shopSlotLeadTimeMonths: SHOP_SLOT_LEAD_TIME_MONTHS.default,
  countOverDeliveryAsLoss: false,
  /** Share of a reserve balance reclaimable against qualifying work, credited by levers 1 and 4. Must be negotiated, not assumed (CLAUDE.md); 1.0 is the lessee-favourable case until the scenario panel exposes it. */
  reservesReclaimPct: 1,
  downtimeCostPerDay: DOWNTIME_COST_PER_DAY,
  lessorRectificationMarkup: LESSOR_RECTIFICATION_MARKUP.default,
};
