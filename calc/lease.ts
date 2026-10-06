// The lease behind a tail, as the data holds it — for the lease view (BRIEF #8: "be confident the
// recommendations are really based on the actual leases"). Pure: the dataset in, this tail's
// lessor terms and return conditions out, each condition with the requirement rows it drives, and
// the anchors that a clause reference elsewhere on screen opens. It quotes; it computes nothing.

import type { Aircraft, Dataset, Lessor, ReturnCondition } from './types';

export interface LeaseCondition extends ReturnCondition {
  /** The components this condition is applied to — one requirement row on each. */
  drives: { position: string; componentId: string }[];
}

export interface Lease {
  tail: string;
  type: Aircraft['type'];
  lessor: Lessor;
  leaseStart: string;
  leaseEnd: string;
  conditions: LeaseCondition[];
  /** Clause references as they appear on screen, longest first, and the part of this lease each opens. */
  anchors: { ref: string; anchor: string }[];
}

/** The anchor id of a return condition inside the lease view. */
export const conditionAnchor = (rc: Pick<ReturnCondition, 'id'>) => `rc:${rc.id}`;

export function leaseOf(data: Pick<Dataset, 'aircraft' | 'lessors' | 'returnConditions'>, tail: string): Lease | null {
  const ac = data.aircraft.find((x) => x.tail === tail);
  const lessor = ac && data.lessors.find((l) => l.id === ac.lessorId);
  if (!ac || !lessor) return null;
  const conditions = data.returnConditions
    .filter((rc) => rc.tail === tail)
    .map((rc) => ({ ...rc, drives: ac.components.filter((c) => c.kind === rc.componentKind).map((c) => ({ position: c.position, componentId: c.id })) }));
  const anchors = [
    ...conditions.map((rc) => ({ ref: rc.clauseRef, anchor: conditionAnchor(rc) })),
    { ref: lessor.qmeClauseRef, anchor: 'qme' },
    // The QME clause is also cited by its number alone: "Clause 15.2".
    { ref: lessor.qmeClauseRef.replace(/\s*\(.*\)$/, ''), anchor: 'qme' },
    { ref: lessor.replacementClauseRef, anchor: 'replacement' },
    { ref: lessor.noticeClauseRef, anchor: 'notice' },
    { ref: lessor.temporaryInstallClauseRef, anchor: 'temporary' },
  ]
    .filter((x, i, all) => x.ref && all.findIndex((y) => y.ref === x.ref) === i)
    .sort((x, y) => y.ref.length - x.ref.length);
  return { tail, type: ac.type, lessor, leaseStart: ac.leaseStart, leaseEnd: ac.leaseEnd, conditions, anchors };
}
