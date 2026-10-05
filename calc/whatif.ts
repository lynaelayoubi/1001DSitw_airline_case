// The what-if: the head of fleet proposes actions — swap a component, send one to the shop,
// change a tail's route, move its return date — and sees what they change against today's plan.
// Pure: the data, the assumptions in force, today's plan and the proposals in; the plan with
// them, and the difference, out.
//
// These are the customer's decisions, not the world's. The seven assumptions belong to the world
// and the robustness sweep moves them, one at a time; here several of his changes hold at once —
// the correlated moves the sweep says it cannot make.
//
// Each change is priced by the levers' own machinery (proposedOption) and imposed before the
// model plans the rest of the fleet: a spare he takes is gone for the tail that would have had
// it, and that tail re-plans around it. A return date moves first, because it changes the world
// every other change is priced in. One action per tail, plus its return date: each lever is priced
// against the tail as it stands, so a second action on the same tail is refused rather than priced
// on a state the model does not carry.
//
// A proposal the model knows cannot happen is refused with the reason and left out — never priced
// as if it could.

import { LEASE_EXTENSION_CONTROL, PROFILES_BY_TYPE } from './constants';
import { assessFleet, type FleetExposure } from './exposure';
import { usd } from './format';
import { describeProposal } from './levers';
import { addMonths } from './projection';
import { compareRecommendations, recommendFleet, type ActionChange, type FleetRecommendation, type ProposalResult } from './recommend';
import type { Assumptions, ComponentKind, Dataset, ISODate, Proposal, RouteProfile } from './types';

export interface Delta {
  before: number;
  after: number;
  change: number;
}

export interface WhatIf {
  /** Every proposal, in the order given: what it was priced as, or why it was refused. */
  proposals: ProposalResult[];
  applied: number;
  /** The plan with the applied proposals; the screen stays on today's. */
  scenario: FleetRecommendation;
  /** Still owed at handback: compensation, and life already bought and handed over. */
  owed: Delta;
  /** Maintenance cash. */
  spend: Delta;
  /** Work, downtime and what is still owed: the net of the two above, with downtime. */
  allIn: Delta;
  /** Tails whose action differs from today's plan, from what to what. */
  changed: ActionChange[];
  trace: string;
}

const delta = (before: number, after: number): Delta => ({ before, after, change: after - before });

export function whatIf(data: Dataset, a: Assumptions, today: FleetRecommendation, proposals: Proposal[]): WhatIf {
  const returning = new Set(today.plans.map((p) => p.tail));
  const c = LEASE_EXTENSION_CONTROL;
  const moved: Record<string, number> = {};
  const returns = new Map<number, ProposalResult>();
  proposals.forEach((pr, k) => {
    if (pr.kind !== 'return') return;
    const asked = describeProposal(pr);
    const refused = !returning.has(pr.tail)
      ? `${pr.tail} is not handing back inside the window.`
      : moved[pr.tail] !== undefined
        ? `${pr.tail}'s return date already moves in this what-if.`
        : pr.months < c.min + c.step || pr.months > c.max
          ? `A return date moves by ${c.min + c.step} to ${c.max} months here: the model does not project past that.`
          : null;
    if (!refused) moved[pr.tail] = pr.months;
    returns.set(k, { proposal: pr, asked, label: asked, refused });
  });

  const scenarioAssumptions = Object.keys(moved).length ? { ...a, leaseExtensionMonths: { ...a.leaseExtensionMonths, ...moved } } : a;
  const actions = proposals.filter((p): p is Exclude<Proposal, { kind: 'return' }> => p.kind !== 'return');
  const scenario = recommendFleet(data, assessFleet(data, scenarioAssumptions), scenarioAssumptions, actions);
  let j = 0;
  const results = proposals.map((pr, k) => (pr.kind === 'return' ? returns.get(k)! : scenario.proposals[j++]!));
  const applied = results.filter((x) => !x.refused).length;

  const sum = (r: FleetRecommendation, f: (p: FleetRecommendation['plans'][number]) => number) => r.plans.reduce((s, p) => s + f(p), 0);
  const owed = delta(sum(today, (p) => p.owed), sum(scenario, (p) => p.owed));
  const spend = delta(sum(today, (p) => p.spend), sum(scenario, (p) => p.spend));
  const allIn = delta(today.totals.after, scenario.totals.after);
  const comparison = compareRecommendations(today, scenario);
  const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${usd(Math.abs(n))}`;

  const trace =
    `Your changes, in the order given; each is priced by the levers' own machinery and imposed before the model plans the rest of ` +
    `the fleet, so a spare or a tail it takes is gone for the others, which re-plan around it. Return dates move first.\n\n` +
    results.map((x) => `${x.proposal.tail}: ${x.asked} — ${x.refused ? `refused: ${x.refused}` : `applied as ${x.label}`}`).join('\n') +
    `\n\nAgainst today's plan: still owed at handback ${usd(owed.before)} → ${usd(owed.after)} (${signed(owed.change)}); maintenance spend ` +
    `${usd(spend.before)} → ${usd(spend.after)} (${signed(spend.change)}); all-in, with downtime, ${usd(allIn.before)} → ${usd(allIn.after)} ` +
    `(${signed(allIn.change)}).\n\n${comparison.trace}`;

  return { proposals: results, applied, scenario, owed, spend, allIn, changed: comparison.changed, trace };
}

/** What the customer can propose on one returning tail: the choices the what-if offers. */
export interface TailChoices {
  tail: string;
  type: string;
  profile: RouteProfile;
  /** The engines, landing gear and APU, each with the units that fit it: the pool and other returning tails. */
  components: { position: string; kind: ComponentKind; units: { id: string; serial: string; where: string }[] }[];
  /** The other profiles the type flies in this network; empty when it flies only one. */
  profiles: RouteProfile[];
  /** Every month to handback, slots inside the lead time included: those are refused with the reason, not hidden. */
  months: { month: number; date: ISODate }[];
  /** The first month outside the shop-slot lead time: where a proposed visit starts. */
  firstSlot: number;
}

export function whatIfChoices(data: Dataset, fleet: FleetExposure): TailChoices[] {
  const aircraft = new Map(data.aircraft.map((x) => [x.tail, x]));
  const returning = fleet.returning.map((t) => aircraft.get(t.tail)!);
  return fleet.returning
    .map((t): TailChoices => {
      const ac = aircraft.get(t.tail)!;
      const components = ac.components
        .filter((c) => c.kind !== 'airframe')
        .map((c) => {
          const model = c.kind === 'engine' ? ac.engineModel : ac.type;
          const fits = (u: { kind: ComponentKind; model: string }) => u.kind === c.kind && u.model === model;
          const units = [
            ...data.pool.filter(fits).map((u) => ({ id: u.id, serial: u.serial, where: 'pool' })),
            ...returning.filter((x) => x.tail !== ac.tail).flatMap((x) => x.components.filter(fits).map((u) => ({ id: u.id, serial: u.serial, where: `on ${x.tail} ${u.position}` }))),
          ];
          return { position: c.position, kind: c.kind, units };
        });
      const months = Array.from({ length: Math.floor(t.projection.monthsToReturn) }, (_, k) => ({ month: k + 1, date: addMonths(fleet.asOf, k + 1) }));
      return {
        tail: ac.tail,
        type: ac.type,
        profile: ac.routeProfile,
        components,
        profiles: PROFILES_BY_TYPE[ac.type].filter((x) => x !== ac.routeProfile),
        months,
        firstSlot: Math.ceil(fleet.assumptions.shopSlotLeadTimeMonths),
      };
    })
    .sort((x, y) => x.tail.localeCompare(y.tail));
}
