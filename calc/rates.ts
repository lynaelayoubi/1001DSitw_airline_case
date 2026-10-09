// Reserve rates and compensation rates. Pure functions; every result carries a trace.
// SPEC §2.3 and ASSUMPTIONS §6–§7. The generator uses these to stamp a compensationRate on
// each return condition; the engine recomputes from the same functions when it prices a gap.

import {
  AIRFRAME,
  APU,
  DERATE_RESERVE_MULTIPLIER,
  ENGINE_RESERVE_GRID,
  ENGINE_SPECS,
  ENVIRONMENT_EFFECT,
  LANDING_GEAR,
  RESERVE_MARKUP_OVER_ACCRUAL,
  WORKSCOPE_TIERS,
} from './constants';
import { num, usd, usd2 } from './format';
import type { AircraftType, Derate, EngineModel, Environment, Workscope } from './types';

export type EnginePhase = 'first-run' | 'mature-run';

export interface Rated {
  rate: number;
  trace: string;
}


export function phaseOf(shopVisitCount: number): EnginePhase {
  return shopVisitCount === 0 ? 'first-run' : 'mature-run';
}

/** The executed-lease grid: $/EFH at 10% derate, by FH:FC band. */
export function gridRatePerEfh(fhFc: number): number {
  for (const band of ENGINE_RESERVE_GRID) {
    if (fhFc < band.maxFhFc) return band.ratePerEfh;
  }
  return ENGINE_RESERVE_GRID[ENGINE_RESERVE_GRID.length - 1]!.ratePerEfh;
}

export interface EngineEconomics {
  prCost: number;
  towFC: number;
  towFH: number;
  accrualPerFC: number;
  trace: string;
}

/** Performance-restoration cost and time-on-wing for an engine in its phase and environment. */
export function engineEconomics(
  model: EngineModel,
  phase: EnginePhase,
  environment: Environment,
  fhFc: number,
): EngineEconomics {
  const spec = ENGINE_SPECS[model];
  const env = ENVIRONMENT_EFFECT[environment];
  const basePr = phase === 'first-run' ? spec.prCostFirstRun : spec.prCostMatureRun;
  const baseTow = phase === 'first-run' ? spec.towFirstRunFC : spec.towMatureRunFC;
  const prCost = basePr * env.costMultiplier;
  const towFC = baseTow * env.towMultiplier;
  const towFH = towFC * fhFc;
  const accrualPerFC = prCost / towFC;
  const trace =
    `${model} ${phase}, ${environment}: PR cost ${usd(basePr)} × ${env.costMultiplier} = ${usd(prCost)}; ` +
    `time on wing ${num(baseTow)} FC × ${env.towMultiplier} = ${num(towFC)} FC ` +
    `(${num(towFH)} FH at ${fhFc.toFixed(2)} FH:FC); accrual ${usd(accrualPerFC)}/FC`;
  return { prCost, towFC, towFH, accrualPerFC, trace };
}

/**
 * Engine performance-restoration reserve, $/engine flight hour.
 * Base = pure accrual at the appraiser's reference FH:FC × the lessor markup calibrated on the
 * executed lease; then shaped by the lease's FH:FC grid and the derate column.
 */
export function engineReserveRatePerEfh(
  model: EngineModel,
  phase: EnginePhase,
  environment: Environment,
  derate: Derate,
  fhFc: number,
): Rated {
  const spec = ENGINE_SPECS[model];
  const econ = engineEconomics(model, phase, environment, spec.referenceFhFc);
  const accrualPerEfhAtRef = econ.prCost / (econ.towFC * spec.referenceFhFc);
  const baseRate = accrualPerEfhAtRef * RESERVE_MARKUP_OVER_ACCRUAL;
  const shape = gridRatePerEfh(fhFc) / gridRatePerEfh(spec.referenceFhFc);
  const derateMult = DERATE_RESERVE_MULTIPLIER[derate];
  const rate = baseRate * shape * derateMult;
  const trace =
    `${econ.trace}. At reference ${spec.referenceFhFc} FH:FC that is ${usd2(accrualPerEfhAtRef)}/EFH; ` +
    `× lessor markup ${RESERVE_MARKUP_OVER_ACCRUAL.toFixed(2)} = ${usd2(baseRate)}/EFH; ` +
    `× grid shape ${shape.toFixed(3)} for ${fhFc.toFixed(2)} FH:FC (${usd2(gridRatePerEfh(fhFc))} ÷ ${usd2(gridRatePerEfh(spec.referenceFhFc))}); ` +
    `× derate ${derate}% ${derateMult.toFixed(3)} = ${usd2(rate)}/EFH`;
  return { rate, trace };
}

/** Engine LLP reserve: OEM list price of the stack ÷ certified cycle life, per cycle. */
export function llpReservePerFC(model: EngineModel): Rated {
  const spec = ENGINE_SPECS[model];
  const rate = spec.llpStackCost / spec.llpCertifiedLifeFC;
  return {
    rate,
    trace: `${model} LLP stack ${usd(spec.llpStackCost)} ÷ certified life ${num(spec.llpCertifiedLifeFC)} FC = ${usd2(rate)}/FC`,
  };
}

/** Cycles of LLP life a workscope buys, scaled from the narrowbody reference to the engine's certified life. */
export function workscopeBucketCycles(model: EngineModel, workscope: Exclude<Workscope, 'none'>): number {
  const spec = ENGINE_SPECS[model];
  const reference = WORKSCOPE_TIERS['build-for-interval'].buysCycles;
  return Math.round((WORKSCOPE_TIERS[workscope].buysCycles * spec.llpCertifiedLifeFC) / reference);
}

export function gearReserve(type: AircraftType): { perMonth: Rated; perFC: Rated } {
  const g = LANDING_GEAR[type];
  const perMonth = g.overhaulCost / g.intervalMonths;
  const perFC = g.overhaulCost / g.intervalFC;
  return {
    perMonth: { rate: perMonth, trace: `${type} gear overhaul ${usd(g.overhaulCost)} ÷ ${g.intervalMonths} months = ${usd(perMonth)}/month` },
    perFC: { rate: perFC, trace: `${type} gear overhaul ${usd(g.overhaulCost)} ÷ ${num(g.intervalFC)} FC = ${usd2(perFC)}/FC` },
  };
}

export function airframeReservePerMonth(type: AircraftType): Rated {
  const checks = AIRFRAME[type].checks;
  const rate = checks.reduce((s, c) => s + c.cost / c.intervalMonths, 0);
  const parts = checks.map((c) => `${c.name} ${usd(c.cost)} ÷ ${c.intervalMonths}`).join(' + ');
  return { rate, trace: `${type} airframe ${parts} = ${usd(rate)}/month` };
}

export function apuReservePerApuHour(type: AircraftType): Rated {
  const a = APU[type];
  const rate = a.overhaulCost / a.intervalApuHours;
  return { rate, trace: `${type} APU overhaul ${usd(a.overhaulCost)} ÷ ${num(a.intervalApuHours)} APU hours = ${usd2(rate)}/APU-FH` };
}

/**
 * compensationRate = the lease's own reserve rate for the item. The reserve rate already carries the
 * lessor's margin over pure cost accrual (RESERVE_MARKUP_OVER_ACCRUAL, 1.54); a multiplier on top
 * would count that margin twice. ASSUMPTIONS §7.
 */
export function compensationRate(reserve: Rated, unit: string): Rated {
  return { rate: reserve.rate, trace: `${reserve.trace}; charged at that rate, ${usd2(reserve.rate)}/${unit} of shortfall` };
}

// ---------------------------------------------------------------------------------------
// Shop visit cost — what a workscope costs and how much life it buys. SPEC §2.4.
// ---------------------------------------------------------------------------------------

export interface EngineShopVisitCost {
  workscope: Exclude<Workscope, 'none'>;
  restoration: number;
  llp: number;
  total: number;
  /** Time on wing the restoration buys — the engine is mature-run after any visit. */
  towFC: number;
  towFH: number;
  /** LLP life the visit buys. */
  bucketCycles: number;
  /** The spec's headline figure: total ÷ bucket cycles ($388/FC vs $688/FC on the reference engine). */
  totalPerFC: number;
  trace: string;
}

/**
 * Cost of an engine shop visit at a given workscope, scaled from the narrowbody reference
 * tiers to this engine's own restoration and LLP costs. `visitNumber` 1 is a first-run engine
 * going in; later visits price at the mature-run figure.
 */
export function engineShopVisitCost(
  model: EngineModel,
  environment: Environment,
  workscope: Exclude<Workscope, 'none'>,
  visitNumber: number,
): EngineShopVisitCost {
  const spec = ENGINE_SPECS[model];
  const tier = WORKSCOPE_TIERS[workscope];
  const ref = WORKSCOPE_TIERS['build-for-interval'];
  const phaseIn: EnginePhase = visitNumber <= 1 ? 'first-run' : 'mature-run';
  const fhFc = spec.referenceFhFc;
  const econIn = engineEconomics(model, phaseIn, environment, fhFc);
  const restorationShare = tier.restoration / ref.restoration;
  const llpShare = tier.llp / ref.llp;
  const restoration = econIn.prCost * restorationShare;
  const llp = spec.llpStackCost * llpShare;
  const total = restoration + llp;
  const after = engineEconomics(model, 'mature-run', environment, fhFc); // time on wing after the visit, at the reference leg
  const bucketCycles = workscopeBucketCycles(model, workscope);
  const totalPerFC = total / bucketCycles;
  const trace =
    `${workscope === 'build-for-cash' ? 'minimum shop visit (build-for-cash)' : 'full shop visit (build-for-interval)'} on ${model} (visit ${visitNumber}, ${phaseIn} going in, ${environment}): restoration ${usd(econIn.prCost)} × ${restorationShare.toFixed(2)} = ${usd(restoration)}, ` +
    `LLP ${usd(spec.llpStackCost)} × ${llpShare.toFixed(2)} = ${usd(llp)}, total ${usd(total)}. ` +
    `Buys ${num(after.towFC)} FC (${num(after.towFH)} FH) on wing and ${num(bucketCycles)} FC of LLP life; ` +
    `${usd(total)} ÷ ${num(bucketCycles)} FC = ${usd(totalPerFC)}/FC`;
  return { workscope, restoration, llp, total, towFC: after.towFC, towFH: after.towFH, bucketCycles, totalPerFC, trace };
}
