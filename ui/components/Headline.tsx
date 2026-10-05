import type { FleetExposure } from '../../calc/exposure';
import type { FleetRecommendation } from '../../calc/recommend';
import { money } from '../format';

/**
 * SPEC §3.2: do nothing · after recommendations · the money that turns on the paperwork. The
 * avoidable total sits at the top, beside the recommended actions it adds up. "After
 * recommendations" is all-in — the work, its downtime, and what is still owed at handback — so it
 * compares like for like with doing nothing.
 */
export function Headline({ fleet, plans }: { fleet: FleetExposure; plans: FleetRecommendation }) {
  const t = fleet.totals;
  const r = plans.totals;
  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile
          label="If nothing changes"
          tip="Compensation and life handed over at handback if no tail acts."
          value={money(t.doNothing)}
          sub={`${money(t.compensation)} cash at handback · ${money(t.overDelivery)} life already handed over`}
        />
        <Tile
          label="After recommendations"
          tip="Work, downtime and what is still owed at handback, once each tail acts on its recommendation."
          value={money(r.after)}
          sub={`${r.acting} act, ${r.forced} forced, ${r.paying} pay at handback${r.undecided ? `, ${r.undecided} no recommendation` : ''}${r.donors ? `, ${r.donors} lend a unit` : ''}`}
        />
        <Tile
          label="Resets the lease does not recognise"
          tip="What handback would cost more if the lease holds you to its definition of a qualifying shop visit."
          value={`${t.qmeDelta > 0 ? '+' : ''}${money(t.qmeDelta)}`}
          sub={
            t.qmeDelta > 0
              ? `On ${t.qmeTails} ${t.qmeTails === 1 ? 'tail' : 'tails'}, a shop visit's records do not meet the lease's definition of a qualifying event, so its clock reset does not count at handback.`
              : "Every recorded shop visit meets the lease's definition, so every clock reset counts."
          }
          flag={t.qmeDelta > 0}
        />
      </div>
      <p className="mt-2 text-sm text-slate-600">Life already handed over was paid for at past shop visits: it is sunk unless a swap keeps the unit in the pool.</p>
    </section>
  );
}


function Tile({ label, tip, value, sub, flag, good }: { label: string; tip: string; value: React.ReactNode; sub: React.ReactNode; flag?: boolean; good?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${flag ? 'border-amber-300 bg-amber-50' : good ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="cursor-help text-[11px] font-medium tracking-wide text-slate-500 uppercase" title={tip}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${flag ? 'text-amber-800' : good ? 'text-emerald-800' : 'text-slate-900'}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}
