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
import { assessFleet } from './exposure';
import { usd } from './format';
import { compareRecommendations, recommendFleet, type FleetRecommendation, type ProposalResult } from './recommend';
import { writeInput } from './robustness';
import type { Assumptions, Dataset, Proposal } from './types';
import { whatIf } from './whatif';

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
}

export interface ScenarioResult {
  /** The scenario's world: the defaults with each change applied, held inside its evidenced range. */
  assumptions: Assumptions;
  today: PlanTotals;
  world: PlanTotals;
  scenario: PlanTotals;
  worldPlan: FleetRecommendation;
  scenarioPlan: FleetRecommendation;
  /** Each decision, in the order given: what it was priced as, or why it was refused. */
  decisions: ProposalResult[];
  /** Aircraft whose recommendation differs from today's plan, in the scenario. */
  changed: ScenarioChange[];
  trace: string;
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
  const worldPlan = s.world.length ? recommendFleet(data, assessFleet(data, assumptions), assumptions) : today;
  const w = s.decisions.length ? whatIf(data, assumptions, worldPlan, s.decisions) : null;
  const scenarioPlan = w ? w.scenario : worldPlan;
  const decided = new Set((w?.proposals ?? []).filter((r) => !r.refused).map((r) => r.proposal.tail));
  const byWorld = new Set(compareRecommendations(today, worldPlan).changed.map((c) => c.tail));
  const changed = compareRecommendations(today, scenarioPlan).changed.map(
    (c): ScenarioChange => ({ ...c, why: decided.has(c.tail) ? 'decision' : byWorld.has(c.tail) ? 'world' : 'knock-on' }),
  );
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
  return { assumptions, today: t, world: wt, scenario: st, worldPlan, scenarioPlan, decisions: w?.proposals ?? [], changed, trace };
}
