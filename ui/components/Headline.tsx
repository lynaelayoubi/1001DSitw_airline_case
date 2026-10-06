import type { FleetExposure } from '../../calc/exposure';
import type { FleetRecommendation } from '../../calc/recommend';
import { count, money } from '../format';

/**
 * SPEC §3.2, by kind of money, forward-looking only. If nothing changes — where a part runs out first,
 * acting late — split in a bar into cash out and engine life handed over, with what it comes to after
 * the actions above as a second line. What acting now saves sits at the top
 * beside the actions. The rest is in the disclosure under them. Last, two plain lines: life already
 * over-delivered at past shop visits, which is sunk and in none of the totals, and the clock-reset
 * column of the table below.
 */
export function Headline({ fleet, plans }: { fleet: FleetExposure; plans: FleetRecommendation }) {
  const t = fleet.totals;
  const r = plans.totals;
  return (
    <section className="mt-12 grid gap-x-12 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="caps">If nothing changes</div>
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

        <details className="mt-2 text-label text-slate-500">
          <summary className="cursor-pointer">What these totals are made of</summary>
          <ul className="mt-2 space-y-1 pl-4">
            <li>
              Engine life handed over, counted the same way in every option: an engine that leaves the airline — back with the aircraft, or on for good as a spare —
              costs the life it carries above the return conditions, and one that comes off into the pool earns that life back, at the same rates.
            </li>
            <li>
              If nothing changes, on a tail whose part runs out before handback: acting late — nobody acts until it runs out, then the cheapest option
              still open that day.
            </li>
            <li>
              What acting now saves, {money(r.avoidable)}: {money(r.avoidableChosen)} saved by the actions chosen, {money(r.avoidableForced)} on required actions, against acting late. In cash, {money(r.avoidableCash)} less of the {money(r.doNothingCash)} in play ({Math.round(r.avoidableCashShare * 100)}%); in engine life,{' '}
              {money(r.avoidableLife)} kept.
            </li>
            <li>
              The {plans.plans.length} tails: {r.acting} act by choice, {r.forced} required, {r.paying} pay at handback
              {r.undecided ? `, ${r.undecided} no recommendation` : ''}
              {r.nothingToDecide ? `, ${r.nothingToDecide} nothing to decide` : ''}
              {r.donors ? `, ${r.donors} lend a unit` : ''}.
            </li>
            <li>
              Already over-delivered: life bought at past shop visits beyond what the lease asks, on engines that stay on the aircraft whatever is done. It was paid for
              when the work was done, so it is in none of these totals.
            </li>
            {t.qmeDelta > 0 && (
              <li>
                Clock reset: on {t.qmeTails} {t.qmeTails === 1 ? 'tail' : 'tails'}, a shop visit's records don't meet the lease's definition of a qualifying event, so
                its clock reset doesn't count.
              </li>
            )}
          </ul>
        </details>

        {/* Life bought at past shop visits: sunk, so beside the totals, not in them. */}
        <p className="mt-6">
          Already over-delivered at past shop visits: <span className="font-semibold tabular-nums">{money(r.pastOverDelivery)}</span>. Sunk on these{' '}
          {count(plans.plans.length)}; preventable on the next {count(plans.plans.length)}.
        </p>

        {/* A one-line summary of the clock-reset column below: plain text, not a fourth total. */}
        <p className="mt-2">
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
