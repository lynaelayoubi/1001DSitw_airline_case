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
  it('lists every recommended action with a date, an aircraft on the ground, or a start-now; ground first, then start-now, then by date', () => {
    const listed = plans.plans.filter(
      (p) => p.role === 'own' && (p.decisionDeadline !== null || p.recommendation.recommended.grounded || p.recommendation.recommended.startNow),
    );
    expect(c.items.map((x) => x.tail).sort()).toEqual(listed.map((p) => p.tail).sort());
    const rank = (x: (typeof c.items)[number]) => (x.grounded ? 0 : x.startNow ? 1 : 2);
    for (let i = 1; i < c.items.length; i++) {
      const [a, b] = [c.items[i - 1]!, c.items[i]!];
      expect(rank(a) <= rank(b)).toBe(true);
      if (a.decideBy && b.decideBy) expect(a.decideBy <= b.decideBy).toBe(true);
    }
  });

  it('gives a chosen action with a date its saving, and says what it falls back to once the date has passed', () => {
    for (const x of c.items.filter((x) => !x.forced && x.decideBy)) {
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

  it('on this fleet: two route changes with no deadline, then three required removals, the soonest decided today', () => {
    expect(c.items.map((x) => [x.tail, x.decideBy, x.forced])).toEqual([
      ['A6-GPZ', null, false],
      ['9H-KVJ', null, true],
      ['9H-ZUU', '2026-10-03', true],
      ['A6-YTM', '2027-05-04', true],
      ['A6-MVC', '2027-06-04', true],
    ]);
    // A6-GPZ's route change has no deadline, and each month of waiting loses part of what it saves.
    const gpz = c.items[0]!;
    expect(gpz.startNow!.perMonth).toBeGreaterThan(0);
    expect(gpz.startNow!.perMonth).toBeLessThan(gpz.saving!);
    // 9H-KVJ's keeps its APU flying: required, and still no deadline.
    expect(c.items[1]!.startNow!.perMonth).toBeGreaterThan(0);
    // 9H-ZUU's engine runs out in 35 days: notice goes now, and after today nothing else keeps it flying.
    expect(c.items[2]!.runsOut).toMatchObject({ position: 'ENG2', date: '2026-11-07' });
    // A6-YTM and A6-MVC: their engines come due ahead of handback, with the slot still to book.
    for (const x of c.items.slice(3)) expect(x.decideBy! > data.asOf).toBe(true);
    // No aircraft is on the ground on this fleet.
    expect(c.items.some((x) => x.grounded)).toBe(false);
  });

  it("adds up to the avoidable total's chosen part, so the list and the total beside it agree", () => {
    const saves = c.items.reduce((s, x) => s + (x.saving ?? 0), 0);
    expect(saves).toBeCloseTo(plans.totals.avoidableChosen, 2);
    expect(plans.totals.avoidableChosen + plans.totals.avoidableForced).toBeCloseTo(plans.totals.avoidable, 6);
    // On this fleet: $1.18M chosen (A6-GPZ's route change), $11.30M on the four forced tails against acting late.
    expect(plans.totals.avoidableChosen).toBeCloseTo(1_176_311, 0);
    expect(plans.totals.avoidableForced).toBeCloseTo(11_299_845, 0);
  });
});
