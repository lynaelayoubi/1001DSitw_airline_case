import { Fragment, useMemo, useState } from 'react';

import { RETURNING_WINDOW_MONTHS } from '../../calc/constants';
import type { ComponentResult, FleetExposure, RequirementResult, TailResult } from '../../calc/exposure';
import { actionOf, type FleetRecommendation, type ScenarioComparison, type TailPlan } from '../../calc/recommend';
import type { Assumptions } from '../../calc/types';
import { Headline } from '../components/Headline';
import { ScenarioPanel } from '../components/ScenarioPanel';
import { Trace } from '../components/Trace';
import { date, int, kindLabel, money, months, unitLabel } from '../format';

/**
 * SPEC §3.1 — one row per returning tail, ranked by money. The full fleet sits behind a
 * toggle; tails beyond the window show no figure, because a projection across years with no
 * shop visit in it is not a forecast. The scenario panel (SPEC §3.4) sits above it; a row whose
 * recommended action differs from the plan at rest says what it was.
 */
export default function FleetScreen({
  fleet,
  plans,
  atRest,
  comparison,
  assumptions,
  onAssumptions,
}: {
  fleet: FleetExposure;
  plans: FleetRecommendation;
  atRest: FleetRecommendation;
  comparison: ScenarioComparison;
  assumptions: Assumptions;
  onAssumptions: (a: Assumptions) => void;
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

      <ScenarioPanel
        assumptions={assumptions}
        onChange={onAssumptions}
        tails={fleet.returning.map((t) => ({ tail: t.tail, type: t.type })).sort((x, y) => x.tail.localeCompare(y.tail))}
        comparison={comparison}
      />

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
              <Th right>If nothing changes</Th>
              <Th right>As the lease allows</Th>
              <Th right>After recommendation</Th>
              <Th>Binding clock</Th>
              <Th>QME</Th>
              <Th>Decide by</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <Fragment key={t.tail}>
                <TailRow t={t} plan={plans.byTail[t.tail]} before={atRest.byTail[t.tail]} open={open === t.tail} onToggle={() => setOpen(open === t.tail ? null : t.tail)} />
                {open === t.tail && <TailDetail t={t} />}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Hover any figure for its arithmetic. Click a tail for the four components. Exposure = compensation on the binding clock of each component, plus the LLP
        clause, plus over-delivery: the LLP life a past shop visit bought beyond the cheapest workscope that would have cleared the contract. Compensation on any
        component is capped at the cheapest work that would put it right. After recommendation is all-in: the work, its downtime, and what is still owed at
        handback.
      </p>
    </main>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-2 py-2 font-medium whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function TailRow({ t, plan, before, open, onToggle }: { t: TailResult; plan?: TailPlan; before?: TailPlan; open: boolean; onToggle: () => void }) {
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
        <Trace text={t.projection.trace}>{months(t.projection.monthsToReturn)}</Trace>
      </td>
      {beyond ? (
        <>
          <td className="px-2 py-2 text-right text-xs text-slate-400" colSpan={3}>
            beyond the {RETURNING_WINDOW_MONTHS}-month window — not forecast
          </td>
          <td className="px-2 py-2 text-slate-300">—</td>
        </>
      ) : (
        <>
          <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
            <Trace text={r.trace} align="right" className="font-semibold tabular-nums">
              {money(r.exposure)}
            </Trace>
            <Breakdown t={t} />
          </td>
          <td className="px-2 py-2 text-right tabular-nums" onClick={(e) => e.stopPropagation()}>
            <Trace text={t.asLeaseAllows.trace} align="right" className={t.qmeDelta > 0 ? 'font-semibold text-amber-800' : 'text-slate-500'}>
              {money(t.asLeaseAllows.exposure)}
            </Trace>
            {t.qmeDelta > 0 && <div className="text-[11px] text-amber-700">+{money(t.qmeDelta)}</div>}
          </td>
          <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
            {plan ? <AfterRecommendation plan={plan} before={before} /> : <span className="text-slate-300">—</span>}
          </td>
          <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <Trace text={t.trace}>
              <span className="font-medium">{t.binding.position}</span> · {unitLabel[t.binding.unit]}
              {t.binding.how === 'tightest' && <span className="ml-1 text-xs text-slate-400">clear</span>}
            </Trace>
          </td>
        </>
      )}
      <td className="px-2 py-2">
        {t.qmeFlag ? (
          <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] leading-tight font-medium text-amber-800">
            {t.qmePositions.join(', ')}
            <br />
            not evidenced
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {plan?.decisionDeadline ? (
          <Trace text={plan.trace} align="right">
            {date(plan.decisionDeadline)}
          </Trace>
        ) : (
          <span className="text-xs text-slate-400">{plan ? 'nothing to book' : '—'}</span>
        )}
      </td>
    </tr>
  );
}

/** The plan's all-in figure, what it saves (or costs over the do-nothing figure), and what it is — and what it was, if the scenario changed it. */
function AfterRecommendation({ plan, before }: { plan: TailPlan; before?: TailPlan }) {
  const changed = before && actionOf(before) !== actionOf(plan);
  return (
    <div className="ml-auto max-w-[13rem]">
      <Trace text={plan.trace} align="right" className="font-semibold tabular-nums">
        {money(plan.after)}
      </Trace>
      {plan.forced ? (
        // Not a saving or a loss the tool chose: the do-nothing figure it is measured against cannot happen.
        plan.avoidable !== 0 && (
          <div className="text-[11px] text-slate-500 tabular-nums">
            {plan.avoidable > 0 ? '−' : '+'}
            {money(Math.abs(plan.avoidable))} vs a do-nothing that cannot happen
          </div>
        )
      ) : (
        <>
          {plan.avoidable > 0 && <div className="text-[11px] text-emerald-700 tabular-nums">−{money(plan.avoidable)}</div>}
          {plan.avoidable < 0 && <div className="text-[11px] text-red-700 tabular-nums">+{money(-plan.avoidable)}</div>}
        </>
      )}
      <div className={`text-[11px] leading-tight ${changed ? 'font-medium text-violet-800' : 'text-slate-500'}`}>
        {plan.forced && <span className="mr-1 rounded bg-slate-800 px-1 py-px text-[10px] font-medium text-white">forced</span>}
        {plan.label}
      </div>
      {plan.forced && <div className="text-[11px] leading-tight text-slate-500">{plan.forced}</div>}
      {changed && <div className="text-[11px] leading-tight text-slate-400">was: {before!.label}</div>}
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

function TailDetail({ t }: { t: TailResult }) {
  return (
    <tr className="border-t border-slate-100 bg-slate-50/60">
      <td colSpan={11} className="px-3 py-3">
        <div className="grid gap-3">
          {t.asRecorded.components.map((c, i) => (
            <ComponentCard key={c.componentId} c={c} lease={t.asLeaseAllows.components[i]!} />
          ))}
        </div>
      </td>
    </tr>
  );
}

function ComponentCard({ c, lease }: { c: ComponentResult; lease: ComponentResult }) {
  const flagged = c.qmeStatus === 'not-evidenced';
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div>
          <span className="font-semibold">{c.position}</span> <span className="text-slate-500">· {kindLabel[c.kind]} · {c.serial}</span>
          {flagged && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">last shop visit not evidenced as a QME</span>}
        </div>
        <div className="text-sm tabular-nums">
          <Trace text={c.trace} align="right">
            <span className="font-semibold">{money(c.exposure)}</span>
            <span className="text-slate-500"> as recorded</span>
          </Trace>
          {flagged && (
            <>
              <span className="mx-2 text-slate-300">·</span>
              <Trace text={lease.trace} align="right">
                <span className="font-semibold text-amber-800">{money(lease.exposure)}</span>
                <span className="text-slate-500"> as the lease allows</span>
              </Trace>
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
            {flagged && <Th right>As the lease allows</Th>}
          </tr>
        </thead>
        <tbody>
          {c.requirements.map((r, i) => (
            <RequirementRow key={r.requirementId} r={r} binding={r.requirementId === c.binding.requirementId} how={c.binding.how} lease={flagged ? lease.requirements[i] : undefined} />
          ))}
        </tbody>
      </table>
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
        <Trace text={r.trace}>
          {unitLabel[u]}
          {r.group === 'llp' && <span className="text-slate-400"> (LLP)</span>}
        </Trace>
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
          <Trace text={lease.trace} align="right">
            {int(lease.remainingAtReturn)} at return · {lease.compensation > 0 ? money(lease.compensation) : '—'}
          </Trace>
        </td>
      )}
    </tr>
  );
}
