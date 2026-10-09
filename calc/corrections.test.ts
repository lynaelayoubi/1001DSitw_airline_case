// The leasing team's corrections, applied to the data the calculation runs on: none, and nothing moves.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { applyCorrections } from './corrections';
import { closingDecisions } from './deadlines';
import { assessFleet } from './exposure';
import { leaseOf, leaseTerms } from './lease';
import { recommendFleet } from './recommend';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const run = (d: Dataset) => {
  const fleet = assessFleet(d);
  const plans = recommendFleet(d, fleet);
  return { fleet, plans, closing: closingDecisions(plans, d.asOf) };
};
const asRead = run(data);

describe('applyCorrections', () => {
  it('with no corrections, returns the data itself: no default figure can move', () => {
    expect(applyCorrections(data, [])).toBe(data);
    expect(asRead.plans.totals.doNothing / 1e6).toBeCloseTo(40.025, 2);
    expect(asRead.plans.totals.after / 1e6).toBeCloseTo(31.35, 2);
    expect(asRead.plans.totals.avoidable / 1e6).toBeCloseTo(8.674, 2);
  });

  it("moves a decision when the notice period is corrected — on that aircraft's lease only", () => {
    // 9H-ZUU's ENG2 runs out on 7 Nov 2026. With 90 days' notice the swap is decided today, short;
    // with 30, it can wait until 8 Oct. A6-DLL has the same lessor and keeps its 90 days.
    const corrected = applyCorrections(data, [{ tail: '9H-ZUU', term: 'notice', value: 30 }]);
    const after = run(corrected);
    expect(asRead.closing.items.find((x) => x.tail === '9H-ZUU')!.decideBy).toBe(data.asOf);
    expect(after.closing.items.find((x) => x.tail === '9H-ZUU')!.decideBy).toBe('2026-10-08');
    expect(leaseOf(corrected, '9H-ZUU')!.lessor.engineRemovalNoticeDays).toBe(30);
    expect(leaseOf(corrected, 'A6-DLL')!.lessor.engineRemovalNoticeDays).toBe(90);
    expect(leaseOf(corrected, '9H-ZUU')!.lessor.name).toBe(leaseOf(data, '9H-ZUU')!.lessor.name);
  });

  it("changes what a tail owes when a threshold is corrected, and no other tail's", () => {
    // A6-DLL's ENG2 is short on cycles at handback; a lease asking for more makes it shorter.
    const rc = leaseTerms(leaseOf(data, 'A6-DLL')!).find((t) => t.label === 'Engines: cycles left at handback')!;
    const after = run(applyCorrections(data, [{ tail: 'A6-DLL', term: rc.id, value: (rc.value as number) + 500 }]));
    const owed = (r: typeof asRead, tail: string) => r.fleet.returning.find((t) => t.tail === tail)!.asRecorded.compensation;
    expect(owed(after, 'A6-DLL')).toBeGreaterThan(owed(asRead, 'A6-DLL'));
    for (const t of asRead.fleet.returning.filter((x) => x.tail !== 'A6-DLL')) expect(owed(after, t.tail), t.tail).toBeCloseTo(owed(asRead, t.tail), 6);
  });
});

describe('leaseTerms', () => {
  it('lists every term the calculation takes from a lease, each with the clause it came from', () => {
    const terms = leaseTerms(leaseOf(data, '9H-ZUU')!);
    expect(terms.map((t) => t.id)).toEqual(['rc:9H-ZUU-RC1', 'rc:9H-ZUU-RC2', 'rc:9H-ZUU-RC3', 'rc:9H-ZUU-RC4', 'rc:9H-ZUU-RC5', 'rc:9H-ZUU-RC6', 'rc:9H-ZUU-RC7', 'notice', 'replacement', 'qme', 'reserves']);
    for (const t of terms) {
      expect(t.clauseRef, t.id).toBeTruthy();
      expect(t.clauseText, t.id).toBeTruthy();
    }
    // Thresholds and the notice period flow into the calculation; the rules are recorded.
    expect(terms.filter((t) => t.live).map((t) => t.id)).toHaveLength(8);
    expect(terms.find((t) => t.id === 'notice')).toMatchObject({ value: 90, clauseRef: 'Clause 12.3(b)' });
    expect(terms.find((t) => t.id === 'reserves')!.value).toBe('No-reserve lease');
  });
});
