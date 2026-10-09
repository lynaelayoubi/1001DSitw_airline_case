// Scenario planning, in the customer's words. The market changes are fields that always show and start
// at no change; the aircraft decisions are questions added to a list. Each says the range it may take
// in its own terms (per cent, dollars) and reads back as a plain sentence; what a change does on its
// own, and a decision's verdict against today's plan, are sentences too.
// Pure, so the wording and the ranges are tested (questions.test.ts).

import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, LEASE_EXTENSION_CONTROL, type AssumptionInputId } from '../calc/constants';
import { monthYear } from '../calc/format';
import { visitName, type LeverId } from '../calc/levers';
import { readInput } from '../calc/robustness';
import type { DecisionVerdict, WorldChange, WorldEffect } from '../calc/scenario';
import type { Proposal } from '../calc/types';
import type { TailChoices } from '../calc/whatif';
import { money } from './format';

const range = (id: AssumptionInputId) => ASSUMPTION_INPUTS.find((i) => i.id === id)!.range;
const whole = (x: number) => Math.round(x);
/** Rounded to the hundredth, so a value read back is the one typed: 0.95 is −5%, not −5.000000000000004%. */
const tidy = (x: number) => Math.round(x * 100) / 100;

export type MarketField = 'shop' | 'fly' | 'reserves' | 'narrowbody' | 'widebody';

export interface MarketInput {
  input: AssumptionInputId;
  label: string;
  /** '%' or '$K': what the field is typed in. */
  unit: '%' | '$K';
  toValue: (n: number) => number;
  fromValue: (v: number) => number;
  /** What the field shows for no change: today's figure, in the field's own terms. */
  none: number;
  min: number;
  max: number;
}

const percentAround = (input: AssumptionInputId, label: string): MarketInput => ({
  input,
  label,
  unit: '%',
  toValue: (n) => 1 + n / 100,
  fromValue: (v) => tidy((v - 1) * 100),
  none: 0,
  min: whole((range(input).min - 1) * 100),
  max: whole((range(input).max - 1) * 100),
});
const dollarsADay = (input: AssumptionInputId, label: string): MarketInput => ({
  input,
  label,
  unit: '$K',
  toValue: (n) => n * 1000,
  fromValue: (v) => tidy(v / 1000),
  none: tidy(readInput(DEFAULT_ASSUMPTIONS, input) / 1000),
  min: tidy(range(input).min / 1000),
  max: tidy(range(input).max / 1000),
});

/** The market changes, in the order they show: each always visible, each starting at no change. */
export const MARKET: Record<MarketField, MarketInput> = {
  shop: percentAround('maintenanceCost', 'Shop costs'),
  fly: percentAround('utilisation', 'Flying hours'),
  reserves: {
    input: 'reservesReclaim',
    label: 'Reserves we can claim back',
    unit: '%',
    toValue: (n) => n / 100,
    fromValue: (v) => tidy(v * 100),
    none: tidy(readInput(DEFAULT_ASSUMPTIONS, 'reservesReclaim') * 100),
    min: whole(range('reservesReclaim').min * 100),
    max: whole(range('reservesReclaim').max * 100),
  },
  narrowbody: dollarsADay('downtimeNarrowbody', 'narrowbody'),
  widebody: dollarsADay('downtimeWidebody', 'widebody'),
};
export const MARKET_FIELDS = Object.keys(MARKET) as MarketField[];

/** A field's text as a number; empty is no change. */
export const marketNumber = (f: MarketField, raw: string): number => (raw.trim() === '' ? MARKET[f].none : Number(raw));

/** Why a market field's value cannot be taken, in one plain sentence with the range; null when it can. */
export function marketProblem(f: MarketField, raw: string): string | null {
  const q = MARKET[f];
  const n = marketNumber(f, raw);
  if (Number.isFinite(n) && n >= q.min && n <= q.max) return null;
  switch (f) {
    case 'shop':
      return `Shop costs: between ${-q.min}% lower and ${q.max}% higher, the range the evidence supports.`;
    case 'fly':
      return `Flying hours: between ${-q.min}% less and ${q.max}% more than planned, the range the evidence supports.`;
    case 'reserves':
      return `Reserves we can claim back: between ${q.min}% and ${q.max}%.`;
    default:
      return `A day on the ground for a ${f}: between ${money(q.min * 1000, { compact: false })} and ${money(q.max * 1000)}, the range the evidence supports.`;
  }
}

/** The market changes the fields hold: one per field that is not at no change, in the fields' order. */
export function marketChanges(values: Partial<Record<MarketField, number>>): WorldChange[] {
  return MARKET_FIELDS.flatMap((f) => {
    const n = values[f];
    return n === undefined || Math.abs(n - MARKET[f].none) < 1e-9 ? [] : [{ input: MARKET[f].input, value: MARKET[f].toValue(n) }];
  });
}

/** A field's value from the scenario: what it holds, or no change. */
export function marketValue(f: MarketField, world: WorldChange[]): number {
  const w = world.find((x) => x.input === MARKET[f].input);
  return w ? MARKET[f].fromValue(w.value) : MARKET[f].none;
}

const pct = (x: number) => `${whole(Math.abs(x) * 100)}%`;
const amount = (n: number) => money(Math.abs(n));

/** What one market change does on its own: "The 9% cut in shop costs saves $1.97M." */
export function worldEffectSentence(e: WorldEffect): string {
  const v = e.change.value;
  const subject = (() => {
    switch (e.change.input) {
      case 'maintenanceCost':
        return v >= 1 ? `The ${pct(v - 1)} rise in shop costs` : `The ${pct(1 - v)} cut in shop costs`;
      case 'utilisation':
        return v >= 1 ? `Flying ${pct(v - 1)} more` : `Flying ${pct(1 - v)} less`;
      case 'reservesReclaim':
        return `Claiming back only ${pct(v)} of our reserves`;
      case 'downtimeNarrowbody':
        return `A ${money(v)} day on the ground for a narrowbody`;
      case 'downtimeWidebody':
        return `A ${money(v)} day on the ground for a widebody`;
      default:
        return ASSUMPTION_INPUTS.find((x) => x.id === e.change.input)!.label;
    }
  })();
  const d = e.difference;
  return `${subject} ${Math.abs(d) < 0.5 ? 'makes no difference' : d > 0 ? `adds ${amount(d)}` : `saves ${amount(d)}`}.`;
}

/** The aircraft decisions, the only questions in the picker: market changes are fields of their own. */
export type DecisionKind = Proposal['kind'];
export const DECISIONS: { kind: DecisionKind; label: string }[] = [
  { kind: 'visit', label: "We send an aircraft's component to the shop" },
  { kind: 'swap', label: "We swap an aircraft's component" },
  { kind: 'return', label: "We move an aircraft's return date" },
  { kind: 'route', label: "We change an aircraft's route profile" },
];

/** The months a return date can move by. */
export const RETURN_MONTHS = Array.from({ length: (LEASE_EXTENSION_CONTROL.max - LEASE_EXTENSION_CONTROL.min) / LEASE_EXTENSION_CONTROL.step }, (_, k) => LEASE_EXTENSION_CONTROL.min + (k + 1) * LEASE_EXTENSION_CONTROL.step);

/** A decision as the question it answers: "We send A6-MXM's ENG1 to the shop in February 2027, minimum shop visit (build-for-cash)". */
export function decisionSentence(p: Proposal, choices: TailChoices[]): string {
  const c = choices.find((x) => x.tail === p.tail);
  switch (p.kind) {
    case 'swap': {
      const unit = p.unit ? c?.components.find((x) => x.position === p.position)?.units.find((u) => u.id === p.unit)?.serial : null;
      return `We swap ${p.tail}'s ${p.position} for ${unit ?? 'the right-sized unit'}`;
    }
    case 'visit': {
      const when = c?.months.find((m) => m.month === p.month)?.date;
      const kind = c?.components.find((x) => x.position === p.position)?.kind ?? 'engine';
      return `We send ${p.tail}'s ${p.position} to the shop${when ? ` in ${monthYear(when)}` : ''}, ${visitName(kind, p.workscope)}`;
    }
    case 'return':
      return `We move ${p.tail}'s return date by ${p.months} ${p.months === 1 ? 'month' : 'months'}`;
    case 'route':
      return `We change ${p.tail}'s route profile${p.profile ? ` to ${p.profile}` : ''}`;
  }
}

/** A decision as a noun: "shop visit", "MLG swap". */
function decisionNoun(p: Proposal): string {
  switch (p.kind) {
    case 'visit':
      return 'shop visit';
    case 'swap':
      return `${p.position} swap`;
    case 'return':
      return 'return-date move';
    case 'route':
      return 'route change';
  }
}

/** Today's advice for the aircraft, as what a decision is measured against: "paying at handback", "today's shop visit". */
export function todayNoun(t: { lever: LeverId }): string {
  switch (t.lever) {
    case 'pay':
      return 'paying at handback';
    case 'L1':
    case 'L4':
      return "today's shop visit";
    case 'L2':
      return "today's route change";
    case 'L3':
      return "today's swap";
    default:
      return "today's plan";
  }
}

const knockOnWords = (v: DecisionVerdict) =>
  v.knockOn.map((k) => ` Includes ${amount(k.difference)} ${k.difference > 0 ? 'more' : 'less'} on ${k.tail}.`).join('');

/** A decision's verdict against today's advice for its aircraft. Refused decisions say why, with the clause, elsewhere. */
export function verdictSentence(v: DecisionVerdict): string {
  switch (v.verdict) {
    case 'better':
      return `Better than today's plan: saves ${amount(v.difference)}.${knockOnWords(v)}`;
    case 'worse':
      return `Costs ${amount(v.difference)} more than ${v.proposal.kind === 'return' ? "today's plan" : todayNoun(v.today)}: not recommended.${knockOnWords(v)}`;
    case 'same':
      return v.label === v.today.label ? "Already today's plan." : "Costs the same as today's plan.";
    case 'refused':
      return `Not possible: ${v.refused}`;
  }
}

/** What one decision does on its own, for the lines under the headline: "Your A6-MXM shop visit costs $1.17M more than paying at handback." */
export function decisionEffectSentence(v: DecisionVerdict): string | null {
  const what = `Your ${v.proposal.tail} ${decisionNoun(v.proposal)}`;
  // A return date does not replace today's action: it is measured against today's plan as a whole.
  const against = v.proposal.kind === 'return' ? "today's plan" : todayNoun(v.today);
  switch (v.verdict) {
    case 'better':
      return `${what} saves ${amount(v.difference)} against ${against}.`;
    case 'worse':
      return `${what} costs ${amount(v.difference)} more than ${against}.`;
    case 'same':
      return v.label === v.today.label ? `${what} is already today's plan.` : `${what} costs the same as ${against}.`;
    case 'refused':
      return null;
  }
}
