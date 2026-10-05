// The what-if: the head of fleet's own actions, several at once, against today's plan. Checked on
// the generated fleet: the knock-on through the spare pool, every refusal the model knows, and
// that clearing returns to today's plan.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { DEFAULT_ASSUMPTIONS } from './constants';
import { assessFleet } from './exposure';
import { actionOf, recommendFleet } from './recommend';
import type { Dataset, Proposal } from './types';
import { whatIf, whatIfChoices } from './whatif';

const data = dataset as unknown as Dataset;
const a = DEFAULT_ASSUMPTIONS;
const today = recommendFleet(data, assessFleet(data, a), a);
const spare = (serial: string) => data.pool.find((u) => u.serial === serial)!.id;
const run = (...ps: Proposal[]) => whatIf(data, a, today, ps);

describe('whatIf', () => {
  it('with nothing proposed, is today’s plan: no difference and no tail changes', () => {
    const w = run();
    expect(w.applied).toBe(0);
    expect(w.owed.change).toBe(0);
    expect(w.spend.change).toBe(0);
    expect(w.allIn.change).toBe(0);
    expect(w.changed).toEqual([]);
  });

  it('takes a spare first, and the tails that would have had it re-plan around it', () => {
    // ESN-6513 is today's spare for 9H-ZUU, whose ENG2 runs out next month. Given to A6-YTM, 9H-ZUU
    // takes ESN-6508 instead — the same action, a different spare — and 9H-KVJ, which had ESN-6508,
    // is left to send its ENG2 to the shop.
    const w = run({ kind: 'swap', tail: 'A6-YTM', position: 'ENG1', unit: spare('ESN-6513') });
    expect(w.proposals[0]!.refused).toBeNull();
    expect(w.scenario.byTail['A6-YTM']!.proposed).toBe(true);
    expect(w.scenario.byTail['9H-ZUU']!.recommendation.recommended.move?.incoming.serial).toBe('ESN-6508');
    expect(w.changed.map((c) => [c.tail, c.to])).toEqual([
      ['9H-KVJ', 'Do the work: ENG2 build-for-cash visit'],
      ['A6-YTM', 'Swap ENG1 for spare ESN-6513'],
    ]);
    // An engine visit in place of a swap: maintenance spend goes up by millions.
    expect(w.spend.change).toBeGreaterThan(5_000_000);
    expect(w.allIn.change).toBeCloseTo(w.scenario.totals.after - today.totals.after, 6);
  });

  it('changes nothing when the proposal is what the model already recommends', () => {
    const w = run({ kind: 'swap', tail: '9H-MMC', position: 'ENG1', unit: spare('ESN-6512') });
    expect(w.applied).toBe(1);
    expect(w.changed).toEqual([]);
    expect(w.allIn.change).toBeCloseTo(0, 6);
  });

  it('refuses what the model knows cannot happen, with the reason, and prices none of it', () => {
    const w = run(
      { kind: 'swap', tail: 'A6-MXM', position: 'ENG1', unit: null },
      { kind: 'visit', tail: '9H-MMC', position: 'ENG1', month: 2, workscope: 'build-for-cash' },
      { kind: 'visit', tail: '9H-ZUU', position: 'ENG2', month: 5, workscope: 'build-for-cash' },
      { kind: 'route', tail: 'A6-MVC', profile: null },
      { kind: 'swap', tail: '9H-ZUU', position: 'ENG1', unit: null },
    );
    const why = w.proposals.map((x) => x.refused);
    expect(why[0]).toContain('No GE90-115B engine is free'); // no spare of that type
    expect(why[1]).toContain('inside the 4-month shop-slot lead time'); // a slot inside the lead time
    expect(why[2]).toContain('ENG2 runs out of cycles at month 1.1, before this slot'); // a component already run out
    expect(why[3]).toContain('flies only the long-haul profile'); // no other route
    expect(why[4]).toContain('this does not deal with it'); // a tail that cannot reach handback as it stands
    expect(w.applied).toBe(0);
    expect(w.allIn.change).toBe(0);
    expect(w.changed).toEqual([]);
  });

  it('refuses a turnaround that would put the engine back after handback', () => {
    const last = whatIfChoices(data, assessFleet(data, a)).find((c) => c.tail === '9H-PJS')!.months.at(-1)!.month;
    const w = run({ kind: 'visit', tail: '9H-PJS', position: 'ENG1', month: last, workscope: 'build-for-cash' });
    expect(w.proposals[0]!.refused).toContain('after handback');
  });

  it('does not promise one spare twice, or give one tail two actions', () => {
    const w = run(
      { kind: 'swap', tail: 'A6-YTM', position: 'ENG1', unit: spare('ESN-6513') },
      { kind: 'swap', tail: '9H-MMC', position: 'ENG1', unit: spare('ESN-6513') },
      { kind: 'route', tail: 'A6-YTM', profile: 'mixed' },
    );
    expect(w.proposals[1]!.refused).toBe('ESN-6513 already goes to A6-YTM in this what-if.');
    expect(w.proposals[2]!.refused).toContain('already has a change in this what-if');
    expect(w.applied).toBe(1);
  });

  it('holds several changes at once, and a return date moves the world the rest is priced in', () => {
    const w = run(
      { kind: 'return', tail: 'A6-MXM', months: 6 },
      { kind: 'visit', tail: 'A6-MVC', position: 'ENG2', month: 14, workscope: 'build-for-cash' },
      { kind: 'route', tail: '9H-RYM', profile: 'short-dense' },
    );
    expect(w.applied).toBe(3);
    expect(w.proposals[1]!.label).toBe('Send ENG2 to the shop: build-for-cash visit, month 14');
    // A6-MXM's own recommendation, re-planned on the later return, is what the plan at that return date says.
    const later = { ...a, leaseExtensionMonths: { 'A6-MXM': 6 } };
    const alone = recommendFleet(data, assessFleet(data, later), later);
    expect(actionOf(w.scenario.byTail['A6-MXM']!)).toBe(actionOf(alone.byTail['A6-MXM']!));
    expect(w.changed.map((c) => c.tail).sort()).toEqual(['9H-RYM', 'A6-MVC', 'A6-MXM']);
  });

  it('refuses a return date moved twice, or past what the model projects', () => {
    const w = run({ kind: 'return', tail: 'A6-MXM', months: 6 }, { kind: 'return', tail: 'A6-MXM', months: 3 }, { kind: 'return', tail: 'A6-DLL', months: 13 });
    expect(w.proposals[1]!.refused).toContain('already moves');
    expect(w.proposals[2]!.refused).toContain('1 to 12 months');
  });
});

describe('whatIfChoices', () => {
  const choices = whatIfChoices(data, assessFleet(data, a));

  it('offers every returning tail its engines, gear and APU — not the airframe — with the units that fit', () => {
    expect(choices.map((c) => c.tail)).toEqual([...today.plans.map((p) => p.tail)].sort());
    for (const c of choices) expect(c.components.map((x) => x.kind)).not.toContain('airframe');
    const ytm = choices.find((c) => c.tail === 'A6-YTM')!.components.find((x) => x.position === 'ENG1')!;
    expect(ytm.units.filter((u) => u.where === 'pool').map((u) => u.serial)).toEqual(['ESN-6508', 'ESN-6512', 'ESN-6513']);
  });

  it('offers slots inside the lead time too, so they can be refused with the reason rather than hidden', () => {
    const mmc = choices.find((c) => c.tail === '9H-MMC')!;
    expect(mmc.months[0]!.month).toBe(1);
    expect(mmc.firstSlot).toBe(4);
  });
});
