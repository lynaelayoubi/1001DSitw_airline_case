import type { ClosingDecisions } from '../../calc/deadlines';
import { date, money } from '../format';
import { Trace } from './Trace';

/**
 * The customer's calendar: the decisions that are closing, soonest first (calc/deadlines.ts) —
 * the top line of the panel, above the model's own view of how firm its answers are. Each row says
 * its own consequence, because there are two: a chosen action falls back to the best option still
 * open — usually paying at handback — while a forced removal with nothing left runs out with
 * nothing booked. Forced rows show no saving: their benchmark is a do-nothing that cannot happen.
 */
export function RunningOutOfTime({ closing }: { closing: ClosingDecisions }) {
  return (
    <div>
      <h2 className="mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
        <Trace text={closing.trace}>Running out of time</Trace>
      </h2>
      {closing.items.length === 0 ? (
        <p className="text-sm text-slate-500">No recommended action has a date: nothing is closing.</p>
      ) : (
        <table className="w-full text-[13px]">
          <tbody>
            {closing.items.map((x) => (
              <tr key={x.tail} className="border-t border-slate-100 align-top first:border-t-0">
                <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{x.tail}</td>
                <td className="py-1.5 pr-3">{x.label}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <Trace text={x.trace}>decide by {date(x.decideBy)}</Trace>
                </td>
                <td className="py-1.5 pr-3 text-right whitespace-nowrap tabular-nums">
                  {x.saving === null ? <span className="text-slate-500">forced</span> : <>saves {money(x.saving)}</>}
                </td>
                <td className={`py-1.5 text-[12px] ${x.runsOut ? 'text-red-800' : 'text-slate-500'}`}>
                  {x.after
                    ? x.after.lever === 'pay'
                      ? 'after that, it pays at handback'
                      : `after that, ${x.after.label} — ${money(x.after.givesUp)} more`
                    : x.runsOut
                      ? x.runsOut.date <= x.decideBy
                        ? `that is the day ${x.runsOut.position} runs out of ${x.runsOut.clock}: after it, nothing is in its place`
                        : `after that, nothing keeps ${x.runsOut.position} flying: it runs out of ${x.runsOut.clock} around ${date(x.runsOut.date)}, with nothing booked`
                      : 'after that, no other option is open'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
