// The readiness checklist: what must be true before each handback — derived from what the model
// computes, or from the declared template — with owner, due date and a status read off the date.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { READINESS_TEMPLATE, READINESS_WINDOW_DAYS } from './constants';
import { assessFleet } from './exposure';
import { addMonths } from './projection';
import { readiness } from './readiness';
import { recommendFleet } from './recommend';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const fleet = assessFleet(data);
const plans = recommendFleet(data, fleet);
const r = readiness(data, fleet, plans);
const of = (tail: string, starts: string) => r.byTail[tail]!.filter((x) => x.title.startsWith(starts));

describe('readiness', () => {
  it('gives every returning tail the standard items, due the template time before its return date', () => {
    for (const t of fleet.returning)
      for (const x of READINESS_TEMPLATE) {
        const item = r.byTail[t.tail]!.find((i) => i.kind === 'standard' && i.title === x.title)!;
        expect(item.due).toBe(addMonths(t.projection.effectiveLeaseEnd, -x.monthsBefore));
        expect(item.source).toEqual({ kind: 'template', basis: x.basis });
      }
  });

  it('lists each forced removal on the date its component runs out', () => {
    for (const p of plans.plans.filter((x) => x.forced)) {
      const f = p.recommendation.forced!;
      expect(of(p.tail, `${f.position} runs out of`)[0]!.due).toBe(addMonths(data.asOf, f.months));
    }
  });

  it("lists the lessor's notice of each engine removal (12.3(b)), short where the removal is forced", () => {
    // 9H-ZUU's ENG2 runs out in 35 days: notice goes today, short.
    const zuu = of('9H-ZUU', 'Notify the lessor')[0]!;
    expect(zuu.due).toBe(data.asOf);
    expect(zuu.title).toContain('(short notice)');
    expect(zuu.source).toMatchObject({ kind: 'lease', anchor: 'notice', ref: 'Clause 12.3(b)' });
    // A6-YTM's and A6-MVC's ENG2 come off for their shop visits: notice 90 days before induction, which
    // falls after the slot is booked.
    for (const [tail, booked] of [['A6-YTM', '2027-05-04'], ['A6-MVC', '2027-06-04']] as const) {
      const slot = of(tail, 'Book the ')[0]!;
      expect(slot.title).toMatch(/^Book the \w+ 2027 shop slot for ENG2: minimum shop visit \(build-for-cash\)$/);
      expect(slot.due).toBe(booked);
      expect(of(tail, 'Notify the lessor')[0]!.due > slot.due).toBe(true);
    }
  });

  it('chases the QME evidence for each shop visit the lease does not count, naming the documents the clause requires', () => {
    const qme = r.items.filter((x) => x.title.startsWith('Chase the QME evidence'));
    expect(qme.map((x) => x.tail).sort()).toEqual(['A6-MVC', 'A6-MXM']);
    for (const x of qme) {
      // Due now, not with the records review: the document is already missing.
      expect(x.due).toBe(data.asOf);
      expect(x.status).toBe('due soon');
      expect(x.trace).toContain('Due now: the evidence is already missing');
      expect(x.detail).toContain('The record does not show which document is missing');
      expect(x.detail).toContain('release certificate');
      expect(x.source).toMatchObject({ kind: 'lease', anchor: 'qme' });
    }
  });

  it('lists what is owed at handback where the recommendation leaves cash to pay, and nothing for a tail with nothing to decide', () => {
    expect(of('A6-MXM', 'Settle')).toHaveLength(1);
    expect(of('9H-RYM', 'Settle')).toHaveLength(0);
  });

  it('reads status off the due date alone, sorts soonest first, and counts the next 90 days in the digest', () => {
    const soon = new Date(Date.parse(data.asOf + 'T00:00:00Z') + READINESS_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    for (const x of r.items) expect(x.status).toBe(x.due < data.asOf ? 'overdue' : x.due <= soon ? 'due soon' : 'open');
    for (let i = 1; i < r.items.length; i++) expect(r.items[i]!.due >= r.items[i - 1]!.due).toBe(true);
    const due = r.items.filter((x) => x.due <= soon);
    expect(r.next).toEqual({ days: 90, items: due.length, tails: new Set(due.map((x) => x.tail)).size });
    // On this fleet: 9H-ZUU's notice and run-out, 9H-PJS's records review, and the QME chases on A6-MXM and A6-MVC.
    expect(r.next).toMatchObject({ items: 5, tails: 4 });
  });
});
