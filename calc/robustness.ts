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
// Three states, from the breakevens:
//   TOO CLOSE TO CALL  an input flips the answer inside the model's own noise (MODEL_NOISE: ±10%
//                      utilisation, ±10% shop costs) — the data cannot tell the options apart;
//   CLOSE              the nearest flip is outside the noise but inside the evidenced range;
//   FIRM               no input flips it anywhere inside its evidenced range.
// The noise is the same rule a materiality floor uses; the evidenced ranges are ASSUMPTIONS §14.
// No round-number threshold enters any of the three.
//
// The inputs move one at a time. Real assumptions move together — a busy summer raises flying and
// shop demand at once — so this is a lower bound on fragility: correlated moves would flip answers
// sooner than any single-input breakeven here suggests.

import { ASSUMPTION_INPUTS, MODEL_NOISE, type AssumptionInput, type AssumptionInputId } from './constants';
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
  /** The flip lies inside the model's own noise on this input (MODEL_NOISE). */
  withinNoise: boolean;
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
}

export type Firmness = 'too-close' | 'close' | 'firm';

export interface Robustness {
  inputs: InputRobustness[];
  /** The inputs whose first flip comes soonest, by reach — at most three. */
  binding: InputRobustness[];
  tails: number;
  /** Tails no input flips anywhere inside its evidenced range. */
  firm: string[];
  /** Tails whose nearest flip is outside the model's noise but inside the evidence, nearest first. */
  close: CloseCall[];
  /** Tails an input flips inside the model's own noise: the data cannot tell the options apart. */
  tooClose: CloseCall[];
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
        const room = Math.abs(edge - current);
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
            const noise = MODEL_NOISE[input.id];
            const withinNoise = noise !== undefined && current !== 0 && Math.abs(value / current - 1) <= noise + 1e-9;
            b[direction] = { value, change: '', reach: Math.abs(value - current) / room, to: p.label, withinNoise };
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

  const binding = inputs.filter((x) => x.first).sort((x, y) => x.first!.reach - y.first!.reach).slice(0, 3);
  const tooClose: CloseCall[] = [];
  const close: CloseCall[] = [];
  const firm: string[] = [];
  const byTailState: Record<string, Firmness> = {};
  for (const p of swept.rest.plans) {
    let nearest: CloseCall | null = null;
    let noisy: CloseCall | null = null;
    for (const x of inputs)
      for (const f of [x.byTail[p.tail]!.down, x.byTail[p.tail]!.up]) {
        if (!f) continue;
        const c = { tail: p.tail, label: p.label, input: x.input, flip: f };
        if (!nearest || f.reach < nearest.flip.reach) nearest = c;
        if (f.withinNoise && (!noisy || f.reach < noisy.flip.reach)) noisy = c;
      }
    if (noisy) tooClose.push(noisy);
    else if (nearest) close.push(nearest);
    else firm.push(p.tail);
    byTailState[p.tail] = noisy ? 'too-close' : nearest ? 'close' : 'firm';
  }
  tooClose.sort((x, y) => x.flip.reach - y.flip.reach);
  close.sort((x, y) => x.flip.reach - y.flip.reach);
  const tails = swept.rest.plans.length;
  const pct = (x: number) => `${num(x * 100)}%`;
  const noiseText = Object.entries(MODEL_NOISE)
    .map(([id, n]) => `±${num(n! * 100)}% on ${ASSUMPTION_INPUTS.find((i) => i.id === id)!.label.toLowerCase()}`)
    .join(' and ');
  const line = (c: CloseCall) => `${c.tail} (${c.label}): ${c.input.label.toLowerCase()} ${c.flip.change} → ${c.flip.to}, reach ${pct(c.flip.reach)}`;

  const trace =
    `Each assumption is stepped outward from its current value, one at a time, across the range the evidence supports, and the ` +
    `${tails} returning tails are re-recommended at every step (${swept.steps} steps). A tail's breakeven on an input is the first step at ` +
    `which its recommended action changes — a different lever, component or workscope, not a different month or a different spare.\n\n` +
    `Three states. Too close to call: an input flips the answer inside the model's own noise (${noiseText}), where the data cannot tell ` +
    `the options apart — the same rule a materiality floor uses. Close: the nearest flip is outside the noise but inside the evidenced ` +
    `range. Firm: no input flips it anywhere inside its evidenced range. Distance is read as reach — how far the input moved ÷ how far ` +
    `the evidence lets it move on that side. No round-number threshold is involved.\n\n` +
    `${firm.length} of ${tails} firm${firm.length ? `: ${firm.join(', ')}` : ''}.` +
    (tooClose.length ? `\nToo close to call:\n${tooClose.map(line).join('\n')}` : '') +
    (close.length ? `\nClose:\n${close.map(line).join('\n')}` : '') +
    `\n\nBinding soonest: ${
      binding.length
        ? binding.map((x) => `${x.input.label} at ${x.first!.change} (reach ${pct(x.first!.reach)}) — the real number comes from ${x.input.source}`).join('; ')
        : 'nothing inside the evidence'
    }.` +
    (inputs.some((x) => !x.first) ? ` Holding across their whole range: ${inputs.filter((x) => !x.first).map((x) => x.input.label.toLowerCase()).join(', ')}.` : '') +
    `\n\nThe inputs move one at a time. Real assumptions move together, so this is a lower bound on fragility: correlated moves would ` +
    `flip answers sooner than any single breakeven here.`;

  return { inputs, binding, tails, firm, close, tooClose, byTail: byTailState, steps: swept.steps, trace };
}
