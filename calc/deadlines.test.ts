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

  it('on this fleet: a route change to start now, then three forced removals, the soonest decided today', () => {
    expect(c.items.map((x) => [x.tail, x.decideBy, x.forced])).toEqual([
      ['A6-GPZ', null, false],
      ['9H-ZUU', '2026-10-03', true],
      ['A6-DLL', '2026-12-03', true],
      ['9H-KVJ', '2027-03-10', true],
    ]);
    // A6-GPZ's route change has no date: start now, and each month of waiting gives up part of what it saves.
    const gpz = c.items[0]!;
    expect(gpz.startNow!.perMonth).toBeGreaterThan(0);
    expect(gpz.startNow!.perMonth).toBeLessThan(gpz.saving!);
    // 9H-ZUU's engine runs out in 35 days: notice goes now, and after today nothing else keeps it flying.
    const zuu = c.items[1]!;
    expect(zuu.runsOut).toMatchObject({ position: 'ENG2', date: '2026-11-07' });
    // A6-DLL's date is the shop-slot booking; the engine runs out later, with nothing booked.
    const dll = c.items[2]!;
    expect(dll.runsOut?.position).toBe('ENG1');
    expect(dll.runsOut!.date > dll.decideBy!).toBe(true);
    // 9H-KVJ's swap must happen before ENG2 runs out, and 90 days' notice comes before that (12.3(b)).
    const kvj = c.items[3]!;
    expect(kvj.runsOut?.date).toBe('2027-06-08');
    expect(Date.parse(kvj.runsOut!.date) - Date.parse(kvj.decideBy!)).toBe(90 * 86_400_000);
    // No aircraft is on the ground on this fleet.
    expect(c.items.some((x) => x.grounded)).toBe(false);
  });

  it("adds up to the avoidable total's chosen part, so the list and the total beside it agree", () => {
    const saves = c.items.reduce((s, x) => s + (x.saving ?? 0), 0);
    expect(saves).toBeCloseTo(plans.totals.avoidableChosen, 2);
    expect(plans.totals.avoidableChosen + plans.totals.avoidableForced).toBeCloseTo(plans.totals.avoidable, 6);
    // On this fleet: $3.33M chosen (A6-GPZ's route change), $1.59M on the three forced tails.
    expect(plans.totals.avoidableChosen).toBeCloseTo(3_331_546, 0);
    expect(plans.totals.avoidableForced).toBeCloseTo(1_592_349, 0);
  });
});
