import { useState } from 'react';

import type { BudgetPlan } from '../../calc/budget';
import { LEASE_EXTENSION_CONTROL } from '../../calc/constants';
import type { ScenarioComparison } from '../../calc/recommend';
import type { ExtensionEffects, Robustness } from '../../calc/robustness';
import type { Assumptions } from '../../calc/types';
import { date, money } from '../format';
import { Trace } from './Trace';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * What you can do, and how firm the answers are. What used to be a panel of sliders. The numbers behind them — MRO rates, the schedule, the cost
 * of a day on the ground — are held by the customer's own teams, so instead of asking for them the
 * screen says how far each would have to move before any answer changes, and where the real number
 * would come from. One control stays: extending a named lease is the customer's own decision.
 */
export function RobustnessPanel({
  robustness,
  extension,
  pending,
  assumptions,
  onChange,
  tails,
  comparison,
  budget,
  onBudget,
  budgetPlan,
}: {
  robustness: Robustness | null;
  extension: ExtensionEffects | null;
  pending: boolean;
  assumptions: Assumptions;
  onChange: (a: Assumptions) => void;
  tails: { tail: string; type: string }[];
  comparison: ScenarioComparison;
  budget: number | null;
  onBudget: (b: number | null) => void;
  budgetPlan: BudgetPlan;
}) {
  const [extended, setExtended] = useState(tails[0]?.tail ?? '');
  const months = assumptions.leaseExtensionMonths[extended] ?? 0;
  const extend = (tail: string, n: number) => onChange({ ...assumptions, leaseExtensionMonths: n > 0 ? { [tail]: n } : {} });
  const c = LEASE_EXTENSION_CONTROL;
  const r = robustness;
  const effect = extension?.byTail[extended];

  return (
    <section className="mb-5 grid gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 lg:grid-cols-[1fr_2fr]">
      <div>
        <h2 className="mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">What you can do</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
          <span>Extend the lease on</span>
          <select
            className="rounded border border-slate-300 bg-white px-1 text-sm"
            value={extended}
            onChange={(e) => {
              setExtended(e.target.value);
              extend(e.target.value, months);
            }}
          >
            {tails.map((t) => (
              <option key={t.tail} value={t.tail}>
                {t.tail} · {t.type}
              </option>
            ))}
          </select>
          <span className="inline-flex items-center overflow-hidden rounded border border-slate-300">
            <button className="px-2 py-0.5 enabled:hover:bg-slate-50 disabled:text-slate-300" disabled={months <= c.min} onClick={() => extend(extended, months - c.step)} aria-label="One month less">
              −
            </button>
            <span className="min-w-[5.5rem] border-x border-slate-300 px-2 py-0.5 text-center tabular-nums">
              {months} {months === 1 ? 'month' : 'months'}
            </span>
            <button className="px-2 py-0.5 enabled:hover:bg-slate-50 disabled:text-slate-300" disabled={months >= c.max} onClick={() => extend(extended, months + c.step)} aria-label="One month more">
              +
            </button>
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {!extension
            ? 'Checking what extending each lease would change…'
            : !extension.any
              ? `Extending any returning tail's lease, by any length up to ${extension.maxMonths} months, changes no recommendation.`
              : !effect || effect.months === null
                ? `Extending ${extended}'s lease changes no recommendation at any length up to ${extension.maxMonths} months.`
                : `Extending ${extended}'s lease first changes a recommendation at ${effect.months} ${effect.months === 1 ? 'month' : 'months'}: ${effect.changes
                    .map((x) => `${x.tail} ${x.from} → ${x.to}`)
                    .join('; ')}.`}
        </p>
        <div className="mt-2 text-sm">
          <Trace text={comparison.trace}>
            <span className={comparison.changed.length ? 'font-semibold text-violet-800' : 'text-slate-500'}>
              {comparison.changed.length === 0
                ? 'No tail changes its recommended action'
                : comparison.changed.length === 1
                  ? `1 of ${comparison.tails} tails changes its recommended action`
                  : `${comparison.changed.length} of ${comparison.tails} tails change their recommended action`}
            </span>
          </Trace>
          {comparison.changed.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[13px]">
              {comparison.changed.map((x) => (
                <li key={x.tail}>
                  <span className="font-medium">{x.tail}</span> <span className="text-slate-500">{x.from}</span> → <span className="text-violet-800">{x.to}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Budget budget={budget} onBudget={onBudget} plan={budgetPlan} />
      </div>

      <div className={pending ? 'opacity-60' : ''}>
        <h2 className="mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
          How firm are these answers {pending && <span className="normal-case">— rechecking…</span>}
        </h2>
        {!r ? (
          <p className="text-sm text-slate-500">Checking how far each assumption would have to move before an answer changes…</p>
        ) : (
          <>
            <p className="text-sm">
              <Trace text={r.trace}>
                <span className="font-semibold">{r.firm.length} firm</span> · <span className="font-semibold">{r.close.length} close</span> ·{' '}
                <span className="font-semibold">{r.tooClose.length} too close to call</span>
              </Trace>{' '}
              <span className="text-slate-500">of {r.tails} recommendations</span>
            </p>
            <CallList
              title="Too close to call — the answer changes inside the data's own noise"
              calls={r.tooClose}
              tone="text-red-800"
            />
            <CallList title="Close — outside the noise, inside the evidence" calls={r.close} tone="text-violet-800" />
            <div className="mt-3 text-[11px] font-medium tracking-wide text-slate-500 uppercase">Binding soonest</div>
            {r.binding.length === 0 ? (
              <p className="text-sm text-slate-500">No assumption changes any answer anywhere inside its evidence.</p>
            ) : (
              <ol className="mt-1 space-y-1 text-[13px]">
                {r.binding.map((x, i) => (
                  <li key={x.input.id}>
                    <span className="text-slate-400">{i + 1}.</span> <span className="font-medium">{x.input.label}</span> at {x.first!.change}{' '}
                    <span className="text-slate-400">(reach {pct(x.first!.reach)})</span> flips {x.first!.tails.map((t) => t.tail).join(', ')}.{' '}
                    <span className="text-slate-500">Real number: {x.input.source}.</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Each assumption moves on its own here. In practice they move together — a busy summer raises flying and shop demand at once — so
              read this as a lower bound on how fragile the answers are: correlated moves would flip them sooner.
            </p>
            {r.binding.length < 3 && (
              <p className="mt-1 text-xs text-slate-500">
                {r.inputs
                  .filter((x) => !x.first)
                  .map((x) => x.input.label)
                  .join(', ')}{' '}
                change no answer anywhere inside their evidence.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function CallList({ title, calls, tone }: { title: string; calls: Robustness['close']; tone: string }) {
  if (!calls.length) return null;
  return (
    <div className="mt-1">
      <div className="text-xs text-slate-500">{title}</div>
      <ul className="space-y-0.5 text-[13px]">
        {calls.map((c) => (
          <li key={c.tail}>
            <span className="font-medium">{c.tail}</span> <span className="text-slate-500">{c.label}</span> → <span className={tone}>{c.flip.to}</span> if{' '}
            {c.input.label.toLowerCase()} {c.flip.change} <span className="text-slate-400">(reach {pct(c.flip.reach)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** This year's return-related maintenance budget: what it funds, and what it leaves out at what cost. */
function Budget({ budget, onBudget, plan }: { budget: number | null; onBudget: (b: number | null) => void; plan: BudgetPlan }) {
  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
        <span>Maintenance budget to {date(plan.windowEnd)}</span>
        <span className="inline-flex items-center gap-1">
          $
          <input
            className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-right tabular-nums"
            type="number"
            min={0}
            step={0.5}
            placeholder="no limit"
            value={budget === null ? '' : budget / 1e6}
            onChange={(e) => onBudget(e.target.value === '' ? null : Math.max(0, Number(e.target.value)) * 1e6)}
          />
          M
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        <Trace text={plan.trace}>
          Every recommended action needs {money(plan.needed)} in this window, {money(plan.forcedSpend)} of it forced
        </Trace>
        .
      </p>
      {budget !== null && (
        <div className="mt-1 text-[13px]">
          {plan.shortfall > 0 && (
            <p className="font-medium text-red-800">The forced removals alone are {money(plan.shortfall)} over this budget: nothing else can be funded.</p>
          )}
          {plan.leftOut.length === 0 ? (
            plan.shortfall === 0 && <p className="text-slate-600">Every recommended action fits.</p>
          ) : (
            <>
              <p className="text-slate-600">
                Left out, paying at handback instead — {money(plan.savingForgone)} of savings given up:
              </p>
              <ul className="space-y-0.5">
                {plan.leftOut.map((x) => (
                  <li key={x.tail}>
                    <span className="font-medium">{x.tail}</span> <span className="text-slate-500">{x.label}</span> · {money(x.spend)} · gives up{' '}
                    <span className="font-medium">{money(x.saving)}</span> ·{' '}
                    {x.closesThisYear ? (
                      <span className="text-red-800">decide by {date(x.decisionDeadline!)} — inside the window, so the option is lost, not deferred</span>
                    ) : (
                      <span className="text-slate-500">can wait for next year's budget</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
