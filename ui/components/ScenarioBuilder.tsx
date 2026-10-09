import { useState } from 'react';

import { ASSUMPTION_INPUTS, SCENARIO_PRESETS, type AssumptionInput, type AssumptionInputId } from '../../calc/constants';
import type { ExtensionEffects } from '../../calc/robustness';
import type { PlanTotals, Scenario, ScenarioResult, WorldChange } from '../../calc/scenario';
import type { Proposal } from '../../calc/types';
import type { TailChoices } from '../../calc/whatif';
import { inputValue, money } from '../format';
import { ClauseText } from './ClauseText';
import { DecisionPicker } from './WhatIf';

const inputOf = (id: AssumptionInputId) => ASSUMPTION_INPUTS.find((i) => i.id === id)!;
/** A value in the unit it is shown in: a percentage for a share, the figure itself otherwise. */
const toField = (i: AssumptionInput, v: number) => (i.unit === 'share' ? Math.round(v * 100) : i.unit === 'multiplier' ? Number(v.toFixed(2)) : v);
const fromField = (i: AssumptionInput, f: number) => (i.unit === 'share' ? f / 100 : f);
const prefix = (i: AssumptionInput) => (i.unit === 'multiplier' ? '×' : i.unit === 'usd-per-day' ? '$' : '');
const suffix = (i: AssumptionInput) => (i.unit === 'share' ? '%' : i.unit === 'months' ? 'months' : i.unit === 'usd-per-day' ? '/day' : '');
const field = 'rounded-md border border-slate-200 bg-white px-2 py-1';
const WHY = { world: 'the world changes', decision: 'your decision', 'knock-on': 'a knock-on of another change' } as const;

/** Add a world change, or replace the one already set for the same assumption. */
const withWorld = (s: Scenario, c: WorldChange): Scenario =>
  s.world.some((w) => w.input === c.input) ? { ...s, world: s.world.map((w) => (w.input === c.input ? c : w)) } : { ...s, world: [...s.world, c] };

/**
 * One scenario: changes in the world and the head of fleet's own decisions, mixed in one list, and
 * what they do together against today's plan (calc/scenario.ts). Today's plan — the Overview — never
 * changes.
 */
export function ScenarioBuilder({
  scenario,
  onScenario,
  result,
  pending,
  choices,
  extension,
}: {
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  result: ScenarioResult;
  pending: boolean;
  choices: TailChoices[];
  extension: ExtensionEffects | null;
}) {
  const [id, setId] = useState<AssumptionInputId>('maintenanceCost');
  const input = inputOf(id);
  const [raw, setRaw] = useState(String(toField(input, 1.1)));
  const value = fromField(input, Number(raw));
  const outside = !raw.trim() || !Number.isFinite(value) || value < input.range.min - 1e-9 || value > input.range.max + 1e-9;
  const empty = !scenario.world.length && !scenario.decisions.length;

  return (
    <section>
      <h2 className="caps mb-2">Build a scenario</h2>
      <p className="mb-6 text-slate-500">
        Mix changes in the world — costs, flying, time on the ground — with your own decisions, and see what they do together against today's plan. The Overview
        always shows today's plan.
      </p>

      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="caps">Ready-made</span>
          {SCENARIO_PRESETS.map((p) => (
            <button key={p.label} className="link rounded-md border border-slate-200 bg-white px-3 py-1 hover:border-accent hover:no-underline" onClick={() => onScenario(withWorld(scenario, { input: p.input, value: p.value }))}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="caps mr-1">The world</span>
          <select
            className={field}
            value={id}
            onChange={(e) => {
              const next = inputOf(e.target.value as AssumptionInputId);
              setId(next.id);
              setRaw(String(toField(next, next.range.min + (next.range.max - next.range.min) / 2)));
            }}
          >
            {ASSUMPTION_INPUTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
          {prefix(input) && <span className="text-slate-500">{prefix(input)}</span>}
          <input className={`${field} w-28 text-right tabular-nums`} type="number" step={input.unit === 'share' ? 1 : input.range.step} value={raw} onChange={(e) => setRaw(e.target.value)} />
          {suffix(input) && <span className="text-slate-500">{suffix(input)}</span>}
          <button className="link rounded-md border border-slate-200 bg-white px-3 py-1 hover:border-accent hover:no-underline disabled:opacity-40" disabled={outside} onClick={() => onScenario(withWorld(scenario, { input: id, value }))}>
            Add to the scenario
          </button>
          <span className="text-label text-slate-500">
            the evidence runs {inputValue(input, input.range.min)} to {inputValue(input, input.range.max)}
          </span>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <span className="caps mt-1.5 mr-1">Your decisions</span>
          <DecisionPicker choices={choices} extension={extension} onAdd={(p: Proposal) => onScenario({ ...scenario, decisions: [...scenario.decisions, p] })} />
        </div>
      </div>

      <div className="mt-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="caps">Changes in this scenario</h3>
          {!empty && (
            <button className="link text-label" onClick={() => onScenario({ world: [], decisions: [] })}>
              Clear the scenario
            </button>
          )}
        </div>
        {empty ? (
          <p className="text-slate-500">None yet: add a ready-made change, a change in the world or a decision above.</p>
        ) : (
          <ul>
            {scenario.world.map((w) => (
              <li key={w.input} className="flex items-baseline gap-4 border-t border-slate-100 py-2 first:border-t-0">
                <span className="w-20 shrink-0 text-label text-slate-500">World</span>
                <span className="flex-1">
                  {inputOf(w.input).label} {inputValue(inputOf(w.input), w.value)}
                </span>
                <button className="text-slate-400 hover:text-slate-900" aria-label="Remove this change" onClick={() => onScenario({ ...scenario, world: scenario.world.filter((x) => x.input !== w.input) })}>
                  ×
                </button>
              </li>
            ))}
            {scenario.decisions.map((d, k) => {
              const r = result.decisions[k];
              return (
                <li key={`d${k}`} className="flex items-baseline gap-4 border-t border-slate-100 py-2 first:border-t-0">
                  <span className="w-20 shrink-0 text-label text-slate-500">Decision</span>
                  <span className="flex-1">
                    <span className="font-medium">{d.tail}</span> {r ? (r.refused ? r.asked : r.label) : '…'}
                    {r?.refused && (
                      <span className="mt-1 block text-label text-slate-500">
                        Not possible, so left out: <ClauseText tail={d.tail} text={r.refused} />
                      </span>
                    )}
                  </span>
                  <button className="text-slate-400 hover:text-slate-900" aria-label="Remove this change" onClick={() => onScenario({ ...scenario, decisions: scenario.decisions.filter((_, j) => j !== k) })}>
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!empty && <Result result={result} pending={pending} />}
    </section>
  );
}

/** Today's plan, today's plan re-made for the scenario's world, and the scenario: three totals side by side, then what changes. */
function Result({ result: r, pending }: { result: ScenarioResult; pending: boolean }) {
  const rows: { label: string; key: keyof PlanTotals; strong?: boolean }[] = [
    { label: 'All-in, after the plan', key: 'allIn', strong: true },
    { label: 'Still owed at handback', key: 'owed' },
    { label: 'Maintenance spend', key: 'spend' },
  ];
  const cell = (t: PlanTotals, key: keyof PlanTotals, strong?: boolean, compare = true) => {
    const change = t[key] - r.today[key];
    return (
      <td className="px-3 py-3 text-right tabular-nums">
        <span className={strong ? 'font-semibold' : ''}>{money(t[key])}</span>
        {compare && <div className="text-label text-slate-500">{Math.abs(change) < 0.5 ? 'no change' : `${change > 0 ? '+' : '−'}${money(Math.abs(change))}`}</div>}
      </td>
    );
  };
  return (
    <div className={`mt-12 ${pending ? 'opacity-60' : ''}`}>
      <h3 className="caps mb-3">The result</h3>
      <table className="w-full">
        <thead className="caps">
          <tr className="border-b border-slate-200">
            <th className="pr-3 pb-3 text-left font-medium" />
            <th className="cursor-help px-3 pb-3 text-right font-medium" title="At the default assumptions: what the Overview shows.">
              Today's plan
            </th>
            <th className="cursor-help px-3 pb-3 text-right font-medium" title="Today's plan re-made for this scenario's world: the recommendation re-run with its assumptions, so an aircraft's action may change.">
              If the world changes like this
            </th>
            <th className="cursor-help pb-3 pl-3 text-right font-medium" title="The world changes and your decisions together.">
              This scenario
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

      <h3 className="caps mt-12 mb-3">What changes</h3>
      {r.changed.length === 0 ? (
        <p className="text-slate-500">No aircraft changes its recommendation: the totals move, the decisions do not.</p>
      ) : (
        <ul className="space-y-2">
          {r.changed.map((c) => (
            <li key={c.tail}>
              <span className="font-medium">{c.tail}</span>: today, {c.from.charAt(0).toLowerCase() + c.from.slice(1)}; in this scenario, {c.to.charAt(0).toLowerCase() + c.to.slice(1)}
              <span className="text-slate-500"> — {WHY[c.why]}.</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
