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
// the reader, not a threshold. Two kinds have no date and come first: an aircraft on the ground
// because nothing keeps it flying — the most urgent item, never hidden — and a route change, which
// starts now and loses value each month it waits.

import { addMonths } from './projection';
import { usd } from './format';
import type { LeverId, LeverOption } from './levers';
import type { FleetRecommendation } from './recommend';
import type { ISODate } from './types';

export interface Closing {
  tail: string;
  label: string;
  /** null for an aircraft on the ground or a route change: neither has a date to decide by. */
  decideBy: ISODate | null;
  /** Nothing keeps the tail flying: on the ground from, for how many days, at what downtime cost. */
  grounded: { from: ISODate; days: number; cost: number } | null;
  /** A route change: start now; each month of waiting gives up this much. */
  startNow: { perMonth: number } | null;
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

const rank = (x: Closing) => (x.grounded ? 0 : x.startNow ? 1 : 2);

export function closingDecisions(plans: FleetRecommendation, asOf: ISODate): ClosingDecisions {
  const items = plans.plans
    .filter((p) => p.role === 'own' && (p.decisionDeadline !== null || p.recommendation.recommended.grounded || p.recommendation.recommended.startNow))
    .map((p): Closing => {
      const rec = p.recommendation;
      const o = rec.recommended;
      const f = rec.forced;
      const base = { tail: p.tail, label: p.label, forced: f !== null, saving: f ? null : o.saving };
      if (o.grounded)
        return {
          ...base,
          decideBy: null,
          grounded: o.grounded,
          startNow: null,
          after: null,
          runsOut: null,
          trace: `${p.tail}: ${p.label} — ${o.grounded.days} days from ${o.grounded.from}, ${usd(o.grounded.cost)} at the downtime rate. Nothing keeps it flying.`,
        };
      if (o.startNow)
        return {
          ...base,
          decideBy: null,
          grounded: null,
          startNow: o.startNow,
          after: null,
          runsOut: null,
          trace: `${p.tail}: ${p.label} — no deadline; each month of waiting loses about ${usd(o.startNow.perMonth)}.`,
        };
      const decideBy = p.decisionDeadline!;
      // A route change loses value each month it waits, so it is not an option still open at full value later.
      const stillOpen = (x: LeverOption) => x.feasible && x.actionKey !== o.actionKey && !x.startNow && !x.grounded && (x.deadline === null || x.deadline > decideBy);
      const next = rec.options.filter(stillOpen).sort((x, y) => x.total - y.total)[0];
      const after = next ? { lever: next.lever, label: next.label, givesUp: next.total - o.total } : null;
      const runsOut = f && !next ? { position: f.position, clock: f.clock, date: addMonths(asOf, f.months) } : null;
      return {
        ...base,
        decideBy,
        grounded: null,
        startNow: null,
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
    // On the ground first, then what starts now, then by date.
    .sort((x, y) => rank(x) - rank(y) || (x.grounded?.from ?? x.decideBy ?? '').localeCompare(y.grounded?.from ?? y.decideBy ?? ''));

  const trace =
    `Every recommended action with a date after which it can no longer be taken — a shop slot that must be booked a lead time ` +
    `ahead, a swap that must happen before a component runs out or before a shop visit stops being the fallback — soonest first, ` +
    `after any aircraft on the ground (most urgent) and any route change (start now). ` +
    `For each, what the tail does once the date has passed: the cheapest option still open then, or, for a forced removal with ` +
    `nothing left, the date the component runs out. No window: every open decision is listed.\n\n` +
    (items.length ? items.map((x) => x.trace).join('\n') : 'No recommended action has a date: nothing is closing.');

  return { items, trace };
}
