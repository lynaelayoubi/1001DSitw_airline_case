// The documents a return needs, per aircraft. Pure: a returning tail in, its redelivery records out
// — the standard template (REDELIVERY_DOCUMENTS), laid over the aircraft's own components so each
// engine, the APU and the gear have theirs, each with an owner and a starting status. One status
// comes from the maintenance record rather than the template: an engine whose last shop visit the
// lease does not count starts as missing its shop visit report, the evidence the QME chase is after.

import { REDELIVERY_DOCUMENTS } from './constants';
import type { TailResult } from './exposure';

export type DocumentStatus = 'to do' | 'in progress' | 'ready' | 'missing';
export const DOCUMENT_STATUSES: DocumentStatus[] = ['to do', 'in progress', 'ready', 'missing'];

export interface RedeliveryDocument {
  /** Stable: tail, template item and component. */
  id: string;
  tail: string;
  title: string;
  /** "ENG2 · ESN-5032", or null for the aircraft as a whole. */
  component: string | null;
  owner: string;
  /** Where the document stands before anyone updates it. */
  initial: DocumentStatus;
  /** Why it starts where it does, when that comes from the record rather than the template. */
  fromRecord: string | null;
}

export function documentsFor(t: TailResult): RedeliveryDocument[] {
  return REDELIVERY_DOCUMENTS.flatMap((d) => {
    if (d.per === 'aircraft') return [{ id: `${t.tail}:${d.id}`, tail: t.tail, title: d.title, component: null, owner: d.owner, initial: 'to do' as const, fromRecord: null }];
    return t.asRecorded.components
      .filter((c) => c.kind === d.per)
      .map((c): RedeliveryDocument => {
        const unproven = d.id === 'esv' && c.qmeStatus === 'not-evidenced';
        return {
          id: `${t.tail}:${d.id}:${c.position}`,
          tail: t.tail,
          title: d.title,
          component: `${c.position} · ${c.serial}`,
          owner: d.owner,
          initial: unproven ? 'missing' : 'to do',
          fromRecord: unproven
            ? "The record does not hold what the lease's qualifying shop visit clause asks for, so the lease does not count the visit: the QME chase in the checklist is after it."
            : null,
        };
      });
  });
}
