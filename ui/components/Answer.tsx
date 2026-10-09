import type { AssignmentDraft } from '../../calc/assign';
import type { PlanTotals, Scenario, ScenarioResult } from '../../calc/scenario';
import type { Robustness } from '../../calc/robustness';
import { useDemo } from '../demo';
import { decideBy, money } from '../format';
import { decisionEffectSentence, worldEffectSentence } from '../questions';
import { canAssign } from '../roles';
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
 * The answer, beside the questions so it stays in view: one sentence, the two totals, what each change
 * does on its own, and the tool's advice — the recommendations the changed figures change, each ready to
 * assign. Your decisions are judged where you added them (DecisionList), never here.
 */
export function Answer({
  scenario,
  result: r,
  pending,
  adviceDrafts,
  onAssign,
  asOf,
}: {
  scenario: Scenario;
  result: ScenarioResult;
  pending: boolean;
  /** The new action on each aircraft the advice changes, drafted for assigning, by tail. */
  adviceDrafts: Record<string, AssignmentDraft>;
  onAssign: (d: AssignmentDraft) => void;
  asOf: string;
}) {
  const { role } = useDemo();
  const empty = !scenario.world.length && !scenario.decisions.length;
  const effects = [...r.worldEffects.map(worldEffectSentence), ...r.verdicts.map(decisionEffectSentence).filter((x): x is string => !!x)];
  const totals = (
    <div className="flex flex-wrap gap-x-12 gap-y-2 tabular-nums">
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
  );
  if (empty)
    return (
      <div>
        <p className="mb-3 text-slate-500">Change a figure or add a decision to see what it does to your plan.</p>
        {totals}
      </div>
    );
  return (
    <div className={`transition-opacity ${pending ? 'opacity-60' : ''}`}>
      <p className="text-display font-semibold tracking-tight text-balance">{answerSentence(r, scenario)}</p>
      <div className="mt-3">{totals}</div>
      {effects.length > 0 && (
        <ul className="mt-6 border-t border-slate-100">
          {effects.map((e) => (
            <li key={e} className="border-b border-slate-100 py-2">
              {e}
            </li>
          ))}
        </ul>
      )}

      {scenario.world.length > 0 &&
        (r.advice.length === 0 ? (
          <p className="mt-6 text-slate-500">The tool's advice holds: every recommendation stands with these figures.</p>
        ) : (
          <>
            <h3 className="caps mt-10 mb-1">The tool's advice changes</h3>
            <ul>
              {r.advice.map((c) => (
                <li key={c.tail} className="border-t border-slate-100 py-3 first:border-t-0">
                  <div>
                    <span className="mr-3 font-medium">{c.tail}</span>
                    <span className="text-slate-500">{c.from}</span> → {c.to}
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-4 text-label">
                    <span>{when(c, asOf)}</span>
                    <span className="tabular-nums">{signed(c.difference)}</span>
                    {adviceDrafts[c.tail] ? (
                      canAssign(role) && (
                        <button className="link" onClick={() => onAssign(adviceDrafts[c.tail]!)}>
                          Assign and notify
                        </button>
                      )
                    ) : (
                      <span className="text-slate-500">nothing to assign</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ))}
    </div>
  );
}

/** The full calculation, folded: the three-column totals and the evidence behind each figure. */
export function Calculation({ scenario, result, robustness, robustnessPending }: { scenario: Scenario; result: ScenarioResult; robustness: Robustness | null; robustnessPending: boolean }) {
  const empty = !scenario.world.length && !scenario.decisions.length;
  return (
    <details>
      <summary className="cursor-pointer">
        <span className="caps">Show the calculation</span>
      </summary>
      <div className="mt-6 space-y-12">
        {!empty && <Totals r={result} />}
        <Evidence robustness={robustness} pending={robustnessPending} />
      </div>
    </details>
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
