// The decisions that are closing. Pure: the fleet's recommendations in, every recommended action
// with a date after which it can no longer be taken, soonest first, and what that date passing
// costs.
//
// Two different things happen after a date. A chosen action falls back to the best option still
// open then — on this fleet, paying at handback — and gives up the difference. A forced one is
// worse: if no other option keeps the component flying, it runs out before handback with nothing
// booked. So there is no single sentence for what happens after a date; each row says its own.
//
// No window: every open decision is listed with its date. Which of them count as "soon" is for
// the reader, not a threshold.

import { addMonths } from './projection';
import { usd } from './format';
import type { LeverId, LeverOption } from './levers';
import type { FleetRecommendation } from './recommend';
import type { ISODate } from './types';

export interface Closing {
  tail: string;
  label: string;
  decideBy: ISODate;
  forced: boolean;
  /** Against paying at handback. Null when forced: a do-nothing that cannot happen is no benchmark. */
  saving: number | null;
  /** The best option still open once the date has passed, and how much more it comes to. */
  after: { lever: LeverId; label: string; givesUp: number } | null;
  /** Forced, with nothing still open after the date: the component, its clock, and when it runs out. */
  runsOut: { position: string; clock: string; date: ISODate } | null;
  trace: string;
}

export interface ClosingDecisions {
  items: Closing[];
  trace: string;
}

export function closingDecisions(plans: FleetRecommendation, asOf: ISODate): ClosingDecisions {
  const items = plans.plans
    .filter((p) => p.role === 'own' && p.decisionDeadline !== null)
    .map((p): Closing => {
      const rec = p.recommendation;
      const o = rec.recommended;
      const decideBy = p.decisionDeadline!;
      const stillOpen = (x: LeverOption) => x.feasible && x.actionKey !== o.actionKey && (x.deadline === null || x.deadline > decideBy);
      const next = rec.options.filter(stillOpen).sort((x, y) => x.total - y.total)[0];
      const after = next ? { lever: next.lever, label: next.label, givesUp: next.total - o.total } : null;
      const f = rec.forced;
      const runsOut = f && !next ? { position: f.position, clock: f.clock, date: addMonths(asOf, f.months) } : null;
      return {
        tail: p.tail,
        label: p.label,
        decideBy,
        forced: f !== null,
        saving: f ? null : o.saving,
        after,
        runsOut,
        trace:
          `${p.tail}: ${p.label}, decide by ${decideBy}. ` +
          (f ? `Forced — ${f.why}. ` : `Saves ${usd(o.saving)} against paying at handback. `) +
          (after
            ? `After that date the best option still open is ${after.label}, ${usd(after.givesUp)} more all-in.`
            : runsOut
              ? `After that date nothing else keeps ${runsOut.position} flying: it runs out of ${runsOut.clock} around ${runsOut.date}, with nothing booked.`
              : `After that date no other option is open.`),
      };
    })
    .sort((x, y) => x.decideBy.localeCompare(y.decideBy));

  const trace =
    `Every recommended action with a date after which it can no longer be taken — a shop slot that must be booked a lead time ` +
    `ahead, a swap that must happen before a component runs out or before a shop visit stops being the fallback — soonest first. ` +
    `For each, what the tail does once the date has passed: the cheapest option still open then, or, for a forced removal with ` +
    `nothing left, the date the component runs out. No window: every open decision is listed.\n\n` +
    (items.length ? items.map((x) => x.trace).join('\n') : 'No recommended action has a date: nothing is closing.');

  return { items, trace };
}
