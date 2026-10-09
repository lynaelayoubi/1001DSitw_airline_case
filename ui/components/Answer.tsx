import type { AssignmentDraft } from '../../calc/assign';
import type { PlanTotals, Scenario, ScenarioResult } from '../../calc/scenario';
import type { Robustness } from '../../calc/robustness';
import type { TailChoices } from '../../calc/whatif';
import { useDemo } from '../demo';
import { decideBy, money } from '../format';
import { decisionEffectSentence, decisionSentence, verdictSentence, worldEffectSentence } from '../questions';
import { canAssign } from '../roles';
import { ClauseText } from './ClauseText';
import { Evidence } from './Evidence';

const signed = (n: number) => (Math.abs(n) < 0.5 ? 'no change' : `${n > 0 ? '+' : '−'}${money(Math.abs(n))}`);

/**
 * The headline counts only the tool's advice: what the changed figures do to the plan, and how many
 * recommendations they change. Your decisions never enter it; each is judged on its own below.
 */
export function answerSentence(r: ScenarioResult, s: Scenario): string {
  const n = r.advice.length;
  const d = r.world.allIn - r.today.allIn;
  if (!s.world.length || (n === 0 && Math.abs(d) < 0.5)) return 'The plan holds: no recommendation changes.';
  const cost = Math.abs(d) < 0.5 ? 'Your plan costs the same.' : `Your plan costs ${money(Math.abs(d))} ${d > 0 ? 'more' : 'less'}.`;
  return `${cost} ${n === 0 ? 'No recommendation changes' : `${n} ${n === 1 ? 'recommendation changes' : 'recommendations change'}`}.`;
}

/** A date to decide by, in words; "no deadline" for a route change, which loses money each month it waits. */
const when = (x: { decideBy: string | null; slotMonth: string | null; noDeadline: boolean }, asOf: string) =>
  x.noDeadline ? 'no deadline' : x.decideBy ? decideBy(x.decideBy, asOf, x.slotMonth) : 'nothing to book';

/**
 * The answer: one sentence, and what each change does on its own. Then the tool's advice — the
 * recommendations the changed figures change, each ready to assign — kept apart from your decisions,
 * each judged against today's advice for its aircraft: better, and ready to assign; worse, and not
 * recommended; or refused by the lease, with the clause. The full calculation is folded beneath.
 */
export function Answer({
  scenario,
  result: r,
  pending,
  adviceDrafts,
  decisionDrafts,
  onAssign,
  named,
  asOf,
  robustness,
  robustnessPending,
}: {
  scenario: Scenario;
  result: ScenarioResult;
  pending: boolean;
  /** The new action on each aircraft the advice changes, drafted for assigning, by tail. */
  adviceDrafts: Record<string, AssignmentDraft>;
  /** Each decision better than today's plan, drafted for assigning, by its place in the list. */
  decisionDrafts: Record<number, AssignmentDraft>;
  onAssign: (d: AssignmentDraft) => void;
  named: TailChoices[];
  asOf: string;
  robustness: Robustness | null;
  robustnessPending: boolean;
}) {
  const { role } = useDemo();
  const empty = !scenario.world.length && !scenario.decisions.length;
  const effects = [...r.worldEffects.map(worldEffectSentence), ...r.verdicts.map(decisionEffectSentence).filter((x): x is string => !!x)];
  const assign = (d: AssignmentDraft | undefined) =>
    d && canAssign(role) ? (
      <button className="link" onClick={() => onAssign(d)}>
        Assign and notify
      </button>
    ) : null;
  return (
    <div className={pending ? 'opacity-60' : ''}>
      {empty ? (
        <p className="text-slate-500">Change a figure or add a decision above to see what it does to your plan.</p>
      ) : (
        <>
          <p className="text-display font-semibold tracking-tight">{answerSentence(r, scenario)}</p>
          <div className="mt-3 flex flex-wrap gap-12 tabular-nums">
            <span>
              <span className="text-slate-500">Today </span>
              <span className="font-semibold">{money(r.today.allIn)}</span>
            </span>
            {scenario.world.length > 0 && (
              <span>
                <span className="text-slate-500">With the changed figures </span>
                <span className="font-semibold">{money(r.world.allIn)}</span>
              </span>
            )}
          </div>
          {effects.length > 0 && (
            <ul className="mt-4 space-y-1">
              {effects.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          {scenario.world.length > 0 && (
            <>
              <h3 className="caps mt-12 mb-3">The tool's advice changes</h3>
              {r.advice.length === 0 ? (
                <p className="text-slate-500">Nothing: with the changed figures, every recommendation stands.</p>
              ) : (
                <table className="w-full">
                  <tbody>
                    {r.advice.map((c) => (
                      <tr key={c.tail} className="border-t border-slate-100 align-baseline first:border-t-0">
                        <td className="py-3 pr-6 font-medium whitespace-nowrap">{c.tail}</td>
                        <td className="py-3 pr-6">
                          <span className="text-slate-500">{c.from}</span> → {c.to}
                        </td>
                        <td className="py-3 pr-6 text-balance">{when(c, asOf)}</td>
                        <td className="py-3 pr-6 text-right whitespace-nowrap tabular-nums">{signed(c.difference)}</td>
                        <td className="py-3 text-right whitespace-nowrap">
                          {adviceDrafts[c.tail] ? assign(adviceDrafts[c.tail]) : <span className="text-label text-slate-500">nothing to assign</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {r.verdicts.length > 0 && (
            <>
              <h3 className="caps mt-12 mb-3">Your decisions</h3>
              <ul>
                {r.verdicts.map((v, k) => (
                  <li key={k} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-slate-100 py-3 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <div>{decisionSentence(v.proposal, named)}</div>
                      <div className={`mt-1 ${v.verdict === 'better' ? 'font-medium' : 'text-slate-500'}`}>
                        {v.verdict === 'refused' ? (
                          <>
                            <span className="font-medium text-slate-900">Not possible:</span> <ClauseText tail={v.proposal.tail} text={v.refused!} />
                          </>
                        ) : (
                          verdictSentence(v)
                        )}
                      </div>
                    </div>
                    {v.verdict === 'better' && (
                      <>
                        {v.closing && v.proposal.kind !== 'return' && (
                          <span className="text-balance">
                            {when({ decideBy: v.closing.decideBy ?? v.closing.grounded?.from ?? null, slotMonth: v.closing.slotMonth, noDeadline: !!v.closing.startNow }, asOf)}
                          </span>
                        )}
                        <span className="whitespace-nowrap">
                          {decisionDrafts[k] ? (
                            assign(decisionDrafts[k])
                          ) : (
                            <span className="text-label text-slate-500">{v.proposal.kind === 'return' ? 'agree it with the lessor' : 'nothing to assign'}</span>
                          )}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
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
