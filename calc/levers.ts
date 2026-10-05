// SPEC §2.6 — the four levers. Each is a pure function of one returning tail and what it can
// draw on (the spare pool, the other returning tails), and each returns the same shape, so the
// recommendation (recommend.ts) can rank them against paying at handback. Money is on the
// as-recorded basis: the basis of the "if nothing changes" figure every option is measured
// against.
//
//   L1 do the work          the cheapest workscope that clears the contract, in the last slot
//   L2 fly it differently   the tail on another route profile's hours-to-cycles mix — a flag
//   L3 move a component     the unit, from the pool or another returning tail, that fits best
//   L4 time the shop visit  every month, both workscopes. L1 is one point on this curve.

import {
  APU,
  APU_HOURS_PER_FLIGHT_CYCLE,
  DAYS_PER_MONTH,
  DOWNTIME_DAYS,
  ENGINE_SHOP_TURNAROUND_DAYS,
  LABOUR_RATE_PER_MH,
  LANDING_GEAR,
  PROFILES_BY_TYPE,
  REMOVAL_INSTALL_MAN_HOURS,
  UTILISATION,
} from './constants';
import { assessComponent, unitCostOfLife, type ComponentResult, type RequirementResult, type TailResult } from './exposure';
import { num, usd, usd2 } from './format';
import { addMonths, monthlyRate, monthsBetween, type UsageProjection } from './projection';
import { engineShopVisitCost } from './rates';
import type { Aircraft, Assumptions, Component, ComponentKind, ISODate, Lessor, ReturnCondition, Workscope } from './types';

export type LeverId = 'pay' | 'L1' | 'L2' | 'L3' | 'L4';

/** Another returning tail, as a source of units for lever 3. */
export interface Donor {
  ac: Aircraft;
  conditions: ReturnCondition[];
  baseline: TailResult;
}

export interface LeverContext {
  ac: Aircraft;
  lessor: Lessor;
  /** This tail's return conditions. */
  conditions: ReturnCondition[];
  a: Assumptions;
  /** assessTail for this tail — the do-nothing position. */
  baseline: TailResult;
  /** Spares not already promised to another tail. */
  pool: Component[];
  /** Other returning tails whose units may be swapped onto this one. */
  donors: Donor[];
  /**
   * A component that runs out before handback (index into ac.components). When set, the levers
   * act on it alone, a route change counts only if it keeps it flying, and paying is off the
   * table: the aircraft cannot reach handback as it stands.
   */
  focus?: number;
}

export interface SwapDetail {
  position: string;
  outgoing: { id: string; serial: string };
  incoming: { id: string; serial: string; from: 'pool' | 'tail'; tail?: string; position?: string };
  /** This tail's share: removal and installation, its own downtime, its exposure afterwards. */
  own: { cost: number; downtimeDays: number; downtimeCost: number; newExposure: number; newCompensation: number };
  /** The other tail's share, for a swap between two aircraft. */
  donor?: {
    tail: string;
    position: string;
    cost: number;
    downtimeDays: number;
    downtimeCost: number;
    exposureBefore: number;
    exposureAfter: number;
    compensationBefore: number;
    compensationAfter: number;
    trace: string;
  };
}

/** One month and workscope on lever 4's sweep, for the component it times. */
export interface CurvePoint {
  position: string;
  month: number;
  date: ISODate;
  workscope: Exclude<Workscope, 'none'>;
  feasible: boolean;
  /** Why the month is not available, when it is not. */
  reason: string;
  visitCost: number;
  reserves: number;
  downtimeCost: number;
  /** The timed component's compensation at handback after the visit. */
  compensation: number;
  /** Its sunk over-delivery, carried whatever the month: the past visit's avoidable LLP life is lost either way. */
  overDelivery: number;
  total: number;
}

export interface LeverOption {
  lever: LeverId;
  label: string;
  /**
   * Money the option spends: maintenance, less reserves reclaimed, plus removal and
   * installation. For a swap between two tails, also the exposure it creates on the other one.
   */
  cost: number;
  downtimeDays: number;
  downtimeCost: number;
  /** This tail's exposure at handback after the option. */
  newExposure: number;
  /**
   * The part of newExposure that is cash payable to the lessor at handback; the rest is life
   * already bought and handed over (over-delivery, or a spare's life given with it).
   */
  newCompensation: number;
  /** cost + downtimeCost + newExposure — SPEC §2.7's totalCost. */
  total: number;
  /** Exposure if nothing changes, less total. */
  saving: number;
  feasible: boolean;
  /** The last date to commit to it. null when there is nothing to book. */
  deadline: ISODate | null;
  trace: string;
  /** The component acted on, where there is one. */
  position?: string;
  /** The physical action, so two levers reaching the same one are ranked once. */
  actionKey: string;
  move?: SwapDetail;
  curve?: CurvePoint[];
}

type Scope = Exclude<Workscope, 'none'>;

const EPS = 1e-9;

/** A restored engine is back on wing this long after induction: the top of the current range. */
const ENGINE_TAT_MONTHS = ENGINE_SHOP_TURNAROUND_DAYS.max / DAYS_PER_MONTH;

/** The airframe is the aircraft: it cannot be swapped, and a heavy check's downtime is not in ASSUMPTIONS §13. */
const MOVABLE: ComponentKind[] = ['engine', 'landing-gear', 'apu'];

const SWAP_DAYS: Record<ComponentKind, number> = {
  engine: DOWNTIME_DAYS.engineSwapWithSpare,
  'landing-gear': DOWNTIME_DAYS.landingGearChange,
  apu: DOWNTIME_DAYS.apuChange,
  airframe: 0,
};

const CLOCK_WORD: Record<ReturnCondition['unit'], string> = { FH: 'hours', FC: 'cycles', months: 'calendar time', 'APU-FH': 'APU hours' };
const clockWord = (r: RequirementResult) => (r.group === 'llp' ? 'LLP life' : CLOCK_WORD[r.unit]);
const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;
const signed = (n: number) => (n < 0 ? '−' : '+') + num(Math.abs(n));

function scopesFor(kind: ComponentKind): Scope[] {
  return kind === 'engine' ? ['build-for-cash', 'build-for-interval'] : ['build-for-interval'];
}

function visitName(kind: ComponentKind, scope: Scope): string {
  return kind === 'engine' ? `${scope} visit` : kind === 'landing-gear' ? 'gear overhaul' : 'APU overhaul';
}

function conditionFor(conditions: ReturnCondition[], id: string): ReturnCondition {
  const rc = conditions.find((x) => x.id === id);
  if (!rc) throw new Error(`No return condition ${id}`);
  return rc;
}

function removalInstall(kind: ComponentKind, changes: number) {
  const mh = REMOVAL_INSTALL_MAN_HOURS[kind];
  return { amount: mh * LABOUR_RATE_PER_MH * changes, trace: `${changes > 1 ? `${changes} × ` : ''}${mh} MH × ${usd(LABOUR_RATE_PER_MH)}` };
}

function finish(ctx: LeverContext, o: Omit<LeverOption, 'total' | 'saving'>): LeverOption {
  const total = o.cost + o.downtimeCost + o.newExposure;
  return { ...o, total, saving: ctx.baseline.asRecorded.exposure - total };
}

function unavailable(ctx: LeverContext, lever: LeverId, label: string, why: string): LeverOption {
  return finish(ctx, {
    lever,
    label,
    cost: 0,
    downtimeDays: 0,
    downtimeCost: 0,
    newExposure: ctx.baseline.asRecorded.exposure,
    newCompensation: ctx.baseline.asRecorded.compensation,
    feasible: false,
    deadline: null,
    trace: why,
    actionKey: `${lever}:unavailable`,
  });
}

/** When the component's first clock reaches zero at the projected rate. It cannot fly past that. */
function runout(p: UsageProjection, before: ComponentResult): { months: number; requirement: RequirementResult } {
  return before.requirements
    .map((r) => ({ months: Math.max(0, r.remainingToday) / monthlyRate(p, r.unit), requirement: r }))
    .reduce((x, y) => (y.months < x.months ? y : x));
}

/** The component whose clock runs out soonest, if any runs out before handback. */
export function firstTimeout(baseline: TailResult): { position: string; months: number; clock: string } | null {
  const p = baseline.projection;
  const hits = baseline.asRecorded.components
    .map((c) => ({ c, out: runout(p, c) }))
    .filter(({ out }) => out.months < p.monthsToReturn - EPS)
    .sort((x, y) => x.out.months - y.out.months);
  const h = hits[0];
  return h ? { position: h.c.position, months: h.out.months, clock: clockWord(h.out.requirement) } : null;
}

/** Components short at handback that a shop visit could put right — or only the focus, when there is one. */
function shortComponents(ctx: LeverContext): number[] {
  return ctx.baseline.asRecorded.components.flatMap((r, i) =>
    r.compensation > 0 && MOVABLE.includes(r.kind) && (ctx.focus === undefined || ctx.focus === i) ? [i] : [],
  );
}

/** Why a lever has nothing to act on when the focus is a component the levers do not move. */
function focusOut(ctx: LeverContext): string | null {
  if (ctx.focus === undefined) return null;
  const c = ctx.ac.components[ctx.focus]!;
  return MOVABLE.includes(c.kind) ? null : `${c.position} is the one running out, and the airframe cannot be swapped or its heavy check timed by the levers.`;
}

// ---------------------------------------------------------------------------------------
// Pay at handback — the option every lever has to beat.
// ---------------------------------------------------------------------------------------

export function payAtHandback(ctx: LeverContext): LeverOption {
  const r = ctx.baseline.asRecorded;
  const p = ctx.baseline.projection;
  // The exposure prices a clock that runs out before handback as a shortfall, capped at the
  // rectifying shop visit. It does not force the removal; say so where it applies.
  const timedOut = r.components
    .map((c) => ({ c, out: runout(p, c) }))
    .filter(({ out }) => out.months < p.monthsToReturn - EPS)
    .map(({ c, out }) => `${c.position} runs out of ${clockWord(out.requirement)} at month ${num(out.months, 1)}`);
  if (ctx.focus !== undefined)
    return unavailable(
      ctx,
      'pay',
      'Pay at handback',
      `${timedOut.join('; ')}, before handback at month ${num(p.monthsToReturn, 1)}: the aircraft cannot reach handback as it stands, so paying at handback is not an option until that is dealt with. On paper it would be ${usd(r.exposure)}.`,
    );
  return finish(ctx, {
    lever: 'pay',
    label: 'Pay at handback',
    cost: 0,
    downtimeDays: 0,
    downtimeCost: 0,
    newExposure: r.exposure,
    newCompensation: r.compensation,
    feasible: true,
    deadline: null,
    actionKey: 'pay',
    trace:
      `Pay at handback: no maintenance and no downtime. The lease takes ${usd(r.compensation)} in compensation and ` +
      `${usd(r.overDelivery)} of life goes back over the thresholds${ctx.a.countOverDeliveryAsLoss ? '' : ' (not counted in this scenario)'} → ${usd(r.exposure)}.` +
      (timedOut.length
        ? ` Caution: ${timedOut.join('; ')}, before handback at month ${num(p.monthsToReturn, 1)}. It will have to come off; this figure is the ` +
          `lease's price for the shortfall, capped at the shop visit that would put it right, not the cost of the forced removal.`
        : ''),
  });
}

// ---------------------------------------------------------------------------------------
// A shop visit at a given month — shared by levers 1 and 4.
// ---------------------------------------------------------------------------------------

/** Why a visit cannot be inducted in this month, or '' if it can. */
function visitBlock(ctx: LeverContext, i: number, month: number): string {
  const p = ctx.baseline.projection;
  const c = ctx.ac.components[i]!;
  const lead = ctx.a.shopSlotLeadTimeMonths;
  const out = runout(p, ctx.baseline.asRecorded.components[i]!);
  const back = month + (c.kind === 'engine' ? ENGINE_TAT_MONTHS : 0);
  if (month < lead - EPS) return `inside the ${lead}-month shop-slot lead time`;
  if (month > out.months + EPS) return `${c.position} runs out of ${clockWord(out.requirement)} at month ${num(out.months, 1)}, before this slot`;
  if (back > p.monthsToReturn + EPS)
    return `a ${ENGINE_SHOP_TURNAROUND_DAYS.max}-day turnaround puts it back on wing at month ${num(back, 1)}, after handback at month ${num(p.monthsToReturn, 1)}`;
  return '';
}

/** Why no month works for this component at all. */
function noWindow(ctx: LeverContext, i: number): string {
  const p = ctx.baseline.projection;
  const c = ctx.ac.components[i]!;
  const lead = ctx.a.shopSlotLeadTimeMonths;
  const out = runout(p, ctx.baseline.asRecorded.components[i]!);
  if (out.months < lead - EPS)
    return (
      `${c.position} runs out of ${clockWord(out.requirement)} at month ${num(out.months, 1)}, before the earliest shop slot at month ${lead}: ` +
      `it has to come off before a slot can be had, so only a spare keeps it flying (lever 3)`
    );
  return `the earliest slot (month ${lead}) plus a ${ENGINE_SHOP_TURNAROUND_DAYS.max}-day turnaround comes after handback at month ${num(p.monthsToReturn, 1)}`;
}

function visitMonths(ctx: LeverContext): number[] {
  const lo = Math.ceil(ctx.a.shopSlotLeadTimeMonths - EPS);
  const hi = Math.floor(ctx.baseline.projection.monthsToReturn + EPS);
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) out.push(m);
  return out;
}

/**
 * Supplemental rent held by the lessor against this component, reclaimable against the work.
 * The rate is the lease's own: the clause's compensation rate ÷ the lessor's negotiation
 * multiplier. The balance runs from the last event the lease recognises — a visit not
 * evidenced as a QME was never reimbursed — capped at what the lease period could have
 * accrued, and no more than the qualifying work costs. Whether an unclaimed balance comes back
 * at lease end is negotiated, not assumed (CLAUDE.md): reservesReclaimPct is that negotiation.
 */
function reservesAt(ctx: LeverContext, i: number, month: number, restoration: number, llpCost: number): { amount: number; trace: string } {
  const { ac, a, lessor, conditions, baseline } = ctx;
  if (lessor.architecture !== 'reserve') return { amount: 0, trace: 'no-reserve lease, so no balance to reclaim' };
  const p = baseline.projection;
  const c = ac.components[i]!;
  const neg = lessor.negotiationMultiplier;
  const pct = a.reservesReclaimPct;
  const leaseMonths = Math.max(0, monthsBetween(ac.leaseStart, p.asOf));
  const rateOf = (kind: ComponentKind, metric: ReturnCondition['metric']) => {
    const rc = conditions.find((x) => x.componentKind === kind && x.metric === metric);
    return rc ? rc.compensationRate / neg : 0;
  };
  const claim = (label: string, rate: number, unit: string, history: number, cap: number, future: number, against: number) => {
    const used = Math.min(history, cap) + future;
    const balance = rate * used;
    const amount = Math.min(balance, against);
    return { amount, trace: `${label} ${usd2(rate)}/${unit} × ${num(used)} ${unit} = ${usd(balance)}${balance > against ? `, capped at the work's ${usd(against)}` : ''}` };
  };
  const parts =
    c.kind === 'engine'
      ? [
          claim('PR', rateOf('engine', 'hoursRemaining'), 'FH', c.asLeaseAllows.tso, ac.hoursPerMonth * leaseMonths, p.hoursPerMonth * month, restoration),
          ...(llpCost > 0 ? [claim('LLP', rateOf('engine', 'llpCyclesRemaining'), 'FC', c.asLeaseAllows.cso, ac.cyclesPerMonth * leaseMonths, p.cyclesPerMonth * month, llpCost)] : []),
        ]
      : c.kind === 'landing-gear'
        ? [claim('gear', rateOf('landing-gear', 'monthsRemaining'), 'month', c.asLeaseAllows.cso / ac.cyclesPerMonth, leaseMonths, month, restoration)]
        : [claim('APU', rateOf('apu', 'hoursRemaining'), 'APU-FH', c.asLeaseAllows.tso, ac.cyclesPerMonth * APU_HOURS_PER_FLIGHT_CYCLE * leaseMonths, p.apuHoursPerMonth * month, restoration)];
  const held = parts.reduce((s, x) => s + x.amount, 0);
  const amount = held * pct;
  return {
    amount,
    trace: `rate = clause rate ÷ negotiation ${neg.toFixed(2)}; ${parts.map((x) => x.trace).join('; ')}; × ${num(pct * 100)}% reclaimable`,
  };
}

interface Visit {
  index: number;
  position: string;
  kind: ComponentKind;
  month: number;
  date: ISODate;
  workscope: Scope;
  feasible: boolean;
  reason: string;
  visitCost: number;
  reserves: number;
  downtimeDays: number;
  downtimeCost: number;
  before: ComponentResult;
  after: ComponentResult;
  newExposure: number;
  newCompensation: number;
  cost: number;
  total: number;
  trace: string;
}

/**
 * The component inducted for a shop visit in `month` (months from today) at `scope`. An engine
 * is back on wing a turnaround later with a spare covering if the pool has one; gear and APU go
 * on exchange. The restored unit is written with counters measured from the visit — negative
 * today, because the visit is in the future — so the exposure engine projects it to handback
 * unchanged. The new visit is assumed evidenced as a QME.
 *
 * What the option costs is the visit's price. The life it buys is paid for in that price, so
 * none of it counts again as over-delivery; the old unit's sunk over-delivery — the avoidable
 * LLP life of its last visit — is lost whether it is handed over or scrapped, so it is carried
 * unchanged and cancels against doing nothing. Only compensation moves.
 */
function simulateVisit(ctx: LeverContext, i: number, month: number, scope: Scope): Visit {
  const { ac, a, baseline, conditions } = ctx;
  const p = baseline.projection;
  const c = ac.components[i]!;
  const before = baseline.asRecorded.components[i]!;
  const engine = c.kind === 'engine';
  const back = month + (engine ? ENGINE_TAT_MONTHS : 0);
  const date = addMonths(p.asOf, month);
  const mult = a.maintenanceCostMultiplier;
  const multNote = mult === 1 ? '' : ` (× maintenance cost ${mult.toFixed(2)})`;
  const hoursTo = (t: number) => p.hoursPerMonth * t;
  const cyclesTo = (t: number) => p.cyclesPerMonth * t;
  const done = { lastShopVisit: date, shopVisitCount: c.shopVisitCount + 1, qmeStatus: 'verified' as const };

  let restored: Component;
  let restoration: number;
  let llpCost = 0;
  let workTrace: string;
  if (engine) {
    const sv = engineShopVisitCost(ac.engineModel, ac.environment, scope, c.shopVisitCount + 1);
    const llpAtInduction = c.llpMinCyclesRemaining - cyclesTo(month);
    const llpReplaced = llpAtInduction < sv.bucketCycles;
    restoration = sv.restoration * mult;
    llpCost = llpReplaced ? sv.llp * mult : 0;
    const llp = llpReplaced ? sv.bucketCycles : llpAtInduction;
    const counters = { tso: -hoursTo(back), cso: -cyclesTo(back), llpMinCyclesRemaining: llp + cyclesTo(back) };
    restored = { ...c, ...counters, ...done, asLeaseAllows: counters, lastWorkscope: scope };
    workTrace =
      `restoration ${usd(restoration)}` +
      (llpReplaced
        ? ` + LLPs ${usd(llpCost)} (${num(llpAtInduction)} FC left at induction, below the ${num(sv.bucketCycles)} FC this workscope leaves)`
        : ` (LLPs kept: ${num(llpAtInduction)} FC left at induction is more than the ${num(sv.bucketCycles)} FC this workscope would leave)`) +
      multNote;
  } else if (c.kind === 'landing-gear') {
    const g = LANDING_GEAR[ac.type];
    restoration = (g.overhaulCost + g.exchangeFee) * mult;
    // Months since overhaul are read as cycles ÷ the tail's own rate, so a visit m months out is −m months of them.
    const counters = { tso: -hoursTo(month), cso: -ac.cyclesPerMonth * month, llpMinCyclesRemaining: Math.min(g.intervalFC, g.intervalMonths * p.cyclesPerMonth) + cyclesTo(month) };
    restored = { ...c, ...counters, ...done, asLeaseAllows: counters, lastWorkscope: 'build-for-interval' };
    workTrace = `overhaul ${usd(g.overhaulCost)} + exchange ${usd(g.exchangeFee)}${multNote}`;
  } else if (c.kind === 'apu') {
    const u = APU[ac.type];
    restoration = u.overhaulCost * mult;
    const counters = { tso: -p.apuHoursPerMonth * month, cso: -cyclesTo(month), llpMinCyclesRemaining: u.intervalApuHours / APU_HOURS_PER_FLIGHT_CYCLE + cyclesTo(month) };
    restored = { ...c, ...counters, ...done, asLeaseAllows: counters, lastWorkscope: 'build-for-interval' };
    workTrace = `overhaul ${usd(u.overhaulCost)}${multNote}`;
  } else {
    throw new Error('The airframe is not timed by the levers');
  }
  const visitCost = restoration + llpCost;

  const reserves = reservesAt(ctx, i, month, restoration, llpCost);
  const spare = engine && ctx.pool.some((u) => u.kind === 'engine' && u.model === ac.engineModel);
  const downtimeDays = engine
    ? spare
      ? 2 * DOWNTIME_DAYS.engineSwapWithSpare
      : DOWNTIME_DAYS.engineShopVisitNoSpare
    : c.kind === 'landing-gear'
      ? DOWNTIME_DAYS.landingGearChange
      : DOWNTIME_DAYS.apuChange;
  const downWhy = engine
    ? spare
      ? 'a spare from the pool covers the turnaround: one overnight change off, one back'
      : 'no spare of this model in the pool, so the aircraft waits'
    : c.kind === 'landing-gear'
      ? 'gear exchange'
      : 'APU change';
  const ri = removalInstall(c.kind, spare ? 2 : 1);
  const perDay = a.downtimeCostPerDay[ac.bodyClass];
  const downtimeCost = downtimeDays * perDay;

  const after = assessComponent(ac, restored, conditions, p, 'as-recorded', a);
  const newExposure = baseline.asRecorded.exposure - before.compensation + after.compensation;
  const cost = visitCost + ri.amount - reserves.amount;
  const reason = visitBlock(ctx, i, month);
  const sunk = a.countOverDeliveryAsLoss && before.overDelivery > 0 ? ` The ${usd(before.overDelivery)} of avoidable LLP life on the old run is lost either way and stays in.` : '';
  const trace =
    `${c.position} ${visitName(c.kind, scope)} inducted month ${month} (${date})` +
    (engine ? `, back on wing month ${num(back, 1)} after a ${ENGINE_SHOP_TURNAROUND_DAYS.max}-day turnaround` : '') +
    `: ${workTrace} + removal and installation ${usd(ri.amount)} (${ri.trace}) − reserves ${usd(reserves.amount)} (${reserves.trace}) = ${usd(cost)}. ` +
    `Down ${days(downtimeDays)} × ${usd(perDay)} = ${usd(downtimeCost)} (${downWhy}). ` +
    `At handback ${c.position} would owe ${usd(after.compensation)} in compensation against ${usd(before.compensation)} if nothing is done; ` +
    `the life the visit buys is paid for in its price.${sunk} Tail exposure ${usd(newExposure)}.`;
  return {
    index: i,
    position: c.position,
    kind: c.kind,
    month,
    date,
    workscope: scope,
    feasible: reason === '',
    reason,
    visitCost,
    reserves: reserves.amount,
    downtimeDays,
    downtimeCost,
    before,
    after,
    newExposure,
    newCompensation: baseline.asRecorded.compensation - before.compensation + after.compensation,
    cost,
    total: cost + downtimeCost + newExposure,
    trace,
  };
}

// ---------------------------------------------------------------------------------------
// L1 · Do the work. SPEC §2.6: cost = shopVisitCost(requiredWorkscope) − reserves × pct,
// compared against the compensation it avoids.
// ---------------------------------------------------------------------------------------

export function doTheWork(ctx: LeverContext): LeverOption {
  const label = 'Do the work';
  const short = shortComponents(ctx);
  if (!short.length) return unavailable(ctx, 'L1', label, focusOut(ctx) ?? 'Nothing is short at handback, so there is no work to do instead of paying.');
  const lead = ctx.a.shopSlotLeadTimeMonths;
  const notes: string[] = [];
  const picks: Visit[] = [];
  for (const i of short) {
    const last = [...visitMonths(ctx)].reverse().find((m) => visitBlock(ctx, i, m) === '');
    if (last === undefined) {
      notes.push(noWindow(ctx, i));
      continue;
    }
    const kind = ctx.ac.components[i]!.kind;
    const visits = scopesFor(kind)
      .map((s) => simulateVisit(ctx, i, last, s))
      .sort((x, y) => x.visitCost - y.visitCost);
    picks.push(visits.find((v) => v.after.compensation === 0) ?? visits[visits.length - 1]!);
  }
  if (!picks.length) return unavailable(ctx, 'L1', label, `No shop visit can be finished before handback: ${notes.join('; ')}.`);
  const v = picks.reduce((x, y) => (y.total < x.total ? y : x));
  const others = picks.filter((x) => x !== v).map((x) => `${x.position} ${visitName(x.kind, x.workscope)} at month ${x.month} would come to ${usd(x.total)} all-in`);
  const next = visitBlock(ctx, v.index, v.month + 1);
  const deadline = addMonths(ctx.baseline.projection.asOf, v.month - lead);
  return finish(ctx, {
    lever: 'L1',
    label: `Do the work: ${v.position} ${visitName(v.kind, v.workscope)}`,
    cost: v.cost,
    downtimeDays: v.downtimeDays,
    downtimeCost: v.downtimeCost,
    newExposure: v.newExposure,
    newCompensation: v.newCompensation,
    feasible: true,
    deadline,
    position: v.position,
    actionKey: `visit:${v.position}:${v.month}:${v.workscope}`,
    trace:
      `Lever 1, do the work rather than pay: the cheapest workscope that clears the contract, inducted in the last month it can be ` +
      `(month ${v.month}; ${next ? `month ${v.month + 1} is out — ${next}` : 'the month before handback'}). ${v.trace} ` +
      `It puts right ${usd(v.before.compensation)} of compensation for ${usd(v.cost + v.downtimeCost)} of work and downtime. ` +
      `Book the slot by ${deadline} (${lead} months' lead).` +
      (others.length ? ` Elsewhere on the tail: ${others.join('; ')}.` : '') +
      (notes.length ? ` Not possible elsewhere on the tail: ${notes.join('; ')}.` : ''),
  });
}

// ---------------------------------------------------------------------------------------
// L4 · Time the shop visit. SPEC §2.6: sweep the date month by month from the slot lead time
// to handback; return the minimum and the whole curve.
// ---------------------------------------------------------------------------------------

export function timeTheShopVisit(ctx: LeverContext): LeverOption {
  const label = 'Time the shop visit';
  const short = shortComponents(ctx);
  if (!short.length) return unavailable(ctx, 'L4', label, focusOut(ctx) ?? 'Nothing is short at handback; a shop visit would only add life to hand back.');
  const lead = ctx.a.shopSlotLeadTimeMonths;
  const notes: string[] = [];
  const bests: Visit[] = [];
  let best: { v: Visit; curve: CurvePoint[] } | null = null;
  for (const i of short) {
    const kind = ctx.ac.components[i]!.kind;
    const curve: CurvePoint[] = [];
    let pick: Visit | null = null;
    for (const m of visitMonths(ctx))
      for (const s of scopesFor(kind)) {
        const v = simulateVisit(ctx, i, m, s);
        curve.push({
          position: v.position,
          month: m,
          date: v.date,
          workscope: s,
          feasible: v.feasible,
          reason: v.reason,
          visitCost: v.visitCost,
          reserves: v.reserves,
          downtimeCost: v.downtimeCost,
          compensation: v.after.compensation,
          overDelivery: v.before.overDelivery,
          total: v.total,
        });
        // Months that cost the same go to the later one: it keeps the decision open longest.
        if (v.feasible && (!pick || v.total < pick.total - 0.5 || (v.total <= pick.total + 0.5 && v.month > pick.month))) pick = v;
      }
    if (!pick) {
      notes.push(noWindow(ctx, i));
      continue;
    }
    bests.push(pick);
    if (!best || pick.total < best.v.total) best = { v: pick, curve };
  }
  if (!best) return unavailable(ctx, 'L4', label, `No month works: ${notes.join('; ')}.`);
  const { v, curve } = best;
  const others = bests.filter((x) => x !== v).map((x) => `${x.position} at best ${x.workscope} in month ${x.month}, ${usd(x.total)} all-in`);
  const open = curve.filter((x) => x.feasible);
  const byMonth = [...new Set(open.map((x) => x.month))].map((m) => {
    const here = open.filter((x) => x.month === m);
    return `month ${m} ${here.map((x) => `${x.workscope === 'build-for-cash' ? 'cash' : 'interval'} ${usd(x.total)}`).join(' / ')}`;
  });
  const deadline = addMonths(ctx.baseline.projection.asOf, v.month - lead);
  return finish(ctx, {
    lever: 'L4',
    label: `Time the shop visit: ${v.position} ${visitName(v.kind, v.workscope)}, month ${v.month}`,
    cost: v.cost,
    downtimeDays: v.downtimeDays,
    downtimeCost: v.downtimeCost,
    newExposure: v.newExposure,
    newCompensation: v.newCompensation,
    feasible: true,
    deadline,
    position: v.position,
    actionKey: `visit:${v.position}:${v.month}:${v.workscope}`,
    curve,
    trace:
      `Lever 4, time the shop visit: ${v.position} swept month by month from the ${lead}-month slot lead time to handback, both workscopes. ` +
      `Open months: ${byMonth.join('; ')}. Cheapest: ${v.workscope} inducted month ${v.month}. ${v.trace} ` +
      `A visit costs the same whichever open month it is in, so months differ only by the reserves reclaimed by then and any compensation left; ` +
      `equal months go to the latest, which keeps the decision open longest. Book the slot by ${deadline}.` +
      (others.length ? ` Elsewhere on the tail: ${others.join('; ')}.` : '') +
      (notes.length ? ` Not possible elsewhere on the tail: ${notes.join('; ')}.` : ''),
  });
}

// ---------------------------------------------------------------------------------------
// L2 · Fly it differently. SPEC §2.6: re-run the projection with another route profile's
// hours-to-cycles mix. A flag with a number on it for the routing team — never a schedule.
// ---------------------------------------------------------------------------------------

export function flyItDifferently(ctx: LeverContext): LeverOption {
  const { ac, a, baseline, conditions } = ctx;
  const label = 'Fly it differently';
  const p = baseline.projection;
  const T = p.monthsToReturn;
  const alternatives = PROFILES_BY_TYPE[ac.type].filter((x) => x !== ac.routeProfile);
  if (!alternatives.length)
    return unavailable(ctx, 'L2', label, `The ${ac.type} flies only the ${ac.routeProfile} profile in this network, so there is no other hours-to-cycles mix to move it to.`);
  const runs = alternatives.map((profile) => {
    const u = UTILISATION[profile];
    const hpm = u.hoursPerMonth * a.utilisationMultiplier;
    const cpm = u.cyclesPerMonth * a.utilisationMultiplier;
    const q: UsageProjection = {
      ...p,
      hoursPerMonth: hpm,
      cyclesPerMonth: cpm,
      apuHoursPerMonth: cpm * APU_HOURS_PER_FLIGHT_CYCLE,
      fhFc: u.fhFc,
      hours: hpm * T,
      cycles: cpm * T,
      apuHours: cpm * APU_HOURS_PER_FLIGHT_CYCLE * T,
    };
    const comps = ac.components.map((c) => assessComponent(ac, c, conditions, q, 'as-recorded', a));
    const sum = (f: (r: ComponentResult) => number) => comps.reduce((s, r) => s + f(r), 0);
    const still = ctx.focus === undefined ? null : runout(q, comps[ctx.focus]!);
    const blocked = still && still.months < T - EPS ? `on ${profile} ${ac.components[ctx.focus!]!.position} would still run out of ${clockWord(still.requirement)} at month ${num(still.months, 1)}` : '';
    return { profile, u, q, blocked, exposure: sum((r) => r.exposure), compensation: sum((r) => r.compensation), overDelivery: sum((r) => r.overDelivery) };
  });
  const open = runs.filter((x) => !x.blocked);
  if (!open.length) return unavailable(ctx, 'L2', label, `A route change does not keep the aircraft flying to handback: ${runs.map((x) => x.blocked).join('; ')}.`);
  const r = open.reduce((x, y) => (y.exposure < x.exposure ? y : x));
  const base = baseline.asRecorded;
  const downtimeDays = DOWNTIME_DAYS.routeReassignment;
  const saving = base.exposure - r.exposure;
  return finish(ctx, {
    lever: 'L2',
    label: `Fly it ${r.profile}, not ${ac.routeProfile} (flag to routing)`,
    cost: 0,
    downtimeDays,
    downtimeCost: downtimeDays * a.downtimeCostPerDay[ac.bodyClass],
    newExposure: r.exposure,
    newCompensation: r.compensation,
    feasible: true,
    deadline: p.asOf,
    actionKey: `route:${r.profile}`,
    trace:
      `Lever 2, a flag for the routing team with a number on it, not a schedule. ${ac.tail} flies ${ac.routeProfile}: ` +
      `${num(p.hoursPerMonth)} FH and ${num(p.cyclesPerMonth)} FC a month. On the ${r.profile} profile (${num(r.q.hoursPerMonth)} FH, ` +
      `${num(r.q.cyclesPerMonth)} FC a month; ${r.u.source}) for the remaining ${num(T, 1)} months it would fly ${signed(r.q.hours - p.hours)} FH ` +
      `and ${signed(r.q.cycles - p.cycles)} FC: compensation ${usd(base.compensation)} → ${usd(r.compensation)}, over-delivery ` +
      `${usd(base.overDelivery)} → ${usd(r.overDelivery)}, exposure ${usd(base.exposure)} → ${usd(r.exposure)}. ` +
      (saving > 0
        ? `The figure assumes the change starts now; each month it waits gives up about ${usd(saving / T)}. `
        : `On this tail it adds more over-delivery than it takes off compensation. `) +
      `No maintenance and no downtime; revenue and network effects are the routing team's to weigh and are not modelled.`,
  });
}

// ---------------------------------------------------------------------------------------
// L3 · Move a component. SPEC §2.6: the unit whose life sits just above this contract's
// threshold, scored by tightness of fit. Cost = removal + install + the exposure the swap
// creates on the receiving tail.
// ---------------------------------------------------------------------------------------

/**
 * A spare from the pool would otherwise stay with the airline, so all of its life above the
 * thresholds leaves the airline because of the swap — not only the part a past visit did not
 * need to buy. It is priced at a build-for-interval visit's rates, which is what makes
 * tightness of fit cost money. A unit swapped between two returning tails is handed to a lessor
 * either way, so it stays on the over-delivery rule on both tails. Returns the spare's exposure
 * on this tail: its compensation plus that life.
 */
function spareExposure(ac: Aircraft, unit: Component, result: ComponentResult, conditions: ReturnCondition[], a: Assumptions) {
  if (!a.countOverDeliveryAsLoss) return { exposure: result.compensation, trace: '' };
  const priced: Component = { ...unit, shopVisitCount: Math.max(1, unit.shopVisitCount), lastWorkscope: 'build-for-interval' };
  const parts = result.requirements
    .filter((r) => r.surplusUnits > 0 && (r.requirementId === result.binding.requirementId || r.group === 'llp'))
    .map((r) => {
      const rate = unitCostOfLife(ac, priced, conditionFor(conditions, r.requirementId), a).rate;
      return { r, rate, amount: r.surplusUnits * rate };
    });
  const amount = parts.reduce((s, x) => s + x.amount, 0);
  return {
    exposure: result.compensation + amount,
    trace: amount
      ? `${unit.serial} is a spare, so all its life above the thresholds leaves the airline with it, priced at a build-for-interval visit's rates: ` +
        `${parts.map((x) => `${num(x.r.surplusUnits)} ${x.r.unit} × ${usd2(x.rate)}`).join(' + ')} = ${usd(amount)}`
      : '',
  };
}

interface Swap {
  index: number;
  unit: Component;
  donor?: { d: Donor; j: number };
  /** '' when both units can fly to their tail's handback; otherwise why not. */
  blocked: string;
  detail: SwapDetail;
  cost: number;
  downtimeDays: number;
  downtimeCost: number;
  newExposure: number;
  newCompensation: number;
  total: number;
  fit: string;
  trace: string;
}

function evaluateSwap(ctx: LeverContext, i: number, unit: Component, donor?: { d: Donor; j: number }): Swap {
  const { ac, a, baseline, conditions } = ctx;
  const p = baseline.projection;
  const c = ac.components[i]!;
  const before = baseline.asRecorded.components[i]!;
  const incoming: Component = { ...unit, position: c.position, installedOn: ac.tail };
  const after = assessComponent(ac, incoming, conditions, p, 'as-recorded', a);
  const given = donor ? { exposure: after.exposure, trace: '' } : spareExposure(ac, incoming, after, conditions, a);
  const dd = SWAP_DAYS[c.kind];
  const ri = removalInstall(c.kind, 1);
  const own = {
    cost: ri.amount,
    downtimeDays: dd,
    downtimeCost: dd * a.downtimeCostPerDay[ac.bodyClass],
    newExposure: baseline.asRecorded.exposure - before.exposure + given.exposure,
    newCompensation: baseline.asRecorded.compensation - before.compensation + after.compensation,
  };

  // A swap that installs a unit which runs out before handback only moves the problem forward.
  const reach = (q: UsageProjection, r: ComponentResult, tail: string, serial: string) => {
    const out = runout(q, r);
    return out.months < q.monthsToReturn - EPS ? `${serial} would run out of ${clockWord(out.requirement)} on ${tail} at month ${num(out.months, 1)}, before its handback` : '';
  };
  let blocked = reach(p, after, ac.tail, unit.serial);

  let donorPart: SwapDetail['donor'];
  if (donor) {
    const { d, j } = donor;
    const theirs = d.ac.components[j]!;
    const dBefore = d.baseline.asRecorded.components[j]!;
    const outgoing: Component = { ...c, position: theirs.position, installedOn: d.ac.tail };
    const dAfter = assessComponent(d.ac, outgoing, d.conditions, d.baseline.projection, 'as-recorded', a);
    const exposureBefore = d.baseline.asRecorded.exposure;
    const exposureAfter = exposureBefore - dBefore.exposure + dAfter.exposure;
    blocked ||= reach(d.baseline.projection, dAfter, d.ac.tail, c.serial);
    donorPart = {
      tail: d.ac.tail,
      position: theirs.position,
      cost: ri.amount,
      downtimeDays: dd,
      downtimeCost: dd * a.downtimeCostPerDay[d.ac.bodyClass],
      exposureBefore,
      exposureAfter,
      compensationBefore: d.baseline.asRecorded.compensation,
      compensationAfter: d.baseline.asRecorded.compensation - dBefore.compensation + dAfter.compensation,
      trace:
        `On ${d.ac.tail}, ${c.serial} in ${theirs.position} would owe ${usd(dAfter.compensation)} with ${usd(dAfter.overDelivery)} of avoidable LLP life, ` +
        `against ${usd(dBefore.exposure)} for ${theirs.serial}: ${d.ac.tail} exposure ${usd(exposureBefore)} → ${usd(exposureAfter)}.`,
    };
  }

  const cost = own.cost + (donorPart ? donorPart.cost + donorPart.exposureAfter - donorPart.exposureBefore : 0);
  const downtimeDays = own.downtimeDays + (donorPart?.downtimeDays ?? 0);
  const downtimeCost = own.downtimeCost + (donorPart?.downtimeCost ?? 0);
  const b = after.requirements.find((r) => r.requirementId === after.binding.requirementId)!;
  const margin = b.remainingAtReturn - b.threshold;
  const fit =
    margin >= 0
      ? `${num(margin)} ${b.unit} above this contract's threshold at handback (${num(b.slackMonths, 1)} months of flying)`
      : `still ${num(-margin)} ${b.unit} short at handback`;
  const where = donor ? `${donor.d.ac.tail}'s ${donor.d.ac.components[donor.j]!.position}` : 'the pool';
  const trace =
    `${unit.serial} from ${where} into ${c.position}: fitted now, it reaches handback ${fit}. ` +
    `${ac.tail} exposure ${usd(baseline.asRecorded.exposure)} → ${usd(own.newExposure)}${given.trace ? ` (${given.trace})` : ''}. ` +
    `${c.position} ${c.serial} goes ${donor ? `to ${where}` : `to the pool, where its life stays the airline's${a.countOverDeliveryAsLoss && before.overDelivery > 0 ? `: its ${usd(before.overDelivery)} of avoidable LLP life is not handed over` : ''}`}. ` +
    `Removal and installation ${usd(ri.amount)} (${ri.trace})${donor ? ' on each tail' : ''}; down ${days(dd)} × ${usd(a.downtimeCostPerDay[ac.bodyClass])}` +
    (donorPart ? ` here and ${days(donorPart.downtimeDays)} × ${usd(a.downtimeCostPerDay[donor!.d.ac.bodyClass])} there. ${donorPart.trace} That ${usd(donorPart.exposureAfter - donorPart.exposureBefore)} is counted against the swap.` : '.');
  return {
    index: i,
    unit,
    donor,
    blocked,
    detail: {
      position: c.position,
      outgoing: { id: c.id, serial: c.serial },
      incoming: donor
        ? { id: unit.id, serial: unit.serial, from: 'tail', tail: donor.d.ac.tail, position: donor.d.ac.components[donor.j]!.position }
        : { id: unit.id, serial: unit.serial, from: 'pool' },
      own,
      donor: donorPart,
    },
    cost,
    downtimeDays,
    downtimeCost,
    newExposure: own.newExposure,
    newCompensation: own.newCompensation,
    total: cost + downtimeCost + own.newExposure,
    fit,
    trace,
  };
}

export function moveAComponent(ctx: LeverContext): LeverOption {
  const { ac, baseline } = ctx;
  const label = 'Move a component';
  const p = baseline.projection;
  const eligible = ac.components.flatMap((c, i) =>
    MOVABLE.includes(c.kind) && baseline.asRecorded.components[i]!.exposure > 0 && (ctx.focus === undefined || ctx.focus === i) ? [i] : [],
  );
  if (!eligible.length) return unavailable(ctx, 'L3', label, focusOut(ctx) ?? 'No engine, landing gear or APU on this tail carries exposure for a swap to move.');

  const swaps: Swap[] = [];
  let fromPool = 0;
  let fromTails = 0;
  for (const i of eligible) {
    const c = ac.components[i]!;
    const model = c.kind === 'engine' ? ac.engineModel : ac.type;
    const fits = (u: Component) => u.kind === c.kind && u.model === model;
    for (const u of ctx.pool.filter(fits)) {
      swaps.push(evaluateSwap(ctx, i, u));
      fromPool++;
    }
    for (const d of ctx.donors)
      d.ac.components.forEach((u, j) => {
        if (!fits(u)) return;
        swaps.push(evaluateSwap(ctx, i, u, { d, j }));
        fromTails++;
      });
  }
  const positions = eligible.map((i) => ac.components[i]!.position).join(', ');
  if (!swaps.length) return unavailable(ctx, 'L3', label, `No unit in the pool or on another returning tail fits ${positions}.`);
  const open = swaps.filter((x) => !x.blocked).sort((x, y) => x.total - y.total);
  const shut = swaps.length - open.length;
  if (!open.length)
    return unavailable(ctx, 'L3', label, `Every unit that fits ${positions} would run out before a handback: ${swaps.map((x) => x.blocked).join('; ')}.`);

  const s = open[0]!;
  const runnerUp = open[1];
  const c = ac.components[s.index]!;
  const out = runout(p, baseline.asRecorded.components[s.index]!);
  const runoutDate = out.months < p.monthsToReturn ? addMonths(p.asOf, out.months) : null;
  const deadline = runoutDate && runoutDate < p.shopSlotDeadline ? runoutDate : p.shopSlotDeadline;
  const why =
    deadline === runoutDate
      ? `${c.position} runs out of ${clockWord(out.requirement)} then and has to come off`
      : `the shop-slot deadline, after which a shop visit is no longer the fallback`;
  return finish(ctx, {
    lever: 'L3',
    label: s.donor ? `Swap ${c.position} with ${s.donor.d.ac.tail}'s ${s.donor.d.ac.components[s.donor.j]!.position}` : `Swap ${c.position} for spare ${s.unit.serial}`,
    cost: s.cost,
    downtimeDays: s.downtimeDays,
    downtimeCost: s.downtimeCost,
    newExposure: s.newExposure,
    newCompensation: s.newCompensation,
    feasible: true,
    deadline,
    position: c.position,
    actionKey: `swap:${c.position}:${s.unit.id}`,
    move: s.detail,
    trace:
      `Lever 3, move a component: the unit whose life sits just above what this contract demands, not the one with the most. ` +
      `Searched ${fromPool + fromTails} units that fit ${positions}: ${fromPool} in the pool, ${fromTails} on other returning tails` +
      (shut ? `; ${shut} ruled out because a unit would run out before handback. ` : '. ') +
      `Best: ${s.trace} ` +
      (runnerUp ? `Next best: ${runnerUp.unit.serial} into ${ac.components[runnerUp.index]!.position} at ${usd(runnerUp.total)} all-in. ` : '') +
      `Priced as fitted today. Decide by ${deadline}: ${why}.`,
  });
}
