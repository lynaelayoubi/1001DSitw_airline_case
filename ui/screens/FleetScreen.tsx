import { Fragment, useMemo, useState } from 'react';

import { RETURNING_WINDOW_MONTHS } from '../../calc/constants';
import type { ComponentResult, FleetExposure, RequirementResult, TailResult } from '../../calc/exposure';
import { actionOf, type FleetRecommendation, type TailPlan } from '../../calc/recommend';
import type { BudgetPlan } from '../../calc/budget';
import type { ClosingDecisions } from '../../calc/deadlines';
import { describeInput, type ExtensionEffects, type Robustness } from '../../calc/robustness';
import type { Assumptions, Proposal } from '../../calc/types';
import type { TailChoices, WhatIf as WhatIfResult } from '../../calc/whatif';
import { Headline } from '../components/Headline';
import { RecommendedActions } from '../components/RecommendedActions';
import { HowFirm } from '../components/HowFirm';
import { WhatThisAssumes } from '../components/WhatThisAssumes';
import { WhatYouCanDo } from '../components/WhatYouCanDo';
import { Working } from '../components/Working';
import { date, int, kindLabel, money, months, unitLabel } from '../format';

/**
 * SPEC §3.1 — the screen leads with its answer: the recommended actions, soonest first, with the
 * avoidable total beside them. Under it, what justifies it: the headline, then one row per
 * returning tail, ranked by money (the full fleet behind a toggle; tails beyond the window show no
 * figure, because a projection across years with no shop visit in it is not a forecast). Then what
 * the customer can do — his own what-if and this year's budget — and last, collapsed, what the
 * answers assume and how firm they are. A row whose recommended action differs from the plan at
 * rest says what it was.
 */
export default function FleetScreen({
  fleet,
  plans,
  atRest,
  robustness,
  extension,
  robustnessPending,
  assumptions,
  onAssumptions,
  budget,
  onBudget,
  budgetPlan,
  closing,
  choices,
  proposals,
  onProposals,
  whatIf,
}: {
  fleet: FleetExposure;
  plans: FleetRecommendation;
  atRest: FleetRecommendation;
  robustness: Robustness | null;
  extension: ExtensionEffects | null;
  robustnessPending: boolean;
  assumptions: Assumptions;
  onAssumptions: (a: Assumptions) => void;
  budget: number | null;
  onBudget: (b: number | null) => void;
  budgetPlan: BudgetPlan;
  closing: ClosingDecisions;
  choices: TailChoices[];
  proposals: Proposal[];
  onProposals: (p: Proposal[]) => void;
  whatIf: WhatIfResult | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!showAll) return fleet.returning;
    const rest = fleet.tails.filter((t) => t.status !== 'returning').sort((a, b) => a.projection.monthsToReturn - b.projection.monthsToReturn);
    return [...fleet.returning, ...rest];
  }, [fleet, showAll]);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 text-slate-900">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Handback</h1>
          <p className="text-sm text-slate-500">
            End-of-lease exposure by tail · as of {date(fleet.asOf)} · {fleet.returning.length} tails handing back inside {RETURNING_WINDOW_MONTHS} months
          </p>
        </div>
        <div className="flex overflow-hidden rounded-md border border-slate-300 text-sm">
          <button className={`px-3 py-1.5 ${!showAll ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`} onClick={() => setShowAll(false)}>
            Returning ({fleet.returning.length})
          </button>
          <button className={`px-3 py-1.5 ${showAll ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`} onClick={() => setShowAll(true)}>
            Whole fleet ({fleet.tails.length})
          </button>
        </div>
      </header>

      <RecommendedActions closing={closing} totals={plans.totals} />
      <Headline fleet={fleet} plans={plans} />

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-[10.5px] font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <Th>Tail</Th>
              <Th>Type</Th>
              <Th>Lessor</Th>
              <Th>Return</Th>
              <Th right>Months left</Th>
              <Th right tip="Compensation and life handed over at handback if this tail does nothing.">
                If nothing changes
              </Th>
              <Th right tip="Work, downtime and what is still owed at handback, after the recommended action.">
                After recommendation
              </Th>
              <Th tip="The clock that sets what this tail pays: short at handback, or the nearest to it.">Binding clock</Th>
              <Th tip="Whether the lease recognises each component's last shop visit as resetting its clock, and what handback costs more if it does not.">
                Clock reset
              </Th>
              <Th tip="The last date to commit to the recommended action.">Decide by</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <Fragment key={t.tail}>
                <TailRow
                  t={t}
                  plan={plans.byTail[t.tail]}
                  before={atRest.byTail[t.tail]}
                  leftOut={budget !== null && budgetPlan.leftOut.some((x) => x.tail === t.tail)}
                  open={open === t.tail}
                  onToggle={() => setOpen(open === t.tail ? null : t.tail)}
                />
                {open === t.tail && <TailDetail t={t} plan={plans.byTail[t.tail]} robustness={robustness} />}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <WhatYouCanDo
        extension={extension}
        budget={budget}
        onBudget={onBudget}
        budgetPlan={budgetPlan}
        choices={choices}
        proposals={proposals}
        onProposals={onProposals}
        whatIf={whatIf}
      />

      {/* What the answers rest on, and how firm they are: justification, under what it justifies. */}
      <div className="mt-6">
        <WhatThisAssumes assumptions={assumptions} onChange={onAssumptions} robustness={robustness} pending={robustnessPending} />
        <HowFirm robustness={robustness} pending={robustnessPending} />
      </div>

    </main>
  );
}

/** A column head; its tip is one sentence answering what the column is. */
function Th({ children, right, tip }: { children: React.ReactNode; right?: boolean; tip?: string }) {
  return (
    <th className={`px-2 py-2 font-medium whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${tip ? 'cursor-help' : ''}`} title={tip}>
      {children}
    </th>
  );
}

function TailRow({ t, plan, before, leftOut, open, onToggle }: { t: TailResult; plan?: TailPlan; before?: TailPlan; leftOut: boolean; open: boolean; onToggle: () => void }) {
  const r = t.asRecorded;
  const beyond = !t.withinHorizon;
  return (
    <tr className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${open ? 'bg-slate-50' : ''}`} onClick={onToggle}>
      <td className="px-2 py-2 font-medium whitespace-nowrap">
        <span className="mr-1 inline-block w-3 text-slate-400">{open ? '▾' : '▸'}</span>
        {t.tail}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">{t.type}</td>
      <td className="max-w-[9rem] px-2 py-2 leading-tight text-slate-600">{t.lessor}</td>
      <td className="px-2 py-2 whitespace-nowrap">{date(t.projection.effectiveLeaseEnd)}</td>
      <td className="px-2 py-2 text-right tabular-nums">
        {months(t.projection.monthsToReturn)}
      </td>
      {beyond ? (
        <>
          <td className="px-2 py-2 text-right text-xs text-slate-400" colSpan={2}>
            beyond the {RETURNING_WINDOW_MONTHS}-month window — not forecast
          </td>
          <td className="px-2 py-2 text-slate-300">—</td>
        </>
      ) : (
        <>
          <td className="px-2 py-2 text-right">
            <span className="font-semibold tabular-nums">{money(r.exposure)}</span>
            <Breakdown t={t} />
          </td>
          <td className="px-2 py-2 text-right">
            {plan ? <AfterRecommendation plan={plan} before={before} leftOut={leftOut} /> : <span className="text-slate-300">—</span>}
          </td>
          <td className="px-2 py-2 whitespace-nowrap">
            <span className="font-medium">{t.binding.position}</span> · {unitLabel[t.binding.unit]}
            {t.binding.how === 'tightest' && <span className="ml-1 text-xs text-slate-400">clear</span>}
          </td>
        </>
      )}
      <td className="px-2 py-2">
        {t.qmeFlag ? (
          <div className="text-[12px] leading-tight">
            <div className="font-medium text-amber-800">not recognised: {t.qmePositions.join(', ')}</div>
            {!beyond && t.qmeDelta > 0 && <div className="text-amber-700 tabular-nums">{money(t.qmeDelta)} more at handback</div>}
          </div>
        ) : (
          <span className="text-xs text-slate-400">recognised</span>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        {plan?.decisionDeadline ? (
          date(plan.decisionDeadline)
        ) : (
          <span className="text-xs text-slate-400">{plan ? 'nothing to book' : '—'}</span>
        )}
      </td>
    </tr>
  );
}

/** The plan's all-in figure, what it saves (or costs over the do-nothing figure), and what it is — and what it was, if the scenario changed it. */
function AfterRecommendation({ plan, before, leftOut }: { plan: TailPlan; before?: TailPlan; leftOut: boolean }) {
  const changed = before && actionOf(before) !== actionOf(plan);
  return (
    <div className="ml-auto max-w-[13rem]">
      <span className="font-semibold tabular-nums">{money(plan.after)}</span>
      {/* A forced tail shows no saving: the do-nothing it would be measured against cannot happen. */}
      {!plan.forced && plan.avoidable > 0 && <div className="text-[11px] text-emerald-700 tabular-nums">−{money(plan.avoidable)}</div>}
      {!plan.forced && plan.avoidable < 0 && <div className="text-[11px] text-red-700 tabular-nums">+{money(-plan.avoidable)}</div>}
      <div className={`text-[11px] leading-tight ${changed ? 'font-medium text-violet-800' : 'text-slate-500'}`}>
        {plan.forced && (
          <span className="mr-1 cursor-help rounded bg-slate-800 px-1 py-px text-[10px] font-medium text-white" title={plan.forced}>
            forced
          </span>
        )}
        {plan.label}
      </div>
      {plan.role === 'own' && !plan.recommendation.call.stands && (
        <div className="text-[11px] leading-tight text-amber-800">{plan.recommendation.call.why}</div>
      )}
      {changed && <div className="text-[11px] leading-tight text-slate-400">was: {before!.label}</div>}
      {leftOut && <div className="text-[11px] leading-tight font-medium text-red-800">left out of the budget — pays at handback</div>}
    </div>
  );
}

const KIND_SHORT: Record<string, string> = { engine: 'ENG', 'landing-gear': 'MLG', airframe: 'AF', apu: 'APU' };

function Breakdown({ t }: { t: TailResult }) {
  return (
    <div className="mt-0.5 flex justify-end gap-2 text-[11px] text-slate-500">
      {(['engine', 'landing-gear', 'airframe', 'apu'] as const).map((k) => {
        const v = t.asRecorded.byKind[k].exposure;
        return (
          <span key={k} className={v > 0 ? '' : 'text-slate-300'}>
            {KIND_SHORT[k]} <span className="tabular-nums">{money(v)}</span>
          </span>
        );
      })}
    </div>
  );
}

function TailDetail({ t, plan, robustness }: { t: TailResult; plan?: TailPlan; robustness: Robustness | null }) {
  const rec = plan?.role === 'own' ? plan.recommendation : null;
  return (
    <tr className="border-t border-slate-100 bg-slate-50/60">
      <td colSpan={10} className="px-3 py-3">
        <div className="grid gap-3">
          {plan && (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="text-sm">
                <span className="font-semibold">{plan.label}</span>
                {rec?.runnerUp && (
                  <span className="text-slate-500">
                    {' '}
                    · next best: {rec.runnerUp.label}, {money(rec.delta)} more
                  </span>
                )}
              </div>
              <Working>{`${t.projection.trace}\n\n${plan.trace}`}</Working>
            </div>
          )}
          <TailRobustness tail={t.tail} robustness={robustness} />
          {t.asRecorded.components.map((c, i) => (
            <ComponentCard key={c.componentId} c={c} lease={t.asLeaseAllows.components[i]!} />
          ))}
        </div>
      </td>
    </tr>
  );
}

/** How far each input would have to move, down and up, before this tail's answer changes. */
export function TailRobustness({ tail, robustness }: { tail: string; robustness: Robustness | null }) {
  if (!robustness) return <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">Checking how far each input would have to move…</div>;
  const side = (input: Robustness['inputs'][number], dir: 'down' | 'up') => {
    const f = input.byTail[tail]?.[dir];
    const edge = dir === 'down' ? input.input.range.min : input.input.range.max;
    if (Math.abs(edge - input.current) < 1e-12) return <span className="text-slate-300">—</span>;
    return f ? (
      <span>
        <span className="font-medium text-violet-800">{f.change}</span> → {f.to} <span className="text-slate-400">(reach {Math.round(f.reach * 100)}%)</span>
      </span>
    ) : (
      <span className="text-slate-400">holds to {describeInput(input.input, edge, input.current)}</span>
    );
  };
  const state = robustness.byTail[tail] ?? 'firm';
  const near = robustness.close.find((c) => c.tail === tail);
  return (
    <details className="rounded-md border border-slate-200 bg-white">
      <summary className="cursor-pointer px-3 py-2 text-sm">
        How firm this answer is — <span className="font-medium">{state}</span>
        {near && (
          <span className="text-slate-500">
            : {near.input.label.toLowerCase()} {near.flip.change} would change it
          </span>
        )}
      </summary>
      <table className="w-full text-xs">
        <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
          <tr>
            <Th>Input</Th>
            <Th>Lower</Th>
            <Th>Higher</Th>
            <Th>Real number from</Th>
          </tr>
        </thead>
        <tbody>
          {robustness.inputs.map((x) => (
            <tr key={x.input.id} className="border-t border-slate-100">
              <td className="px-3 py-1.5 whitespace-nowrap">{x.input.label}</td>
              <td className="px-3 py-1.5">{side(x, 'down')}</td>
              <td className="px-3 py-1.5">{side(x, 'up')}</td>
              <td className="px-3 py-1.5 text-slate-500">{x.input.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function ComponentCard({ c, lease }: { c: ComponentResult; lease: ComponentResult }) {
  const flagged = c.qmeStatus === 'not-evidenced';
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div>
          <span className="font-semibold">{c.position}</span> <span className="text-slate-500">· {kindLabel[c.kind]} · {c.serial}</span>
          {flagged && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
              the lease does not recognise its last shop visit: the records do not meet its definition of a qualifying event, so the clock does not reset
            </span>
          )}
        </div>
        <div className="text-sm tabular-nums">
          <span className="font-semibold">{money(c.exposure)}</span>
          {flagged && (
            <>
              <span className="text-slate-500"> if the reset counts</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-semibold text-amber-800">{money(lease.exposure)}</span>
              <span className="text-slate-500"> under the lease, where it does not</span>
            </>
          )}
        </div>
      </div>
      <table className="w-full text-xs">
        <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
          <tr>
            <Th>Clause</Th>
            <Th>Clock</Th>
            <Th right>Today</Th>
            <Th right>Flown before handback</Th>
            <Th right>At return</Th>
            <Th right>Lease demands</Th>
            <Th right>Gap</Th>
            <Th right>Compensation</Th>
            <Th right>Over-delivery</Th>
            {flagged && <Th right>Under the lease</Th>}
          </tr>
        </thead>
        <tbody>
          {c.requirements.map((r, i) => (
            <RequirementRow key={r.requirementId} r={r} binding={r.requirementId === c.binding.requirementId} how={c.binding.how} lease={flagged ? lease.requirements[i] : undefined} />
          ))}
        </tbody>
      </table>
      <div className="border-t border-slate-100 px-3 py-1.5">
        <Working>
          {[c.trace, ...c.requirements.map((r) => r.trace), ...(flagged ? [`Under the lease, where the reset does not count: ${lease.trace}`] : [])].join('\n\n')}
        </Working>
      </div>
    </div>
  );
}

function RequirementRow({ r, binding, how, lease }: { r: RequirementResult; binding: boolean; how: 'shortfall' | 'tightest'; lease?: RequirementResult }) {
  const u = r.unit;
  const short = r.gap > 0;
  return (
    <tr className={`border-t border-slate-100 ${binding ? 'bg-slate-50' : ''}`}>
      <td className="px-3 py-1.5 whitespace-nowrap text-slate-500">{r.clauseRef}</td>
      <td className="px-3 py-1.5 whitespace-nowrap">
        {unitLabel[u]}
        {r.group === 'llp' && <span className="text-slate-400"> (LLP)</span>}
        {binding && <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">{how === 'shortfall' ? 'binds' : 'runs out first'}</span>}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{int(r.remainingToday)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">−{int(r.projectedUse)}</td>
      <td className={`px-3 py-1.5 text-right tabular-nums ${r.remainingAtReturn < 0 ? 'text-red-700' : ''}`}>{int(r.remainingAtReturn)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">≥ {int(r.threshold)}</td>
      <td className={`px-3 py-1.5 text-right tabular-nums ${short ? 'font-medium text-red-700' : 'text-emerald-700'}`}>
        {short ? `${int(r.gap)} short` : `${int(-r.gap)} over`}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{r.compensation > 0 ? money(r.compensation) : <span className="text-slate-300">—</span>}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{r.overDelivery > 0 ? money(r.overDelivery) : <span className="text-slate-300">—</span>}</td>
      {lease && (
        <td className="px-3 py-1.5 text-right tabular-nums text-amber-800">
          {int(lease.remainingAtReturn)} at return · {lease.compensation > 0 ? money(lease.compensation) : '—'}
        </td>
      )}
    </tr>
  );
}
