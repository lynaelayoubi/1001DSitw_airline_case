// ASSUMPTIONS §11b — the scale check. Is the exposure the right size? Two comparisons, each
// against something the model did not produce itself:
//
//   fleet    exposure on the returning tails ÷ the maintenance they accrue over the rest of
//            their leases, on the reconciliation's own four-component cost basis. A handback
//            that costs more than all the maintenance it takes to get there is counting
//            something twice.
//   per tail exposure ÷ the one published end-of-lease settlement, a 737-800 at about $6.7M,
//            scaled for widebodies by the published ratio of total maintenance event value.

import { EOL_SETTLEMENT_NARROWBODY, SCALE_BANDS, WIDEBODY_EVENT_VALUE_RATIO } from './constants';
import type { FleetExposure } from './exposure';
import { num, usd } from './format';
import { componentAnnualAccrual } from './reconcile';
import type { Aircraft, BodyClass } from './types';

export interface TailScale {
  tail: string;
  bodyClass: BodyClass;
  exposure: number;
  /** Four-component maintenance accrual between today and handback. */
  accrual: number;
  benchmark: number;
  /** exposure ÷ benchmark. */
  multiple: number;
}

export interface ScaleCheck {
  exposure: number;
  accrual: number;
  /** exposure ÷ accrual, against SCALE_BANDS.accrualRatio. */
  accrualRatio: number;
  benchmark: Record<BodyClass, number>;
  tails: TailScale[];
  maxMultiple: number;
  /** Mean multiple over the tails with any exposure, against SCALE_BANDS.averageMultiple. */
  averageMultiple: number;
  withinBands: boolean;
  trace: string;
}

export function checkScale(aircraft: Aircraft[], fleet: FleetExposure): ScaleCheck {
  const byTail = new Map(aircraft.map((ac) => [ac.tail, ac]));
  const benchmark: Record<BodyClass, number> = {
    narrowbody: EOL_SETTLEMENT_NARROWBODY,
    widebody: EOL_SETTLEMENT_NARROWBODY * WIDEBODY_EVENT_VALUE_RATIO,
  };
  const tails = fleet.returning.map((t): TailScale => {
    const ac = byTail.get(t.tail)!;
    const accrual = (ac.components.reduce((s, c) => s + componentAnnualAccrual(ac, c).annualCost, 0) * t.projection.monthsToReturn) / 12;
    const exposure = t.asRecorded.exposure;
    return { tail: t.tail, bodyClass: t.bodyClass, exposure, accrual, benchmark: benchmark[t.bodyClass], multiple: exposure / benchmark[t.bodyClass] };
  });
  const exposure = tails.reduce((s, t) => s + t.exposure, 0);
  const accrual = tails.reduce((s, t) => s + t.accrual, 0);
  const accrualRatio = exposure / accrual;
  const exposed = tails.filter((t) => t.exposure > 0);
  const averageMultiple = exposed.reduce((s, t) => s + t.multiple, 0) / Math.max(1, exposed.length);
  const maxMultiple = Math.max(0, ...tails.map((t) => t.multiple));
  const b = SCALE_BANDS;
  const withinBands =
    accrualRatio >= b.accrualRatio.min &&
    accrualRatio <= b.accrualRatio.max &&
    maxMultiple <= b.perTailMaxMultiple &&
    averageMultiple >= b.averageMultiple.min &&
    averageMultiple <= b.averageMultiple.max;
  const trace =
    `Exposure on ${tails.length} returning tails ${usd(exposure)} ÷ their four-component maintenance accrual to handback ${usd(accrual)} = ${accrualRatio.toFixed(2)} ` +
    `(band ${b.accrualRatio.min}–${b.accrualRatio.max}). Settlement benchmark ${usd(benchmark.narrowbody)} a narrowbody, × ${WIDEBODY_EVENT_VALUE_RATIO.toFixed(2)} = ` +
    `${usd(benchmark.widebody)} a widebody; largest multiple ${maxMultiple.toFixed(2)} (no more than ${b.perTailMaxMultiple}), average over the ${exposed.length} tails ` +
    `with exposure ${averageMultiple.toFixed(2)} (band ${b.averageMultiple.min}–${b.averageMultiple.max}).\n` +
    tails.map((t) => `${t.tail} ${t.bodyClass}: ${usd(t.exposure)} = ${num(t.multiple, 2)} × benchmark; accrual to handback ${usd(t.accrual)}`).join('\n');
  return { exposure, accrual, accrualRatio, benchmark, tails, maxMultiple, averageMultiple, withinBands, trace };
}
