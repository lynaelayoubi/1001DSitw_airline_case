import type { FleetExposure } from '../../calc/exposure';
import { money } from '../format';
import { Trace } from './Trace';

/**
 * SPEC §3.2: do nothing · after recommendations · avoidable, plus the QME delta flagged.
 * The two that need the levers (SPEC §2.6–2.8) are shown as pending, not as a number — a
 * figure with no formula behind it does not go on screen.
 */
export function Headline({ fleet }: { fleet: FleetExposure }) {
  const t = fleet.totals;
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="If nothing changes"
        value={<Trace text={fleet.trace}>{money(t.doNothing)}</Trace>}
        sub={`${money(t.compensation)} compensation · ${money(t.overDelivery)} over-delivery`}
      />
      <Tile label="After recommendations" value="—" sub="Needs the four levers (SPEC §2.6). Next step." pending />
      <Tile label="Avoidable" value="—" sub="Do nothing minus the best feasible option (SPEC §2.8). Next step." pending />
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
    </section>
  );
}

function Tile({ label, value, sub, pending, flag }: { label: string; value: React.ReactNode; sub: string; pending?: boolean; flag?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${flag ? 'border-amber-300 bg-amber-50' : pending ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'}`}>
      <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${pending ? 'text-slate-300' : flag ? 'text-amber-800' : 'text-slate-900'}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}
