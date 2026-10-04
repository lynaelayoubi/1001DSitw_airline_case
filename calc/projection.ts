// SPEC §2.1 — project forward. Pure: aircraft and assumptions in, a projection with a trace
// out. Two things live here: how much the tail will fly between today and handback, and
// where each component's clocks stand today on either basis (as the maintenance system
// records them, or as the lease would allow — SPEC §2.5).

import {
  AIRFRAME,
  APU,
  APU_HOURS_PER_FLIGHT_CYCLE,
  DAYS_PER_MONTH,
  ENGINE_SPECS,
  ENVIRONMENT_EFFECT,
  LANDING_GEAR,
} from './constants';
import { num } from './format';
import { engineEconomics, phaseOf } from './rates';
import type { Aircraft, Assumptions, Component, ISODate, Metric, ReturnCondition } from './types';

/**
 * Which position a component is read from. `as-recorded` is the maintenance system's
 * view. `as-lease-allows` withdraws the credit of any shop visit that is not evidenced as a
 * qualified maintenance event, so the clock runs from the previous verified event.
 */
export type Basis = 'as-recorded' | 'as-lease-allows';

export type Unit = ReturnCondition['unit'];

const MS_PER_DAY = 86_400_000;

export function parseDate(d: ISODate): Date {
  return new Date(d + 'T00:00:00Z');
}

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

/** Dates are whole days, so the result is rounded to the nearest day. */
export function addMonths(d: ISODate, months: number): ISODate {
  return toISO(new Date(parseDate(d).getTime() + Math.round(months * DAYS_PER_MONTH) * MS_PER_DAY));
}

/** Fractional months between two dates at the model's 30.4375-day month. */
export function monthsBetween(from: ISODate, to: ISODate): number {
  return (parseDate(to).getTime() - parseDate(from).getTime()) / (DAYS_PER_MONTH * MS_PER_DAY);
}

export interface UsageProjection {
  tail: string;
  asOf: ISODate;
  leaseEnd: ISODate;
  extensionMonths: number;
  /** leaseEnd plus any extension in the scenario. */
  effectiveLeaseEnd: ISODate;
  monthsToReturn: number;
  utilisationMultiplier: number;
  /** After the utilisation multiplier. */
  hoursPerMonth: number;
  cyclesPerMonth: number;
  apuHoursPerMonth: number;
  fhFc: number;
  /** Projected use between today and handback, by currency. */
  hours: number;
  cycles: number;
  apuHours: number;
  months: number;
  shopSlotLeadTimeMonths: number;
  /** Latest date a shop slot can still be booked for before handback. SPEC §2.7. */
  shopSlotDeadline: ISODate;
  trace: string;
}

export function projectUsage(ac: Aircraft, asOf: ISODate, a: Assumptions): UsageProjection {
  const extensionMonths = a.leaseExtensionMonths[ac.tail] ?? 0;
  const effectiveLeaseEnd = extensionMonths ? addMonths(ac.leaseEnd, extensionMonths) : ac.leaseEnd;
  // Extension months are added as months; the effective date is for display and the deadline.
  const monthsToReturn = Math.max(0, monthsBetween(asOf, ac.leaseEnd) + extensionMonths);
  const hoursPerMonth = ac.hoursPerMonth * a.utilisationMultiplier;
  const cyclesPerMonth = ac.cyclesPerMonth * a.utilisationMultiplier;
  const apuHoursPerMonth = cyclesPerMonth * APU_HOURS_PER_FLIGHT_CYCLE;
  const hours = hoursPerMonth * monthsToReturn;
  const cycles = cyclesPerMonth * monthsToReturn;
  const apuHours = apuHoursPerMonth * monthsToReturn;
  const shopSlotDeadline = addMonths(effectiveLeaseEnd, -a.shopSlotLeadTimeMonths);
  const ext = extensionMonths ? ` + ${extensionMonths} months extension = ${effectiveLeaseEnd}` : '';
  const trace =
    `${ac.tail}: lease ends ${ac.leaseEnd}${ext}; ${num(monthsToReturn, 1)} months from ${asOf}. ` +
    `Flies ${num(ac.hoursPerMonth)} FH and ${num(ac.cyclesPerMonth)} FC a month (${ac.routeProfile}) × utilisation ${a.utilisationMultiplier.toFixed(2)} ` +
    `= ${num(hoursPerMonth)} FH, ${num(cyclesPerMonth)} FC a month → ${num(hours)} FH, ${num(cycles)} FC, ` +
    `${num(apuHours)} APU hours (${APU_HOURS_PER_FLIGHT_CYCLE} per cycle) before handback. ` +
    `Shop slot needs ${a.shopSlotLeadTimeMonths} months lead: book by ${shopSlotDeadline}.`;
  return {
    tail: ac.tail,
    asOf,
    leaseEnd: ac.leaseEnd,
    extensionMonths,
    effectiveLeaseEnd,
    monthsToReturn,
    utilisationMultiplier: a.utilisationMultiplier,
    hoursPerMonth,
    cyclesPerMonth,
    apuHoursPerMonth,
    fhFc: ac.hoursPerMonth / ac.cyclesPerMonth,
    hours,
    cycles,
    apuHours,
    months: monthsToReturn,
    shopSlotLeadTimeMonths: a.shopSlotLeadTimeMonths,
    shopSlotDeadline,
    trace,
  };
}

/** Projected use in a requirement's currency. */
export function projectedUse(p: UsageProjection, unit: Unit): number {
  switch (unit) {
    case 'FH':
      return p.hours;
    case 'FC':
      return p.cycles;
    case 'APU-FH':
      return p.apuHours;
    case 'months':
      return p.months;
  }
}

/** Monthly burn in a requirement's currency, for converting a gap into months of flying. */
export function monthlyRate(p: UsageProjection, unit: Unit): number {
  switch (unit) {
    case 'FH':
      return p.hoursPerMonth;
    case 'FC':
      return p.cyclesPerMonth;
    case 'APU-FH':
      return p.apuHoursPerMonth;
    case 'months':
      return 1;
  }
}

export interface ClockReading {
  metric: Metric;
  unit: Unit;
  basis: Basis;
  /** Life left on this clock today, in the unit. Negative means already past the limit. */
  remainingToday: number;
  /** The interval the clock runs to, where one exists. */
  limit: number | null;
  /** Consumed since the last event that reset the clock, on this basis. */
  used: number | null;
  trace: string;
}

function position(c: Component, basis: Basis) {
  return basis === 'as-lease-allows' ? c.asLeaseAllows : { tso: c.tso, cso: c.cso, llpMinCyclesRemaining: c.llpMinCyclesRemaining };
}

/** Where a component's clock stands today for one requirement, on one basis. */
export function readClock(ac: Aircraft, c: Component, rc: ReturnCondition, basis: Basis): ClockReading {
  const pos = position(c, basis);
  const basisNote =
    basis === 'as-lease-allows' && c.qmeStatus === 'not-evidenced'
      ? ' [as the lease allows: last shop visit not evidenced as a QME, clock runs from the previous verified event]'
      : '';
  const fhFc = ac.hoursPerMonth / ac.cyclesPerMonth;
  const out = (remainingToday: number, limit: number | null, used: number | null, trace: string): ClockReading => ({
    metric: rc.metric,
    unit: rc.unit,
    basis,
    remainingToday,
    limit,
    used,
    trace: trace + basisNote,
  });

  switch (c.kind) {
    case 'engine': {
      const model = ac.engineModel;
      const phase = phaseOf(c.shopVisitCount);
      const spec = ENGINE_SPECS[model];
      const env = ENVIRONMENT_EFFECT[ac.environment];
      // The interval is quoted in cycles at the appraiser's reference flight leg; in hours it is
      // the same interval at that leg. A tail flying shorter legs than the reference burns the
      // cycle clock faster, longer legs the hours clock — which is the whole point.
      const econ = engineEconomics(model, phase, ac.environment, spec.referenceFhFc);
      const baseTow = phase === 'first-run' ? spec.towFirstRunFC : spec.towMatureRunFC;
      if (rc.metric === 'hoursRemaining') {
        const limit = econ.towFH;
        return out(
          limit - pos.tso,
          limit,
          pos.tso,
          `${c.position} ${model} ${phase}, ${ac.environment}: time on wing ${num(baseTow)} FC × ${env.towMultiplier} × ${spec.referenceFhFc.toFixed(2)} FH:FC (the interval's reference flight leg; this tail flies ${fhFc.toFixed(2)}) = ${num(limit)} FH; ` +
            `${num(pos.tso)} FH since last shop visit → ${num(limit - pos.tso)} FH remaining today`,
        );
      }
      if (rc.metric === 'cyclesRemaining') {
        const limit = econ.towFC;
        return out(
          limit - pos.cso,
          limit,
          pos.cso,
          `${c.position} ${model} ${phase}, ${ac.environment}: time on wing ${num(baseTow)} FC × ${env.towMultiplier} = ${num(limit)} FC; ` +
            `${num(pos.cso)} FC since last shop visit → ${num(limit - pos.cso)} FC remaining today`,
        );
      }
      if (rc.metric === 'llpCyclesRemaining') {
        // LLP life is tracked part by part, with each part's own records: a shop visit that fails
        // the lease's QME definition does not reset the restoration clock, but it does not take
        // life off parts that were fitted. So both bases read the recorded LLP position.
        const llp = c.llpMinCyclesRemaining;
        const note = basis === 'as-lease-allows' ? ' (LLP life is tracked per part, so the lease basis reads it as recorded)' : '';
        return {
          metric: rc.metric,
          unit: rc.unit,
          basis,
          remainingToday: llp,
          limit: null,
          used: null,
          trace: `${c.position} ${model}: limiting life-limited part has ${num(llp)} FC remaining today (the worst part sets the engine's life)${note}`,
        };
      }
      break;
    }
    case 'landing-gear': {
      const g = LANDING_GEAR[ac.type];
      if (rc.metric === 'monthsRemaining') {
        const used = pos.cso / ac.cyclesPerMonth;
        const limit = g.intervalMonths;
        return out(
          limit - used,
          limit,
          used,
          `MLG ${ac.type}: overhaul interval ${limit} months; ${num(pos.cso)} FC since overhaul ÷ ${num(ac.cyclesPerMonth)} FC a month = ${num(used, 1)} months → ${num(limit - used, 1)} months remaining today`,
        );
      }
      if (rc.metric === 'cyclesRemaining') {
        return out(
          pos.llpMinCyclesRemaining,
          g.intervalFC,
          g.intervalFC - pos.llpMinCyclesRemaining,
          `MLG ${ac.type}: ${num(pos.llpMinCyclesRemaining)} FC to next overhaul today (the lesser of the ${num(g.intervalFC)} FC and ${g.intervalMonths}-month limits, as the maintenance programme carries it)`,
        );
      }
      break;
    }
    case 'airframe': {
      const checks = AIRFRAME[ac.type].checks;
      const next = checks.reduce((a, b) => (b.intervalMonths < a.intervalMonths ? b : a));
      if (rc.metric === 'monthsRemaining') {
        const used = pos.cso / ac.cyclesPerMonth;
        const limit = next.intervalMonths;
        return out(
          limit - used,
          limit,
          used,
          `AIRFRAME ${ac.type}: ${next.name} every ${limit} months; ${num(pos.cso)} FC since last check ÷ ${num(ac.cyclesPerMonth)} FC a month = ${num(used, 1)} months → ${num(limit - used, 1)} months remaining today`,
        );
      }
      break;
    }
    case 'apu': {
      const a = APU[ac.type];
      if (rc.metric === 'hoursRemaining') {
        const limit = a.intervalApuHours;
        return out(
          limit - pos.tso,
          limit,
          pos.tso,
          `APU ${ac.type}: interval ${num(limit)} APU hours; ${num(pos.tso)} APU hours since overhaul → ${num(limit - pos.tso)} remaining today`,
        );
      }
      break;
    }
  }
  throw new Error(`No clock for ${c.kind} / ${rc.metric}`);
}
