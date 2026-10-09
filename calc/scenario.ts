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

import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, type AssumptionInputId } from './constants';
import { closingDecisions } from './deadlines';
import { assessFleet, type FleetExposure } from './exposure';
import { usd } from './format';
import { describeProposal } from './levers';
import { compareRecommendations, recommendFleet, type FleetRecommendation, type ProposalResult } from './recommend';
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
  /** The new action has no deadline: a route change, losing money each month it waits. */
  noDeadline: boolean;
  /** This aircraft's all-in after the plan, in the scenario less today. */
  difference: number;
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
    const asked = describeProposal(d, d.kind === 'swap' ? serial(d.unit) : undefined);
    return { proposal: d, asked, label: asked, refused: CLEARED_REFUSAL };
  });
  const decided = new Set(decisions.filter((r) => !r.refused).map((r) => r.proposal.tail));
  const byWorld = new Set(compareRecommendations(today, worldPlan).changed.map((c) => c.tail));
  const closing = closingDecisions(scenarioPlan, data.asOf).items;
  const changed = compareRecommendations(today, scenarioPlan).changed.map((c): ScenarioChange => {
    const item = closing.find((x) => x.tail === c.tail);
    return {
      ...c,
      why: decided.has(c.tail) ? 'decision' : byWorld.has(c.tail) ? 'world' : 'knock-on',
      decideBy: item ? (item.decideBy ?? item.grounded?.from ?? null) : null,
      noDeadline: !!item?.startNow,
      difference: scenarioPlan.byTail[c.tail]!.after - today.byTail[c.tail]!.after,
    };
  });
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
  return { assumptions, today: t, world: wt, scenario: st, worldPlan, scenarioPlan, scenarioFleet, costChange: st.allIn - t.allIn, decisions, changed, trace };
}
