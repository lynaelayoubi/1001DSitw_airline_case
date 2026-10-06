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

import { COST_ESTIMATE_UNCERTAINTY, DEFAULT_ASSUMPTIONS } from './constants';
import type { FleetExposure, TailResult } from './exposure';
import { num, usd } from './format';
import {
  actingLate,
  coverUntilRestored,
  describeProposal,
  doTheWork,
  firstTimeout,
  flyItDifferently,
  moveAComponent,
  onTheGround,
  payAtHandback,
  proposedOption,
  timeTheShopVisit,
  type Donor,
  type LeverContext,
  type LeverOption,
} from './levers';
import type { Assumptions, Dataset, ISODate, Proposal, ReturnCondition } from './types';

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
  /**
   * Set when a component runs out before handback and a lever can keep it flying: the
   * recommendation is then a forced removal, not a choice, and doing nothing is not on the table.
   */
  forced: { position: string; clock: string; months: number; why: string } | null;
  /** Can the best option be told apart from the next best, given how good the cost estimates are? (tellApart) */
  call: Call;
  /** No exposure at handback, as recorded or under the lease: nothing to decide, so no options are weighed. */
  nothingToDecide: boolean;
  /**
   * For a tail whose component runs out before handback, what doing nothing turns into: acting late
   * (actingLate) — and the figure doNothing is. null for every other tail, whose doNothing is the
   * handback cheque.
   */
  late: LeverOption | null;
  /** The cash part of doNothing: compensation at handback, or acting late's shop spend, downtime and compensation. */
  doNothingCash: number;
  trace: string;
}

/**
 * The one rule for whether there is a recommendation at all. A recommendation stands only if its
 * advantage over the next best option is larger than the uncertainty in the costs that produced
 * it: COST_ESTIMATE_UNCERTAINTY (±10.1%, from the quality of the escalated appraiser figures,
 * ASSUMPTIONS §0) of the estimated money on which the two options differ — maintenance spend,
 * compensation, life handed over, exposure moved to another tail. Money common to both options
 * moves both alike and cancels out of the advantage, so it carries no uncertainty into it.
 * Downtime is a declared input, not a cost estimate: how far it would have to move is the
 * robustness question (calc/robustness.ts), not this one.
 */
export interface Call {
  stands: boolean;
  /** runnerUp.total − best.total; 0 with no runner-up. */
  advantage: number;
  /** Estimated money on which the two options differ. */
  differing: number;
  /** COST_ESTIMATE_UNCERTAINTY × differing. */
  uncertainty: number;
  /** The two options, when they cannot be told apart. */
  between: [string, string] | null;
  why: string;
}

export function tellApart(best: LeverOption, next: LeverOption | null): Call {
  if (!next) return { stands: true, advantage: 0, differing: 0, uncertainty: 0, between: null, why: 'it is the only feasible option' };
  const lines = (o: LeverOption) => [o.spend, o.newCompensation, o.newExposure - o.newCompensation, o.cost - o.spend];
  const a = lines(best);
  const b = lines(next);
  const differing = a.reduce((s, x, i) => s + Math.abs(x - b[i]!), 0);
  const uncertainty = COST_ESTIMATE_UNCERTAINTY * differing;
  const advantage = next.total - best.total;
  const stands = advantage > uncertainty + 1e-6;
  const u = `±${num(COST_ESTIMATE_UNCERTAINTY * 100, 1)}%`;
  const why = stands
    ? `${usd(advantage)} ahead of ${next.label}, more than the ±${usd(uncertainty)} the cost estimates could move it (${u} of the ${usd(differing)} on which the two differ)`
    : differing < 1 && Math.abs(advantage) < 1
      ? `${next.label} comes to the same money: nothing to choose between them`
      : `${next.label} comes within ${usd(advantage)}, inside the ±${usd(uncertainty)} the cost estimates could move it (${u} of the ${usd(differing)} on which the two differ): the options cannot be told apart`;
  return { stands, advantage, differing, uncertainty, between: stands ? null : [best.label, next.label], why };
}

const LEVER_ORDER = ['pay', 'L1', 'L2', 'L3', 'L4', 'ground'];

// With a component running out before handback (focus), two more routes: cover it with a spare
// while it goes to the shop (12.3(c)), and the aircraft on the ground — always open, so a forced
// tail never falls back to paying at handback.
const all = (ctx: LeverContext) => [
  payAtHandback(ctx),
  doTheWork(ctx),
  flyItDifferently(ctx),
  moveAComponent(ctx),
  timeTheShopVisit(ctx),
  ...(ctx.focus === undefined ? [] : [coverUntilRestored(ctx), onTheGround(ctx)]),
];

export function recommendTail(ctx: LeverContext): TailRecommendation {
  // Nothing owed at handback on either basis (to the dollar shown): there is nothing to decide, so
  // no lever is weighed — no route change, no "nothing to choose between them".
  const doNothing = ctx.baseline.asRecorded.exposure;
  if (doNothing < 0.5 && ctx.baseline.asLeaseAllows.exposure < 0.5) {
    const pay = payAtHandback(ctx);
    return {
      tail: ctx.ac.tail,
      doNothing,
      options: [pay],
      recommended: pay,
      runnerUp: null,
      delta: 0,
      decisionDeadline: null,
      unavoidable: pay.total,
      avoidable: doNothing - pay.total,
      forced: null,
      call: { stands: true, advantage: 0, differing: 0, uncertainty: 0, between: null, why: 'there is no exposure at handback' },
      nothingToDecide: true,
      late: null,
      doNothingCash: ctx.baseline.asRecorded.compensation,
      trace: `${ctx.ac.tail}: no exposure at handback, as recorded or under the lease — every clock clears its return condition. Nothing to decide.`,
    };
  }
  // A component that runs out before handback has to be dealt with: the options become the levers
  // applied to it, with a spare covering it at the shop and, always open, the aircraft on the ground.
  // Paying at handback is never one of them: a component out of its clock cannot fly.
  const timeout = firstTimeout(ctx.baseline);
  let offered = all(ctx);
  let preamble = '';
  let forced: TailRecommendation['forced'] = null;
  let late: LeverOption | null = null;
  if (timeout) {
    const focus = ctx.ac.components.findIndex((c) => c.position === timeout.position);
    offered = all({ ...ctx, focus });
    // What doing nothing turns into for a part that cannot fly on: acting late, on the day it runs out.
    late = actingLate({ ...ctx, focus });
    const at = `${timeout.position} runs out of ${timeout.clock} at month ${num(timeout.months, 1)}, before handback`;
    preamble = `Required: ${at}, so the options are the ones that deal with it; paying at handback is not one of them. `;
    forced = { ...timeout, why: `${at}: it has to come off, so doing nothing is not an option` };
  }
  const options = offered.sort(
    (x, y) => Number(y.feasible) - Number(x.feasible) || x.total - y.total || LEVER_ORDER.indexOf(x.lever) - LEVER_ORDER.indexOf(y.lever),
  );
  // Lever 4 can land on lever 1's month and workscope; the same action is ranked once.
  const distinct: LeverOption[] = [];
  for (const o of options) if (o.feasible && !distinct.some((d) => d.actionKey === o.actionKey)) distinct.push(o);
  const best = distinct[0]!; // paying is feasible unless a focused lever is
  const call = tellApart(best, distinct[1] ?? null);
  // Below the estimates' precision there is no recommendation. Where paying is one of the two, the
  // tail does nothing; where both are actions (it must act), the cheaper stands in for the pair.
  const fallBack = !call.stands && !forced ? distinct.slice(0, 2).find((o) => o.lever === 'pay') : undefined;
  const recommended = fallBack ?? best;
  const runnerUp = fallBack ? best : (distinct[1] ?? null);
  const delta = runnerUp ? runnerUp.total - recommended.total : 0;
  // Not SPEC's min over every option: a route change has no date (start now), and the minimum
  // would put today on every tail.
  const decisionDeadline = recommended.deadline;
  const unavoidable = recommended.total;
  const baseline = late ? late.total : doNothing;
  const avoidable = baseline - unavoidable;

  const line = (o: LeverOption) =>
    o.feasible
      ? `${o.label}: ${usd(o.cost)} cost + ${usd(o.downtimeCost)} downtime + ${usd(o.newExposure)} still owed = ${usd(o.total)}`
      : `${o.label}: not available — ${o.trace}`;
  const trace =
    (call.stands ? '' : `No recommendation: ${call.why}. `) +
    `${ctx.ac.tail}: ${preamble}${recommended.label}, ${usd(unavoidable)} all-in against ${usd(baseline)} if nothing changes` +
    (late
      ? avoidable >= 0
        ? ` — which for this tail is acting late: ${late.label}. Acting now saves ${usd(avoidable)}. `
        : ` — which for this tail is acting late: ${late.label}. Acting now costs ${usd(-avoidable)} more than waiting; it is still the cheapest of the options open today. `
      : avoidable > 0
        ? `, so ${usd(avoidable)} is avoidable. `
        : ': nothing is avoidable. ') +
    (runnerUp ? `Runner-up: ${runnerUp.label}, ${usd(delta)} more${runnerUp.deadline ? `, open until ${runnerUp.deadline}` : ''}. ` : '') +
    (decisionDeadline
      ? `Decide by ${decisionDeadline}.`
      : recommended.grounded
        ? `On the ground from ${recommended.grounded.from}: ${num(recommended.grounded.days)} days, ${usd(recommended.grounded.cost)} at the downtime rate.`
        : recommended.startNow
          ? `No deadline: each month of waiting loses about ${usd(recommended.startNow.perMonth)}.`
          : 'Nothing to book.') +
    (call.stands && runnerUp ? ` It stands: ${call.why}.` : '') +
    `\n\n${options.map((o, k) => `${o.feasible ? `${k + 1}.` : '–'} ${line(o)}`).join('\n')}` +
    `\n\n${recommended.trace}`;
  return {
    tail: ctx.ac.tail,
    doNothing: baseline,
    options,
    recommended,
    runnerUp,
    delta,
    decisionDeadline,
    unavoidable,
    avoidable,
    forced,
    call,
    nothingToDecide: false,
    late,
    doNothingCash: late ? late.spend + late.downtimeCost + late.newCompensation : ctx.baseline.asRecorded.compensation,
    trace: trace + (late ? `\n\nActing late: ${late.trace}` : ''),
  };
}

export interface TailPlan {
  tail: string;
  /** The action is the customer's own, proposed in the what-if (calc/whatif.ts), not the model's choice. */
  proposed: boolean;
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
  /** Cash payable to the lessor at handback if nothing changes — the money in play. */
  doNothingCash: number;
  /** The cash part of after: this tail's maintenance, removal, downtime and compensation still payable. */
  afterCash: number;
  /** doNothingCash − afterCash. */
  avoidableCash: number;
  /**
   * avoidable − avoidableCash: life already bought that the plan keeps from being handed over (a
   * unit sent to the pool), net of any spare's life given in its place. Zero for every plan that
   * leaves the units where they are: sunk over-delivery cancels there.
   */
  avoidableLife: number;
  /** Why the action is forced rather than chosen, or null. */
  forced: string | null;
  /** Still owed at handback after the plan: compensation, and life already bought and handed over. */
  owed: number;
  /** Maintenance cash the plan's action spends, and when (LeverOption.spend). A donor's share is on the tail that asked. */
  spend: number;
  spendDate: ISODate | null;
  decisionDeadline: ISODate | null;
  trace: string;
}

/** A proposal in the what-if: what was asked, and what it was priced as or why it was refused. */
export interface ProposalResult {
  proposal: Proposal;
  /** What was asked, as the customer would say it. */
  asked: string;
  /** The priced option, when applied. */
  label: string;
  refused: string | null;
}

export interface FleetRecommendation {
  /** One per returning tail, in the fleet table's order. */
  plans: TailPlan[];
  /** The customer's proposed actions, in the order given — [] for the model's own plan. */
  proposals: ProposalResult[];
  byTail: Record<string, TailPlan>;
  totals: {
    doNothing: number;
    /** Σ after: maintenance, downtime and what is still owed at handback, across the returning tails. */
    after: number;
    /** doNothing − after. */
    avoidable: number;
    /**
     * avoidable, split by whether the tail chose to act. Chosen: what the actions the tails choose
     * save against paying at handback — the saves in the list of recommended actions add up to it.
     * Forced: the difference on tails that must act, measured against a do-nothing that cannot
     * happen (a donor to a forced tail's swap counts with it).
     */
    avoidableChosen: number;
    avoidableForced: number;
    /** Cash payable at handback if nothing changes, and the life already bought and handed over. */
    doNothingCash: number;
    doNothingLife: number;
    avoidableCash: number;
    avoidableLife: number;
    /** avoidableCash ÷ doNothingCash: the saving as a share of the money actually in play. */
    avoidableCashShare: number;
    /** doNothingCash ÷ doNothing: the share of doing nothing that is cash out — the headline bar. */
    doNothingCashShare: number;
    /**
     * Tails acting by choice, forced to act, paying, with no recommendation (the options cannot be
     * told apart), with nothing to decide (no exposure), giving a unit to a swap.
     */
    acting: number;
    forced: number;
    paying: number;
    undecided: number;
    nothingToDecide: number;
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
  if (plan.recommendation.nothingToDecide) return 'nothing';
  const o = plan.recommendation.recommended;
  if (!plan.recommendation.call.stands && o.lever !== 'pay') return `undecided:${plan.recommendation.call.between!.join('|')}`;
  return o.move ? `swap:${o.move.position}:${o.move.incoming.from}` : o.actionKey.replace(/^(visit|cover):([^:]+):\d+:/, '$1:$2:');
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
    ? `${changed.length} of ${tails} ${changed.length === 1 ? 'tails changes its' : 'tails change their'} recommended action against the plan at rest:\n` +
      changed.map((c) => `${c.tail}: ${c.from} → ${c.to}`).join('\n') +
      `\n\nA different month for the same visit, or a different spare for the same swap, is not counted as a change.`
    : `No tail changes its recommended action against the plan at rest; the totals move, the decisions do not.`;
  return { tails, changed, trace };
}

/** The customer's own action on a tail, standing in for the model's ranking. */
function imposedRecommendation(ctx: LeverContext, o: LeverOption, timeout: ReturnType<typeof firstTimeout>): TailRecommendation {
  const late = timeout && ctx.focus !== undefined ? actingLate(ctx) : null;
  const doNothing = late ? late.total : ctx.baseline.asRecorded.exposure;
  const at = timeout && `${timeout.position} runs out of ${timeout.clock} at month ${num(timeout.months, 1)}, before handback`;
  return {
    tail: ctx.ac.tail,
    doNothing,
    options: [o],
    recommended: o,
    runnerUp: null,
    delta: 0,
    decisionDeadline: o.deadline,
    unavoidable: o.total,
    avoidable: doNothing - o.total,
    forced: timeout ? { ...timeout, why: `${at}: it has to come off, so doing nothing is not an option` } : null,
    call: { stands: true, advantage: 0, differing: 0, uncertainty: 0, between: null, why: "it is your change, not the model's choice" },
    nothingToDecide: false,
    late,
    doNothingCash: late ? late.spend + late.downtimeCost + late.newCompensation : ctx.baseline.asRecorded.compensation,
    trace: `${ctx.ac.tail}: your change — ${o.label}, ${usd(o.total)} all-in against ${usd(doNothing)} if nothing changes. Decided by you, not ranked by the model.\n\n${o.trace}`,
  };
}

export function recommendFleet(
  data: Pick<Dataset, 'aircraft' | 'lessors' | 'pool' | 'returnConditions'>,
  fleet: FleetExposure,
  a: Assumptions = DEFAULT_ASSUMPTIONS,
  proposals: Exclude<Proposal, { kind: 'return' }>[] = [],
): FleetRecommendation {
  const aircraft = new Map(data.aircraft.map((x) => [x.tail, x]));
  const lessors = new Map(data.lessors.map((l) => [l.id, l]));
  const conditions = new Map<string, ReturnCondition[]>();
  for (const rc of data.returnConditions) conditions.set(rc.tail, [...(conditions.get(rc.tail) ?? []), rc]);

  const tails = fleet.returning;
  const donors: Donor[] = tails.map((t) => {
    const ac = aircraft.get(t.tail)!;
    const lessor = lessors.get(ac.lessorId);
    if (!lessor) throw new Error(`${t.tail}: no lessor ${ac.lessorId}`);
    return { ac, lessor, conditions: conditions.get(t.tail) ?? [], baseline: t };
  });
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

  // The customer's own actions go first, in the order given: a spare or a tail his change takes is
  // gone for the tails that would have had it, and they plan around it below.
  const proposed = new Set<string>();
  const takenBy = new Map<string, string>();
  const units = new Map([...data.pool.map((u) => [u.id, { serial: u.serial, tail: null as string | null }] as const), ...data.aircraft.flatMap((x) => x.components.map((u) => [u.id, { serial: u.serial, tail: x.tail }] as const))]);
  const results: ProposalResult[] = proposals.map((pr) => {
    const unit = pr.kind === 'swap' && pr.unit ? units.get(pr.unit) : undefined;
    const asked = describeProposal(pr, unit?.serial);
    const refuse = (why: string): ProposalResult => ({ proposal: pr, asked, label: asked, refused: why });
    const t = tails.find((x) => x.tail === pr.tail);
    if (!t) return refuse(`${pr.tail} is not handing back inside the window.`);
    if (proposed.has(pr.tail)) return refuse(`${pr.tail} already has a change in this what-if: one per tail, because each is priced against the tail as it stands.`);
    const giving = gives.get(pr.tail);
    if (giving) return refuse(`${pr.tail} already gives its ${giving.option.move!.donor!.position} to ${giving.to} in this what-if.`);
    if (pr.kind === 'swap' && pr.unit && unit) {
      if (takenBy.has(pr.unit)) return refuse(`${unit.serial} already goes to ${takenBy.get(pr.unit)} in this what-if.`);
      if (unit.tail && (proposed.has(unit.tail) || gives.has(unit.tail))) return refuse(`${unit.serial} is on ${unit.tail}, which already has a change in this what-if.`);
    }
    const timeout = firstTimeout(t);
    const ctx = contextFor(t, usedPool, new Set([...acting, ...gives.keys()]));
    if (timeout) ctx.focus = ctx.ac.components.findIndex((c) => c.position === timeout.position);
    const o = proposedOption(ctx, pr);
    if (!o.feasible) return refuse(o.trace);
    settled.set(pr.tail, imposedRecommendation(ctx, o, timeout));
    proposed.add(pr.tail);
    acting.add(pr.tail);
    if (o.move?.incoming.from === 'pool') usedPool.add(o.move.incoming.id);
    if (o.move?.donor) gives.set(o.move.donor.tail, { to: pr.tail, option: o });
    if (o.move) takenBy.set(o.move.incoming.id, pr.tail);
    return { proposal: pr, asked, label: o.label, refused: null };
  });

  for (const t of order) {
    if (gives.has(t.tail) || proposed.has(t.tail)) continue;
    const rec = recommendTail(contextFor(t, usedPool, new Set([...acting, ...gives.keys()])));
    settled.set(t.tail, rec);
    const o = rec.recommended;
    if (o.lever === 'pay') continue;
    acting.add(t.tail);
    if (o.move?.incoming.from === 'pool') usedPool.add(o.move.incoming.id);
    if (o.covers) usedPool.add(o.covers.id);
    if (o.move?.donor) gives.set(o.move.donor.tail, { to: t.tail, option: o });
  }

  const plans = tails.map((t): TailPlan => {
    const rec = settled.get(t.tail) ?? independent.get(t.tail)!;
    // A donor is never forced (it gives a unit away); an own plan carries its recommendation's baseline.
    const doNothing = gives.has(t.tail) ? t.asRecorded.exposure : rec.doNothing;
    const doNothingCash = gives.has(t.tail) ? t.asRecorded.compensation : rec.doNothingCash;
    const gift = gives.get(t.tail);
    if (gift) {
      const d = gift.option.move!.donor!;
      const after = d.cost + d.downtimeCost + d.exposureAfter;
      const afterCash = d.cost + d.downtimeCost + d.compensationAfter;
      return {
        tail: t.tail,
        proposed: false,
        role: 'donor',
        recommendation: rec,
        label: `Gives ${d.position} to ${gift.to}`,
        doNothing,
        after,
        avoidable: doNothing - after,
        doNothingCash,
        afterCash,
        avoidableCash: doNothingCash - afterCash,
        avoidableLife: doNothing - after - (doNothingCash - afterCash),
        forced: null,
        owed: d.exposureAfter,
        spend: 0,
        spendDate: null,
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
    const label = rec.nothingToDecide
      ? 'Nothing to decide — no exposure at handback'
      : rec.call.stands
        ? o.label
        : o.lever === 'pay'
          ? 'No recommendation — pay at handback'
          : `Cannot tell apart: ${rec.call.between!.join(' / ')}`;
    const after = own ? own.cost + own.downtimeCost + own.newExposure : o.total;
    const afterCash = own ? own.cost + own.downtimeCost + own.newCompensation : o.cost + o.downtimeCost + o.newCompensation;
    return {
      tail: t.tail,
      proposed: proposed.has(t.tail),
      role: 'own',
      recommendation: rec,
      label,
      doNothing,
      after,
      avoidable: doNothing - after,
      doNothingCash,
      afterCash,
      avoidableCash: doNothingCash - afterCash,
      avoidableLife: doNothing - after - (doNothingCash - afterCash),
      forced: rec.forced?.why ?? null,
      owed: own ? own.newExposure : o.newExposure,
      spend: o.spend,
      spendDate: o.spendDate,
      decisionDeadline: rec.decisionDeadline,
      trace:
        rec.trace +
        (o.move?.donor
          ? `\n\nThis row carries ${t.tail}'s share (${usd(after)}); ${o.move.donor.tail} carries the rest of the swap on its own row.`
          : ''),
    };
  });

  const sum = (f: (p: TailPlan) => number) => plans.reduce((s, p) => s + f(p), 0);
  const forcedTails = new Set(plans.filter((p) => p.forced).map((p) => p.tail));
  for (const [donor, gift] of gives) if (forcedTails.has(gift.to)) forcedTails.add(donor);
  const avoidableForced = sum((p) => (forcedTails.has(p.tail) ? p.avoidable : 0));
  const doNothing = sum((p) => p.doNothing);
  const after = sum((p) => p.after);
  const doNothingCash = sum((p) => p.doNothingCash);
  const avoidableCash = sum((p) => p.avoidableCash);
  const avoidableLife = sum((p) => p.avoidableLife);
  const own = plans.filter((p) => p.role === 'own');
  const totals = {
    doNothing,
    after,
    avoidable: doNothing - after,
    avoidableChosen: doNothing - after - avoidableForced,
    avoidableForced,
    doNothingCash,
    doNothingLife: doNothing - doNothingCash,
    avoidableCash,
    avoidableLife,
    avoidableCashShare: doNothingCash > 0 ? avoidableCash / doNothingCash : 0,
    doNothingCashShare: doNothing > 0 ? doNothingCash / doNothing : 0,
    acting: own.filter((p) => p.recommendation.call.stands && !p.forced && p.recommendation.recommended.lever !== 'pay').length,
    forced: own.filter((p) => p.recommendation.call.stands && p.forced).length,
    paying: own.filter((p) => p.recommendation.call.stands && !p.recommendation.nothingToDecide && p.recommendation.recommended.lever === 'pay').length,
    undecided: own.filter((p) => !p.recommendation.call.stands).length,
    nothingToDecide: own.filter((p) => p.recommendation.nothingToDecide).length,
    donors: plans.filter((p) => p.role === 'donor').length,
  };
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const trace =
    `${plans.length} tails returning. If nothing changes ${usd(doNothing)}: ${usd(doNothingCash)} of cash payable at handback — the money in play — ` +
    `and ${usd(totals.doNothingLife)} of life already bought and handed over, which is sunk. After recommendations ${usd(after)} all-in — ` +
    `maintenance less reserves, downtime, and what is still owed at handback — so ${usd(totals.avoidable)} is avoidable: ` +
    `${usd(avoidableCash)} of it cash, ${pct(totals.avoidableCashShare)} of the money in play, and ${usd(avoidableLife)} life kept by sending units to the pool ` +
    `rather than handing them over. ${totals.acting} act by choice, ${totals.forced} are forced (a component runs out before handback), ` +
    `${totals.paying} pay at handback, ${totals.undecided} have no recommendation (the options cannot be told apart within ±${num(COST_ESTIMATE_UNCERTAINTY * 100, 1)}% ` +
    `cost estimates), ${totals.nothingToDecide} have nothing to decide (no exposure)${totals.donors ? `, ${totals.donors} give a unit to another tail's swap` : ''}. ` +
    `Each spare and each tail is used once; ` +
    `forced tails chose first.\n\n` +
    plans.map((p) => `${p.tail}: ${p.forced ? 'forced — ' : ''}${p.label} — ${usd(p.doNothing)} → ${usd(p.after)}`).join('\n');
  return { plans, proposals: results, byTail: Object.fromEntries(plans.map((p) => [p.tail, p])), totals, trace };
}
