// SPEC §2.7–§2.8 — the recommendation and the avoidable / unavoidable split.
//
// One tail: rank paying at handback and the four levers by total cost (maintenance less
// reserves, downtime, and what is still owed at handback), and return the winner, the
// runner-up, the delta between them and the date the decision has to be made by.
//
// The fleet: the same for every returning tail, but a spare can only go on one aircraft and a
// tail can only take part in one action. Tails with a component that runs out before handback
// are settled first, soonest first — they have to act, the rest are choosing. Then the others,
// in order of what they could save with everything available. Each chooses from what is left.

import { DEFAULT_ASSUMPTIONS } from './constants';
import type { FleetExposure, TailResult } from './exposure';
import { num, usd } from './format';
import {
  doTheWork,
  firstTimeout,
  flyItDifferently,
  moveAComponent,
  payAtHandback,
  timeTheShopVisit,
  type Donor,
  type LeverContext,
  type LeverOption,
} from './levers';
import type { Assumptions, Dataset, ISODate, ReturnCondition } from './types';

export interface TailRecommendation {
  tail: string;
  /** Exposure if nothing changes, as recorded. */
  doNothing: number;
  /** Paying at handback and the four levers: feasible ones cheapest first, then the rest. */
  options: LeverOption[];
  recommended: LeverOption;
  runnerUp: LeverOption | null;
  /** runnerUp.total − recommended.total. */
  delta: number;
  /** The recommended action's deadline; null when the recommendation is to pay, which books nothing. */
  decisionDeadline: ISODate | null;
  /** SPEC §2.8: the total under the best feasible option. */
  unavoidable: number;
  /** doNothing − unavoidable. */
  avoidable: number;
  trace: string;
}

const LEVER_ORDER = ['pay', 'L1', 'L2', 'L3', 'L4'];

const all = (ctx: LeverContext) => [payAtHandback(ctx), doTheWork(ctx), flyItDifferently(ctx), moveAComponent(ctx), timeTheShopVisit(ctx)];

export function recommendTail(ctx: LeverContext): TailRecommendation {
  // A component that runs out before handback has to be dealt with: the options become the
  // levers applied to it. If none can keep it flying, fall back to the plain ranking.
  const timeout = firstTimeout(ctx.baseline);
  let offered = all(ctx);
  let forced = '';
  if (timeout) {
    const focused = all({ ...ctx, focus: ctx.ac.components.findIndex((c) => c.position === timeout.position) });
    const at = `${timeout.position} runs out of ${timeout.clock} at month ${num(timeout.months, 1)}, before handback`;
    if (focused.some((o) => o.feasible)) {
      offered = focused;
      forced = `${at}, so the options are the ones that keep it flying; paying at handback is not one of them. `;
    } else forced = `${at}, and no lever can keep it flying, so the plain ranking stands: see the caution on paying. `;
  }
  const options = offered.sort(
    (x, y) => Number(y.feasible) - Number(x.feasible) || x.total - y.total || LEVER_ORDER.indexOf(x.lever) - LEVER_ORDER.indexOf(y.lever),
  );
  // Lever 4 can land on lever 1's month and workscope; the same action is ranked once.
  const distinct: LeverOption[] = [];
  for (const o of options) if (o.feasible && !distinct.some((d) => d.actionKey === o.actionKey)) distinct.push(o);
  const recommended = distinct[0]!; // paying is feasible unless a focused lever is
  const runnerUp = distinct[1] ?? null;
  const delta = runnerUp ? runnerUp.total - recommended.total : 0;
  // Not SPEC's min over every option: a route change is worth most if started now, so its
  // deadline is always today, and the minimum would put today on every tail.
  const decisionDeadline = recommended.deadline;
  const doNothing = ctx.baseline.asRecorded.exposure;
  const unavoidable = recommended.total;
  const avoidable = doNothing - unavoidable;

  const line = (o: LeverOption) =>
    o.feasible
      ? `${o.label}: ${usd(o.cost)} cost + ${usd(o.downtimeCost)} downtime + ${usd(o.newExposure)} still owed = ${usd(o.total)}`
      : `${o.label}: not available — ${o.trace}`;
  const trace =
    `${ctx.ac.tail}: ${forced}${recommended.label}, ${usd(unavoidable)} all-in against ${usd(doNothing)} if nothing changes` +
    (avoidable > 0
      ? `, so ${usd(avoidable)} is avoidable. `
      : avoidable < 0
        ? ` — ${usd(-avoidable)} more, because the do-nothing figure assumed it could fly to handback. `
        : ': nothing is avoidable. ') +
    (runnerUp ? `Runner-up: ${runnerUp.label}, ${usd(delta)} more${runnerUp.deadline ? `, open until ${runnerUp.deadline}` : ''}. ` : '') +
    (decisionDeadline ? `Decide by ${decisionDeadline}.` : 'Nothing to book.') +
    `\n\n${options.map((o, k) => `${o.feasible ? `${k + 1}.` : '–'} ${line(o)}`).join('\n')}` +
    `\n\n${recommended.trace}`;
  return { tail: ctx.ac.tail, doNothing, options, recommended, runnerUp, delta, decisionDeadline, unavoidable, avoidable, trace };
}

export interface TailPlan {
  tail: string;
  /** 'donor' when the tail gives a unit to another tail's swap instead of acting on its own. */
  role: 'own' | 'donor';
  /** The tail's own ranking, from what was left to it. */
  recommendation: TailRecommendation;
  /** What happens to this tail. */
  label: string;
  doNothing: number;
  /**
   * This tail's own total after the plan: its share of the action's cost and downtime plus its
   * exposure at handback. For a swap between two tails each carries its own share, so the fleet
   * total adds up.
   */
  after: number;
  avoidable: number;
  decisionDeadline: ISODate | null;
  trace: string;
}

export interface FleetRecommendation {
  /** One per returning tail, in the fleet table's order. */
  plans: TailPlan[];
  byTail: Record<string, TailPlan>;
  totals: {
    doNothing: number;
    /** Σ after: maintenance, downtime and what is still owed at handback, across the returning tails. */
    after: number;
    /** doNothing − after. */
    avoidable: number;
    acting: number;
    paying: number;
    donors: number;
  };
  trace: string;
}

/**
 * What a tail is told to do, without the detail that does not change the decision: the lever,
 * the component and the workscope, but not the month of a visit or which spare goes on. A move
 * from month 6 to month 7, or from one spare to another, is the same action.
 */
export function actionOf(plan: TailPlan): string {
  if (plan.role === 'donor') return `gives:${plan.label}`;
  const o = plan.recommendation.recommended;
  return o.move ? `swap:${o.move.position}:${o.move.incoming.from}` : o.actionKey.replace(/^visit:([^:]+):\d+:/, 'visit:$1:');
}

export interface ActionChange {
  tail: string;
  from: string;
  to: string;
}

export interface ScenarioComparison {
  tails: number;
  /** Tails whose recommended action differs from the plan at rest. */
  changed: ActionChange[];
  trace: string;
}

/** SPEC §3.4: which tails change what they are told to do when the scenario moves. */
export function compareRecommendations(atRest: FleetRecommendation, scenario: FleetRecommendation): ScenarioComparison {
  const changed = scenario.plans.flatMap((p): ActionChange[] => {
    const before = atRest.byTail[p.tail];
    return before && actionOf(before) !== actionOf(p) ? [{ tail: p.tail, from: before.label, to: p.label }] : [];
  });
  const tails = scenario.plans.length;
  const trace = changed.length
    ? `${changed.length} of ${tails} tails change their recommended action against the plan at rest:\n` +
      changed.map((c) => `${c.tail}: ${c.from} → ${c.to}`).join('\n') +
      `\n\nA different month for the same visit, or a different spare for the same swap, is not counted as a change.`
    : `No tail changes its recommended action against the plan at rest; the totals move, the decisions do not.`;
  return { tails, changed, trace };
}

export function recommendFleet(
  data: Pick<Dataset, 'aircraft' | 'lessors' | 'pool' | 'returnConditions'>,
  fleet: FleetExposure,
  a: Assumptions = DEFAULT_ASSUMPTIONS,
): FleetRecommendation {
  const aircraft = new Map(data.aircraft.map((x) => [x.tail, x]));
  const lessors = new Map(data.lessors.map((l) => [l.id, l]));
  const conditions = new Map<string, ReturnCondition[]>();
  for (const rc of data.returnConditions) conditions.set(rc.tail, [...(conditions.get(rc.tail) ?? []), rc]);

  const tails = fleet.returning;
  const donors: Donor[] = tails.map((t) => ({ ac: aircraft.get(t.tail)!, conditions: conditions.get(t.tail) ?? [], baseline: t }));
  const contextFor = (t: TailResult, usedPool: Set<string>, busy: Set<string>): LeverContext => {
    const ac = aircraft.get(t.tail)!;
    const lessor = lessors.get(ac.lessorId);
    if (!lessor) throw new Error(`${t.tail}: no lessor ${ac.lessorId}`);
    return {
      ac,
      lessor,
      conditions: conditions.get(t.tail) ?? [],
      a,
      baseline: t,
      pool: data.pool.filter((u) => !usedPool.has(u.id)),
      donors: donors.filter((d) => d.ac.tail !== t.tail && !busy.has(d.ac.tail)),
    };
  };

  const independent = new Map(tails.map((t) => [t.tail, recommendTail(contextFor(t, new Set(), new Set()))]));
  const timeout = new Map(tails.map((t) => [t.tail, firstTimeout(t)?.months ?? Infinity]));
  const order = [...tails].sort(
    (x, y) => timeout.get(x.tail)! - timeout.get(y.tail)! || independent.get(y.tail)!.avoidable - independent.get(x.tail)!.avoidable,
  );

  const usedPool = new Set<string>();
  const acting = new Set<string>();
  const gives = new Map<string, { to: string; option: LeverOption }>();
  const settled = new Map<string, TailRecommendation>();
  for (const t of order) {
    if (gives.has(t.tail)) continue;
    const rec = recommendTail(contextFor(t, usedPool, new Set([...acting, ...gives.keys()])));
    settled.set(t.tail, rec);
    const o = rec.recommended;
    if (o.lever === 'pay') continue;
    acting.add(t.tail);
    if (o.move?.incoming.from === 'pool') usedPool.add(o.move.incoming.id);
    if (o.move?.donor) gives.set(o.move.donor.tail, { to: t.tail, option: o });
  }

  const plans = tails.map((t): TailPlan => {
    const doNothing = t.asRecorded.exposure;
    const rec = settled.get(t.tail) ?? independent.get(t.tail)!;
    const gift = gives.get(t.tail);
    if (gift) {
      const d = gift.option.move!.donor!;
      const after = d.cost + d.downtimeCost + d.exposureAfter;
      return {
        tail: t.tail,
        role: 'donor',
        recommendation: rec,
        label: `Gives ${d.position} to ${gift.to}`,
        doNothing,
        after,
        avoidable: doNothing - after,
        decisionDeadline: settled.get(gift.to)!.decisionDeadline,
        trace:
          `${t.tail} gives ${d.position} to ${gift.to} and takes ${gift.option.move!.outgoing.serial} in its place, as part of ${gift.to}'s swap ` +
          `(${gift.option.label}). ${d.trace} This tail: ${usd(d.cost)} removal and installation + ${usd(d.downtimeCost)} downtime + ` +
          `${usd(d.exposureAfter)} still owed = ${usd(after)}, against ${usd(doNothing)} if nothing changes. Across the two tails the swap saves ` +
          `${usd(gift.option.saving)}.`,
      };
    }
    const o = rec.recommended;
    const own = o.move?.own;
    const after = own ? own.cost + own.downtimeCost + own.newExposure : o.total;
    return {
      tail: t.tail,
      role: 'own',
      recommendation: rec,
      label: o.label,
      doNothing,
      after,
      avoidable: doNothing - after,
      decisionDeadline: rec.decisionDeadline,
      trace:
        rec.trace +
        (o.move?.donor
          ? `\n\nThis row carries ${t.tail}'s share (${usd(after)}); ${o.move.donor.tail} carries the rest of the swap on its own row.`
          : ''),
    };
  });

  const doNothing = plans.reduce((s, p) => s + p.doNothing, 0);
  const after = plans.reduce((s, p) => s + p.after, 0);
  const totals = {
    doNothing,
    after,
    avoidable: doNothing - after,
    acting: plans.filter((p) => p.role === 'own' && p.recommendation.recommended.lever !== 'pay').length,
    paying: plans.filter((p) => p.role === 'own' && p.recommendation.recommended.lever === 'pay').length,
    donors: plans.filter((p) => p.role === 'donor').length,
  };
  const trace =
    `${plans.length} tails returning. If nothing changes ${usd(doNothing)}. After recommendations ${usd(after)} all-in — maintenance less ` +
    `reserves, downtime, and what is still owed at handback — so ${usd(totals.avoidable)} is avoidable. ${totals.acting} act, ` +
    `${totals.paying} pay at handback${totals.donors ? `, ${totals.donors} give a unit to another tail's swap` : ''}. Each spare and each tail is used once; ` +
    `tails with a component that runs out before handback chose first.\n\n` +
    plans.map((p) => `${p.tail}: ${p.label} — ${usd(p.doNothing)} → ${usd(p.after)}`).join('\n');
  return { plans, byTail: Object.fromEntries(plans.map((p) => [p.tail, p])), totals, trace };
}
