// How firm is each recommendation: the sweep across every assumption's plausible range, the
// breakevens it finds, and the holds / close-call split. Checked on the generated fleet, and each
// breakeven is confirmed by re-recommending at it.

import { describe, expect, it, vi } from 'vitest';

import dataset from '../data/fleet.json';
import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS } from './constants';
import { assessFleet } from './exposure';
import { usd } from './format';
import { actionOf, recommendFleet } from './recommend';
import { computeExtensionEffects, computeRobustness, inputsLine, readInput, writeInput } from './robustness';
import type { Dataset } from './types';

// The sweep re-recommends the fleet hundreds of times: a slower machine needs longer than the default 5 seconds.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const data = dataset as unknown as Dataset;
const a = DEFAULT_ASSUMPTIONS;
const r = computeRobustness(data, a);
const plan = (x: typeof a) => recommendFleet(data, assessFleet(data, x), x);
const rest = plan(a);

describe('computeRobustness', () => {
  it('sweeps from an override, and only toward an edge of the evidence that lies that way', () => {
    // Widebody downtime overridden to the top of its evidence: the sweep starts there, and has no room upward.
    const top = ASSUMPTION_INPUTS.find((i) => i.id === 'downtimeWidebody')!.range.max;
    const o = computeRobustness(data, writeInput(a, 'downtimeWidebody', top));
    const x = o.inputs.find((i) => i.input.id === 'downtimeWidebody')!;
    expect(x.current).toBe(top);
    for (const b of Object.values(x.byTail)) expect(b.up).toBeNull();
    for (const b of Object.values(x.byTail)) if (b.down) expect(b.down.value).toBeLessThan(top);
  });

  it('sweeps every assumption and records every returning tail on it', () => {
    expect(r.inputs.map((x) => x.input.id)).toEqual(ASSUMPTION_INPUTS.map((i) => i.id));
    for (const x of r.inputs) expect(Object.keys(x.byTail).sort()).toEqual(rest.plans.map((p) => p.tail).sort());
  });

  it('puts every tail in exactly one state: firm, close, no recommendation, or nothing to decide', () => {
    const nothing = Object.values(r.byTail).filter((x) => x === 'nothing to decide').length;
    expect(r.firm.length + r.close.length + r.undecided.length + nothing).toBe(r.tails);
    for (const c of r.close) {
      expect(c.flip.reach).toBeGreaterThan(0);
      expect(c.flip.reach).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < r.close.length; i++) expect(r.close[i]!.flip.reach).toBeGreaterThanOrEqual(r.close[i - 1]!.flip.reach);
    // How firm is only asked of a recommendation that stands.
    for (const x of r.undecided) expect(rest.byTail[x.tail]!.recommendation.call.stands).toBe(false);
  });

  it('finds each breakeven where it is: one step short, the answer stands; at it, the answer changes', () => {
    for (const x of r.inputs)
      for (const [tail, b] of Object.entries(x.byTail))
        for (const [dir, f] of [['down', b.down], ['up', b.up]] as const) {
          if (!f) continue;
          const sign = dir === 'down' ? 1 : -1;
          const before = f.value + sign * x.input.range.step;
          const at = plan(writeInput(a, x.input.id, f.value)).byTail[tail]!;
          expect(actionOf(at), `${tail} on ${x.input.id} at ${f.value}`).not.toBe(actionOf(rest.byTail[tail]!));
          expect(at.label).toBe(f.to);
          if (Math.abs(before - x.current) > 1e-9) {
            const short = plan(writeInput(a, x.input.id, before)).byTail[tail]!;
            expect(actionOf(short), `${tail} on ${x.input.id} at ${before}`).toBe(actionOf(rest.byTail[tail]!));
          }
        }
  });

  it('sorts every input into those that change some answer inside their evidence and those that change none', () => {
    expect([...r.changing, ...r.holding].map((x) => x.id).sort()).toEqual(ASSUMPTION_INPUTS.map((x) => x.id).sort());
    for (const x of r.inputs) expect(r.changing.includes(x.input)).toBe(x.first !== null);
  });

  it('on this fleet: two firm, five close, three with nothing to decide', () => {
    // Close, nearest first: A6-MVC if 90% or less of its reserves could be reclaimed; A6-MXM at 2% more
    // flying; 9H-KVJ at 12% more; A6-YTM at 30% of its reserves; A6-DLL only if a widebody day cost nothing.
    expect(r.close.map((c) => [c.tail, c.input.id])).toEqual([
      ['A6-MVC', 'reservesReclaim'],
      ['A6-MXM', 'utilisation'],
      ['9H-KVJ', 'utilisation'],
      ['A6-YTM', 'reservesReclaim'],
      ['A6-DLL', 'downtimeWidebody'],
    ]);
    expect([...r.firm].sort()).toEqual(['9H-ZUU', 'A6-GPZ']);
    expect(r.undecided).toEqual([]);
    for (const t of ['9H-MMC', '9H-RYM', '9H-PJS']) expect(r.byTail[t]).toBe('nothing to decide');
    expect(r.byTail['A6-MXM']).toBe('close');
    // Flying, both costs of a day on the ground and the share of reserves reclaimable change an answer
    // inside their evidence; shop costs, the lessor's markup and the slot lead time change none.
    expect(r.changing.map((x) => x.id)).toEqual(['utilisation', 'downtimeNarrowbody', 'downtimeWidebody', 'reservesReclaim']);
    expect(inputsLine(r.changing, r.holding)).toBe(
      'Inside their evidence, utilisation, narrowbody day on the ground, widebody day on the ground, share of reserves reclaimable change at least ' +
        "one answer; shop costs, lessor's provider over our cost, shop-slot lead time change none.",
    );
    // Shop costs change nothing anywhere between −9% and +50%.
    expect(r.inputs.find((x) => x.input.id === 'maintenanceCost')!.first).toBeNull();
  });

  it('sweeps from the assumptions it is given, not from the defaults', () => {
    const moved = writeInput(a, 'utilisation', 1.05);
    const m = computeRobustness(data, moved);
    expect(m.inputs.find((x) => x.input.id === 'utilisation')!.current).toBe(1.05);
    expect(readInput(moved, 'utilisation')).toBe(1.05);
  });

  it('leaves trace formatting on once it is done, and says how "close" is defined', () => {
    expect(usd(1_234)).toBe('$1,234');
    expect(r.trace).toContain('No round-number threshold');
    expect(r.trace).toContain('told apart');
    expect(r.trace).toContain('lower bound on fragility');
  });
});

describe('check before acting', () => {
  it('lists the close calls an assumption flips within the first half of its evidenced range, with the way it has to move', () => {
    expect(r.checks.map((c) => [c.tail, c.input.id, c.direction])).toEqual([
      ['A6-MVC', 'reservesReclaim', 'down'],
      ['A6-MXM', 'utilisation', 'up'],
    ]);
    for (const c of r.checks) expect(c.flip.reach).toBeLessThan(0.5);
    for (const c of r.close.filter((x) => !r.checks.includes(x))) expect(c.flip.reach).toBeGreaterThanOrEqual(0.5);
  });

  it("flips A6-MXM at 2% more flying, to a shop visit or six real days on the ground — not a day-less one", () => {
    // ENG1 then runs out on 13 April, six days before its 19 April 2028 handback.
    const mxm = r.close.find((c) => c.tail === 'A6-MXM')!;
    expect(mxm.flip.change).toBe('+2%');
    expect(mxm.flip.to).toBe('Cannot tell apart: On the ground from 13 Apr 2028 to handback / Do the work: send ENG1 to the shop in September 2027, minimum shop visit (build-for-cash)');
  });
});

describe('computeExtensionEffects — does the one control change anything?', () => {
  const e = computeExtensionEffects(data, a);
  const ext = (tail: string, n: number) => plan({ ...a, leaseExtensionMonths: { [tail]: n } });

  it('finds the shortest extension of each lease that changes any recommendation, or none', () => {
    expect(e.any).toBe(true);
    expect(e.byTail['A6-MXM']!.months).toBe(1);
    for (const t of ['A6-MVC', 'A6-YTM', '9H-ZUU', 'A6-GPZ', '9H-PJS']) expect(e.byTail[t]!.months, t).toBeNull();
  });

  it('is right about it: a month on A6-MXM changes an answer, a year on A6-GPZ changes none', () => {
    const changed = ext('A6-MXM', 1).plans.filter((p) => actionOf(p) !== actionOf(rest.byTail[p.tail]!));
    expect(changed.map((p) => p.tail)).toEqual(e.byTail['A6-MXM']!.changes.map((c) => c.tail));
    const none = ext('A6-GPZ', 12).plans.filter((p) => actionOf(p) !== actionOf(rest.byTail[p.tail]!));
    expect(none).toEqual([]);
  });
});
