import type { AssignmentDraft } from '../../calc/assign';
import type { PlanTotals, Scenario, ScenarioResult } from '../../calc/scenario';
import type { Robustness } from '../../calc/robustness';
import type { TailChoices } from '../../calc/whatif';
import { useDemo } from '../demo';
import { decideBy, money } from '../format';
import { decisionSentence } from '../questions';
import { canAssign } from '../roles';
import { ClauseText } from './ClauseText';
import { Evidence } from './Evidence';

const signed = (n: number) => (Math.abs(n) < 0.5 ? 'no change' : `${n > 0 ? '+' : '−'}${money(Math.abs(n))}`);

/** The answer in one sentence: what the plan costs now, and how many recommendations change. */
export function answerSentence(r: ScenarioResult): string {
  const n = r.changed.length;
  if (n === 0) return 'Your plan holds: no recommendation changes.';
  const cost = Math.abs(r.costChange) < 0.5 ? 'Your plan costs the same.' : `Your plan costs ${money(Math.abs(r.costChange))} ${r.costChange > 0 ? 'more' : 'less'}.`;
  return `${cost} ${n} ${n === 1 ? 'recommendation changes' : 'recommendations change'}.`;
}

/**
 * The answer to the questions asked: one sentence and two totals; then what you'd do differently, one
 * line per aircraft whose recommendation changes, each ready to assign; then any question that could
 * not be taken, and why. The full calculation is folded beneath.
 */
export function Answer({
  scenario,
  result: r,
  pending,
  drafts,
  onAssign,
  named,
  asOf,
  robustness,
  robustnessPending,
}: {
  scenario: Scenario;
  result: ScenarioResult;
  pending: boolean;
  /** The new action on each changed aircraft, drafted for assigning, where it has one to assign. */
  drafts: Record<string, AssignmentDraft>;
  onAssign: (d: AssignmentDraft) => void;
  named: TailChoices[];
  asOf: string;
  robustness: Robustness | null;
  robustnessPending: boolean;
}) {
  const { role } = useDemo();
  const empty = !scenario.world.length && !scenario.decisions.length;
  const refused = r.decisions.filter((d) => d.refused);
  return (
    <div className={pending ? 'opacity-60' : ''}>
      {empty ? (
        <p className="text-slate-500">Ask a question above to see what it does to your plan.</p>
      ) : (
        <>
          <p className="text-display font-semibold tracking-tight">{answerSentence(r)}</p>
          <div className="mt-3 flex flex-wrap gap-12 tabular-nums">
            <span>
              <span className="text-slate-500">Today </span>
              <span className="font-semibold">{money(r.today.allIn)}</span>
            </span>
            <span>
              <span className="text-slate-500">With these changes </span>
              <span className="font-semibold">{money(r.scenario.allIn)}</span>
            </span>
          </div>

          <h3 className="caps mt-12 mb-3">What you'd do differently</h3>
          {r.changed.length === 0 ? (
            <p className="text-slate-500">Nothing: every recommendation stands.</p>
          ) : (
            <table className="w-full">
              <tbody>
                {r.changed.map((c) => (
                  <tr key={c.tail} className="border-t border-slate-100 align-baseline first:border-t-0">
                    <td className="py-3 pr-6 font-medium whitespace-nowrap">{c.tail}</td>
                    <td className="py-3 pr-6">
                      <span className="text-slate-500">{c.from}</span> → {c.to}
                    </td>
                    <td className="py-3 pr-6 whitespace-nowrap">{c.noDeadline ? 'no deadline' : c.decideBy ? decideBy(c.decideBy, asOf) : 'nothing to book'}</td>
                    <td className="py-3 pr-6 text-right whitespace-nowrap tabular-nums">{signed(c.difference)}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {drafts[c.tail] ? (
                        canAssign(role) && (
                          <button className="link" onClick={() => onAssign(drafts[c.tail]!)}>
                            Assign and notify
                          </button>
                        )
                      ) : (
                        <span className="text-label text-slate-500">nothing to assign</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {refused.length > 0 && (
            <ul className="mt-6 space-y-2">
              {refused.map((d, k) => (
                <li key={k}>
                  <span className="font-medium">Not possible:</span> {decisionSentence(d.proposal, named)}. <ClauseText tail={d.proposal.tail} text={d.refused!} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <details className="mt-12">
        <summary className="cursor-pointer">
          <span className="caps">Show the calculation</span>
        </summary>
        <div className="mt-6 space-y-12">
          {!empty && <Totals r={r} />}
          <Evidence robustness={robustness} pending={robustnessPending} />
        </div>
      </details>
    </div>
  );
}

/** Today's plan, today's plan with the changed figures, and with the actions too: three totals side by side. */
function Totals({ r }: { r: ScenarioResult }) {
  const rows: { label: string; key: keyof PlanTotals; strong?: boolean }[] = [
    { label: 'All-in, after the plan', key: 'allIn', strong: true },
    { label: 'Still owed at handback', key: 'owed' },
    { label: 'Maintenance spend', key: 'spend' },
  ];
  const cell = (t: PlanTotals, key: keyof PlanTotals, strong?: boolean, compare = true) => (
    <td className="px-3 py-3 text-right tabular-nums">
      <span className={strong ? 'font-semibold' : ''}>{money(t[key])}</span>
      {compare && <div className="text-label text-slate-500">{signed(t[key] - r.today[key])}</div>}
    </td>
  );
  return (
    <section>
      <h3 className="caps mb-3">The totals</h3>
      <table className="w-full">
        <thead className="caps">
          <tr className="border-b border-slate-200">
            <th className="pr-3 pb-3 text-left font-medium" />
            <th className="cursor-help px-3 pb-3 text-right font-medium" title="At the default figures: what the Overview shows.">
              Today's plan
            </th>
            <th className="cursor-help px-3 pb-3 text-right font-medium" title="Today's plan re-made with the changed figures — costs, flying, reserves, a day on the ground — so an aircraft's action may change.">
              Changed figures only
            </th>
            <th className="cursor-help pb-3 pl-3 text-right font-medium" title="The changed figures and your actions together.">
              Figures and actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.key} className="border-t border-slate-100 align-baseline first:border-t-0">
              <td className={`py-3 pr-3 ${x.strong ? 'font-medium' : ''}`}>{x.label}</td>
              {cell(r.today, x.key, x.strong, false)}
              {cell(r.world, x.key, x.strong)}
              {cell(r.scenario, x.key, x.strong)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
