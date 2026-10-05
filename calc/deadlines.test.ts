import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { closingDecisions } from './deadlines';
import { assessFleet } from './exposure';
import { recommendFleet } from './recommend';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const plans = recommendFleet(data, assessFleet(data));
const c = closingDecisions(plans, data.asOf);

describe('closingDecisions — the decisions that are running out of time', () => {
  it('lists every recommended action with a date, soonest first, and nothing without one', () => {
    const dated = plans.plans.filter((p) => p.role === 'own' && p.decisionDeadline !== null);
    expect(c.items.map((x) => x.tail).sort()).toEqual(dated.map((p) => p.tail).sort());
    for (let i = 1; i < c.items.length; i++) expect(c.items[i]!.decideBy >= c.items[i - 1]!.decideBy).toBe(true);
  });

  it('gives a chosen action its saving, and says what it falls back to once the date has passed', () => {
    for (const x of c.items.filter((x) => !x.forced)) {
      const rec = plans.byTail[x.tail]!.recommendation;
      expect(x.saving).toBe(rec.recommended.saving);
      expect(x.after).not.toBeNull();
      // Falling back can only cost more: the recommendation was the cheapest option.
      expect(x.after!.givesUp).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives a forced removal no saving: its benchmark is a do-nothing that cannot happen', () => {
    for (const x of c.items.filter((x) => x.forced)) expect(x.saving).toBeNull();
  });

  it('on this fleet: two forced removals close first, and missing either leaves an engine to run out', () => {
    expect(c.items.map((x) => [x.tail, x.decideBy, x.forced])).toEqual([
      ['9H-ZUU', '2026-11-07', true],
      ['A6-DLL', '2026-12-03', true],
      ['9H-KVJ', '2027-06-08', true],
      ['9H-MMC', '2027-08-15', false],
      ['A6-GPZ', '2028-01-03', false],
    ]);
    // 9H-ZUU's swap must happen before ENG2 runs out — the date is the run-out itself.
    const zuu = c.items[0]!;
    expect(zuu.runsOut?.position).toBe('ENG2');
    expect(zuu.runsOut?.date).toBe(zuu.decideBy);
    // A6-DLL's date is the shop-slot booking; the engine runs out later, with nothing booked.
    const dll = c.items[1]!;
    expect(dll.runsOut?.position).toBe('ENG1');
    expect(dll.runsOut!.date > dll.decideBy).toBe(true);
    // The two chosen swaps fall back to paying at handback, giving up exactly what they save.
    for (const x of c.items.filter((x) => !x.forced)) {
      expect(x.after!.lever).toBe('pay');
      expect(x.after!.givesUp).toBeCloseTo(x.saving!, 2);
    }
  });
});
