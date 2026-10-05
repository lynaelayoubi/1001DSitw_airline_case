import type { FleetExposure } from '../../calc/exposure';
import type { FleetRecommendation } from '../../calc/recommend';
import { money } from '../format';

/**
 * SPEC §3.2, by kind of money. If nothing changes, split in a bar into cash out at handback and
 * life already spent at past shop visits; after recommendations. The avoidable total sits at the
 * top beside the actions. No tile carries more than six words; the rest is in the disclosure under
 * them. Last, a plain line summarising the clock-reset column of the table below it.
 */
export function Headline({ fleet, plans }: { fleet: FleetExposure; plans: FleetRecommendation }) {
  const t = fleet.totals;
  const r = plans.totals;
  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile label="If nothing changes" value={money(t.doNothing)}>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="bg-slate-700" style={{ width: `${t.cashShare * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-600">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-700" />
              cash out <span className="font-medium tabular-nums">{money(t.compensation)}</span>
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200" />
              already spent <span className="font-medium tabular-nums">{money(t.overDelivery)}</span>
            </span>
          </div>
        </Tile>
        <Tile label="After recommendations" value={money(r.after)}>
          <div className="mt-1 text-xs text-slate-500">work, downtime and what's still owed</div>
        </Tile>
      </div>

      <details className="mt-2 text-xs text-slate-600">
        <summary className="cursor-pointer text-slate-500">What these totals are made of</summary>
        <ul className="mt-1 space-y-1 pl-4">
          <li>Already spent: life paid for at past shop visits, sunk unless a swap keeps the unit in the pool.</li>
          <li>
            Avoidable, {money(r.avoidable)}: {money(r.avoidableChosen)} saved by the actions chosen, {money(r.avoidableForced)} on forced tails, against a do-nothing
            that cannot happen. In cash, {money(r.avoidableCash)} of the {money(r.doNothingCash)} payable ({Math.round(r.avoidableCashShare * 100)}%); in life,{' '}
            {money(r.avoidableLife)}, spares handed over net of units kept in the pool.
          </li>
          <li>
            The {plans.plans.length} tails: {r.acting} act, {r.forced} forced, {r.paying} pay at handback
            {r.undecided ? `, ${r.undecided} no recommendation` : ''}
            {r.nothingToDecide ? `, ${r.nothingToDecide} nothing to decide` : ''}
            {r.donors ? `, ${r.donors} lend a unit` : ''}.
          </li>
          {t.qmeDelta > 0 && (
            <li>
              Clock reset: on {t.qmeTails} {t.qmeTails === 1 ? 'tail' : 'tails'}, a shop visit's records don't meet the lease's definition of a qualifying event, so
              its clock reset doesn't count.
            </li>
          )}
        </ul>
      </details>

      {/* A one-line summary of the clock-reset column below: plain text, not a fourth total. */}
      <p className="mt-3 text-sm text-slate-700">
        {t.qmeDelta > 0 ? (
          <>
            Clock reset: on {t.qmeTails} {t.qmeTails === 1 ? 'tail' : 'tails'} the lease doesn't count a shop visit —{' '}
            <span className="text-base font-semibold text-slate-900 tabular-nums">{money(t.qmeDelta)}</span> more if lessors enforce the records clause.
          </>
        ) : (
          "Clock reset: the lease counts every shop visit's records, so every clock reset counts."
        )}
      </p>
    </section>
  );
}

function Tile({ label, value, children }: { label: string; value: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {children}
    </div>
  );
}
