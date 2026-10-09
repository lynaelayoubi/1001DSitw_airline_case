// The draft a recommended action is assigned with: owner, due date, a message in plain English and
// the structured request, every figure from the recommendation.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { draftAssignment } from './assign';
import { closingDecisions } from './deadlines';
import { assessFleet } from './exposure';
import { leaseOf } from './lease';
import { recommendFleet } from './recommend';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const fleet = assessFleet(data);
const plans = recommendFleet(data, fleet);
const closing = closingDecisions(plans, data.asOf);
const draft = (tail: string) => {
  const x = closing.items.find((i) => i.tail === tail)!;
  return draftAssignment(x, plans.byTail[tail]!, fleet.returning.find((t) => t.tail === tail)!, leaseOf(data, tail)!, data.asOf);
};

describe('draftAssignment', () => {
  it('drafts one per recommended action, each with an owner and a due date', () => {
    const all = closing.items.map((x) => draft(x.tail));
    expect(all).toHaveLength(closing.items.length);
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    for (const d of all) {
      expect(d.owner).toBeTruthy();
      expect(d.due >= data.asOf).toBe(true);
    }
  });

  it('says what to do, by when, why in dollars, and the lease clause behind it — a shop visit to maintenance planning', () => {
    const d = draft('A6-YTM');
    expect(d.owner).toBe('Maintenance planning');
    expect(d.due).toBe('2027-05-04');
    expect(d.message).toContain("Book the September 2027 shop slot for A6-YTM's ENG2 by 4 May 2027: a minimum shop visit (build-for-cash)");
    expect(d.message).toContain('Acting now saves $4.83M against acting late');
    expect(d.message).toContain('Annex D, para 4.1(b)');
    expect(d.message).toContain("90 days' notice of the removal, by 5 Jun 2027 (Clause 12.3(b))");
    expect(d.request).toMatchObject({ aircraft: 'A6-YTM · A320neo', component: 'ENG2 · ESN-1702', due: '2027-05-04', reference: 'Annex D, para 4.1(b); Clause 12.3(b)' });
  });

  it('dates a swap that cannot wait today, and says the notice goes short', () => {
    const d = draft('9H-ZUU');
    expect(d.due).toBe(data.asOf);
    expect(d.message).toContain("Swap 9H-ZUU's ENG2 (ESN-1507) for spare ESN-6513 today");
    expect(d.message).toContain('After today nothing else keeps it flying');
    expect(d.message).toContain('it goes today, short (Clause 12.3(b))');
    expect(d.request.reference).toContain('Clause 12.2(a)');
  });

  it('sends a route change to network planning, with what each month of waiting loses — about the part it keeps flying', () => {
    const gpz = draft('A6-GPZ');
    expect(gpz.owner).toBe('Network planning');
    expect(gpz.message).toContain('It saves $1.12M against paying at handback');
    expect(gpz.message).toContain('every month it waits loses about $59K');
    const kvj = draft('9H-KVJ');
    expect(kvj.message).toContain('APU runs out of APU hours');
    expect(kvj.message).toContain('left on APU at handback');
    expect(kvj.message).toContain('every month it waits loses about $80K');
    expect(kvj.request.component).toBe('The aircraft');
  });
});
