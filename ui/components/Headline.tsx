import type { FleetExposure } from '../../calc/exposure';
import type { FleetRecommendation } from '../../calc/recommend';
import { money } from '../format';
import { Trace } from './Trace';

/**
 * SPEC §3.2: do nothing · after recommendations · avoidable, plus the QME delta flagged.
 * "After recommendations" is all-in — the work, its downtime, and what is still owed at
 * handback — so it compares like for like with doing nothing.
 */
export function Headline({ fleet, plans }: { fleet: FleetExposure; plans: FleetRecommendation }) {
  const t = fleet.totals;
  const r = plans.totals;
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="If nothing changes"
        value={<Trace text={fleet.trace}>{money(t.doNothing)}</Trace>}
        sub={`${money(t.compensation)} compensation · ${money(t.overDelivery)} over-delivery`}
      />
      <Tile
        label="After recommendations"
        value={<Trace text={plans.trace}>{money(r.after)}</Trace>}
        sub={`Work, downtime and what is still owed · ${r.acting} act, ${r.paying} pay at handback${r.donors ? `, ${r.donors} lend a unit` : ''}`}
      />
      <Tile
        label="Avoidable"
        value={<Trace text={plans.trace}>{money(r.avoidable)}</Trace>}
        sub="If nothing changes, less the best feasible option on each tail"
        good={r.avoidable > 0}
      />
      <Tile
        label="As the lease allows"
        value={<Trace text={fleet.trace} align="right">{money(t.asLeaseAllows)}</Trace>}
        sub={
          t.qmeDelta > 0
            ? `+${money(t.qmeDelta)} on ${t.qmeTails} ${t.qmeTails === 1 ? 'tail' : 'tails'} with maintenance the lease does not recognise`
            : 'Every recorded event is evidenced'
        }
        flag={t.qmeDelta > 0}
      />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Of the <Trace text={fleet.trace}>{money(t.doNothing)}</Trace> if nothing changes,{' '}
        <span className="font-semibold text-slate-900">{money(t.compensation)}</span> is cash payable to lessors at handback and{' '}
        <span className="font-semibold text-slate-900">{money(t.overDelivery)}</span> is life already bought and handed over — LLP life past shop visits
        bought beyond the cheapest workscope that would have cleared the contract
        {fleet.assumptions.countOverDeliveryAsLoss ? '' : ' (not counted in this scenario)'}. That part is sunk: it cancels out of the avoidable figure
        unless a swap keeps the unit in the pool.
      </p>
    </section>
  );
}

function Tile({ label, value, sub, flag, good }: { label: string; value: React.ReactNode; sub: string; flag?: boolean; good?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${flag ? 'border-amber-300 bg-amber-50' : good ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${flag ? 'text-amber-800' : good ? 'text-emerald-800' : 'text-slate-900'}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}
