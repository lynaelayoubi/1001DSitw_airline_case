// The What if questions, in the customer's words: what each sets in the calculation, the range it may
// take in its own terms (per cent, dollars, months), and the plain sentence it reads as once added.
// Pure, so the wording and the ranges are tested (questions.test.ts).

import { ASSUMPTION_INPUTS, LEASE_EXTENSION_CONTROL, WHAT_IF_STARTING_VALUES, type AssumptionInputId } from '../calc/constants';
import type { WorldChange } from '../calc/scenario';
import type { Proposal } from '../calc/types';
import type { TailChoices } from '../calc/whatif';
import { money } from './format';

export type Kind = 'shopUp' | 'shopDown' | 'fly' | 'reserves' | 'downtime' | 'visit' | 'swap' | 'return' | 'route';

export const QUESTIONS: { kind: Kind; label: string }[] = [
  { kind: 'shopUp', label: 'Shop costs go up by …' },
  { kind: 'shopDown', label: 'We renegotiate the maintenance contract: shop costs down by …' },
  { kind: 'fly', label: 'Our aircraft fly more or less than planned' },
  { kind: 'reserves', label: 'We can only claim back part of our reserves' },
  { kind: 'downtime', label: 'A day on the ground costs …' },
  { kind: 'visit', label: "We send an aircraft's component to the shop" },
  { kind: 'swap', label: "We swap an aircraft's component" },
  { kind: 'return', label: "We move an aircraft's return date" },
  { kind: 'route', label: "We change an aircraft's route profile" },
];

const range = (id: AssumptionInputId) => ASSUMPTION_INPUTS.find((i) => i.id === id)!.range;
const whole = (x: number) => Math.round(x);
const pct = (x: number) => `${whole(x * 100)}%`;

/** A percentage question: the assumption it sets, how a percentage becomes its value, and its range in per cent. */
export const PERCENT: Record<'shopUp' | 'shopDown' | 'fly' | 'reserves', { input: AssumptionInputId; toValue: (n: number) => number; min: number; max: number; start: number }> = {
  shopUp: { input: 'maintenanceCost', toValue: (n) => 1 + n / 100, min: 0, max: whole((range('maintenanceCost').max - 1) * 100), start: WHAT_IF_STARTING_VALUES.shopCostsUpPct },
  shopDown: { input: 'maintenanceCost', toValue: (n) => 1 - n / 100, min: 0, max: whole((1 - range('maintenanceCost').min) * 100), start: WHAT_IF_STARTING_VALUES.shopCostsDownPct },
  fly: { input: 'utilisation', toValue: (n) => 1 + n / 100, min: whole((range('utilisation').min - 1) * 100), max: whole((range('utilisation').max - 1) * 100), start: WHAT_IF_STARTING_VALUES.flyingPct },
  reserves: { input: 'reservesReclaim', toValue: (n) => n / 100, min: whole(range('reservesReclaim').min * 100), max: whole(range('reservesReclaim').max * 100), start: WHAT_IF_STARTING_VALUES.reservesClaimedPct },
};

export const DOWNTIME_INPUT = { narrowbody: 'downtimeNarrowbody', widebody: 'downtimeWidebody' } as const;

/** The months a return date can move by. */
export const RETURN_MONTHS = Array.from({ length: (LEASE_EXTENSION_CONTROL.max - LEASE_EXTENSION_CONTROL.min) / LEASE_EXTENSION_CONTROL.step }, (_, k) => LEASE_EXTENSION_CONTROL.min + (k + 1) * LEASE_EXTENSION_CONTROL.step);

/** Why a value cannot be added, in one plain sentence with the range; null when it can. */
export function outsideRange(kind: Kind, raw: string, body: 'narrowbody' | 'widebody' = 'narrowbody'): string | null {
  const n = Number(raw);
  const bad = !raw.trim() || !Number.isFinite(n);
  if (kind in PERCENT) {
    const q = PERCENT[kind as keyof typeof PERCENT];
    if (!bad && n >= q.min && n <= q.max) return null;
    if (kind === 'fly') return `Between ${-q.min}% less and ${q.max}% more than planned: the range the evidence supports.`;
    if (kind === 'shopDown') return `Between ${q.min}% and ${q.max}%: that is as far down as the evidence goes.`;
    return `Between ${q.min}% and ${q.max}%: the range the evidence supports.`;
  }
  if (kind === 'downtime') {
    const r = range(DOWNTIME_INPUT[body]);
    return !bad && n >= r.min && n <= r.max ? null : `Between ${money(r.min, { compact: false })} and ${money(r.max)} a day for a ${body}: the range the evidence supports.`;
  }
  return null;
}

const WORKSCOPE: Record<string, string> = {
  'build-for-cash': 'minimum shop visit (build-for-cash)',
  'build-for-interval': 'full shop visit (build-for-interval)',
};
export const workscopeWords = (w: string) => WORKSCOPE[w] ?? w;

const monthYear = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A world change as the question it answers. */
export function worldSentence(c: WorldChange): string {
  const v = c.value;
  switch (c.input) {
    case 'maintenanceCost':
      return v >= 1 ? `Shop costs go up by ${pct(v - 1)}` : `We renegotiate the maintenance contract: shop costs down by ${pct(1 - v)}`;
    case 'utilisation':
      return v >= 1 ? `Our aircraft fly ${pct(v - 1)} more than planned` : `Our aircraft fly ${pct(1 - v)} less than planned`;
    case 'reservesReclaim':
      return `We can only claim back ${pct(v)} of our reserves`;
    case 'downtimeNarrowbody':
      return `A day on the ground costs ${money(v)} for a narrowbody`;
    case 'downtimeWidebody':
      return `A day on the ground costs ${money(v)} for a widebody`;
    default: {
      const i = ASSUMPTION_INPUTS.find((x) => x.id === c.input)!;
      return `${i.label}: ${v}`;
    }
  }
}

/** A decision as the question it answers. */
export function decisionSentence(p: Proposal, choices: TailChoices[]): string {
  const c = choices.find((x) => x.tail === p.tail);
  switch (p.kind) {
    case 'swap': {
      const unit = p.unit ? c?.components.find((x) => x.position === p.position)?.units.find((u) => u.id === p.unit)?.serial : null;
      return `We swap ${p.tail}'s ${p.position} for ${unit ?? 'the right-sized unit'}`;
    }
    case 'visit': {
      const when = c?.months.find((m) => m.month === p.month)?.date;
      const engine = c?.components.find((x) => x.position === p.position)?.kind === 'engine';
      return `We send ${p.tail}'s ${p.position} to the shop${when ? ` in ${monthYear(when)}` : ''}${engine ? `: ${workscopeWords(p.workscope)}` : ''}`;
    }
    case 'return':
      return `We move ${p.tail}'s return date by ${p.months} ${p.months === 1 ? 'month' : 'months'}`;
    case 'route':
      return `We change ${p.tail}'s route profile${p.profile ? ` to ${p.profile}` : ''}`;
  }
}
