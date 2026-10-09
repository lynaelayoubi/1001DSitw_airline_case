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
import { dayMonthYear, monthYear, num, usd, usd2 } from './format';
import { addMonths, monthlyRate, monthsBetween, parseDate, toISO, type UsageProjection } from './projection';
import { engineShopVisitCost } from './rates';
import type { Aircraft, Assumptions, Component, ComponentKind, ISODate, Lessor, Proposal, ReturnCondition, RouteProfile, Workscope } from './types';

export type LeverId = 'pay' | 'L1' | 'L2' | 'L3' | 'L4' | 'ground';

/** Another returning tail, as a source of units for lever 3. */
export interface Donor {
  ac: Aircraft;
  /** Its lessor: the replacement test and the removal notice apply on its tail too. */
  lessor: Lessor;
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
  /**
   * Maintenance cash the option spends — shop visit less reserves reclaimed, removal and
   * installation — and the date it falls: a visit's induction month, a swap now. What a
   * maintenance budget pays for (calc/budget.ts); 0 and null when nothing is spent.
   */
  spend: number;
  spendDate: ISODate | null;
  /** Reserves reclaimed against the work, which spend is already net of; absent where none are. */
  reservesReclaimed?: number;
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
  /** The position whose own unit comes off into the pool for good — kept by the airline, its life with it. */
  toPool?: string;
  /** The physical action, so two levers reaching the same one are ranked once. */
  actionKey: string;
  move?: SwapDetail;
  curve?: CurvePoint[];
  /** A pool spare installed temporarily while the component is at the shop (clause 12.3(c)), from and until (months from today). */
  covers?: { id: string; serial: string; from: number; until: number };
  /** No date to decide by: worth most started now, and each month of waiting gives up this much (a route change). */
  startNow?: { perMonth: number };
  /** The aircraft on the ground because nothing keeps it flying: from when, for how many days, at what downtime cost. */
  grounded?: { from: ISODate; days: number; cost: number };
  /** Notices the lessor must have (clause 12.3(b)): when, for what, and whether the full notice no longer fits. */
  notices?: { due: ISODate; what: string; short: boolean }[];
  /** A shop slot to book: by when, for which part, which visit in plain words, and the month ("September 2027"). */
  slot?: { bookBy: ISODate; position: string; visit: string; month: string };
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
const MS_PER_DAY = 86_400_000;
const addDays = (d: ISODate, n: number): ISODate => toISO(new Date(parseDate(d).getTime() + n * MS_PER_DAY));
const daysBetween = (from: ISODate, to: ISODate) => Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / MS_PER_DAY);
/** A clock as the replacement clause names it: life to the next shop visit or overhaul, or LLP life. */
const LIFE_NOUN: Record<ReturnCondition['unit'], string> = { FH: 'hours', FC: 'cycles', months: 'months', 'APU-FH': 'APU hours' };
const lifeWord = (r: RequirementResult, kind: ComponentKind) =>
  r.group === 'llp' ? 'LLP cycles' : `${LIFE_NOUN[r.unit]} to its next ${kind === 'engine' ? 'shop visit' : 'overhaul'}`;
const signed = (n: number) => (n < 0 ? '−' : '+') + num(Math.abs(n));

function scopesFor(kind: ComponentKind): Scope[] {
  return kind === 'engine' ? ['build-for-cash', 'build-for-interval'] : ['build-for-interval'];
}

/** A shop visit in plain words first: "minimum shop visit (build-for-cash)", "gear overhaul". */
export function visitName(kind: ComponentKind, scope: Scope): string {
  if (kind !== 'engine') return kind === 'landing-gear' ? 'gear overhaul' : 'APU overhaul';
  return scope === 'build-for-cash' ? 'minimum shop visit (build-for-cash)' : 'full shop visit (build-for-interval)';
}

/** A month from the data date, as a person names it: "September 2027". Never "month 11". */
export const monthOf = (asOf: ISODate, m: number): string => monthYear(addMonths(asOf, m));

/** A moment from the data date, fractional months and all, as a person writes it: "around 28 Mar 2028". */
export const around = (asOf: ISODate, m: number): string => `around ${dayMonthYear(addMonths(asOf, m))}`;

/** A shop visit as a person says it: "send ENG1 to the shop in September 2027, minimum shop visit (build-for-cash)". */
const sendWords = (asOf: ISODate, position: string, kind: ComponentKind, scope: Scope, m: number) =>
  `send ${position} to the shop in ${monthOf(asOf, m)}, ${visitName(kind, scope)}`;

/** The slot a shop visit needs: book it by, for which part, which visit, which month. */
const slotFor = (bookBy: ISODate, asOf: ISODate, position: string, kind: ComponentKind, scope: Scope, m: number) => ({
  bookBy,
  position,
  visit: visitName(kind, scope),
  month: monthOf(asOf, m),
});

/** With its article: "a gear overhaul", "an APU overhaul". */
export const withArticle = (s: string): string => `${/^[aeiou]/i.test(s) ? 'an' : 'a'} ${s}`;

/** Handback as a date: "on 19 Apr 2028". */
const handback = (p: UsageProjection) => `on ${dayMonthYear(p.effectiveLeaseEnd)}`;

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
    spend: 0,
    spendDate: null,
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

/**
 * The component whose clock runs out soonest, if any runs out before handback — by at least a day.
 * One that runs out on its handback day reaches handback: the lease's compensation prices the
 * shortfall, and there is no day on the ground to put right. (Counting it as forced offered "on the
 * ground to handback" for no days at all.)
 */
export function firstTimeout(baseline: TailResult): { position: string; months: number; clock: string } | null {
  const p = baseline.projection;
  const hits = baseline.asRecorded.components
    .map((c) => ({ c, out: runout(p, c) }))
    .filter(({ out }) => out.months < p.monthsToReturn - 1 / DAYS_PER_MONTH)
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
    .map(({ c, out }) => `${c.position} runs out of ${clockWord(out.requirement)} ${around(p.asOf, out.months)}`);
  if (ctx.focus !== undefined)
    return unavailable(
      ctx,
      'pay',
      'Pay at handback',
      `${timedOut.join('; ')}, before handback ${handback(p)}: the aircraft cannot reach handback as it stands, so paying at handback is not an option until that is dealt with. On paper it would be ${usd(r.exposure)}.`,
    );
  return finish(ctx, {
    lever: 'pay',
    label: 'Pay at handback',
    cost: 0,
    downtimeDays: 0,
    downtimeCost: 0,
    newExposure: r.exposure,
    newCompensation: r.compensation,
    spend: 0,
    spendDate: null,
    feasible: true,
    deadline: null,
    actionKey: 'pay',
    trace:
      `Pay at handback: no maintenance and no downtime. The lease takes ${usd(r.compensation)} in compensation and ` +
      `${usd(r.overDelivery)} of life goes back over the thresholds${ctx.a.countOverDeliveryAsLoss ? '' : ' (bought at past shop visits: sunk, so not counted)'} → ${usd(r.exposure)}.` +
      (timedOut.length
        ? ` Caution: ${timedOut.join('; ')}, before handback ${handback(p)}. It will have to come off; this figure is the ` +
          `lease's price for the shortfall, capped at the shop visit that would put it right, not the cost of the required removal.`
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
  if (month > out.months + EPS) return `${c.position} runs out of ${clockWord(out.requirement)} ${around(p.asOf, out.months)}, before this slot`;
  if (back > p.monthsToReturn + EPS)
    return `a ${ENGINE_SHOP_TURNAROUND_DAYS.max}-day turnaround puts it back on wing ${around(p.asOf, back)}, after handback ${handback(p)}`;
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
      `${c.position} runs out of ${clockWord(out.requirement)} ${around(p.asOf, out.months)}, before the earliest shop slot, in ${monthOf(p.asOf, lead)}: ` +
      `it has to come off before a slot can be had, so only a spare keeps it flying (lever 3)`
    );
  return `the earliest slot (${monthOf(p.asOf, lead)}) plus a ${ENGINE_SHOP_TURNAROUND_DAYS.max}-day turnaround comes after handback ${handback(p)}`;
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
 * The rate is the lease's own reserve rate, which is the clause's compensation rate. The balance runs from the last event the lease recognises — a visit not
 * evidenced as a QME was never reimbursed — capped at what the lease period could have
 * accrued, and no more than the qualifying work costs. Whether an unclaimed balance comes back
 * at lease end is negotiated, not assumed (CLAUDE.md): reservesReclaimPct is that negotiation.
 */
function reservesAt(ctx: LeverContext, i: number, month: number, restoration: number, llpCost: number): { amount: number; trace: string } {
  const { ac, a, lessor, conditions, baseline } = ctx;
  if (lessor.architecture !== 'reserve') return { amount: 0, trace: 'no-reserve lease, so no balance to reclaim' };
  const p = baseline.projection;
  const c = ac.components[i]!;
  const pct = a.reservesReclaimPct;
  const leaseMonths = Math.max(0, monthsBetween(ac.leaseStart, p.asOf));
  const rateOf = (kind: ComponentKind, metric: ReturnCondition['metric']) => {
    const rc = conditions.find((x) => x.componentKind === kind && x.metric === metric);
    return rc ? rc.compensationRate : 0;
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
    trace: `at the lease's reserve rates: ${parts.map((x) => x.trace).join('; ')}; × ${num(pct * 100)}% reclaimable`,
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
/**
 * opts.flownTo: the month the component stops flying before induction — earlier than the induction
 * month when it has run out and sits off the wing waiting for its slot (default: the induction
 * month). opts.cover: whether a pool spare covers the turnaround (default: whether the pool has one).
 */
function simulateVisit(ctx: LeverContext, i: number, month: number, scope: Scope, opts: { flownTo?: number; cover?: boolean } = {}): Visit {
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
    const llpAtInduction = c.llpMinCyclesRemaining - cyclesTo(opts.flownTo ?? month);
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

  const reserves = reservesAt(ctx, i, opts.flownTo ?? month, restoration, llpCost);
  const spare = engine && (opts.cover ?? ctx.pool.some((u) => u.kind === 'engine' && u.model === ac.engineModel));
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
    `${c.position} ${visitName(c.kind, scope)} inducted in ${monthYear(date)}` +
    (engine ? `, back on wing ${around(p.asOf, back)} after a ${ENGINE_SHOP_TURNAROUND_DAYS.max}-day turnaround` : '') +
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
  const others = picks.filter((x) => x !== v).map((x) => `${x.position} ${visitName(x.kind, x.workscope)} in ${monthOf(ctx.baseline.projection.asOf, x.month)} would come to ${usd(x.total)} all-in`);
  const next = visitBlock(ctx, v.index, v.month + 1);
  const deadline = addMonths(ctx.baseline.projection.asOf, v.month - lead);
  return finish(ctx, {
    lever: 'L1',
    label: `Do the work: ${sendWords(ctx.baseline.projection.asOf, v.position, v.kind, v.workscope, v.month)}`,
    cost: v.cost,
    downtimeDays: v.downtimeDays,
    downtimeCost: v.downtimeCost,
    newExposure: v.newExposure,
    newCompensation: v.newCompensation,
    spend: v.cost,
    reservesReclaimed: v.reserves,
    spendDate: v.date,
    feasible: true,
    deadline,
    position: v.position,
    actionKey: `visit:${v.position}:${v.month}:${v.workscope}`,
    slot: slotFor(deadline, ctx.baseline.projection.asOf, v.position, v.kind, v.workscope, v.month),
    notices: visitNotice(ctx, v),
    trace:
      `Lever 1, do the work rather than pay: the cheapest workscope that clears the contract, inducted in the last month it can be ` +
      `(${monthOf(ctx.baseline.projection.asOf, v.month)}; ${next ? `${monthOf(ctx.baseline.projection.asOf, v.month + 1)} is out — ${next}` : 'the month before handback'}). ${v.trace} ` +
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
  const others = bests.filter((x) => x !== v).map((x) => `${x.position} at best ${withArticle(visitName(x.kind, x.workscope))} in ${monthOf(ctx.baseline.projection.asOf, x.month)}, ${usd(x.total)} all-in`);
  const open = curve.filter((x) => x.feasible);
  const byMonth = [...new Set(open.map((x) => x.month))].map((m) => {
    const here = open.filter((x) => x.month === m);
    return `${monthOf(ctx.baseline.projection.asOf, m)} ${here.map((x) => `${x.workscope === 'build-for-cash' ? 'cash' : 'interval'} ${usd(x.total)}`).join(' / ')}`;
  });
  const deadline = addMonths(ctx.baseline.projection.asOf, v.month - lead);
  return finish(ctx, {
    lever: 'L4',
    label: `Time the shop visit: ${sendWords(ctx.baseline.projection.asOf, v.position, v.kind, v.workscope, v.month)}`,
    cost: v.cost,
    downtimeDays: v.downtimeDays,
    downtimeCost: v.downtimeCost,
    newExposure: v.newExposure,
    newCompensation: v.newCompensation,
    spend: v.cost,
    reservesReclaimed: v.reserves,
    spendDate: v.date,
    feasible: true,
    deadline,
    position: v.position,
    actionKey: `visit:${v.position}:${v.month}:${v.workscope}`,
    curve,
    slot: slotFor(deadline, ctx.baseline.projection.asOf, v.position, v.kind, v.workscope, v.month),
    notices: visitNotice(ctx, v),
    trace:
      `Lever 4, time the shop visit: ${v.position} swept month by month from the ${lead}-month slot lead time to handback, both workscopes. ` +
      `Open months: ${byMonth.join('; ')}. Cheapest: ${withArticle(visitName(v.kind, v.workscope))} inducted in ${monthOf(ctx.baseline.projection.asOf, v.month)}. ${v.trace} ` +
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
  const { ac } = ctx;
  const label = 'Fly it differently';
  const alternatives = PROFILES_BY_TYPE[ac.type].filter((x) => x !== ac.routeProfile);
  if (!alternatives.length)
    return unavailable(ctx, 'L2', label, `The ${ac.type} flies only the ${ac.routeProfile} profile in this network, so there is no other hours-to-cycles mix to move it to.`);
  const runs = alternatives.map((profile) => routeRun(ctx, profile));
  const open = runs.filter((x) => !x.blocked);
  if (!open.length) return unavailable(ctx, 'L2', label, `A route change does not keep the aircraft flying to handback: ${runs.map((x) => x.blocked).join('; ')}.`);
  return routeOption(ctx, open.reduce((x, y) => (y.exposure < x.exposure ? y : x)));
}

type RouteRun = ReturnType<typeof routeRun>;

/** The tail on one route profile's hours-to-cycles mix to handback; blocked if it leaves the focus running out. */
function routeRun(ctx: LeverContext, profile: RouteProfile) {
  const { ac, a, baseline, conditions } = ctx;
  const p = baseline.projection;
  const T = p.monthsToReturn;
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
  const blocked = still && still.months < T - EPS ? `on ${profile} ${ac.components[ctx.focus!]!.position} would still run out of ${clockWord(still.requirement)} ${around(q.asOf, still.months)}` : '';
  return { profile, u, q, blocked, exposure: sum((r) => r.exposure), compensation: sum((r) => r.compensation), overDelivery: sum((r) => r.overDelivery) };
}

function routeOption(ctx: LeverContext, r: RouteRun): LeverOption {
  const { ac, a, baseline } = ctx;
  const p = baseline.projection;
  const T = p.monthsToReturn;
  const base = baseline.asRecorded;
  const downtimeDays = DOWNTIME_DAYS.routeReassignment;
  const saving = base.exposure - r.exposure;
  return finish(ctx, {
    lever: 'L2',
    label: `Route change: fly it ${r.profile}, not ${ac.routeProfile} (flag to routing)`,
    cost: 0,
    downtimeDays,
    downtimeCost: downtimeDays * a.downtimeCostPerDay[ac.bodyClass],
    newExposure: r.exposure,
    newCompensation: r.compensation,
    spend: 0,
    spendDate: null,
    feasible: true,
    deadline: null,
    startNow: { perMonth: Math.max(0, saving / T) },
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
 * either way, so it stays on the over-delivery rule on both tails. The spare's life leaves going
 * forward, so it counts even though over-delivery bought at past shop visits does not. Returns the
 * spare's exposure on this tail: its compensation plus that life.
 */
function spareExposure(ac: Aircraft, unit: Component, result: ComponentResult, conditions: ReturnCondition[], a: Assumptions) {
  const life = lifeAboveThresholds(ac, unit, result, conditions, a);
  return {
    exposure: result.compensation + life.amount,
    trace: life.amount ? `${unit.serial} is a spare, so all its life above the thresholds leaves the airline with it, priced at the rates of a full shop visit (build-for-interval): ${life.trace}` : '',
  };
}

/**
 * The life a unit carries above this tail's thresholds at handback — the binding clock and LLPs —
 * priced at a build-for-interval visit's rates. What an engine costs when it leaves the airline
 * (back with the aircraft, or on for good as a spare), and what one earns back when it comes off
 * into the pool: one valuation for both, so life is counted the same way in every option.
 */
export function lifeAboveThresholds(ac: Aircraft, unit: Component, result: ComponentResult, conditions: ReturnCondition[], a: Assumptions): { amount: number; trace: string } {
  const priced: Component = { ...unit, shopVisitCount: Math.max(1, unit.shopVisitCount), lastWorkscope: 'build-for-interval' };
  const parts = result.requirements
    .filter((r) => r.surplusUnits > 0 && (r.requirementId === result.binding.requirementId || r.group === 'llp'))
    .map((r) => {
      const rate = unitCostOfLife(ac, priced, conditionFor(conditions, r.requirementId), a).rate;
      return { r, rate, amount: r.surplusUnits * rate };
    });
  const amount = parts.reduce((s, x) => s + x.amount, 0);
  return { amount, trace: `${parts.map((x) => `${num(x.r.surplusUnits)} ${x.r.unit} × ${usd2(x.rate)}`).join(' + ')} = ${usd(amount)}` };
}

/**
 * The replacement test (LEASE-NOTES.md, clause 12.2, strict form): a unit installed as a permanent
 * replacement must have no less life than the one it replaces on every clock the clause names — to
 * the next scheduled shop visit, check or overhaul, and in LLP life. Both units are read as the
 * records stand today, on the receiving tail's clauses. '' when it passes; otherwise why not.
 */
function replacementBlock(lessor: Lessor, kind: ComponentKind, incoming: ComponentResult, outgoing: ComponentResult, serial: string, replaced: string): string {
  if (lessor.replacementTest !== 'strict') return '';
  const short = incoming.requirements.flatMap((r) => {
    const out = outgoing.requirements.find((x) => x.requirementId === r.requirementId);
    const gap = out ? out.remainingToday - r.remainingToday : 0;
    return gap > 0.5 ? [`${num(gap)} fewer ${lifeWord(r, kind)}`] : [];
  });
  return short.length ? `not a permitted replacement under ${lessor.replacementClauseRef}: ${serial} has ${short.join(' and ')} than ${replaced}` : '';
}

/**
 * The latest a swap on this component can happen: when it runs out, or the shop-slot deadline,
 * whichever is sooner. forced: the component runs out before handback, so its removal is forced by
 * the clock, not planned.
 */
function swapBy(ctx: LeverContext, i: number): { date: ISODate; why: string; forced: boolean } {
  const p = ctx.baseline.projection;
  const c = ctx.ac.components[i]!;
  const out = runout(p, ctx.baseline.asRecorded.components[i]!);
  const runoutDate = out.months < p.monthsToReturn ? addMonths(p.asOf, out.months) : null;
  return runoutDate && runoutDate < p.shopSlotDeadline
    ? { date: runoutDate, why: `${c.position} runs out of ${clockWord(out.requirement)} then and has to come off`, forced: true }
    : { date: p.shopSlotDeadline, why: `the shop-slot deadline, after which a shop visit is no longer the fallback`, forced: runoutDate !== null };
}

/**
 * 12.3(b) asks notice of a PLANNED engine removal. A removal forced by the engine running out is
 * not planned: if the full notice can no longer be given, it goes to the lessor now, short — a
 * conversation with the lessor, not a refusal. The date to decide by, and what the working says.
 */
function forcedNotice(ctx: LeverContext, outBy: ISODate, n: number, position: string): { decideBy: ISODate; note: string } {
  const asOf = ctx.baseline.projection.asOf;
  const full = addDays(outBy, -n);
  if (full >= asOf) return { decideBy: full, note: `less ${n} days' notice of the removal (${ctx.lessor.noticeClauseRef})` };
  const left = daysBetween(asOf, outBy);
  return {
    decideBy: asOf,
    note:
      `a removal required by ${position} running out, not a planned one, so ${ctx.lessor.noticeClauseRef}'s ${n} days cannot be given in full: ` +
      `notice goes to the lessor now, ${days(left)} ahead, ${days(n - left)} short — a conversation with the lessor, not a refusal`,
  };
}

/** Days of notice a planned removal of this component needs (clause 12.3(b)): engines only, the longer of the two lessors' on a swap between tails. */
function noticeDays(ctx: LeverContext, i: number, donor?: Donor): number {
  if (ctx.ac.components[i]!.kind !== 'engine') return 0;
  return Math.max(ctx.lessor.engineRemovalNoticeDays, donor?.lessor.engineRemovalNoticeDays ?? 0);
}

/** Clause 12.3(b): '' if the notice a planned engine removal needs can still be given before the swap has to happen; otherwise why not. */
function noticeBlock(ctx: LeverContext, i: number, donor?: Donor): string {
  const n = noticeDays(ctx, i, donor);
  if (!n) return '';
  const { date: by, forced } = swapBy(ctx, i);
  if (forced) return ''; // a forced removal is not refused for want of notice (forcedNotice)
  const asOf = ctx.baseline.projection.asOf;
  const clause = donor && donor.lessor.engineRemovalNoticeDays > ctx.lessor.engineRemovalNoticeDays ? donor.lessor.noticeClauseRef : ctx.lessor.noticeClauseRef;
  return addDays(by, -n) < asOf
    ? `not possible under ${clause}: a planned engine removal needs ${n} days' notice, and ${ctx.ac.components[i]!.position} must come off by ${by}, ${days(daysBetween(asOf, by))} from today`
    : '';
}

interface Swap {
  index: number;
  unit: Component;
  donor?: { d: Donor; j: number };
  /** '' when the swap can be made: both units fly to their tail's handback, and the lease permits each as a replacement. Otherwise why not. */
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
    return out.months < q.monthsToReturn - EPS
      ? `${serial} would run out of ${clockWord(out.requirement)} on ${tail} ${around(q.asOf, out.months)}, before its handback, so the swap only moves the problem`
      : '';
  };
  let blocked = reach(p, after, ac.tail, unit.serial) || replacementBlock(ctx.lessor, c.kind, after, before, unit.serial, c.position);

  let donorPart: SwapDetail['donor'];
  if (donor) {
    const { d, j } = donor;
    const theirs = d.ac.components[j]!;
    const dBefore = d.baseline.asRecorded.components[j]!;
    const outgoing: Component = { ...c, position: theirs.position, installedOn: d.ac.tail };
    const dAfter = assessComponent(d.ac, outgoing, d.conditions, d.baseline.projection, 'as-recorded', a);
    const exposureBefore = d.baseline.asRecorded.exposure;
    const exposureAfter = exposureBefore - dBefore.exposure + dAfter.exposure;
    blocked ||=
      reach(d.baseline.projection, dAfter, d.ac.tail, c.serial) ||
      replacementBlock(d.lessor, theirs.kind, dAfter, dBefore, c.serial, `${d.ac.tail}'s ${theirs.position}`) ||
      (d.lessor.engineRemovalNoticeDays > ctx.lessor.engineRemovalNoticeDays ? noticeBlock(ctx, i, d) : '');
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
  const late: string[] = [];
  let fromPool = 0;
  let fromTails = 0;
  for (const i of eligible) {
    const c = ac.components[i]!;
    const tooLate = noticeBlock(ctx, i);
    if (tooLate) {
      late.push(tooLate);
      continue;
    }
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
  if (!swaps.length)
    return unavailable(ctx, 'L3', label, late.length ? `A swap is ${late.join('; ')}.` : `No unit in the pool or on another returning tail fits ${positions}.`);
  const open = swaps.filter((x) => !x.blocked).sort((x, y) => x.total - y.total);
  const shut = swaps.filter((x) => x.blocked);
  if (!open.length)
    return unavailable(ctx, 'L3', label, `No unit that fits ${positions} can go on: ${[...new Set(shut.map((x) => x.blocked))].join('; ')}${late.length ? `; and ${late.join('; ')}` : ''}.`);

  const s = open[0]!;
  const runnerUp = open[1];
  return swapOption(
    ctx,
    s,
    `Lever 3, move a component: the unit whose life sits just above what this contract demands, not the one with the most. ` +
      `Searched ${fromPool + fromTails} units that fit ${positions}: ${fromPool} in the pool, ${fromTails} on other returning tails` +
      (shut.length ? `; ruled out — ${[...new Set(shut.map((x) => x.blocked))].join('; ')}. ` : '. ') +
      (late.length ? `Elsewhere on the tail, a swap is ${late.join('; ')}. ` : '') +
      `Best: ${s.trace} ` +
      (runnerUp ? `Next best: ${runnerUp.unit.serial} into ${ac.components[runnerUp.index]!.position} at ${usd(runnerUp.total)} all-in. ` : ''),
  );
}

/**
 * A swap as an option: it has to happen by the earlier of the component running out and the
 * shop-slot deadline, and a planned engine removal needs notice before that (clause 12.3(b)), so
 * it is decided that much earlier.
 */
function swapOption(ctx: LeverContext, s: Swap, trace: string): LeverOption {
  const { ac, baseline } = ctx;
  const p = baseline.projection;
  const c = ac.components[s.index]!;
  const by = swapBy(ctx, s.index);
  const notice = noticeDays(ctx, s.index, s.donor?.d);
  const forced = notice && by.forced ? forcedNotice(ctx, by.date, notice, c.position) : null;
  const deadline = forced ? forced.decideBy : notice ? addDays(by.date, -notice) : by.date;
  const why =
    `${by.date}, ${by.why}` +
    (forced ? `; ${forced.note}` : notice ? `, less ${notice} days' notice of a planned engine removal (${ctx.lessor.noticeClauseRef})` : '');
  return finish(ctx, {
    lever: 'L3',
    label: s.donor ? `Swap ${c.position} with ${s.donor.d.ac.tail}'s ${s.donor.d.ac.components[s.donor.j]!.position}` : `Swap ${c.position} for spare ${s.unit.serial}`,
    toPool: s.donor ? undefined : c.position,
    cost: s.cost,
    downtimeDays: s.downtimeDays,
    downtimeCost: s.downtimeCost,
    newExposure: s.newExposure,
    newCompensation: s.newCompensation,
    // Removal and installation on each tail touched; the exposure a swap moves is not cash.
    spend: s.detail.own.cost + (s.detail.donor?.cost ?? 0),
    spendDate: p.asOf,
    feasible: true,
    deadline,
    position: c.position,
    actionKey: `swap:${c.position}:${s.unit.id}`,
    move: s.detail,
    notices: notice
      ? [{ due: deadline, what: `${c.position} comes off for the swap${s.donor ? `, and ${s.donor.d.ac.tail}'s ${s.donor.d.ac.components[s.donor.j]!.position} with it` : ''}`, short: forced !== null && deadline === p.asOf && addDays(by.date, -notice) < p.asOf }]
      : undefined,
    trace: `${trace}Priced as fitted today. Decide by ${deadline}: the swap has to happen by ${why}.`,
  });
}

// ---------------------------------------------------------------------------------------
// A component that runs out before handback. Two more routes than the four levers: cover it with a
// pool spare while it goes to the shop (12.3(c)), and — when nothing keeps the tail flying — the
// aircraft on the ground, priced, never hidden behind "pay at handback".
// ---------------------------------------------------------------------------------------

/** When the component runs out, and the first slot it can go into after that (the slot lead time from today). */
function forcedSlot(ctx: LeverContext, i: number) {
  const p = ctx.baseline.projection;
  const out = runout(p, ctx.baseline.asRecorded.components[i]!);
  const slot = Math.max(Math.ceil(ctx.a.shopSlotLeadTimeMonths - EPS), Math.ceil(out.months - EPS));
  return { out, slot, outDate: addMonths(p.asOf, out.months) };
}

/** The notice a shop visit's planned engine removal needs (clause 12.3(b)), due that many days before induction. */
function visitNotice(ctx: LeverContext, v: Visit): LeverOption['notices'] {
  if (v.kind !== 'engine') return undefined;
  const due = addDays(v.date, -ctx.lessor.engineRemovalNoticeDays);
  const asOf = ctx.baseline.projection.asOf;
  return [{ due: due < asOf ? asOf : due, what: `${v.position} comes off for its shop visit`, short: due < asOf }];
}

/** The cheapest workscope that clears the contract, for a component inducted at `month` after it stopped flying at `flownTo`. */
function forcedVisit(ctx: LeverContext, i: number, month: number, flownTo: number, cover: boolean): Visit {
  const visits = scopesFor(ctx.ac.components[i]!.kind)
    .map((s) => simulateVisit(ctx, i, month, s, { flownTo, cover }))
    .sort((x, y) => x.visitCost - y.visitCost);
  return visits.find((v) => v.after.compensation === 0) ?? visits[visits.length - 1]!;
}

/**
 * The pool spares that could cover this engine for `span` months under 12.3(c): each must fly that
 * long on this tail without running out itself, and its time away from the pool is the life it
 * burns, priced like any spare's life at a build-for-interval visit's rates. Cheapest first.
 */
function coverSpares(ctx: LeverContext, i: number, span: number) {
  const { ac, a, baseline, conditions } = ctx;
  const p = baseline.projection;
  const c = ac.components[i]!;
  const covers = ctx.pool
    .filter((u) => u.kind === 'engine' && u.model === ac.engineModel)
    .map((u) => {
      const fitted = assessComponent(ac, { ...u, position: c.position, installedOn: ac.tail }, conditions, p, 'as-recorded', a);
      const short = fitted.requirements.find((r) => r.remainingToday < monthlyRate(p, r.unit) * span - EPS);
      const priced: Component = { ...u, shopVisitCount: Math.max(1, u.shopVisitCount), lastWorkscope: 'build-for-interval' };
      const burn = fitted.requirements
        .filter((r) => r.requirementId === fitted.binding.requirementId || r.group === 'llp')
        .map((r) => {
          const used = monthlyRate(p, r.unit) * span;
          const rate = unitCostOfLife(ac, priced, conditionFor(conditions, r.requirementId), a).rate;
          return { r, used, rate, amount: used * rate };
        });
      return { u, short, burn, cost: burn.reduce((s2, x) => s2 + x.amount, 0) };
    });
  return { covers, usable: covers.filter((x) => !x.short).sort((x, y) => x.cost - y.cost) };
}

/**
 * Clause 12.3(c): the engine comes off when it runs out, a pool spare goes on temporarily, the
 * engine goes into the first slot the lead time allows, comes back after the turnaround and is
 * reinstalled before handback. It stays the permanent engine, so 12.2's replacement test does not
 * apply to the spare. Priced: the shop visit, two removals and installations, the downtime of two
 * overnight changes, and the spare's time away from the pool — the life it burns on this tail,
 * priced like any spare's life at a build-for-interval visit's rates.
 */
export function coverUntilRestored(ctx: LeverContext): LeverOption {
  const label = 'Cover it with a spare while it goes to the shop';
  if (ctx.focus === undefined) return unavailable(ctx, 'L1', label, 'Nothing runs out before handback, so no removal is required.');
  const { ac, a, baseline, conditions, lessor } = ctx;
  const p = baseline.projection;
  const i = ctx.focus;
  const c = ac.components[i]!;
  if (c.kind !== 'engine') return unavailable(ctx, 'L1', label, `${c.position} is not an engine: ${lessor.temporaryInstallClauseRef} covers temporary engines only.`);
  const { out, slot, outDate } = forcedSlot(ctx, i);
  const back = slot + ENGINE_TAT_MONTHS;
  if (back > p.monthsToReturn + EPS)
    return unavailable(
      ctx,
      'L1',
      label,
      `the first slot after ${c.position} runs out is in ${monthOf(p.asOf, slot)}; a ${ENGINE_SHOP_TURNAROUND_DAYS.max}-day turnaround puts it back ${around(p.asOf, back)}, after handback ${handback(p)}.`,
    );
  const span = back - out.months;
  const { covers, usable } = coverSpares(ctx, i, span);
  if (!usable.length)
    return unavailable(
      ctx,
      'L1',
      label,
      covers.length
        ? `no pool spare lasts the ${num(span, 1)} months from ${c.position}'s run-out to its return: ${covers.map((x) => `${x.u.serial} runs short of ${lifeWord(x.short!, 'engine')}`).join('; ')}.`
        : `the pool has no ${ac.engineModel} to cover it.`,
    );
  const sp = usable[0]!;
  const v = forcedVisit(ctx, i, slot, out.months, true);
  const n = lessor.engineRemovalNoticeDays;
  const notice = forcedNotice(ctx, outDate, n, c.position);
  const bookBy = addMonths(p.asOf, slot - a.shopSlotLeadTimeMonths);
  const deadline = notice.decideBy < bookBy ? notice.decideBy : bookBy;
  const cost = v.cost + sp.cost;
  return finish(ctx, {
    lever: 'L1',
    label: `Cover ${c.position} with spare ${sp.u.serial} while it goes to the shop`,
    cost,
    downtimeDays: v.downtimeDays,
    downtimeCost: v.downtimeCost,
    newExposure: v.newExposure,
    newCompensation: v.newCompensation,
    spend: v.cost,
    reservesReclaimed: v.reserves,
    spendDate: v.date,
    feasible: true,
    deadline,
    position: c.position,
    actionKey: `cover:${c.position}:${slot}:${v.workscope}`,
    covers: { id: sp.u.id, serial: sp.u.serial, from: out.months, until: back },
    slot: slotFor(bookBy, p.asOf, c.position, c.kind, v.workscope, slot),
    notices: [
      { due: notice.decideBy, what: `${c.position} comes off when it runs out, on ${dayMonthYear(outDate)}`, short: addDays(outDate, -n) < p.asOf },
      { due: addDays(addMonths(p.asOf, back), -n), what: `spare ${sp.u.serial} comes off to reinstall ${c.position}`, short: false },
    ],
    trace:
      `${c.position} runs out of ${clockWord(out.requirement)} on ${outDate} and comes off. Under ${lessor.temporaryInstallClauseRef} spare ` +
      `${sp.u.serial} goes on as a temporary engine; ${c.position} stays the permanent engine, so ${lessor.replacementClauseRef}'s replacement ` +
      `test does not apply. ${c.position} goes into the first slot the ${a.shopSlotLeadTimeMonths}-month lead time allows (month ${slot}) and is ` +
      `reinstalled at month ${num(back, 1)}, before handback at month ${num(p.monthsToReturn, 1)}. ${v.trace} ` +
      `The spare's time away from the pool: ${num(span, 1)} months on this tail, ` +
      `${sp.burn.map((x) => `${num(x.used)} ${x.r.unit}${x.r.group === 'llp' ? ' of LLP life' : ''} × ${usd2(x.rate)}`).join(' + ')} = ${usd(sp.cost)}, ` +
      `priced at the rates of a full shop visit (build-for-interval). Notice of the removal: ${notice.note}. Reinstalling ${c.position} is a planned ` +
      `removal of the spare: ${n} days' notice before month ${num(back, 1)}. Book the slot by ${bookBy}.`,
  });
}

/**
 * The baseline for a tail whose component runs out before handback: acting late. Nobody acts until
 * it runs out; then the cheapest option still open that day is taken. Notice goes to the lessor
 * then, short — 12.3(b) allows it for a removal forced by the component running out. A free pool
 * spare can go on that day: permanently, where 12.2's replacement test passes, or under 12.3(c) as a
 * temporary engine until the component is back from a slot booked that day, a lead time later.
 * Otherwise the aircraft is on the ground for the lead time, then the shop visit. If the component
 * cannot be back before handback and no spare goes on, the aircraft is on the ground to handback and
 * pays the lease's compensation as it stands. Priced with
 * the levers' own machinery and the downtime rate — the price of waiting, set against acting now.
 * Not an option offered: what doing nothing turns into for a component that cannot fly on.
 */
export function actingLate(ctx: LeverContext): LeverOption {
  const label = 'Acting late';
  if (ctx.focus === undefined) return unavailable(ctx, 'ground', label, 'Nothing runs out before handback.');
  const { ac, a, baseline, lessor } = ctx;
  const p = baseline.projection;
  const i = ctx.focus;
  const c = ac.components[i]!;
  const out = runout(p, baseline.asRecorded.components[i]!);
  const outDate = addMonths(p.asOf, out.months);
  const perDay = a.downtimeCostPerDay[ac.bodyClass];
  const lead = a.shopSlotLeadTimeMonths;
  // Booked the day it runs out: the first monthly slot a lead time on.
  const slot = Math.ceil(out.months + lead - EPS);
  const back = slot + (c.kind === 'engine' ? ENGINE_TAT_MONTHS : 0);
  const notice =
    c.kind === 'engine'
      ? `Notice goes to the lessor on ${outDate}, the day it comes off — short, as ${lessor.noticeClauseRef} allows for a removal required by the engine running out. `
      : '';
  const at = `Nobody acts until ${c.position} runs out of ${clockWord(out.requirement)} on ${outDate}. ${notice}`;
  const options: LeverOption[] = [];

  // A free pool spare put on for good the day it runs out, where the lease permits it as a replacement.
  if (MOVABLE.includes(c.kind)) {
    const model = c.kind === 'engine' ? ac.engineModel : ac.type;
    const swap = ctx.pool
      .filter((u) => u.kind === c.kind && u.model === model)
      .map((u) => evaluateSwap(ctx, i, u))
      .filter((x) => !x.blocked)
      .sort((x, y) => x.total - y.total)[0];
    if (swap)
      options.push(
        finish(ctx, {
          lever: 'ground',
          label: `Acting late: ${c.position} swapped for spare ${swap.unit.serial} on ${dayMonthYear(outDate)}`,
          cost: swap.cost,
          downtimeDays: swap.downtimeDays,
          downtimeCost: swap.downtimeCost,
          newExposure: swap.newExposure,
          newCompensation: swap.newCompensation,
          spend: swap.detail.own.cost,
          spendDate: outDate,
          feasible: true,
          deadline: null,
          position: c.position,
          toPool: c.position,
          actionKey: `late:${c.position}:swap`,
          trace: `${at}Spare ${swap.unit.serial} is free that day and the lease permits it as a replacement (${lessor.replacementClauseRef}): ${swap.trace}`,
        }),
      );
  }

  if (MOVABLE.includes(c.kind) && back <= p.monthsToReturn + EPS) {
    // A free pool spare covers it under 12.3(c) while it is at the shop, if one lasts that long.
    if (c.kind === 'engine') {
      const sp = coverSpares(ctx, i, back - out.months).usable[0];
      if (sp) {
        const v = forcedVisit(ctx, i, slot, out.months, true);
        options.push(
          finish(ctx, {
            lever: 'ground',
            label: `Acting late: spare ${sp.u.serial} covers ${c.position} from ${dayMonthYear(outDate)} while it goes to the shop`,
            cost: v.cost + sp.cost,
            downtimeDays: v.downtimeDays,
            downtimeCost: v.downtimeCost,
            newExposure: v.newExposure,
            newCompensation: v.newCompensation,
            spend: v.cost,
            reservesReclaimed: v.reserves,
            spendDate: v.date,
            feasible: true,
            deadline: null,
            position: c.position,
            actionKey: `late:${c.position}:cover`,
            trace:
              `${at}Spare ${sp.u.serial} is free that day and covers it under ${lessor.temporaryInstallClauseRef}; the slot booked that day is month ` +
              `${slot}, and ${c.position} is back at month ${num(back, 1)}. ${v.trace} The spare's time away from the pool, ${usd(sp.cost)}.`,
          }),
        );
      }
    }
    // Otherwise the aircraft waits on the ground for the slot, then goes through the shop visit.
    const v = forcedVisit(ctx, i, slot, out.months, false);
    const waitDays = Math.round((slot - out.months) * DAYS_PER_MONTH);
    options.push(
      finish(ctx, {
        lever: 'ground',
        label: `Acting late: on the ground from ${dayMonthYear(outDate)} for a slot, then the shop visit`,
        cost: v.cost,
        downtimeDays: waitDays + v.downtimeDays,
        downtimeCost: waitDays * perDay + v.downtimeCost,
        newExposure: v.newExposure,
        newCompensation: v.newCompensation,
        spend: v.cost,
        reservesReclaimed: v.reserves,
        spendDate: v.date,
        feasible: true,
        deadline: null,
        position: c.position,
        actionKey: `late:${c.position}:ground`,
        grounded: { from: outDate, days: waitDays, cost: waitDays * perDay },
        trace:
          `${at}No spare covers it, so the aircraft is on the ground until the slot booked that day, month ${slot}: ${days(waitDays)} × ` +
          `${usd(perDay)} = ${usd(waitDays * perDay)}. Then the shop visit: ${v.trace}`,
      }),
    );
  } else if (!options.length) {
    const groundDays = Math.round((p.monthsToReturn - out.months) * DAYS_PER_MONTH);
    options.push(
      finish(ctx, {
        lever: 'ground',
        label: `Acting late: on the ground from ${dayMonthYear(outDate)} to handback`,
        cost: 0,
        downtimeDays: groundDays,
        downtimeCost: groundDays * perDay,
        newExposure: baseline.asRecorded.exposure,
        newCompensation: baseline.asRecorded.compensation,
        spend: 0,
        spendDate: null,
        feasible: true,
        deadline: null,
        position: c.position,
        actionKey: `late:${c.position}:handback`,
        grounded: { from: outDate, days: groundDays, cost: groundDays * perDay },
        trace:
          `${at}A slot booked that day would not bring ${c.position} back before handback, and no spare goes on, so the aircraft is on the ground to handback: ` +
          `${days(groundDays)} × ${usd(perDay)} = ${usd(groundDays * perDay)}, and the lease's compensation as it stands, ${usd(baseline.asRecorded.exposure)}.`,
      }),
    );
  }
  return options.reduce((x, y) => (y.total < x.total ? y : x));
}

/**
 * When nothing keeps the tail flying: the aircraft on the ground from the run-out — until the
 * component is back from the first slot the lead time allows, or until handback if that comes
 * first — priced in days at the downtime rate. A forced tail never resolves to paying at handback.
 */
export function onTheGround(ctx: LeverContext): LeverOption {
  const label = 'On the ground';
  if (ctx.focus === undefined) return unavailable(ctx, 'ground', label, 'Nothing runs out before handback.');
  const { ac, a, baseline } = ctx;
  const p = baseline.projection;
  const i = ctx.focus;
  const c = ac.components[i]!;
  const { out, slot, outDate } = forcedSlot(ctx, i);
  const perDay = a.downtimeCostPerDay[ac.bodyClass];
  const back = slot + (c.kind === 'engine' ? ENGINE_TAT_MONTHS : 0);
  if (MOVABLE.includes(c.kind) && back <= p.monthsToReturn + EPS) {
    // On the ground from the run-out until the slot, then the shop visit at its own downtime (§13:
    // with no spare the aircraft waits 14 days for an engine; the turnaround sits behind a spare).
    const waitDays = Math.round((slot - out.months) * DAYS_PER_MONTH);
    // No wait: it reaches a slot before it runs out, so this is the shop visit itself (lever 1), not time on the ground.
    if (waitDays <= 0)
      return unavailable(ctx, 'ground', label, `${c.position} reaches the first slot (${monthOf(p.asOf, slot)}) before it runs out: that is a shop visit, not time on the ground.`);
    const v = forcedVisit(ctx, i, slot, out.months, false);
    const groundDays = waitDays + v.downtimeDays;
    const downtimeCost = waitDays * perDay + v.downtimeCost;
    return finish(ctx, {
      lever: 'ground',
      label: `On the ground from ${dayMonthYear(outDate)} until the slot, then the shop visit`,
      cost: v.cost,
      downtimeDays: groundDays,
      downtimeCost,
      newExposure: v.newExposure,
      newCompensation: v.newCompensation,
      spend: v.cost,
      reservesReclaimed: v.reserves,
      spendDate: v.date,
      feasible: true,
      deadline: null,
      position: c.position,
      actionKey: `ground:${c.position}`,
      grounded: { from: outDate, days: groundDays, cost: downtimeCost },
      slot: slotFor(addMonths(p.asOf, slot - a.shopSlotLeadTimeMonths), p.asOf, c.position, c.kind, v.workscope, slot),
      notices:
        c.kind === 'engine'
          ? [
              (() => {
                const f = forcedNotice(ctx, outDate, ctx.lessor.engineRemovalNoticeDays, c.position);
                return { due: f.decideBy, what: `${c.position} comes off when it runs out, on ${dayMonthYear(outDate)}`, short: addDays(outDate, -ctx.lessor.engineRemovalNoticeDays) < p.asOf };
              })(),
            ]
          : undefined,
      trace:
        `${c.position} runs out of ${clockWord(out.requirement)} on ${outDate}, and nothing keeps the aircraft flying: it stays on the ground until ` +
        `the first slot the lead time allows (${monthOf(p.asOf, slot)}), ${days(waitDays)} × ${usd(perDay)} = ${usd(waitDays * perDay)}, then goes through the ` +
        `shop visit. ${v.trace}`,
    });
  }
  const groundDays = Math.round((p.monthsToReturn - out.months) * DAYS_PER_MONTH);
  const downtimeCost = groundDays * perDay;
  return finish(ctx, {
    lever: 'ground',
    label: `On the ground from ${dayMonthYear(outDate)} to handback`,
    cost: 0,
    downtimeDays: groundDays,
    downtimeCost,
    newExposure: baseline.asRecorded.exposure,
    newCompensation: baseline.asRecorded.compensation,
    spend: 0,
    spendDate: null,
    feasible: true,
    deadline: null,
    position: c.position,
    actionKey: `ground:${c.position}`,
    grounded: { from: outDate, days: groundDays, cost: downtimeCost },
    trace:
      `${c.position} runs out of ${clockWord(out.requirement)} on ${outDate}, and nothing keeps the aircraft flying or brings ${c.position} back ` +
      `before handback: on the ground for ${days(groundDays)} × ${usd(perDay)} = ${usd(downtimeCost)}, and the lease's compensation at handback ` +
      `as it stands, ${usd(baseline.asRecorded.exposure)}.`,
  });
}

// ---------------------------------------------------------------------------------------
// The customer's own choice — the what-if (calc/whatif.ts). One action on one tail, priced by
// the same machinery as the levers, or refused with the reason the model knows it cannot
// happen: never priced as if it could.
// ---------------------------------------------------------------------------------------

/** What a proposal asks for, as the customer would say it; a swap's unit by its serial, a shop visit by its month. */
export function describeProposal(p: Proposal, asOf: ISODate, serial?: string): string {
  switch (p.kind) {
    case 'swap':
      return `Swap ${p.position} ${serial ? `for ${serial}` : 'for the right-sized unit'}`;
    case 'visit':
      return `Send ${p.position} to the shop in ${monthOf(asOf, p.month)}, ${visitName(p.position.startsWith('ENG') ? 'engine' : p.position === 'APU' ? 'apu' : 'landing-gear', p.workscope)}`;
    case 'route':
      return p.profile ? `Route change: fly it ${p.profile}` : 'Change its route';
    case 'return':
      return `Hand it back ${p.months} ${p.months === 1 ? 'month' : 'months'} later`;
  }
}

/**
 * A proposed swap, shop visit or route change on this tail, as an option. Infeasible, with the
 * reason as its trace, when the model knows it cannot happen: no free unit of that type, a slot
 * inside the lead time or after the component has run out, a turnaround past handback, a route
 * the type does not fly — or, on a tail with a component running out before handback, a change
 * that does not deal with it. Set ctx.focus to that component, as recommendTail does.
 */
export function proposedOption(ctx: LeverContext, proposal: Exclude<Proposal, { kind: 'return' }>): LeverOption {
  const { ac, baseline } = ctx;
  const p = baseline.projection;
  const out = ctx.focus === undefined ? null : { c: ac.components[ctx.focus]!, r: runout(p, baseline.asRecorded.components[ctx.focus]!) };
  const runsOut = out ? `${out.c.position} runs out of ${clockWord(out.r.requirement)} ${around(p.asOf, out.r.months)}, before handback` : '';

  if (proposal.kind === 'route') {
    const label = proposal.profile ? `Route change: fly it ${proposal.profile}` : 'Change its route';
    const flown = PROFILES_BY_TYPE[ac.type];
    if (!proposal.profile || proposal.profile === ac.routeProfile || !flown.includes(proposal.profile))
      return unavailable(
        ctx,
        'L2',
        label,
        flown.length < 2
          ? `The ${ac.type} flies only the ${ac.routeProfile} profile in this network: there is no other route to put it on.`
          : proposal.profile === ac.routeProfile
            ? `${ac.tail} already flies ${ac.routeProfile}.`
            : `The ${ac.type} does not fly ${proposal.profile} in this network.`,
      );
    const r = routeRun(ctx, proposal.profile);
    if (r.blocked) return unavailable(ctx, 'L2', label, `${runsOut}, and ${r.blocked}: the route change does not keep it flying.`);
    return routeOption(ctx, r);
  }

  const i = ac.components.findIndex((c) => c.position === proposal.position);
  const c = ac.components[i];
  const label = proposal.kind === 'swap' ? `Swap ${proposal.position}` : `Send ${proposal.position} to the shop`;
  if (!c) return unavailable(ctx, proposal.kind === 'swap' ? 'L3' : 'L4', label, `${ac.tail} has no ${proposal.position}.`);
  if (out && ctx.focus !== i)
    return unavailable(ctx, proposal.kind === 'swap' ? 'L3' : 'L4', label, `${runsOut}, and this does not deal with it: one change per tail, so it has to be ${out.c.position}.`);

  if (proposal.kind === 'visit') {
    if (!MOVABLE.includes(c.kind)) return unavailable(ctx, 'L4', label, `The airframe's heavy check is not timed by the levers: its downtime is not in ASSUMPTIONS §13.`);
    const scope: Scope = c.kind === 'engine' ? proposal.workscope : 'build-for-interval';
    const block = visitBlock(ctx, i, proposal.month);
    if (block) return unavailable(ctx, 'L4', label, `A slot in ${monthOf(p.asOf, proposal.month)} cannot be had: ${block}.`);
    const v = simulateVisit(ctx, i, proposal.month, scope);
    const lead = ctx.a.shopSlotLeadTimeMonths;
    const deadline = addMonths(p.asOf, v.month - lead);
    return finish(ctx, {
      lever: 'L4',
      label: `Send ${c.position} to the shop in ${monthOf(p.asOf, v.month)}, ${visitName(c.kind, scope)}`,
      cost: v.cost,
      downtimeDays: v.downtimeDays,
      downtimeCost: v.downtimeCost,
      newExposure: v.newExposure,
      newCompensation: v.newCompensation,
      spend: v.cost,
      reservesReclaimed: v.reserves,
      spendDate: v.date,
      feasible: true,
      deadline,
      position: c.position,
      actionKey: `visit:${c.position}:${v.month}:${scope}`,
      slot: slotFor(deadline, p.asOf, c.position, c.kind, scope, v.month),
      trace: `Your change: ${v.trace} Book the slot by ${deadline} (${lead} months' lead).`,
    });
  }

  if (!MOVABLE.includes(c.kind)) return unavailable(ctx, 'L3', label, `The airframe is the aircraft: it cannot be swapped.`);
  const tooLate = noticeBlock(ctx, i);
  if (tooLate) return unavailable(ctx, 'L3', label, `A swap of ${c.position} is ${tooLate}.`);
  const model = c.kind === 'engine' ? ac.engineModel : ac.type;
  const fits = (u: Component) => u.kind === c.kind && u.model === model;
  const what = `${model} ${c.kind === 'engine' ? 'engine' : c.kind === 'landing-gear' ? 'landing gear' : 'APU'}`;
  const free: Swap[] = [
    ...ctx.pool.filter(fits).map((u) => evaluateSwap(ctx, i, u)),
    ...ctx.donors.flatMap((d) => d.ac.components.flatMap((u, j) => (fits(u) ? [evaluateSwap(ctx, i, u, { d, j })] : []))),
  ];
  let s: Swap | undefined;
  if (proposal.unit) {
    s = free.find((x) => x.unit.id === proposal.unit);
    if (!s) {
      const elsewhere = [...ctx.pool, ...ctx.donors.flatMap((d) => d.ac.components)].find((u) => u.id === proposal.unit);
      return unavailable(
        ctx,
        'L3',
        label,
        elsewhere ? `${elsewhere.serial} is a ${elsewhere.model} ${elsewhere.kind}; ${c.position} on ${ac.tail} takes a ${what}.` : `That unit is not free: it is in no pool and on no returning tail that is free to give it.`,
      );
    }
  } else {
    if (!free.length) return unavailable(ctx, 'L3', label, `No ${what} is free: none in the pool, and none on another returning tail that is free to give one.`);
    s = free.filter((x) => !x.blocked).sort((x, y) => x.total - y.total)[0];
    if (!s) return unavailable(ctx, 'L3', label, `No free ${what} can go on: ${free.map((x) => x.blocked).join('; ')}.`);
  }
  if (s.blocked) return unavailable(ctx, 'L3', `${label} for ${s.unit.serial}`, `${s.blocked}.`);
  return swapOption(ctx, s, `Your change: ${proposal.unit ? '' : 'the right-sized unit, as the model would pick. '}${s.trace} `);
}
