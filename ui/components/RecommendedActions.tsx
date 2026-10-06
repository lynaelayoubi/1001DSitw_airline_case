import type { ClosingDecisions, Closing } from '../../calc/deadlines';
import type { FleetRecommendation } from '../../calc/recommend';
import { date, money } from '../format';

/** What happens once the date has passed, in one sentence: the tip on the date. */
function afterTheDate(x: Closing & { decideBy: string }): string {
  if (x.after) return x.after.lever === 'pay' ? 'After this date it pays at handback.' : `After this date the best option left is ${x.after.label}, ${money(x.after.givesUp)} more.`;
  if (x.runsOut)
    return x.runsOut.date <= x.decideBy
      ? `This is the day ${x.runsOut.position} runs out of ${x.runsOut.clock}; after it, nothing is in its place.`
      : `After this date nothing keeps ${x.runsOut.position} flying, and it runs out of ${x.runsOut.clock} around ${date(x.runsOut.date)}.`;
  return 'After this date no other option is open.';
}

/**
 * The screen's answer, at the top: every recommended action, soonest first (calc/deadlines.ts) —
 * tail, action, the date to decide by, and either "forced" or what it saves. An aircraft on the
 * ground because nothing keeps it flying comes first, with its days and their cost; a route change
 * says "start now" — with the avoidable
 * total beside it, split so the saves in the list add up to its chosen part. Everything else on
 * the screen justifies this, and sits under it.
 */
export function RecommendedActions({ closing, totals: r }: { closing: ClosingDecisions; totals: FleetRecommendation['totals'] }) {
  return (
    <section className="mb-4 grid gap-3 lg:grid-cols-[3fr_1fr]">
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <h2 className="mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">Recommended actions, soonest first</h2>
        {closing.items.length === 0 ? (
          <p className="text-sm text-slate-500">No tail needs to act: every recommendation is to pay at handback.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {closing.items.map((x) => (
                <tr key={x.tail} className={`border-t border-slate-100 align-top first:border-t-0 ${x.grounded ? 'text-amber-900' : ''}`}>
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{x.tail}</td>
                  <td className="py-1.5 pr-3">{x.label}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {x.grounded ? (
                      <span className="font-medium">from {date(x.grounded.from)}</span>
                    ) : x.startNow ? (
                      <span className="cursor-help" title={`Each month of waiting gives up about ${money(x.startNow.perMonth)}.`}>
                        start now
                      </span>
                    ) : (
                      <span className="cursor-help" title={afterTheDate({ ...x, decideBy: x.decideBy! })}>
                        decide by {date(x.decideBy!)}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
                    {x.grounded ? (
                      <span className="rounded bg-amber-100 px-1.5 py-px text-[11px] font-medium text-amber-900">
                        {x.grounded.days} days on the ground · {money(x.grounded.cost)}
                      </span>
                    ) : x.saving === null ? (
                      <span className="cursor-help rounded bg-amber-100 px-1.5 py-px text-[11px] font-medium text-amber-900" title="A component runs out before handback, so doing nothing is not an option.">
                        forced
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-800">saves {money(x.saving)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className={`rounded-lg border px-4 py-3 ${r.avoidable > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
        <div className="cursor-help text-[11px] font-medium tracking-wide text-slate-500 uppercase" title="If nothing changes, less after recommendations.">
          What acting now saves
        </div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${r.avoidable > 0 ? 'text-emerald-800' : 'text-slate-900'}`}>{money(r.avoidable)}</div>
        <div className="mt-1 text-xs text-slate-600">
          {money(r.avoidableChosen)} by choice · {money(r.avoidableForced)} forced
        </div>
      </div>
    </section>
  );
}
