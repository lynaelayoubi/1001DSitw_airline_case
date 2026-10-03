// SPEC §2.2–§2.5 — the exposure: gap per requirement, priced both ways, the binding clock,
// over-delivery, and the QME adjustment. Pure: aircraft, return conditions and assumptions
// in; result objects out, each carrying its own trace.
//
// Shape. A tail has five components; each component kind has a few return conditions;
// every component is assessed against every condition of its kind, on two bases:
//   as-recorded      — the maintenance system's position (tso / cso / LLP remaining)
//   as-lease-allows  — the same, but a shop visit not evidenced as a qualified maintenance
//                      event does not reset the clock (SPEC §2.5)
// The difference between the two totals is money already spent that the lease does not
// recognise.

import { AIRFRAME, APU, DEFAULT_ASSUMPTIONS, LANDING_GEAR, RETURNING_WINDOW_MONTHS } from './constants';
import { num, usd, usd2 } from './format';
import { monthlyRate, projectUsage, projectedUse, readClock, type Basis, type UsageProjection } from './projection';
import { engineShopVisitCost } from './rates';
import type {
  Aircraft,
  Assumptions,
  BodyClass,
  Component,
  ComponentKind,
  Dataset,
  ISODate,
  Metric,
  QmeStatus,
  ReturnCondition,
} from './types';

/**
 * Hours, cycles and months on the same component all measure the interval to its next
 * shop visit — whichever runs out first is the one that costs you, so only the binding
 * one is counted. LLP life is a separate part-life limit and is counted on top.
 */
export type RequirementGroup = 'interval' | 'llp';

export const requirementGroup = (metric: Metric): RequirementGroup => (metric === 'llpCyclesRemaining' ? 'llp' : 'interval');

export interface UnitCostOfLife {
  rate: number;
  trace: string;
}

/**
 * SPEC §2.4: what a unit of handed-back life cost to buy. shopVisitCost(workscope) ÷ the life
 * that workscope bought. Zero where no shop visit was paid for during the lease — the life
 * came with the aircraft, so a surplus costs nothing.
 */
export function unitCostOfLife(ac: Aircraft, c: Component, rc: ReturnCondition, a: Assumptions): UnitCostOfLife {
  const m = a.maintenanceCostMultiplier;
  const mult = m === 1 ? '' : ` × maintenance cost ${m.toFixed(2)}`;
  if (c.shopVisitCount === 0 || c.lastWorkscope === 'none') {
    return { rate: 0, trace: 'no shop visit paid for during the lease; the life was delivered with the aircraft, so a surplus costs nothing' };
  }
  switch (c.kind) {
    case 'engine': {
      if (rc.metric === 'llpCyclesRemaining') {
        // LLP life is priced at the visit that bought it: the last one, unless a later visit
        // restored performance without replacing the life-limited parts.
        const by = c.llpBoughtBy === undefined ? { workscope: c.lastWorkscope, visitNumber: c.shopVisitCount } : c.llpBoughtBy;
        if (!by || by.workscope === 'none') {
          return { rate: 0, trace: 'LLPs not replaced since the engine was delivered; the life came with it, so a surplus costs nothing' };
        }
        const lv = engineShopVisitCost(ac.engineModel, ac.environment, by.workscope, by.visitNumber);
        const rate = (lv.llp / lv.bucketCycles) * m;
        return { rate, trace: `${lv.trace}. LLP ${usd(lv.llp)} ÷ ${num(lv.bucketCycles)} FC${mult} = ${usd2(rate)}/FC of surplus` };
      }
      const sv = engineShopVisitCost(ac.engineModel, ac.environment, c.lastWorkscope, c.shopVisitCount);
      if (rc.unit === 'FH') {
        const rate = (sv.restoration / sv.towFH) * m;
        return { rate, trace: `${sv.trace}. Restoration ${usd(sv.restoration)} ÷ ${num(sv.towFH)} FH on wing${mult} = ${usd2(rate)}/FH of surplus` };
      }
      const rate = (sv.restoration / sv.towFC) * m;
      return { rate, trace: `${sv.trace}. Restoration ${usd(sv.restoration)} ÷ ${num(sv.towFC)} FC on wing${mult} = ${usd2(rate)}/FC of surplus` };
    }
    case 'landing-gear': {
      const g = LANDING_GEAR[ac.type];
      if (rc.unit === 'months') {
        const rate = (g.overhaulCost / g.intervalMonths) * m;
        return { rate, trace: `gear overhaul ${usd(g.overhaulCost)} ÷ ${g.intervalMonths} months${mult} = ${usd(rate)}/month of surplus` };
      }
      const rate = (g.overhaulCost / g.intervalFC) * m;
      return { rate, trace: `gear overhaul ${usd(g.overhaulCost)} ÷ ${num(g.intervalFC)} FC${mult} = ${usd2(rate)}/FC of surplus` };
    }
    case 'airframe': {
      const next = AIRFRAME[ac.type].checks.reduce((x, y) => (y.intervalMonths < x.intervalMonths ? y : x));
      const rate = (next.cost / next.intervalMonths) * m;
      return { rate, trace: `${next.name} ${usd(next.cost)} ÷ ${next.intervalMonths} months${mult} = ${usd(rate)}/month of surplus` };
    }
    case 'apu': {
      const p = APU[ac.type];
      const rate = (p.overhaulCost / p.intervalApuHours) * m;
      return { rate, trace: `APU overhaul ${usd(p.overhaulCost)} ÷ ${num(p.intervalApuHours)} APU hours${mult} = ${usd2(rate)}/APU hour of surplus` };
    }
  }
}

export interface RequirementResult {
  requirementId: string;
  clauseRef: string;
  componentId: string;
  position: string;
  kind: ComponentKind;
  metric: Metric;
  unit: ReturnCondition['unit'];
  group: RequirementGroup;
  basis: Basis;
  threshold: number;
  compensationRate: number;
  remainingToday: number;
  projectedUse: number;
  remainingAtReturn: number;
  /** threshold − remainingAtReturn. Positive is a shortfall; negative is over-delivery. */
  gap: number;
  shortfallUnits: number;
  surplusUnits: number;
  /** shortfallUnits × compensationRate. */
  compensation: number;
  unitCostOfLife: number;
  /** surplusUnits × unitCostOfLife. */
  overDelivery: number;
  /** (remainingAtReturn − threshold) in months of flying at the projected rate. Negative = short. */
  slackMonths: number;
  trace: string;
}

/** SPEC §2.1–§2.4 for one component against one return condition. */
export function assessRequirement(
  ac: Aircraft,
  c: Component,
  rc: ReturnCondition,
  p: UsageProjection,
  basis: Basis,
  a: Assumptions,
): RequirementResult {
  const clock = readClock(ac, c, rc, basis);
  const use = projectedUse(p, rc.unit);
  const remainingAtReturn = clock.remainingToday - use;
  const gap = rc.threshold - remainingAtReturn;
  const shortfallUnits = Math.max(0, gap);
  const surplusUnits = Math.max(0, -gap);
  const compensation = shortfallUnits * rc.compensationRate;
  const unitCost = surplusUnits > 0 ? unitCostOfLife(ac, c, rc, a) : { rate: 0, trace: '' };
  const overDelivery = surplusUnits * unitCost.rate;
  const slackMonths = -gap / monthlyRate(p, rc.unit);
  const u = rc.unit;
  const verdict =
    gap > 0
      ? `shortfall ${num(shortfallUnits)} ${u} × ${usd2(rc.compensationRate)}/${u} = ${usd(compensation)} compensation`
      : gap < 0
        ? `over-delivery ${num(surplusUnits)} ${u}: ${unitCost.trace} → ${usd(overDelivery)}`
        : 'exactly on the threshold';
  const trace =
    `${clock.trace}. Less ${num(use)} ${u} projected before handback = ${num(remainingAtReturn)} ${u} at return. ` +
    `Lease demands ≥ ${num(rc.threshold)} ${u} (${rc.clauseRef}); gap ${num(gap)} ${u} → ${verdict}.`;
  return {
    requirementId: rc.id,
    clauseRef: rc.clauseRef,
    componentId: c.id,
    position: c.position,
    kind: c.kind,
    metric: rc.metric,
    unit: rc.unit,
    group: requirementGroup(rc.metric),
    basis,
    threshold: rc.threshold,
    compensationRate: rc.compensationRate,
    remainingToday: clock.remainingToday,
    projectedUse: use,
    remainingAtReturn,
    gap,
    shortfallUnits,
    surplusUnits,
    compensation,
    unitCostOfLife: unitCost.rate,
    overDelivery,
    slackMonths,
    trace,
  };
}

/**
 * ASSUMPTIONS §7: on shortfall the executed lease lets the lessor require rectification or
 * take redelivery and be indemnified at commercial rates — so no component can owe more than
 * the shop visit that would put it right. Linear compensation is capped here.
 */
export function rectificationCost(ac: Aircraft, c: Component, a: Assumptions): UnitCostOfLife {
  const m = a.maintenanceCostMultiplier;
  const mult = m === 1 ? '' : ` × maintenance cost ${m.toFixed(2)}`;
  switch (c.kind) {
    case 'engine': {
      const sv = engineShopVisitCost(ac.engineModel, ac.environment, 'build-for-interval', c.shopVisitCount + 1);
      return { rate: sv.total * m, trace: `a ${sv.workscope} visit (${usd(sv.total)}${mult})` };
    }
    case 'landing-gear': {
      const g = LANDING_GEAR[ac.type];
      return { rate: (g.overhaulCost + g.exchangeFee) * m, trace: `a gear overhaul with exchange (${usd(g.overhaulCost)} + ${usd(g.exchangeFee)}${mult})` };
    }
    case 'airframe': {
      const next = AIRFRAME[ac.type].checks.reduce((x, y) => (y.intervalMonths < x.intervalMonths ? y : x));
      return { rate: next.cost * m, trace: `a ${next.name} (${usd(next.cost)}${mult})` };
    }
    case 'apu': {
      const p = APU[ac.type];
      return { rate: p.overhaulCost * m, trace: `an APU overhaul (${usd(p.overhaulCost)}${mult})` };
    }
  }
}

export interface BindingClock {
  requirementId: string;
  metric: Metric;
  unit: ReturnCondition['unit'];
  /** 'shortfall': it produces the largest compensation. 'tightest': nothing is short; it is the clock that runs out first. */
  how: 'shortfall' | 'tightest';
}

export interface ComponentResult {
  componentId: string;
  serial: string;
  kind: ComponentKind;
  position: string;
  qmeStatus: QmeStatus;
  basis: Basis;
  requirements: RequirementResult[];
  binding: BindingClock;
  /** Binding-clock shortfall × rate, plus LLP, before the cap. */
  compensationUncapped: number;
  /** What putting the component right would cost — the most the lease can claim. */
  rectificationCost: number;
  /** min(compensationUncapped, rectificationCost). */
  compensation: number;
  overDelivery: number;
  /** compensation, plus over-delivery when the scenario counts it as a loss. */
  exposure: number;
  trace: string;
}

/** SPEC §2.3: the binding clock — whichever of the interval requirements produces the larger compensation. */
export function bindingClock(requirements: RequirementResult[]): BindingClock {
  const interval = requirements.filter((r) => r.group === 'interval');
  const pool = interval.length ? interval : requirements;
  const worst = pool.reduce((x, y) => (y.compensation > x.compensation ? y : x));
  if (worst.compensation > 0) return { requirementId: worst.requirementId, metric: worst.metric, unit: worst.unit, how: 'shortfall' };
  const tightest = pool.reduce((x, y) => (y.slackMonths < x.slackMonths ? y : x));
  return { requirementId: tightest.requirementId, metric: tightest.metric, unit: tightest.unit, how: 'tightest' };
}

export function assessComponent(
  ac: Aircraft,
  c: Component,
  conditions: ReturnCondition[],
  p: UsageProjection,
  basis: Basis,
  a: Assumptions,
): ComponentResult {
  const requirements = conditions.filter((rc) => rc.componentKind === c.kind).map((rc) => assessRequirement(ac, c, rc, p, basis, a));
  if (!requirements.length) throw new Error(`${ac.tail}: no return conditions for ${c.kind}`);
  const binding = bindingClock(requirements);
  const bound = requirements.find((r) => r.requirementId === binding.requirementId)!;
  const llp = requirements.filter((r) => r.group === 'llp');
  const compensationUncapped = bound.compensation + llp.reduce((s, r) => s + r.compensation, 0);
  const cap = rectificationCost(ac, c, a);
  const capped = compensationUncapped > cap.rate;
  const compensation = capped ? cap.rate : compensationUncapped;
  const overDelivery = bound.overDelivery + llp.reduce((s, r) => s + r.overDelivery, 0);
  const exposure = compensation + (a.countOverDeliveryAsLoss ? overDelivery : 0);
  const interval = requirements.filter((r) => r.group === 'interval');
  const others = interval.filter((r) => r.requirementId !== binding.requirementId);
  const bindingNote =
    interval.length > 1
      ? binding.how === 'shortfall'
        ? `${bound.unit} binds: ${usd(bound.compensation)} against ${others.map((r) => `${usd(r.compensation)} on ${r.unit}`).join(', ')}. The other clock is not counted — the component comes off when the binding one runs out.`
        : `${bound.unit} binds: nothing is short, and it is the clock that runs out first (${num(bound.slackMonths, 1)} months after handback against ${others.map((r) => `${num(r.slackMonths, 1)} on ${r.unit}`).join(', ')}).`
      : `${bound.unit} is the only clock.`;
  const llpNote = llp.length ? ` LLP counted on top: ${llp.map((r) => `${usd(r.compensation)} compensation, ${usd(r.overDelivery)} over-delivery`).join('; ')}.` : '';
  const capNote = capped
    ? ` Linear compensation ${usd(compensationUncapped)} exceeds the cost of ${cap.trace}, which is the lease's own remedy, so it is capped there.`
    : '';
  const trace =
    `${c.position} (${c.serial}, ${c.qmeStatus}), ${basis}: ${bindingNote}${llpNote}${capNote} ` +
    `Compensation ${usd(compensation)}, over-delivery ${usd(overDelivery)}${a.countOverDeliveryAsLoss ? '' : ' (not counted as a loss in this scenario)'} → exposure ${usd(exposure)}.`;
  return {
    componentId: c.id,
    serial: c.serial,
    kind: c.kind,
    position: c.position,
    qmeStatus: c.qmeStatus,
    basis,
    requirements,
    binding,
    compensationUncapped,
    rectificationCost: cap.rate,
    compensation,
    overDelivery,
    exposure,
    trace,
  };
}

export interface KindTotals {
  compensation: number;
  overDelivery: number;
  exposure: number;
}

export interface TailBasisResult {
  basis: Basis;
  components: ComponentResult[];
  byKind: Record<ComponentKind, KindTotals>;
  compensation: number;
  overDelivery: number;
  exposure: number;
  trace: string;
}

const KINDS: ComponentKind[] = ['engine', 'landing-gear', 'airframe', 'apu'];

/**
 * Over-delivery is money already spent on a shop visit, whatever the paperwork says — so the
 * lease basis keeps the recorded over-delivery and only the compensation moves. That keeps
 * the QME delta what SPEC §2.5 says it is: what the lease would claim on top.
 */
function withRecordedOverDelivery(lease: ComponentResult, recorded: ComponentResult, a: Assumptions): ComponentResult {
  const exposure = lease.compensation + (a.countOverDeliveryAsLoss ? recorded.overDelivery : 0);
  return {
    ...lease,
    overDelivery: recorded.overDelivery,
    exposure,
    trace: `${lease.trace} Over-delivery held at the recorded ${usd(recorded.overDelivery)}: the life was paid for whether or not the lease credits it → exposure ${usd(exposure)}.`,
  };
}

function assessTailOnBasis(
  ac: Aircraft,
  conditions: ReturnCondition[],
  p: UsageProjection,
  basis: Basis,
  a: Assumptions,
  recorded?: TailBasisResult,
): TailBasisResult {
  const components = ac.components.map((c, i) => {
    const r = assessComponent(ac, c, conditions, p, basis, a);
    return recorded ? withRecordedOverDelivery(r, recorded.components[i]!, a) : r;
  });
  const byKind = Object.fromEntries(KINDS.map((k) => [k, { compensation: 0, overDelivery: 0, exposure: 0 }])) as Record<ComponentKind, KindTotals>;
  for (const c of components) {
    byKind[c.kind].compensation += c.compensation;
    byKind[c.kind].overDelivery += c.overDelivery;
    byKind[c.kind].exposure += c.exposure;
  }
  const compensation = components.reduce((s, c) => s + c.compensation, 0);
  const overDelivery = components.reduce((s, c) => s + c.overDelivery, 0);
  const exposure = components.reduce((s, c) => s + c.exposure, 0);
  const trace =
    `${ac.tail} ${basis}: ${KINDS.map((k) => `${k} ${usd(byKind[k].exposure)}`).join(', ')} = ${usd(exposure)} ` +
    `(${usd(compensation)} compensation + ${usd(overDelivery)} over-delivery${a.countOverDeliveryAsLoss ? '' : ', the latter not counted'}).`;
  return { basis, components, byKind, compensation, overDelivery, exposure, trace };
}

export interface TailBinding {
  position: string;
  kind: ComponentKind;
  metric: Metric;
  unit: ReturnCondition['unit'];
  how: BindingClock['how'];
  compensation: number;
  slackMonths: number;
}

export interface TailResult {
  tail: string;
  type: Aircraft['type'];
  bodyClass: BodyClass;
  lessor: string;
  lessorId: string;
  leaseEnd: ISODate;
  status: Aircraft['status'];
  projection: UsageProjection;
  asRecorded: TailBasisResult;
  asLeaseAllows: TailBasisResult;
  /**
   * Inside the window the model is built for (RETURNING_WINDOW_MONTHS). Beyond it a projection
   * with no intervening shop visit is not a forecast, and the UI does not show it as one.
   */
  withinHorizon: boolean;
  /** asLeaseAllows.exposure − asRecorded.exposure: what the lease would claim on top for work it does not recognise. */
  qmeDelta: number;
  /** Any component whose last shop visit is not evidenced as a qualified maintenance event. */
  qmeFlag: boolean;
  qmePositions: string[];
  /** The clock that costs the most across the tail, as recorded — or the tightest if nothing is short. */
  binding: TailBinding;
  trace: string;
}

/** SPEC §2.5: assess a tail on both bases and report the difference. */
export function assessTail(ac: Aircraft, conditions: ReturnCondition[], asOf: ISODate, a: Assumptions = DEFAULT_ASSUMPTIONS): TailResult {
  const own = conditions.filter((rc) => rc.tail === ac.tail);
  const projection = projectUsage(ac, asOf, a);
  const asRecorded = assessTailOnBasis(ac, own, projection, 'as-recorded', a);
  const asLeaseAllows = assessTailOnBasis(ac, own, projection, 'as-lease-allows', a, asRecorded);
  const qmeDelta = asLeaseAllows.exposure - asRecorded.exposure;
  const qmePositions = ac.components.filter((c) => c.qmeStatus === 'not-evidenced').map((c) => c.position);

  const all = asRecorded.components.flatMap((c) => c.requirements.filter((r) => r.requirementId === c.binding.requirementId || r.group === 'llp'));
  const worst = all.reduce((x, y) => (y.compensation > x.compensation ? y : x));
  const chosen = worst.compensation > 0 ? worst : all.reduce((x, y) => (y.slackMonths < x.slackMonths ? y : x));
  const binding: TailBinding = {
    position: chosen.position,
    kind: chosen.kind,
    metric: chosen.metric,
    unit: chosen.unit,
    how: worst.compensation > 0 ? 'shortfall' : 'tightest',
    compensation: chosen.compensation,
    slackMonths: chosen.slackMonths,
  };
  const trace =
    `${projection.trace}\n${asRecorded.trace}\n${asLeaseAllows.trace}\n` +
    (qmePositions.length
      ? `QME: ${qmePositions.join(', ')} not evidenced; the lease would see ${usd(qmeDelta)} more exposure than the maintenance system does.`
      : 'QME: every recorded event is evidenced; both bases agree.') +
    `\nBinding clock: ${binding.position} ${binding.unit} — ${binding.how === 'shortfall' ? `${usd(binding.compensation)}, the largest single compensation on the tail` : `nothing is short; it runs out ${num(binding.slackMonths, 1)} months after handback, the soonest on the tail`}.`;
  return {
    tail: ac.tail,
    type: ac.type,
    bodyClass: ac.bodyClass,
    lessor: ac.lessor,
    lessorId: ac.lessorId,
    leaseEnd: ac.leaseEnd,
    status: ac.status,
    projection,
    asRecorded,
    asLeaseAllows,
    withinHorizon: projection.monthsToReturn <= RETURNING_WINDOW_MONTHS,
    qmeDelta,
    qmeFlag: qmePositions.length > 0,
    qmePositions,
    binding,
    trace,
  };
}

export interface FleetTotals {
  tails: number;
  /** Exposure if nothing changes, as the maintenance system records it. */
  doNothing: number;
  /** The same, as the lease would allow it. */
  asLeaseAllows: number;
  qmeDelta: number;
  qmeTails: number;
  compensation: number;
  overDelivery: number;
  byKind: Record<ComponentKind, KindTotals>;
}

export interface FleetExposure {
  asOf: ISODate;
  assumptions: Assumptions;
  /** Every tail, ranked by exposure if nothing changes. */
  tails: TailResult[];
  /** The ones handing back inside the window, same order. */
  returning: TailResult[];
  totals: FleetTotals;
  trace: string;
}

export function totalsOf(tails: TailResult[]): FleetTotals {
  const byKind = Object.fromEntries(KINDS.map((k) => [k, { compensation: 0, overDelivery: 0, exposure: 0 }])) as Record<ComponentKind, KindTotals>;
  for (const t of tails)
    for (const k of KINDS) {
      byKind[k].compensation += t.asRecorded.byKind[k].compensation;
      byKind[k].overDelivery += t.asRecorded.byKind[k].overDelivery;
      byKind[k].exposure += t.asRecorded.byKind[k].exposure;
    }
  return {
    tails: tails.length,
    doNothing: tails.reduce((s, t) => s + t.asRecorded.exposure, 0),
    asLeaseAllows: tails.reduce((s, t) => s + t.asLeaseAllows.exposure, 0),
    qmeDelta: tails.reduce((s, t) => s + t.qmeDelta, 0),
    qmeTails: tails.filter((t) => t.qmeFlag).length,
    compensation: tails.reduce((s, t) => s + t.asRecorded.compensation, 0),
    overDelivery: tails.reduce((s, t) => s + t.asRecorded.overDelivery, 0),
    byKind,
  };
}

/** The whole fleet. Totals are over the returning tails — the ones with a number that is due. */
export function assessFleet(data: Pick<Dataset, 'asOf' | 'aircraft' | 'returnConditions'>, a: Assumptions = DEFAULT_ASSUMPTIONS): FleetExposure {
  const byTail = new Map<string, ReturnCondition[]>();
  for (const rc of data.returnConditions) {
    const list = byTail.get(rc.tail);
    if (list) list.push(rc);
    else byTail.set(rc.tail, [rc]);
  }
  const tails = data.aircraft
    .map((ac) => assessTail(ac, byTail.get(ac.tail) ?? [], data.asOf, a))
    .sort((x, y) => y.asRecorded.exposure - x.asRecorded.exposure);
  const returning = tails.filter((t) => t.status === 'returning');
  const totals = totalsOf(returning);
  const trace =
    `${returning.length} tails returning; as of ${data.asOf}. Exposure if nothing changes ${usd(totals.doNothing)} ` +
    `(${usd(totals.compensation)} compensation + ${usd(totals.overDelivery)} over-delivery${a.countOverDeliveryAsLoss ? '' : ', not counted'}); ` +
    `as the lease allows ${usd(totals.asLeaseAllows)}; QME delta ${usd(totals.qmeDelta)} on ${totals.qmeTails} tails. ` +
    `By component: ${KINDS.map((k) => `${k} ${usd(totals.byKind[k].exposure)}`).join(', ')}.`;
  return { asOf: data.asOf, assumptions: a, tails, returning, totals, trace };
}
