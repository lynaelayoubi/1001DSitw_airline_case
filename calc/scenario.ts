// One scenario: changes in the world — shop costs, flying, a day on the ground, reserves, slot lead
// time, the lessor's markup — and the head of fleet's own decisions, together. Pure: the data, today's
// plan and the scenario in; three plans and what changes between them out.
//
//   today's plan     the recommendation at the default assumptions: what the Overview shows
//   world            the recommendation re-run with the scenario's assumptions — today's plan re-made
//                    for that world, so an aircraft's recommendation may change in it
//   scenario         the scenario's decisions applied to that plan (whatIf)
//
// Both are measured against today's plan. A scenario never changes today's plan.
//
// The tool's advice and the head of fleet's decisions are kept apart, because mixing them misleads: a
// decision worse than today's advice must never read as a recommendation. The advice is what the
// changed figures alone do to the plan. Each decision is judged on its own against today's advice for
// its aircraft, at today's figures: better, worse, already the plan, or refused by the lease. And each
// change is priced on its own, so the page can say what each one contributes.

import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, type AssumptionInputId } from './constants';
import { closingDecisions, type Closing } from './deadlines';
import { assessFleet, type FleetExposure } from './exposure';
import { usd } from './format';
import { describeProposal, type LeverId } from './levers';
import { compareRecommendations, recommendFleet, type ActionChange, type FleetRecommendation, type ProposalResult } from './recommend';
import { writeInput } from './robustness';
import type { Assumptions, Dataset, ISODate, Proposal } from './types';
import { whatIf, type TailChoices } from './whatif';

export interface WorldChange {
  input: AssumptionInputId;
  value: number;
}

export interface Scenario {
  world: WorldChange[];
  decisions: Proposal[];
}

export const EMPTY_SCENARIO: Scenario = { world: [], decisions: [] };

export interface PlanTotals {
  /** Work, downtime and what is still owed at handback, after the plan. */
  allIn: number;
  /** If nothing changes. */
  doNothing: number;
  /** Still owed at handback after the plan. */
  owed: number;
  /** Maintenance cash the plan spends. */
  spend: number;
}

export interface ScenarioChange {
  tail: string;
  from: string;
  to: string;
  /** Why it changes: the world, the head of fleet's decision on that tail, or a knock-on of another change. */
  why: 'world' | 'decision' | 'knock-on';
  /** The new action's date to decide by, or the day the aircraft goes down; null when it has none. */
  decideBy: ISODate | null;
  /** The shop slot's month when the date to decide by is the slot's booking date. */
  slotMonth: string | null;
  /** The new action has no deadline: a route change, losing money each month it waits. */
  noDeadline: boolean;
  /** This aircraft's all-in after the plan, in the scenario less today. */
  difference: number;
}

/** What one change in the world does on its own, against today's plan: the fleet's all-in, less today's. */
export interface WorldEffect {
  change: WorldChange;
  difference: number;
}

/** One of the head of fleet's decisions, judged on its own against today's advice for its aircraft. */
export interface DecisionVerdict {
  proposal: Proposal;
  /** What it was priced as, or what was asked when refused. */
  label: string;
  refused: string | null;
  /** Saves money against today's plan; costs more; costs the same; or cannot be taken. */
  verdict: 'better' | 'worse' | 'same' | 'refused';
  /** Today's recommended action on the aircraft. */
  today: { label: string; lever: LeverId };
  /** The fleet's all-in with this decision alone, less today's: its own aircraft and any knock-on. 0 when refused. */
  difference: number;
  /** Other aircraft whose all-in moves with it: a spare or an engine it takes from them. */
  knockOn: { tail: string; difference: number }[];
  /** The decision's own closing date, as on the Overview; null when it has none or is refused. */
  closing: Closing | null;
  /** The plan and fleet with this decision alone, for drafting its assignment; null when refused. */
  plan: FleetRecommendation | null;
  fleet: FleetExposure | null;
}

export interface ScenarioResult {
  /** The scenario's world: the defaults with each change applied, held inside its evidenced range. */
  assumptions: Assumptions;
  today: PlanTotals;
  world: PlanTotals;
  scenario: PlanTotals;
  worldPlan: FleetRecommendation;
  scenarioPlan: FleetRecommendation;
  /** The fleet the scenario's plan was priced on: the scenario's assumptions, and any moved return date. */
  scenarioFleet: FleetExposure;
  /** The scenario's all-in less today's. */
  costChange: number;
  /** Each decision, in the order given: what it was priced as, or why it was refused. */
  decisions: ProposalResult[];
  /** Aircraft whose recommendation differs from today's plan, in the scenario. */
  changed: ScenarioChange[];
  /** The fleet the changed figures alone were priced on. */
  worldFleet: FleetExposure;
  /** The tool's advice: recommendations the changed figures alone change. A decision never puts an aircraft here. */
  advice: ScenarioChange[];
  /** Each change in the world on its own, in the order given. */
  worldEffects: WorldEffect[];
  /** Each decision on its own, in the order given. */
  verdicts: DecisionVerdict[];
  trace: string;
}

/**
 * Why a cleared aircraft takes no decision. Not yet priced fairly: an aircraft with nothing to decide
 * never weighs its options, so its do-nothing never counts the life of an engine a swap would keep in
 * the pool — the swap would be charged the spare's life and not credited the engine it keeps. Letting
 * cleared aircraft weigh their options is the fix, left for the real build: it changes default figures.
 */
export const CLEARED_REFUSAL =
  'Cleared: nothing to decide. A decision here cannot be priced fairly yet, because an aircraft with nothing to decide never weighs its options, so the engine a swap would keep in the pool would not be credited.';

/** The aircraft today's plan has nothing to decide on: no decision is offered or priced on them. */
export const clearedTails = (today: FleetRecommendation): Set<string> =>
  new Set(today.plans.filter((p) => p.role === 'own' && p.recommendation.nothingToDecide).map((p) => p.tail));

/** What the decision picker offers: every returning aircraft but the cleared ones, which it names. */
export function decisionChoices(choices: TailChoices[], today: FleetRecommendation): { open: TailChoices[]; cleared: string[] } {
  const cleared = clearedTails(today);
  return { open: choices.filter((c) => !cleared.has(c.tail)), cleared: choices.filter((c) => cleared.has(c.tail)).map((c) => c.tail) };
}

const totals = (r: FleetRecommendation): PlanTotals => ({
  allIn: r.totals.after,
  doNothing: r.totals.doNothing,
  owed: r.plans.reduce((s, p) => s + p.owed, 0),
  spend: r.plans.reduce((s, p) => s + p.spend, 0),
});

/** A world change held inside the range its evidence supports. */
export function inEvidence(c: WorldChange): number {
  const r = ASSUMPTION_INPUTS.find((i) => i.id === c.input)!.range;
  return Math.min(r.max, Math.max(r.min, c.value));
}

/** What changes between two plans, each with the new action's date and its money against the first. */
function changesBetween(today: FleetRecommendation, plan: FleetRecommendation, asOf: ISODate, why: (c: ActionChange) => ScenarioChange['why']): ScenarioChange[] {
  const closing = closingDecisions(plan, asOf).items;
  return compareRecommendations(today, plan).changed.map((c): ScenarioChange => {
    const item = closing.find((x) => x.tail === c.tail);
    return {
      ...c,
      why: why(c),
      decideBy: item ? (item.decideBy ?? item.grounded?.from ?? null) : null,
      slotMonth: item?.slotMonth ?? null,
      noDeadline: !!item?.startNow,
      difference: plan.byTail[c.tail]!.after - today.byTail[c.tail]!.after,
    };
  });
}

/**
 * Whether a decision is offered as an action to assign: only when it is better than today's plan, is
 * an action rather than a return date (agreed with the lessor, not assigned), and has its closing date.
 * A decision worse than today's advice is never offered: it is not recommended.
 */
export const assignable = (v: DecisionVerdict): boolean => v.verdict === 'better' && v.proposal.kind !== 'return' && v.closing !== null && v.plan !== null && v.fleet !== null;

/** A decision on its own, at today's figures, against today's plan. */
function judge(data: Dataset, today: FleetRecommendation, d: Proposal, asked: ProposalResult): DecisionVerdict {
  const was = today.byTail[d.tail];
  const todayAction = { label: was?.label ?? '', lever: (was?.recommendation.recommended.lever ?? 'pay') as LeverId };
  const refusedAs = (why: string): DecisionVerdict => ({
    proposal: d,
    label: asked.asked,
    refused: why,
    verdict: 'refused',
    today: todayAction,
    difference: 0,
    knockOn: [],
    closing: null,
    plan: null,
    fleet: null,
  });
  if (asked.refused) return refusedAs(asked.refused);
  const w = whatIf(data, DEFAULT_ASSUMPTIONS, today, [d]);
  const r = w.proposals[0]!;
  if (r.refused) return refusedAs(r.refused);
  const difference = w.scenario.totals.after - today.totals.after;
  const knockOn = w.scenario.plans
    .filter((p) => p.tail !== d.tail && today.byTail[p.tail] && Math.abs(p.after - today.byTail[p.tail]!.after) > 0.5)
    .map((p) => ({ tail: p.tail, difference: p.after - today.byTail[p.tail]!.after }));
  return {
    proposal: d,
    label: r.label,
    refused: null,
    // Within half a dollar is the same money: a decision that is today's plan prices to the cent as today's plan.
    verdict: Math.abs(difference) <= 0.5 ? 'same' : difference < 0 ? 'better' : 'worse',
    today: todayAction,
    difference,
    knockOn,
    closing: closingDecisions(w.scenario, data.asOf).items.find((x) => x.tail === d.tail) ?? null,
    plan: w.scenario,
    fleet: w.fleet,
  };
}

export function runScenario(data: Dataset, today: FleetRecommendation, s: Scenario): ScenarioResult {
  const assumptions = s.world.reduce((a, c) => writeInput(a, c.input, inEvidence(c)), DEFAULT_ASSUMPTIONS);
  // With no world change, the world is today's; with no decision, the scenario is the world.
  const worldFleet = assessFleet(data, assumptions);
  const worldPlan = s.world.length ? recommendFleet(data, worldFleet, assumptions) : today;
  // A decision on a cleared aircraft is refused with the reason, never priced (CLEARED_REFUSAL).
  const cleared = clearedTails(today);
  const priced = s.decisions.filter((d) => !cleared.has(d.tail));
  const w = priced.length ? whatIf(data, assumptions, worldPlan, priced) : null;
  const scenarioPlan = w ? w.scenario : worldPlan;
  const serial = (id: string | null) =>
    id ? (data.pool.find((u) => u.id === id) ?? data.aircraft.flatMap((a) => a.components).find((u) => u.id === id))?.serial : undefined;
  let next = 0;
  const decisions: ProposalResult[] = s.decisions.map((d) => {
    if (!cleared.has(d.tail)) return w!.proposals[next++]!;
    const asked = describeProposal(d, data.asOf, d.kind === 'swap' ? serial(d.unit) : undefined);
    return { proposal: d, asked, label: asked, refused: CLEARED_REFUSAL };
  });
  const decided = new Set(decisions.filter((r) => !r.refused).map((r) => r.proposal.tail));
  const advice = s.world.length ? changesBetween(today, worldPlan, data.asOf, () => 'world') : [];
  const byWorld = new Set(advice.map((c) => c.tail));
  const changed = changesBetween(today, scenarioPlan, data.asOf, (c) => (decided.has(c.tail) ? 'decision' : byWorld.has(c.tail) ? 'world' : 'knock-on'));
  // Each change on its own. One change in the world alone is the world plan already.
  const alone = (c: WorldChange) => {
    const a = writeInput(DEFAULT_ASSUMPTIONS, c.input, inEvidence(c));
    return recommendFleet(data, assessFleet(data, a), a);
  };
  const worldEffects = s.world.map((c): WorldEffect => ({ change: c, difference: (s.world.length === 1 ? worldPlan : alone(c)).totals.after - today.totals.after }));
  // A refusal in the scenario stands on its own too (a cleared aircraft, one change per tail); a decision priced there is judged alone.
  const verdicts = s.decisions.map((d, k) => judge(data, today, d, decisions[k]!.refused && cleared.has(d.tail) ? decisions[k]! : { ...decisions[k]!, refused: null }));
  const t = totals(today);
  const wt = totals(worldPlan);
  const st = totals(scenarioPlan);
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${usd(Math.abs(n))}`;
  const trace =
    `Today's plan, at the default assumptions: all-in ${usd(t.allIn)}. ` +
    (s.world.length
      ? `The world changes — ${s.world.map((c) => `${ASSUMPTION_INPUTS.find((i) => i.id === c.input)!.label} ${inEvidence(c)}`).join(', ')} — and the recommendation, re-run for that world, comes to ${usd(wt.allIn)} (${signed(wt.allIn - t.allIn)}). `
      : 'No change to the world. ') +
    (w ? `With the decisions on top: ${usd(st.allIn)} (${signed(st.allIn - t.allIn)}).\n\n${w.trace}` : 'No decisions.');
  const scenarioFleet = w ? w.fleet : worldFleet;
  return {
    assumptions,
    today: t,
    world: wt,
    scenario: st,
    worldPlan,
    scenarioPlan,
    scenarioFleet,
    costChange: st.allIn - t.allIn,
    decisions,
    changed,
    worldFleet,
    advice,
    worldEffects,
    verdicts,
    trace,
  };
}
