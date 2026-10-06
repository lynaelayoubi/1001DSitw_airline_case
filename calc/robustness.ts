// How firm is each recommendation? The same sweep as lever 4, run on the inputs instead of on
// months: every assumption in ASSUMPTION_INPUTS is stepped outward from its current value, one at
// a time, across the range the evidence supports, and the fleet is re-recommended at each step.
// The first step at which a tail's recommended action changes is its breakeven on that input.
//
// Distance is measured as REACH: how far the input moved ÷ how far the evidence lets it move on
// that side. Reach 0.3 means the answer changes a third of the way to the edge of what is
// plausible; reach above 1 cannot happen inside the sweep, so an input that never flips a tail
// is said to hold. Reach puts a 4% change in utilisation and a 40% change in the cost of a day on
// the ground on one scale: each is read against its own evidence.
//
// This is a different question from whether there is a recommendation at all (tellApart in
// calc/recommend.ts: an advantage larger than the cost estimates' uncertainty). Given that the
// options can be told apart, how far would an input have to move to change the answer?
//   CLOSE  an input flips it inside its evidenced range;
//   FIRM   no input flips it anywhere inside its evidenced range.
// Tails with no recommendation, and tails with nothing to decide, are left out of both. No
// round-number threshold enters either.
//
// The inputs move one at a time. Real assumptions move together — a busy summer raises flying and
// shop demand at once — so this is a lower bound on fragility: correlated moves would flip answers
// sooner than any single-input breakeven here suggests.

import { ASSUMPTION_INPUTS, CHECK_BEFORE_ACTING_REACH, LEASE_EXTENSION_CONTROL, type AssumptionInput, type AssumptionInputId } from './constants';
import { assessTail, totalsOf, type FleetExposure } from './exposure';
import { num, withoutTraces } from './format';
import { actionOf, recommendFleet, type FleetRecommendation } from './recommend';
import type { Assumptions, Dataset, ReturnCondition } from './types';

/** Read and write one input on an Assumptions object. */
export function readInput(a: Assumptions, id: AssumptionInputId): number {
  switch (id) {
    case 'maintenanceCost':
      return a.maintenanceCostMultiplier;
    case 'utilisation':
      return a.utilisationMultiplier;
    case 'downtimeNarrowbody':
      return a.downtimeCostPerDay.narrowbody;
    case 'downtimeWidebody':
      return a.downtimeCostPerDay.widebody;
    case 'lessorMarkup':
      return a.lessorRectificationMarkup;
    case 'reservesReclaim':
      return a.reservesReclaimPct;
    case 'shopSlotLead':
      return a.shopSlotLeadTimeMonths;
  }
}

export function writeInput(a: Assumptions, id: AssumptionInputId, v: number): Assumptions {
  switch (id) {
    case 'maintenanceCost':
      return { ...a, maintenanceCostMultiplier: v };
    case 'utilisation':
      return { ...a, utilisationMultiplier: v };
    case 'downtimeNarrowbody':
      return { ...a, downtimeCostPerDay: { ...a.downtimeCostPerDay, narrowbody: v } };
    case 'downtimeWidebody':
      return { ...a, downtimeCostPerDay: { ...a.downtimeCostPerDay, widebody: v } };
    case 'lessorMarkup':
      return { ...a, lessorRectificationMarkup: v };
    case 'reservesReclaim':
      return { ...a, reservesReclaimPct: v };
    case 'shopSlotLead':
      return { ...a, shopSlotLeadTimeMonths: v };
  }
}

/** The input as a person would say it: "+12%", "$65,000 a day", "75%", "5 months". */
export function describeInput(input: AssumptionInput, value: number, rest: number): string {
  const rel = rest !== 0 ? value / rest - 1 : 0;
  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${num(Math.abs(x) * 100)}%`;
  switch (input.unit) {
    case 'multiplier':
      return input.id === 'lessorMarkup' ? `× ${num(value, 2)}` : pct(rel);
    case 'usd-per-day':
      return `$${num(value)} a day${rest !== 0 ? ` (${pct(rel)})` : ''}`;
    case 'share':
      return `${num(value * 100)}%`;
    case 'months':
      return `${num(value)} months`;
  }
}

export interface Flip {
  /** The input value at which the tail's action first differs, at the sweep's resolution. */
  value: number;
  /** As a person would say it, against the current value. */
  change: string;
  /** |value − current| ÷ |edge of the plausible range − current| on that side. */
  reach: number;
  /** What the tail would be told to do instead. */
  to: string;
}

export interface TailBreakevens {
  down: Flip | null;
  up: Flip | null;
}

export interface InputRobustness {
  input: AssumptionInput;
  current: number;
  /** The nearest flip of any tail on this input, or null if every tail holds across the range. */
  first: (Flip & { direction: 'down' | 'up'; tails: { tail: string; from: string; to: string }[] }) | null;
  byTail: Record<string, TailBreakevens>;
}

export interface CloseCall {
  tail: string;
  label: string;
  input: AssumptionInput;
  flip: Flip;
  /** Which way the assumption has to move to flip the answer. */
  direction: 'down' | 'up';
}

export type Firmness = 'close' | 'firm' | 'no recommendation' | 'nothing to decide';

export interface Robustness {
  inputs: InputRobustness[];
  /** Inputs that change some tail's answer somewhere inside their evidenced range, and inputs that change none. */
  changing: AssumptionInput[];
  holding: AssumptionInput[];
  tails: number;
  /** Tails no input flips anywhere inside its evidenced range. */
  firm: string[];
  /** Tails an input flips inside its evidenced range, nearest first. */
  close: CloseCall[];
  /** Tails with no recommendation: the options cannot be told apart (tellApart), so how firm is not asked. */
  undecided: { tail: string; why: string }[];
  /** What to check before acting: the close calls an assumption flips within the first half of its evidenced range. */
  checks: CloseCall[];
  byTail: Record<string, Firmness>;
  /** Fleet re-recommendations the sweep ran. */
  steps: number;
  trace: string;
}

type Data = Pick<Dataset, 'asOf' | 'aircraft' | 'lessors' | 'pool' | 'returnConditions'>;

/** The returning tails only, assessed: all a recommendation needs, at a fraction of the fleet's cost. */
function assessReturning(data: Data, a: Assumptions): FleetExposure {
  const conditions = new Map<string, ReturnCondition[]>();
  for (const rc of data.returnConditions) conditions.set(rc.tail, [...(conditions.get(rc.tail) ?? []), rc]);
  const tails = data.aircraft
    .filter((ac) => ac.status === 'returning')
    .map((ac) => assessTail(ac, conditions.get(ac.tail) ?? [], data.asOf, a))
    .sort((x, y) => y.asRecorded.exposure - x.asRecorded.exposure);
  return { asOf: data.asOf, assumptions: a, tails, returning: tails, totals: totalsOf(tails), trace: '' };
}

export function computeRobustness(data: Data, a: Assumptions): Robustness {
  // The sweep reads decisions, not prose, so it runs with trace formatting off.
  const swept = withoutTraces(() => {
    const plan = (x: Assumptions) => recommendFleet(data, assessReturning(data, x), x);
    const rest = plan(a);
    const restAction = new Map(rest.plans.map((p) => [p.tail, actionOf(p)]));
    let steps = 0;
    const inputs = ASSUMPTION_INPUTS.map((input) => {
      const current = readInput(a, input.id);
      const byTail: Record<string, TailBreakevens> = Object.fromEntries(rest.plans.map((p) => [p.tail, { down: null, up: null }]));
      for (const direction of ['down', 'up'] as const) {
        const edge = direction === 'down' ? input.range.min : input.range.max;
        // Only toward an edge that lies that way: a value already at or past it has no evidenced room on that side.
        const room = direction === 'down' ? current - edge : edge - current;
        if (room <= 1e-12) continue;
        const sign = direction === 'down' ? -1 : 1;
        for (let k = 1; ; k++) {
          const v = current + sign * k * input.range.step;
          const value = direction === 'down' ? Math.max(v, edge) : Math.min(v, edge);
          const r = plan(writeInput(a, input.id, value));
          steps++;
          for (const p of r.plans) {
            const b = byTail[p.tail];
            if (!b || b[direction] || actionOf(p) === restAction.get(p.tail)) continue;
            b[direction] = { value, change: '', reach: Math.abs(value - current) / room, to: p.label };
          }
          if (value === edge || Object.values(byTail).every((b) => b[direction])) break;
        }
      }
      return { input, current, byTail };
    });
    return { rest, inputs, steps };
  });

  // Formatting is back on: write the changes as a person would say them, then the summary.
  const restLabel = new Map(swept.rest.plans.map((p) => [p.tail, p.label]));
  const inputs = swept.inputs.map(({ input, current, byTail }): InputRobustness => {
    for (const b of Object.values(byTail)) for (const f of [b.down, b.up]) if (f) f.change = describeInput(input, f.value, current);
    let first: InputRobustness['first'] = null;
    for (const direction of ['down', 'up'] as const)
      for (const [tail, b] of Object.entries(byTail)) {
        const f = b[direction];
        if (!f) continue;
        if (!first || f.reach < first.reach - 1e-12) first = { ...f, direction, tails: [] };
        if (first.direction === direction && Math.abs(f.reach - first.reach) <= 1e-12) first.tails.push({ tail, from: restLabel.get(tail)!, to: f.to });
      }
    return { input, current, first, byTail };
  });

  const changing = inputs.filter((x) => x.first).map((x) => x.input);
  const holding = inputs.filter((x) => !x.first).map((x) => x.input);
  const close: CloseCall[] = [];
  const firm: string[] = [];
  const undecided: { tail: string; why: string }[] = [];
  const byTailState: Record<string, Firmness> = {};
  for (const p of swept.rest.plans) {
    // No exposure, no answer: how firm it is is not asked, and the tail is counted nowhere.
    if (p.role === 'own' && p.recommendation.nothingToDecide) {
      byTailState[p.tail] = 'nothing to decide';
      continue;
    }
    if (p.role === 'own' && !p.recommendation.call.stands) {
      undecided.push({ tail: p.tail, why: p.recommendation.call.why });
      byTailState[p.tail] = 'no recommendation';
      continue;
    }
    let nearest: CloseCall | null = null;
    for (const x of inputs)
      for (const direction of ['down', 'up'] as const) {
        const f = x.byTail[p.tail]![direction];
        if (f && (!nearest || f.reach < nearest.flip.reach)) nearest = { tail: p.tail, label: p.label, input: x.input, flip: f, direction };
      }
    if (nearest) close.push(nearest);
    else firm.push(p.tail);
    byTailState[p.tail] = nearest ? 'close' : 'firm';
  }
  close.sort((x, y) => x.flip.reach - y.flip.reach);
  const tails = swept.rest.plans.length;
  const pct = (x: number) => `${num(x * 100)}%`;
  const line = (c: CloseCall) => `${c.tail} (${c.label}): ${c.input.label.toLowerCase()} ${c.flip.change} → ${c.flip.to}, reach ${pct(c.flip.reach)}`;

  const trace =
    `Each assumption is stepped outward from its current value, one at a time, across the range the evidence supports, and the ` +
    `${tails} returning tails are re-recommended at every step (${swept.steps} steps). A tail's breakeven on an input is the first step at ` +
    `which its recommended action changes — a different lever, component or workscope, not a different month or a different spare.\n\n` +
    `Given that the options can be told apart, how far would an input have to move to change the answer? Close: an input flips it ` +
    `inside its evidenced range. Firm: none does. Distance is read as reach — how far the input moved ÷ how far the evidence lets it ` +
    `move on that side. Tails with no recommendation — options the cost estimates cannot tell apart — are not asked. No round-number ` +
    `threshold is involved.\n\n` +
    `${firm.length} firm${firm.length ? `: ${firm.join(', ')}` : ''}.` +
    (close.length ? `\nClose:\n${close.map(line).join('\n')}` : '') +
    (undecided.length ? `\nNo recommendation:\n${undecided.map((x) => `${x.tail}: ${x.why}`).join('\n')}` : '') +
    `\n\n${inputsLine(changing, holding)}` +
    `\n\nThe inputs move one at a time. Real assumptions move together, so this is a lower bound on fragility: correlated moves would ` +
    `flip answers sooner than any single breakeven here.`;

  const checks = close.filter((c) => c.flip.reach < CHECK_BEFORE_ACTING_REACH);
  return { inputs, changing, holding, tails, firm, close, undecided, checks, byTail: byTailState, steps: swept.steps, trace };
}

/** Which inputs change any answer anywhere inside their evidence, and which change none — one line, from the sweep. */
export function inputsLine(changing: AssumptionInput[], holding: AssumptionInput[]): string {
  const list = (xs: AssumptionInput[]) => xs.map((x) => x.label.toLowerCase()).join(', ');
  if (!changing.length) return `No input changes any answer anywhere inside its evidence.`;
  return `Inside their evidence, ${list(changing)} ${changing.length === 1 ? 'changes' : 'change'} at least one answer` + (holding.length ? `; ${list(holding)} ${holding.length === 1 ? 'changes' : 'change'} none.` : '.');
}

/** What extending one returning tail's lease does, at the shortest length that does anything. */
export interface ExtensionEffect {
  /** The shortest extension, in whole months, that changes any tail's recommended action — or null if none up to the control's limit does. */
  months: number | null;
  changes: { tail: string; from: string; to: string }[];
}

export interface ExtensionEffects {
  byTail: Record<string, ExtensionEffect>;
  /** Some extension of some lease changes some recommendation. */
  any: boolean;
  maxMonths: number;
  steps: number;
}

/**
 * For each returning tail, extend its lease by 1, 2, … months up to the control's limit and find the
 * first length at which any tail's recommended action changes against no extension. Lets the screen
 * say plainly when the one control it keeps would change nothing.
 */
export function computeExtensionEffects(data: Data, a: Assumptions): ExtensionEffects {
  return withoutTraces(() => {
    const plan = (x: Assumptions) => recommendFleet(data, assessReturning(data, x), x);
    const base = { ...a, leaseExtensionMonths: {} };
    const rest = plan(base);
    const restAction = new Map(rest.plans.map((p) => [p.tail, actionOf(p)]));
    const restLabel = new Map(rest.plans.map((p) => [p.tail, p.label]));
    const maxMonths = LEASE_EXTENSION_CONTROL.max;
    let steps = 0;
    const byTail: Record<string, ExtensionEffect> = {};
    for (const t of rest.plans.map((p) => p.tail)) {
      byTail[t] = { months: null, changes: [] };
      for (let n = LEASE_EXTENSION_CONTROL.step; n <= maxMonths; n += LEASE_EXTENSION_CONTROL.step) {
        const r = plan({ ...base, leaseExtensionMonths: { [t]: n } });
        steps++;
        const changes = r.plans.filter((p) => actionOf(p) !== restAction.get(p.tail)).map((p) => ({ tail: p.tail, from: restLabel.get(p.tail)!, to: p.label }));
        if (changes.length) {
          byTail[t] = { months: n, changes };
          break;
        }
      }
    }
    return { byTail, any: Object.values(byTail).some((e) => e.months !== null), maxMonths, steps };
  });
}
