import { Fragment, useMemo } from 'react';

import { RETURNING_WINDOW_MONTHS } from '../../calc/constants';
import type { ComponentResult, RequirementResult, TailResult } from '../../calc/exposure';
import type { LeverOption } from '../../calc/levers';
import { actionOf, type TailPlan } from '../../calc/recommend';
import { conditionAnchor } from '../../calc/lease';
import type { ReadinessItem } from '../../calc/readiness';
import type { AssignmentDraft } from '../../calc/assign';
import type { CloseCall } from '../../calc/robustness';
import { ActivityLog } from '../components/ActivityLog';
import { checkNote } from '../components/HowFirm';
import { slotMonthOf } from '../../calc/deadlines';
import { AlsoWorthKnowing, Headline } from '../components/Headline';
import { RecommendedActions } from '../components/RecommendedActions';
import { TailReadiness } from '../components/Readiness';
import { Working } from '../components/Working';
import { date, decideBy, int, kindLabel, money, months, unitLabel } from '../format';
import { useLeaseLinks } from '../leaseLinks';
import type { ScreenProps } from './Shell';

/**
 * SPEC §3.1 — the Overview leads with its answer: the recommended actions, soonest first, with what
 * acting now saves beside them; under them the headline money, then one row per returning tail,
 * ranked by money (the full fleet behind a toggle; tails beyond the window show no figure, because a
 * projection across years with no shop visit in it is not a forecast). Opening a tail shows its
 * detail and the calculation behind it. Nothing else: scenarios, leases and the return checklist are
 * pages of their own. A row whose recommended action differs from the plan at rest says what it was.
 */
export default function Overview({
  fleet,
  plans,
  atRest,
  robustness,
  budget,
  budgetPlan,
  closing,
  readiness,
  showAll,
  onShowAll,
  open,
  onOpen,
  flash,
  drafts,
  onAssign,
  onTry,
  tryable,
}: Pick<ScreenProps, 'fleet' | 'plans' | 'atRest' | 'robustness' | 'budget' | 'budgetPlan' | 'closing' | 'readiness'> & {
  showAll: boolean;
  onShowAll: (v: boolean) => void;
  open: string | null;
  onOpen: (tail: string | null) => void;
  flash: string | null;
  drafts: Record<string, AssignmentDraft>;
  onAssign: (d: AssignmentDraft) => void;
  /** Opens Scenario planning with the aircraft picked; null where the role cannot open it. */
  onTry: ((tail: string) => void) | null;
  /** The aircraft the decision picker offers: every returning one but the cleared. */
  tryable: Set<string>;
}) {
  const rows = useMemo(() => {
    // Ranked by the figure each row shows if nothing changes: on a forced tail, acting late.
    const doNothing = (t: TailResult) => plans.byTail[t.tail]?.doNothing ?? t.asRecorded.exposure;
    const returning = [...fleet.returning].sort((a, b) => doNothing(b) - doNothing(a));
    if (!showAll) return returning;
    const rest = fleet.tails.filter((t) => t.status !== 'returning').sort((a, b) => a.projection.monthsToReturn - b.projection.monthsToReturn);
    return [...returning, ...rest];
  }, [fleet, plans, showAll]);

  return (
    <>
      <div className="mb-12 text-slate-500">
        <p>A live model of every lease obligation on the fleet: what it costs, what to do, and the date after which you cannot.</p>
        <p>
          as of {date(fleet.asOf)} · {fleet.returning.length} tails handing back inside {RETURNING_WINDOW_MONTHS} months
        </p>
      </div>

      <RecommendedActions closing={closing} totals={plans.totals} checks={robustness?.checks ?? []} asOf={fleet.asOf} drafts={drafts} onAssign={onAssign} onTry={onTry} />
      <ActivityLog />
      <Headline fleet={fleet} plans={plans} />

      <div className="mt-12 flex flex-wrap items-end justify-between gap-6">
        <h2 className="caps">Fleet</h2>
        <div className="flex overflow-hidden rounded-md border border-slate-200">
          <button className={`px-3 py-1 ${!showAll ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-900'}`} onClick={() => onShowAll(false)}>
            Returning ({fleet.returning.length})
          </button>
          <button className={`px-3 py-1 ${showAll ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-900'}`} onClick={() => onShowAll(true)}>
            Whole fleet ({fleet.tails.length})
          </button>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead className="caps">
            <tr className="border-b border-slate-200">
              <Th>Tail</Th>
              <Th>Return</Th>
              <Th right tip="Compensation at handback if this tail does nothing, and the life of any engine another option would keep — or, where a part runs out first, the cost of acting only when it does.">
                If nothing changes
              </Th>
              <Th right tip="Work, downtime and what is still owed at handback, after the recommended action.">
                After recommendation
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
                  // The note sits on the action row where there is one; a tail that pays has none, so it sits here.
                  check={closing.items.some((i) => i.tail === t.tail) ? undefined : robustness?.checks.find((c) => c.tail === t.tail)}
                  open={open === t.tail}
                  onToggle={() => onOpen(open === t.tail ? null : t.tail)}
                  onTry={onTry && tryable.has(t.tail) ? () => onTry(t.tail) : undefined}
                />
                {open === t.tail && <TailDetail t={t} plan={plans.byTail[t.tail]} flash={flash} ready={readiness.byTail[t.tail] ?? []} />}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <AlsoWorthKnowing fleet={fleet} plans={plans} />
    </>
  );
}

/** A column head; its tip is one sentence answering what the column is. */
function Th({ children, right, tip }: { children: React.ReactNode; right?: boolean; tip?: string }) {
  return (
    <th className={`px-2 pt-0 pb-3 font-medium whitespace-nowrap first:pl-0 last:pr-0 ${right ? 'text-right' : 'text-left'} ${tip ? 'cursor-help' : ''}`} title={tip}>
      {children}
    </th>
  );
}

function TailRow({
  t,
  plan,
  before,
  leftOut,
  check,
  open,
  onToggle,
  onTry,
}: {
  t: TailResult;
  plan?: TailPlan;
  before?: TailPlan;
  leftOut: boolean;
  check?: CloseCall;
  open: boolean;
  onToggle: () => void;
  onTry?: () => void;
}) {
  const r = t.asRecorded;
  const beyond = !t.withinHorizon;
  // No exposure on either basis: the row says there is nothing to decide, and stops.
  const nothing = plan?.role === 'own' && plan.recommendation.nothingToDecide;
  return (
    <tr id={`tail-${t.tail}`} className={`cursor-pointer border-t border-slate-100 align-top first:border-t-0 hover:bg-slate-50 ${open ? 'bg-slate-50' : ''}`} onClick={onToggle}>
      <td className="py-4 pr-2 font-medium whitespace-nowrap">
        <span className="mr-1 inline-block w-3 text-slate-400">{open ? '▾' : '▸'}</span>
        {t.tail}
        {onTry && (
          <div className="mt-1 pl-4 text-label font-normal">
            <button
              className="link"
              onClick={(e) => {
                e.stopPropagation();
                onTry();
              }}
            >
              Try a scenario
            </button>
          </div>
        )}
      </td>
      <td className="px-2 py-4 whitespace-nowrap">{date(t.projection.effectiveLeaseEnd)}</td>
      {beyond ? (
        <>
          <td className="px-2 py-4 text-right text-slate-400" colSpan={2}>
            beyond the {RETURNING_WINDOW_MONTHS}-month window — not forecast
          </td>
        </>
      ) : nothing ? (
        <td className="px-2 py-4 text-slate-500" colSpan={3}>
          cleared: meets every return condition, as recorded and under the lease
        </td>
      ) : (
        <>
          <td className="px-2 py-4 text-right">
            {plan?.recommendation.late ? (
              <>
                <span className="font-semibold tabular-nums">{money(plan.doNothing)}</span>
                <div className="mt-1 text-label text-balance text-slate-500" title={plan.recommendation.late.label}>
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
          <td className="px-2 py-4 text-right">
            {plan ? <AfterRecommendation plan={plan} before={before} leftOut={leftOut} check={check} /> : <span className="text-slate-300">—</span>}
          </td>
        </>
      )}
      {!nothing && (
        <td className="min-w-[8rem] py-4 pl-2">
          {plan?.decisionDeadline ? (
            <span className="text-balance">
              {plan.decisionDeadline === t.projection.asOf
                ? decideBy(plan.decisionDeadline, t.projection.asOf, slotMonthOf(plan.recommendation.recommended, plan.decisionDeadline))
                : date(plan.decisionDeadline)}
            </span>
          ) : plan?.recommendation.recommended.grounded ? (
            <span className="font-medium text-amber-800">on the ground from {date(plan.recommendation.recommended.grounded.from)}</span>
          ) : plan?.recommendation.recommended.startNow ? (
            <span className="text-balance">no deadline · loses {money(plan.recommendation.recommended.startNow.perMonth)} a month</span>
          ) : (
            <span className="text-slate-400">{plan ? 'nothing to book' : '—'}</span>
          )}
        </td>
      )}
    </tr>
  );
}

/** The option paying is measured against, in a few words, naming the part where the noun does not: "a shop visit on ENG2", "an APU overhaul". */
function beatsNoun(o: LeverOption, position: string): string {
  if (o.lever === 'L3') return `a swap of ${position}`;
  return position === 'APU' ? 'an APU overhaul' : position === 'MLG' ? 'a gear overhaul' : `a shop visit on ${position}`;
}

/**
 * The requirement row that shows a capped component's compensation, or null when it is not capped:
 * the binding clock if it is short, otherwise the first short LLP clause. The uncapped figures stay in
 * the calculation; a row never shows one.
 */
function cappedRow(c: ComponentResult): string | null {
  if (c.compensationUncapped - c.compensation < 0.5) return null;
  const at = c.requirements.find((r) => r.requirementId === c.binding.requirementId && r.compensation > 0) ?? c.requirements.find((r) => r.group === 'llp' && r.compensation > 0);
  return at?.requirementId ?? null;
}

/** The plan's all-in figure, what it saves (or costs over the do-nothing figure), and what it is — and what it was, if the scenario changed it. */
function AfterRecommendation({ plan, before, leftOut, check }: { plan: TailPlan; before?: TailPlan; leftOut: boolean; check?: CloseCall }) {
  const changed = before && actionOf(before) !== actionOf(plan);
  const paying = plan.role === 'own' && plan.recommendation.call.stands && plan.recommendation.recommended.lever === 'pay';
  const beats = plan.recommendation.payBeats;
  return (
    <div className="ml-auto max-w-[13rem]">
      <span className="font-semibold tabular-nums">{money(plan.after)}</span> <span className="text-label text-slate-500">all-in</span>
      {/* A forced tail's saving is against acting late, when its part runs out. */}
      {plan.avoidable > 0.5 && (
        <div className="mt-1 text-label text-slate-500 tabular-nums">
          −{money(plan.avoidable)}
          {plan.forced && ' vs acting late'}
        </div>
      )}
      {plan.avoidable < -0.5 && (
        <div className="mt-1 text-label font-medium tabular-nums">
          +{money(-plan.avoidable)}
          {plan.forced && ' vs acting late'}
        </div>
      )}
      <div className={`text-label text-balance ${changed ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
        {plan.forced && (
          <span className="mr-1 cursor-help rounded bg-amber-50 px-1.5 py-px font-medium text-amber-800" title="A part runs out before the aircraft goes back, so it has to be dealt with.">
            required
          </span>
        )}
        {paying ? `Pay at handback: ${money(plan.recommendation.recommended.newCompensation)} cheque` : plan.label}
      </div>
      {/* Measured against the best option on the part that owes most, not the cheapest anywhere. */}
      {paying && beats?.option && (
        <div className="text-label text-balance text-slate-500">
          paying beats {beatsNoun(beats.option, beats.position)} by {money(beats.delta!)}
        </div>
      )}
      {paying && beats && !beats.option && <div className="text-label text-balance text-slate-500">nothing can act on {beats.position} before handback</div>}
      {plan.role === 'own' && !plan.recommendation.call.stands && (
        <div className="text-label text-slate-500">{plan.recommendation.call.why}</div>
      )}
      {changed && <div className="text-label text-slate-400">was: {before!.label}</div>}
      {leftOut && <div className="text-label font-medium">left out of the budget — pays at handback</div>}
      {check && <div className="mt-1 text-label text-balance text-slate-500">Confirm before you act: {checkNote(check)}</div>}
    </div>
  );
}

const KIND_SHORT: Record<string, string> = { engine: 'ENG', 'landing-gear': 'MLG', airframe: 'AF', apu: 'APU' };

function Breakdown({ t }: { t: TailResult }) {
  return (
    <div className="mt-1 ml-auto grid w-max grid-cols-2 justify-items-end gap-x-3 text-label text-slate-500">
      {(['engine', 'landing-gear', 'airframe', 'apu'] as const).map((k) => {
        const v = t.asRecorded.byKind[k].exposure;
        return (
          <span key={k} className={`whitespace-nowrap ${v > 0 ? '' : 'text-slate-300'}`}>
            {KIND_SHORT[k]} <span className="tabular-nums">{money(v)}</span>
          </span>
        );
      })}
    </div>
  );
}

/** What the fleet table leaves to the detail: type, lessor (opening the lease), months left, the clock that sets the bill, and clock reset. */
function TailFacts({ t }: { t: TailResult }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-500">
      <span className="text-slate-900">{t.type}</span>
      <LessorLink tail={t.tail} name={t.lessor} />
      <span className="tabular-nums">{months(t.projection.monthsToReturn)} left</span>
      <span>
        sets the bill: <span className="text-slate-900">{t.binding.position}</span> · {unitLabel[t.binding.unit]}
        {t.binding.how === 'tightest' && ', clear of every condition'}
      </span>
      <span>
        clock reset:{' '}
        {t.qmeFlag ? (
          <span className="text-slate-900">
            not counted on {t.qmePositions.join(', ')}
            {t.withinHorizon && t.qmeDelta > 0 && `, ${money(t.qmeDelta)} more at handback`}
          </span>
        ) : (
          'counted'
        )}
      </span>
    </div>
  );
}

/** The lessor's name opens the tail's lease. */
function LessorLink({ tail, name }: { tail: string; name: string }) {
  const links = useLeaseLinks();
  return (
    <button
      className="link text-left"
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
    <tr className="bg-slate-50">
      <td colSpan={5} className="px-4 pt-2 pb-6">
        <div className="grid gap-4">
          <TailFacts t={t} />
          {plan && !nothing && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div>
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
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <span className="font-semibold">{c.position}</span> <span className="text-slate-500">· {kindLabel[c.kind]} · {c.serial}</span>
          {flagged && (
            <span className="ml-2 text-label text-slate-500">
              the lease doesn't count its last shop visit: the records don't meet its definition of a qualifying event, so the clock doesn't reset
            </span>
          )}
        </div>
        <div className="tabular-nums">
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
      <div className="overflow-x-auto px-4 pt-3 pb-1">
        <table className="w-full text-label">
          <thead className="caps">
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
                capped={cappedRow(c) === null ? null : { at: cappedRow(c)!, total: c.compensation }}
                lease={flagged ? lease.requirements[i] : undefined}
                leaseCapped={flagged && cappedRow(lease) !== null ? { at: cappedRow(lease)!, total: lease.compensation } : null}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-4 py-2">
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
  capped,
  lease,
  leaseCapped,
}: {
  id: string;
  flash: string | null;
  tail: string;
  r: RequirementResult;
  binding: boolean;
  how: 'shortfall' | 'tightest';
  /** The component's compensation is capped at the cost of the work: the one row that shows it, and the figure. */
  capped: { at: string; total: number } | null;
  lease?: RequirementResult;
  leaseCapped: { at: string; total: number } | null;
}) {
  const links = useLeaseLinks();
  const u = r.unit;
  const short = r.gap > 0;
  return (
    <tr id={id} className={`border-t border-slate-100 transition-colors ${flash === id ? 'bg-accent-soft' : binding ? 'bg-slate-50' : ''}`}>
      <td className="py-1.5 pr-2 whitespace-nowrap">
        <button
          className="link"
          onClick={(e) => {
            e.stopPropagation();
            links?.open(tail, conditionAnchor({ id: r.requirementId }));
          }}
        >
          {r.clauseRef}
        </button>
      </td>
      <td className="px-2 py-1.5 last:pr-0 whitespace-nowrap">
        {unitLabel[u]}
        {r.group === 'llp' && <span className="text-slate-400"> (LLP)</span>}
        {binding && <span className="ml-2 rounded bg-slate-900 px-1.5 py-px font-medium text-white">{how === 'shortfall' ? 'costs most' : 'runs out first'}</span>}
      </td>
      <td className="px-2 py-1.5 last:pr-0 text-right tabular-nums">{int(r.remainingToday)}</td>
      <td className="px-2 py-1.5 last:pr-0 text-right tabular-nums text-slate-500">−{int(r.projectedUse)}</td>
      <td className={`px-2 py-1.5 last:pr-0 text-right tabular-nums ${r.remainingAtReturn < 0 ? 'font-medium' : ''}`}>{int(r.remainingAtReturn)}</td>
      <td className="px-2 py-1.5 last:pr-0 text-right tabular-nums">≥ {int(r.threshold)}</td>
      <td className={`px-2 py-1.5 last:pr-0 text-right tabular-nums ${short ? 'font-medium' : 'text-slate-500'}`}>
        {short ? `${int(r.gap)} short` : `${int(-r.gap)} over`}
      </td>
      <td className="px-2 py-1.5 last:pr-0 text-right tabular-nums">
        {capped ? (
          capped.at === r.requirementId ? (
            <>
              {money(capped.total)}
              <div className="text-slate-500">capped at the cost of the work</div>
            </>
          ) : (
            <span className="text-slate-300">—</span>
          )
        ) : r.compensation > 0 ? (
          money(r.compensation)
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-2 py-1.5 last:pr-0 text-right tabular-nums">{r.overDelivery > 0 ? money(r.overDelivery) : <span className="text-slate-300">—</span>}</td>
      {lease && (
        <td className="px-2 py-1.5 last:pr-0 text-right tabular-nums">
          {int(lease.remainingAtReturn)} at return ·{' '}
          {leaseCapped ? (leaseCapped.at === r.requirementId ? `${money(leaseCapped.total)}, capped at the cost of the work` : '—') : lease.compensation > 0 ? money(lease.compensation) : '—'}
        </td>
      )}
    </tr>
  );
}
