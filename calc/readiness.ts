// The readiness checklist (BRIEF #7: "all of the other smaller pieces"). Pure: the recommendations,
// the exposure and the lessors in; per returning tail, everything that must be true before handback
// — owner, due date, status — out, soonest first across the fleet.
//
// Two kinds. Derived items come from what the model already computes and point at their source:
// forced removals, the lessor's notice of each engine removal (12.3(b)), shop slots to book, QME
// evidence to chase, and what is owed at handback. Standard items — records, manuals, cabin, final
// inspection — come from a declared template (READINESS_TEMPLATE), due a fixed time before the
// return date, and say so. Status is derived from the due date alone; nothing is set by hand.

import { READINESS_OWNERS, READINESS_TEMPLATE, READINESS_WINDOW_DAYS } from './constants';
import type { FleetExposure } from './exposure';
import { num, usd } from './format';
import { addMonths, parseDate, toISO } from './projection';
import type { FleetRecommendation } from './recommend';
import type { Dataset, ISODate } from './types';

export type ReadinessStatus = 'overdue' | 'due soon' | 'open';

export type ReadinessSource =
  | { kind: 'lease'; anchor: string; ref: string }
  | { kind: 'recommendation' }
  | { kind: 'component'; componentId: string; position: string }
  | { kind: 'template'; basis: string };

export interface ReadinessItem {
  tail: string;
  title: string;
  owner: string;
  due: ISODate;
  status: ReadinessStatus;
  kind: 'derived' | 'standard';
  source: ReadinessSource;
  /** A second line where the item needs one: the documents a QME clause requires. */
  detail?: string;
  trace: string;
}

export interface Readiness {
  items: ReadinessItem[];
  byTail: Record<string, ReadinessItem[]>;
  /** The digest: items due within the window (overdue included), and how many tails they fall on. */
  next: { days: number; items: number; tails: number };
  trace: string;
}

const MS_PER_DAY = 86_400_000;
const addDays = (d: ISODate, n: number): ISODate => toISO(new Date(parseDate(d).getTime() + n * MS_PER_DAY));

/** The documents a lessor's QME clause requires, as it lists them: "(i) …, (ii) … and (iii) …". */
function qmeDocuments(clauseText: string): string {
  const m = clauseText.match(/delivered to Lessor (\(i\).*?), in each case/);
  return m ? m[1]! : 'the evidence the clause requires';
}

export function readiness(data: Pick<Dataset, 'lessors'>, fleet: FleetExposure, plans: FleetRecommendation): Readiness {
  const asOf = fleet.asOf;
  const soon = addDays(asOf, READINESS_WINDOW_DAYS);
  const status = (due: ISODate): ReadinessStatus => (due < asOf ? 'overdue' : due <= soon ? 'due soon' : 'open');
  const lessors = new Map(data.lessors.map((l) => [l.id, l]));
  const items: ReadinessItem[] = [];
  const add = (x: Omit<ReadinessItem, 'status'>) => items.push({ ...x, status: status(x.due) });

  for (const t of fleet.returning) {
    const plan = plans.byTail[t.tail];
    const lessor = lessors.get(t.lessorId);
    if (!plan || !lessor) continue;
    const returnDate = t.projection.effectiveLeaseEnd;
    const rec = plan.recommendation;
    const o = rec.recommended;

    if (plan.role === 'own') {
      if (rec.forced)
        add({
          tail: t.tail,
          title: `${rec.forced.position} runs out of ${rec.forced.clock}: it has to come off`,
          owner: READINESS_OWNERS.maintenance,
          due: addMonths(asOf, rec.forced.months),
          kind: 'derived',
          source: { kind: 'recommendation' },
          trace: `${rec.forced.why}. Recommended: ${plan.label}.`,
        });
      if (o.slot)
        add({
          tail: t.tail,
          title: `Book the shop slot: ${o.slot.what}`,
          owner: READINESS_OWNERS.planning,
          due: o.slot.bookBy,
          kind: 'derived',
          source: { kind: 'recommendation' },
          trace: `The recommended action (${plan.label}) needs a slot booked a ${fleet.assumptions.shopSlotLeadTimeMonths}-month lead time ahead.`,
        });
      for (const n of o.notices ?? [])
        add({
          tail: t.tail,
          title: `Notify the lessor: ${n.what}${n.short ? ' (short notice)' : ''}`,
          owner: READINESS_OWNERS.leasing,
          due: n.due,
          kind: 'derived',
          source: { kind: 'lease', anchor: 'notice', ref: lessor.noticeClauseRef },
          trace:
            `${lessor.noticeClauseRef} asks ${lessor.engineRemovalNoticeDays} days' notice of a planned engine removal.` +
            (n.short ? ' This removal is forced by the engine running out, so the full notice no longer fits: it goes now, short.' : ''),
        });
      const owedCash = o.move ? o.move.own.newCompensation : o.newCompensation;
      if (owedCash >= 0.5 && !rec.nothingToDecide)
        add({
          tail: t.tail,
          title: `Settle ${usd(owedCash)} of compensation at handback`,
          owner: READINESS_OWNERS.finance,
          due: returnDate,
          kind: 'derived',
          source: { kind: 'recommendation' },
          trace: `Cash payable to ${lessor.name} at handback after the recommended action (${plan.label}), against the provision carved at lease signing.`,
        });
    }

    // QME evidence to chase: due now. The document is already missing and the shop visit already
    // past; the longer the chase waits, the harder the evidence is to recover.
    t.asRecorded.components.forEach((c, i) => {
      if (c.qmeStatus !== 'not-evidenced') return;
      const atStake = t.asLeaseAllows.components[i]!.exposure - c.exposure;
      add({
        tail: t.tail,
        title: `Chase the QME evidence for ${c.position}'s last shop visit — ${usd(atStake)} turns on it`,
        owner: READINESS_OWNERS.records,
        due: asOf,
        kind: 'derived',
        source: { kind: 'lease', anchor: 'qme', ref: lessor.qmeClauseRef },
        detail: `The record does not show which document is missing; the clause requires ${qmeDocuments(lessor.qmeClauseText)}.`,
        trace:
          `${c.position}'s last shop visit is not evidenced as ${lessor.qmeClauseRef} requires, so the lease does not count its clock reset. ` +
          `The record does not show which document is missing; the clause requires ${qmeDocuments(lessor.qmeClauseText)}. ` +
          `Due now: the evidence is already missing and the shop visit already past, so there is nothing to wait for, and the longer ` +
          `the chase waits the harder the paperwork is to recover from the shop.`,
      });
    });

    for (const x of READINESS_TEMPLATE)
      add({
        tail: t.tail,
        title: x.title,
        owner: x.owner,
        due: addMonths(returnDate, -x.monthsBefore),
        kind: 'standard',
        source: { kind: 'template', basis: x.basis },
        trace: `Standard item: due ${x.monthsBefore} ${x.monthsBefore === 1 ? 'month' : 'months'} before the return date (${returnDate}); ${x.basis}.`,
      });
  }

  items.sort((x, y) => x.due.localeCompare(y.due) || x.tail.localeCompare(y.tail));
  const byTail: Record<string, ReadinessItem[]> = {};
  for (const x of items) (byTail[x.tail] ??= []).push(x);
  const due = items.filter((x) => x.due <= soon);
  const next = { days: READINESS_WINDOW_DAYS, items: due.length, tails: new Set(due.map((x) => x.tail)).size };
  const trace =
    `${items.length} items across ${Object.keys(byTail).length} returning tails: those the model derives (forced removals, notices to the lessor, ` +
    `shop slots, QME evidence, what is owed at handback) and ${READINESS_TEMPLATE.length} standard items each from a declared template. ` +
    `Status from the due date alone: overdue before ${asOf}, due soon within ${READINESS_WINDOW_DAYS} days (to ${soon}), otherwise open. ` +
    `Next ${READINESS_WINDOW_DAYS} days: ${num(next.items)} items across ${num(next.tails)} tails.`;
  return { items, byTail, next, trace };
}
