// A recommended action as a piece of work someone owns. Pure: the action, its tail and lease in;
// the draft a head of fleet sends out — owner, due date, a message in plain English and, for a
// maintenance system, the same thing as a structured request. Every figure in it comes from the
// recommendation; the UI only lets the person edit and send it.

import { ASSIGN_OWNER_BY_LEVER, READINESS_OWNERS } from './constants';
import type { Closing } from './deadlines';
import type { TailResult } from './exposure';
import { dayMonthYear, num, usdShort } from './format';
import type { Lease } from './lease';
import { addMonths } from './projection';
import { actionOf, type TailPlan } from './recommend';
import type { ISODate, ReturnCondition } from './types';

/** Who an action can be assigned to. */
export const OWNERS = [READINESS_OWNERS.planning, READINESS_OWNERS.leasing, READINESS_OWNERS.records, READINESS_OWNERS.network] as const;
export type Owner = (typeof OWNERS)[number];

/** What a maintenance system would be sent: one structured request, readable as it stands. */
export interface MaintenanceRequest {
  aircraft: string;
  component: string;
  action: string;
  due: ISODate;
  reason: string;
  reference: string;
}

export interface AssignmentDraft {
  /** Stable across months and spares: the tail and its action (actionOf). */
  id: string;
  tail: string;
  /** The recommended action, as listed. */
  action: string;
  owner: Owner;
  due: ISODate;
  message: string;
  request: MaintenanceRequest;
}

const UNIT_WORD: Record<ReturnCondition['unit'], string> = { FH: 'flight hours', FC: 'cycles', months: 'months', 'APU-FH': 'APU hours' };

export function draftAssignment(x: Closing, plan: TailPlan, t: TailResult, lease: Lease, asOf: ISODate): AssignmentDraft {
  const rec = plan.recommendation;
  const o = rec.recommended;
  const tail = t.tail;
  const due = x.decideBy ?? x.grounded?.from ?? asOf;
  const when = due === asOf ? 'today' : `by ${dayMonthYear(due)}`;
  const handback = t.projection.effectiveLeaseEnd;
  // The part the action is for: the one acted on, or the one it keeps flying, or the one that sets the bill.
  const position = o.position ?? rec.forced?.position ?? t.binding.position;
  const comp = t.asRecorded.components.find((c) => c.position === position)!;
  const binding = comp.requirements.find((r) => r.requirementId === comp.binding.requirementId)!;
  const l = lease.lessor;
  const swapped = o.move?.incoming.from === 'pool' ? o.move.incoming.serial : null;

  // What to do.
  const visitWhat = o.label.replace(/^(Do the work|Time the shop visit): /, '').replace(/, month \d+$/, '');
  const route = o.label.replace(/^Route change: /, '').replace(/ \(flag to routing\)$/, '');
  const what =
    o.lever === 'L2'
      ? `Route change for ${tail}: ${route}.`
      : swapped
        ? `Swap ${tail}'s ${position} (${comp.serial}) for spare ${swapped} ${when}.`
        : o.slot
          ? `Book a shop slot for ${tail}'s ${visitWhat} ${when}: it goes into the shop around ${dayMonthYear(o.spendDate!)}.`
          : o.grounded
            ? `${tail} goes on the ground from ${dayMonthYear(o.grounded.from)} for ${num(o.grounded.days)} days: ${o.label}.`
            : `${tail}: ${o.label}, ${when}.`;

  // Why it matters, in dollars.
  const f = rec.forced;
  const why = f
    ? `${f.position} runs out of ${f.clock} around ${dayMonthYear(addMonths(asOf, f.months))}, before ${tail} goes back to ${l.name} on ${dayMonthYear(handback)}.` +
      (plan.avoidable > 0.5
        ? ` Acting now saves ${usdShort(plan.avoidable)} against acting late.`
        : x.runsOut
          ? ` After ${due === asOf ? 'today' : dayMonthYear(due)} nothing else keeps it flying.`
          : '') +
      (x.startNow ? ` There is no deadline, but every month it waits loses about ${usdShort(x.startNow.perMonth)}.` : '')
    : `It saves ${usdShort(plan.avoidable)} against paying at handback, when ${tail} goes back to ${l.name} on ${dayMonthYear(handback)}.` +
      (x.startNow ? ` There is no deadline, but every month it waits loses about ${usdShort(x.startNow.perMonth)}.` : '');

  // The lease behind it.
  const clauses = [binding.clauseRef];
  const leaseLines = [
    `The lease asks for at least ${num(binding.threshold)} ${binding.group === 'llp' ? 'LLP cycles' : UNIT_WORD[binding.unit]} left on ${position} at handback (${binding.clauseRef}).`,
  ];
  for (const n of o.notices ?? []) {
    clauses.push(l.noticeClauseRef);
    leaseLines.push(
      `The lessor needs ${l.engineRemovalNoticeDays} days' notice of the removal, ${n.short ? `which no longer fits: it goes today, short` : `by ${dayMonthYear(n.due)}`} (${l.noticeClauseRef}).`,
    );
  }
  if (swapped) {
    clauses.push(l.replacementClauseRef);
    leaseLines.push(`The spare passes the lease's replacement test (${l.replacementClauseRef}).`);
  }
  if (o.covers) {
    clauses.push(l.temporaryInstallClauseRef);
    leaseLines.push(`A spare may stand in while it is at the shop (${l.temporaryInstallClauseRef}).`);
  }

  const action =
    o.lever === 'L2'
      ? `Route change: ${route}`
      : swapped
        ? `Remove ${position} (${comp.serial}); fit spare ${swapped} for good`
        : o.slot
          ? `Shop visit: ${visitWhat}, inducted around ${dayMonthYear(o.spendDate!)}`
          : o.label;

  return {
    id: `${tail}:${actionOf(plan)}`,
    tail,
    action: plan.label,
    owner: ASSIGN_OWNER_BY_LEVER[o.lever] as Owner,
    due,
    message: [what, why, ...leaseLines].join(' '),
    request: {
      aircraft: `${tail} · ${t.type}`,
      component: o.lever === 'L2' ? 'The aircraft' : `${position} · ${comp.serial}`,
      action,
      due,
      reason: why,
      reference: [...new Set(clauses)].join('; '),
    },
  };
}
