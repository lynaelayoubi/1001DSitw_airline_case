import { Fragment, useEffect, useMemo, useState } from 'react';

import { RETURNING_WINDOW_MONTHS } from '../../calc/constants';
import type { ComponentResult, FleetExposure, RequirementResult, TailResult } from '../../calc/exposure';
import type { LeverOption } from '../../calc/levers';
import { actionOf, type FleetRecommendation, type TailPlan } from '../../calc/recommend';
import type { BudgetPlan } from '../../calc/budget';
import type { ClosingDecisions } from '../../calc/deadlines';
import { conditionAnchor, type Lease } from '../../calc/lease';
import type { Readiness, ReadinessItem } from '../../calc/readiness';
import type { ExtensionEffects, Robustness } from '../../calc/robustness';
import type { Assumptions, Proposal } from '../../calc/types';
import type { TailChoices, WhatIf as WhatIfResult } from '../../calc/whatif';
import { Headline } from '../components/Headline';
import { RecommendedActions } from '../components/RecommendedActions';
import { HowFirm } from '../components/HowFirm';
import { LeaseView } from '../components/LeaseView';
import { ReadinessList, TailReadiness } from '../components/Readiness';
import { WhatThisAssumes } from '../components/WhatThisAssumes';
import { WhatYouCanDo } from '../components/WhatYouCanDo';
import { Working } from '../components/Working';
import { date, int, kindLabel, money, months, unitLabel } from '../format';
import { LeaseLinksContext, useLeaseLinks } from '../leaseLinks';

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
  leaseOf,
  readiness,
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
  leaseOf: (tail: string) => Lease | null;
  readiness: Readiness;
}) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  // The lease slide-over, and the requirement row a lease condition was followed back to.
  const [lease, setLease] = useState<{ tail: string; anchor?: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const links = useMemo(() => ({ leaseOf, open: (tail: string, anchor?: string) => setLease({ tail, anchor }) }), [leaseOf]);
  const shown = lease ? leaseOf(lease.tail) : null;
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => document.getElementById(flash)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
    const off = setTimeout(() => setFlash(null), 2500);
    return () => {
      clearTimeout(t);
      clearTimeout(off);
    };
  }, [flash]);

  const rows = useMemo(() => {
    // Ranked by the figure each row shows if nothing changes: on a forced tail, acting late.
    const doNothing = (t: TailResult) => plans.byTail[t.tail]?.doNothing ?? t.asRecorded.exposure;
    const returning = [...fleet.returning].sort((a, b) => doNothing(b) - doNothing(a));
    if (!showAll) return returning;
    const rest = fleet.tails.filter((t) => t.status !== 'returning').sort((a, b) => a.projection.monthsToReturn - b.projection.monthsToReturn);
    return [...returning, ...rest];
  }, [fleet, plans, showAll]);

  return (
    <LeaseLinksContext.Provider value={links}>
      <main className="mx-auto max-w-[1500px] px-4 py-6 text-slate-900">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Handback</h1>
            <p className="text-sm text-slate-500">A live model of every lease obligation on the fleet: what it costs, what to do, and the date after which you cannot.</p>
            <p className="text-sm text-slate-500">
              as of {date(fleet.asOf)} · {fleet.returning.length} tails handing back inside {RETURNING_WINDOW_MONTHS} months
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

        <RecommendedActions closing={closing} totals={plans.totals} checks={robustness?.checks ?? []} />
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
                <Th right tip="Compensation and life handed over at handback if this tail does nothing — or, where a part runs out first, the cost of acting only when it does.">
                  If nothing changes
                </Th>
                <Th right tip="Work, downtime and what is still owed at handback, after the recommended action.">
                  After recommendation
                </Th>
                <Th tip="The clock that sets what this tail pays: short at handback, or the nearest to it.">Runs out first</Th>
                <Th tip="Whether the lease counts each component's last shop visit as resetting its clock, and what handback costs more if it does not.">
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
                  {open === t.tail && <TailDetail t={t} plan={plans.byTail[t.tail]} flash={flash} ready={readiness.byTail[t.tail] ?? []} />}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <ReadinessList
          readiness={readiness}
          onShowTail={(tail) => {
            setShowAll(false);
            setOpen(tail);
            setFlash(`tail-${tail}`);
          }}
        />

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
      {lease && shown && (
        <LeaseView
          lease={shown}
          anchor={lease.anchor}
          onClose={() => setLease(null)}
          onGoToRow={(componentId, conditionId) => {
            setLease(null);
            setOpen(shown.tail);
            setFlash(`req-${componentId}-${conditionId}`);
          }}
        />
      )}
    </LeaseLinksContext.Provider>
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
  // No exposure on either basis: the row says there is nothing to decide, and stops.
  const nothing = plan?.role === 'own' && plan.recommendation.nothingToDecide;
  return (
    <tr id={`tail-${t.tail}`} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${open ? 'bg-slate-50' : ''}`} onClick={onToggle}>
      <td className="px-2 py-2 font-medium whitespace-nowrap">
        <span className="mr-1 inline-block w-3 text-slate-400">{open ? '▾' : '▸'}</span>
        {t.tail}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">{t.type}</td>
      <td className="max-w-[9rem] px-2 py-2 leading-tight text-slate-600">
        <LessorLink tail={t.tail} name={t.lessor} />
      </td>
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
      ) : nothing ? (
        <td className="px-2 py-2 text-emerald-800" colSpan={5}>
          cleared: meets every return condition, as recorded and under the lease
        </td>
      ) : (
        <>
          <td className="px-2 py-2 text-right">
            {plan?.recommendation.late ? (
              <>
                <span className="font-semibold tabular-nums">{money(plan.doNothing)}</span>
                <div className="mt-0.5 text-[11px] text-slate-500" title={plan.recommendation.late.label}>
                  acting late, when {plan.recommendation.forced?.position} runs out
                </div>
              </>
            ) : (
              <>
                <span className="font-semibold tabular-nums">{money(r.exposure)}</span>
                <Breakdown t={t} />
              </>
            )}
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
      {!nothing && (
        <td className="px-2 py-2">
          {t.qmeFlag ? (
            <div className="text-[12px] leading-tight">
              <div className="font-medium text-slate-800">not counted: {t.qmePositions.join(', ')}</div>
              {!beyond && t.qmeDelta > 0 && <div className="text-slate-600 tabular-nums">{money(t.qmeDelta)} more at handback</div>}
            </div>
          ) : (
            <span className="text-xs text-slate-400">counted</span>
          )}
        </td>
      )}
      {!nothing && (
        <td className="px-2 py-2 whitespace-nowrap">
          {plan?.decisionDeadline ? (
            date(plan.decisionDeadline)
          ) : plan?.recommendation.recommended.grounded ? (
            <span className="text-xs font-medium text-amber-900">on the ground from {date(plan.recommendation.recommended.grounded.from)}</span>
          ) : plan?.recommendation.recommended.startNow ? (
            <span className="text-xs">no deadline · loses {money(plan.recommendation.recommended.startNow.perMonth)} a month</span>
          ) : (
            <span className="text-xs text-slate-400">{plan ? 'nothing to book' : '—'}</span>
          )}
        </td>
      )}
    </tr>
  );
}

/** What the next best option is, in a word or two: a shop visit, an overhaul, a swap, a route change. */
function optionNoun(o: LeverOption): string {
  if (o.lever === 'L2') return 'a route change';
  if (o.lever === 'L3') return 'a swap';
  return o.position === 'APU' ? 'an APU overhaul' : o.position === 'MLG' ? 'a gear overhaul' : 'a shop visit';
}

/** The plan's all-in figure, what it saves (or costs over the do-nothing figure), and what it is — and what it was, if the scenario changed it. */
function AfterRecommendation({ plan, before, leftOut }: { plan: TailPlan; before?: TailPlan; leftOut: boolean }) {
  const changed = before && actionOf(before) !== actionOf(plan);
  return (
    <div className="ml-auto max-w-[13rem]">
      <span className="font-semibold tabular-nums">{money(plan.after)}</span>
      {/* A forced tail's saving is against acting late, when its part runs out. */}
      {plan.avoidable > 0.5 && (
        <div className="text-[11px] text-emerald-700 tabular-nums">
          −{money(plan.avoidable)}
          {plan.forced && ' vs acting late'}
        </div>
      )}
      {plan.avoidable < -0.5 && (
        <div className="text-[11px] text-red-700 tabular-nums">
          +{money(-plan.avoidable)}
          {plan.forced && ' vs acting late'}
        </div>
      )}
      <div className={`text-[11px] leading-tight ${changed ? 'font-medium text-violet-800' : 'text-slate-500'}`}>
        {plan.forced && (
          <span className="mr-1 cursor-help rounded bg-amber-100 px-1 py-px text-[10px] font-medium text-amber-900" title="A part runs out before the aircraft goes back, so it has to be dealt with.">
            required
          </span>
        )}
        {plan.label}
      </div>
      {plan.role === 'own' && plan.recommendation.recommended.lever === 'pay' && plan.recommendation.call.stands && plan.recommendation.runnerUp && (
        <div className="text-[11px] leading-tight text-slate-500">
          paying beats {optionNoun(plan.recommendation.runnerUp)} by {money(plan.recommendation.delta)}
        </div>
      )}
      {plan.role === 'own' && !plan.recommendation.call.stands && (
        <div className="text-[11px] leading-tight text-slate-500">{plan.recommendation.call.why}</div>
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

/** The lessor's name opens the tail's lease. */
function LessorLink({ tail, name }: { tail: string; name: string }) {
  const links = useLeaseLinks();
  return (
    <button
      className="text-left underline decoration-slate-300 decoration-dotted underline-offset-2 hover:text-slate-900"
      title={`Open ${tail}'s lease.`}
      onClick={(e) => {
        e.stopPropagation();
        links?.open(tail);
      }}
    >
      {name}
    </button>
  );
}

function TailDetail({
  t,
  plan,
  flash,
  ready,
}: {
  t: TailResult;
  plan?: TailPlan;
  flash: string | null;
  ready: ReadinessItem[];
}) {
  const rec = plan?.role === 'own' ? plan.recommendation : null;
  const nothing = rec?.nothingToDecide ?? false;
  return (
    <tr className="border-t border-slate-100 bg-slate-50/60">
      <td colSpan={10} className="px-3 py-3">
        <div className="grid gap-3">
          {plan && !nothing && (
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
              <Working tail={t.tail} text={`${t.projection.trace}\n\n${plan.trace}`} />
            </div>
          )}
          <TailReadiness items={ready} />
          {t.asRecorded.components.map((c, i) => (
            <ComponentCard key={c.componentId} tail={t.tail} c={c} lease={t.asLeaseAllows.components[i]!} flash={flash} />
          ))}
        </div>
      </td>
    </tr>
  );
}

function ComponentCard({ tail, c, lease, flash }: { tail: string; c: ComponentResult; lease: ComponentResult; flash: string | null }) {
  const flagged = c.qmeStatus === 'not-evidenced';
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div>
          <span className="font-semibold">{c.position}</span> <span className="text-slate-500">· {kindLabel[c.kind]} · {c.serial}</span>
          {flagged && (
            <span className="ml-2 text-xs text-slate-600">
              the lease doesn't count its last shop visit: the records don't meet its definition of a qualifying event, so the clock doesn't reset
            </span>
          )}
        </div>
        <div className="text-sm tabular-nums">
          <span className="font-semibold">{money(c.exposure)}</span>
          {flagged && (
            <>
              <span className="text-slate-500"> if the reset counts</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-semibold">{money(lease.exposure)}</span>
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
            <RequirementRow
              key={r.requirementId}
              id={`req-${c.componentId}-${r.requirementId}`}
              flash={flash}
              tail={tail}
              r={r}
              binding={r.requirementId === c.binding.requirementId}
              how={c.binding.how}
              lease={flagged ? lease.requirements[i] : undefined}
            />
          ))}
        </tbody>
      </table>
      <div className="border-t border-slate-100 px-3 py-1.5">
        <Working
          tail={tail}
          text={[c.trace, ...c.requirements.map((r) => r.trace), ...(flagged ? [`Under the lease, where the reset does not count: ${lease.trace}`] : [])].join('\n\n')}
        />
      </div>
    </div>
  );
}

function RequirementRow({
  id,
  flash,
  tail,
  r,
  binding,
  how,
  lease,
}: {
  id: string;
  flash: string | null;
  tail: string;
  r: RequirementResult;
  binding: boolean;
  how: 'shortfall' | 'tightest';
  lease?: RequirementResult;
}) {
  const links = useLeaseLinks();
  const u = r.unit;
  const short = r.gap > 0;
  return (
    <tr id={id} className={`border-t border-slate-100 transition-colors ${flash === id ? 'bg-violet-100' : binding ? 'bg-slate-50' : ''}`}>
      <td className="px-3 py-1.5 whitespace-nowrap text-slate-500">
        <button
          className="underline decoration-slate-300 decoration-dotted underline-offset-2 hover:text-violet-800"
          onClick={(e) => {
            e.stopPropagation();
            links?.open(tail, conditionAnchor({ id: r.requirementId }));
          }}
        >
          {r.clauseRef}
        </button>
      </td>
      <td className="px-3 py-1.5 whitespace-nowrap">
        {unitLabel[u]}
        {r.group === 'llp' && <span className="text-slate-400"> (LLP)</span>}
        {binding && <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">{how === 'shortfall' ? 'costs most' : 'runs out first'}</span>}
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
        <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">
          {int(lease.remainingAtReturn)} at return · {lease.compensation > 0 ? money(lease.compensation) : '—'}
        </td>
      )}
    </tr>
  );
}
