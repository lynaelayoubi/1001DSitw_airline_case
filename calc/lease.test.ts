// The lease view's data: a tail's lessor terms and return conditions, quoted from the dataset,
// with the anchors that clause references elsewhere on screen open.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { conditionAnchor, leaseOf } from './lease';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const lease = leaseOf(data, '9H-ZUU')!;

describe('leaseOf', () => {
  it("quotes the tail's lessor and every return condition exactly as the data holds them", () => {
    const ac = data.aircraft.find((a) => a.tail === '9H-ZUU')!;
    expect(lease.lessor).toBe(data.lessors.find((l) => l.id === ac.lessorId));
    const rcs = data.returnConditions.filter((rc) => rc.tail === '9H-ZUU');
    expect(lease.conditions).toHaveLength(rcs.length);
    lease.conditions.forEach((c, k) => {
      const { drives, ...quoted } = c;
      expect(quoted).toEqual(rcs[k]);
      expect(drives.length).toBeGreaterThan(0);
    });
    expect([lease.leaseStart, lease.leaseEnd]).toEqual([ac.leaseStart, ac.leaseEnd]);
  });

  it('links each condition to the components it is applied to: an engine clause drives both engines', () => {
    const engine = lease.conditions.find((c) => c.componentKind === 'engine')!;
    expect(engine.drives.map((d) => d.position)).toEqual(['ENG1', 'ENG2']);
    const gear = lease.conditions.find((c) => c.componentKind === 'landing-gear')!;
    expect(gear.drives.map((d) => d.position)).toEqual(['MLG']);
  });

  it('opens each clause from its reference, longest first, the QME clause by its number alone too', () => {
    const at = (ref: string) => lease.anchors.find((a) => a.ref === ref)?.anchor;
    for (const c of lease.conditions) expect(at(c.clauseRef)).toBe(conditionAnchor(c));
    expect(at(lease.lessor.qmeClauseRef)).toBe('qme');
    expect(at(lease.lessor.qmeClauseRef.replace(/\s*\(.*\)$/, ''))).toBe('qme');
    expect(at('Clause 12.2(a)')).toBe('replacement');
    expect(at('Clause 12.3(b)')).toBe('notice');
    expect(at('Clause 12.3(c)')).toBe('temporary');
    for (let i = 1; i < lease.anchors.length; i++) expect(lease.anchors[i]!.ref.length).toBeLessThanOrEqual(lease.anchors[i - 1]!.ref.length);
  });

  it('has no lease for a tail it does not know', () => {
    expect(leaseOf(data, 'NO-SUCH')).toBeNull();
  });
});
