import type { FleetExposure } from '../../calc/exposure';
import type { FleetRecommendation } from '../../calc/recommend';
import { count, money } from '../format';

/**
 * SPEC §3.2, by kind of money, forward-looking only. If nothing changes — where a part runs out first,
 * acting late — split in a bar into cash out and engine life handed over, with what it comes to after
 * the actions above as a second line. What acting now saves sits at the top beside the actions. No
 * disclosure: what each figure is made of is on screen, and the two definitions that are not sit in
 * tips — acting late on "If nothing changes", a reset the lease does not count on the clock-reset
 * line. Last, two plain lines: life already
 * over-delivered at past shop visits, which is sunk and in none of the totals, and the clock-reset
 * column of the table below.
 */
export function Headline({ fleet, plans }: { fleet: FleetExposure; plans: FleetRecommendation }) {
  const t = fleet.totals;
  const r = plans.totals;
  return (
    <section className="mt-12 grid gap-x-12 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div
          className="caps cursor-help"
          title="Where a part runs out before handback, doing nothing means acting late: nobody acts until it runs out, then the cheapest option still open that day."
        >
          If nothing changes
        </div>
        <div className="mt-2 text-display font-semibold tabular-nums">{money(r.doNothing)}</div>
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="bg-slate-600" style={{ width: `${r.doNothingCashShare * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-label text-slate-500">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-600" />
            cash out <span className="font-medium text-slate-900 tabular-nums">{money(r.doNothingCash)}</span>
          </span>
          <span className="cursor-help" title="Life above the return conditions on engines that go to the lessor: a spare fitted for good when a part runs out and nobody acted, or the aircraft's own engine where another option would keep it in the pool.">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200" />
            engine life handed over <span className="font-medium text-slate-900 tabular-nums">{money(r.doNothingLife)}</span>
          </span>
        </div>
        <div className="mt-3 tabular-nums">→ {money(r.after)} after the actions above</div>

        {/* Not added to what acting now saves: these tails need nothing, or are better off paying. */}
        <p className="mt-6 text-slate-500">
          {r.nothingToDecide} {r.nothingToDecide === 1 ? 'tail' : 'tails'} cleared · {r.paying} where paying beats fixing
        </p>

        {/* Life bought at past shop visits: sunk, so beside the totals, not in them. */}
        <p className="mt-6">
          Already over-delivered at past shop visits: <span className="font-semibold tabular-nums">{money(r.pastOverDelivery)}</span>. Sunk on these{' '}
          {count(plans.plans.length)}; preventable on the next {count(plans.plans.length)}.
        </p>

        {/* A one-line summary of the clock-reset column below: plain text, not a fourth total. */}
        <p
          className={`mt-2 ${t.qmeDelta > 0 ? 'cursor-help' : ''}`}
          title={t.qmeDelta > 0 ? "A shop visit whose records don't meet the lease's definition of a qualifying event doesn't reset the clock under the lease." : undefined}
        >
          {t.qmeDelta > 0 ? (
            <>
              Clock reset: on {t.qmeTails} {t.qmeTails === 1 ? 'tail' : 'tails'} the lease doesn't count a shop visit —{' '}
              <span className="font-semibold tabular-nums">{money(t.qmeDelta)}</span> more if lessors enforce the records clause.
            </>
          ) : (
            "Clock reset: the lease counts every shop visit's records, so every clock reset counts."
          )}
        </p>
      </div>
    </section>
  );
}
