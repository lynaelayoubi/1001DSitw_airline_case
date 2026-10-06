import type { ClosingDecisions, Closing } from '../../calc/deadlines';
import type { FleetRecommendation } from '../../calc/recommend';
import type { CloseCall } from '../../calc/robustness';
import { checkNote } from './HowFirm';
import { date, decideBy, money } from '../format';

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
 * tail, action, the date to decide by, and either "required" or what it saves. An aircraft on the
 * ground because nothing keeps it flying comes first, with its days and their cost; a route change
 * has no deadline, and says what each month of waiting loses — with the avoidable
 * total beside it, split so the saves in the list add up to its chosen part. Everything else on
 * the screen justifies this, and sits under it.
 */
export function RecommendedActions({
  closing,
  totals: r,
  checks,
  asOf,
}: {
  closing: ClosingDecisions;
  totals: FleetRecommendation['totals'];
  checks: CloseCall[];
  asOf: string;
}) {
  return (
    <section className="grid gap-x-12 gap-y-12 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <h2 className="caps mb-2">Recommended actions, soonest first</h2>
        {closing.items.length === 0 ? (
          <p className="text-slate-500">No tail needs to act: every recommendation is to pay at handback.</p>
        ) : (
          <table className="w-full">
            <tbody>
              {closing.items.map((x) => (
                <tr key={x.tail} className="align-baseline">
                  <td className="py-2 pr-6 font-medium whitespace-nowrap">{x.tail}</td>
                  <td className="py-2 pr-6">
                    {x.label}
                    {checks.some((c) => c.tail === x.tail) && (
                      <div className="mt-1 text-label text-slate-500">Check before acting: {checkNote(checks.find((c) => c.tail === x.tail)!)}</div>
                    )}
                  </td>
                  <td className="py-2 pr-6 whitespace-nowrap">
                    {x.grounded ? (
                      <span className="font-medium">from {date(x.grounded.from)}</span>
                    ) : x.startNow ? (
                      <span>no deadline · loses {money(x.startNow.perMonth)} a month</span>
                    ) : (
                      <span className="cursor-help" title={afterTheDate({ ...x, decideBy: x.decideBy! })}>
                        {decideBy(x.decideBy!, asOf)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap tabular-nums">
                    {x.grounded ? (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-label font-medium text-amber-800">
                        {x.grounded.days} days on the ground · {money(x.grounded.cost)}
                      </span>
                    ) : x.saving === null ? (
                      <span className="cursor-help rounded bg-amber-50 px-2 py-0.5 text-label font-medium text-amber-800" title="A part runs out before the aircraft goes back, so it has to be dealt with.">
                        required
                      </span>
                    ) : (
                      <span>saves {money(x.saving)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="lg:col-span-4">
        <div className="caps cursor-help" title="If nothing changes, less after recommendations.">
          What acting now saves
        </div>
        <div className={`mt-2 text-display font-semibold tabular-nums ${r.avoidable > 0 ? 'text-accent' : ''}`}>{money(r.avoidable)}</div>
        <div className="mt-1 text-label text-slate-500">
          {money(r.avoidableCash)} less cash to lessors · {money(r.avoidableLife)} of engine life kept
        </div>
        <div className="mt-1 text-label text-slate-500">
          {money(r.avoidableChosen)} optional · {money(r.avoidableForced)} required
        </div>
      </div>
    </section>
  );
}
