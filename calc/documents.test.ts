// The documents a return needs: the standard template over each aircraft's own components.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { REDELIVERY_DOCUMENTS } from './constants';
import { documentsFor } from './documents';
import { assessFleet } from './exposure';
import type { Dataset } from './types';

const fleet = assessFleet(dataset as unknown as Dataset);
const tail = (t: string) => fleet.returning.find((x) => x.tail === t)!;

describe('documentsFor', () => {
  it('lays the template over the aircraft: one of each aircraft record, and one per engine, APU and gear', () => {
    const docs = documentsFor(tail('A6-MVC'));
    // Five aircraft records, two per engine on two engines, the APU's and the gear's.
    expect(docs).toHaveLength(5 + 2 * 2 + 1 + 1);
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
    expect(docs.filter((d) => d.component === null).map((d) => d.title)).toEqual(REDELIVERY_DOCUMENTS.filter((d) => d.per === 'aircraft').map((d) => d.title));
    for (const d of docs) expect(d.owner).toBeTruthy();
  });

  it("starts the shop visit report missing on an engine whose last visit the lease does not count — from the record, and says so", () => {
    const missing = documentsFor(tail('A6-MVC')).filter((d) => d.initial === 'missing');
    expect(missing.map((d) => [d.title, d.component])).toEqual([['Shop visit reports', 'ENG2 · ESN-5032']]);
    expect(missing[0]!.fromRecord).toContain('QME chase');
    // A tail whose shop visits all count starts with nothing missing.
    expect(documentsFor(tail('9H-MMC')).some((d) => d.initial === 'missing')).toBe(false);
  });
});
