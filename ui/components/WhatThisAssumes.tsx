import { useState } from 'react';

import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, type AssumptionInput } from '../../calc/constants';
import { readInput, writeInput, type Robustness } from '../../calc/robustness';
import type { Assumptions } from '../../calc/types';
import { inputValue } from '../format';

/**
 * What the recommendations rest on: the one place the seven assumptions live, collapsed directly
 * above the panel. The label carries the finding; open, each input's value, evidenced range (why it
 * stops there is in ASSUMPTIONS §14), the
 * system its real number should come from, whether the sweep found any recommendation it changes,
 * and an override. An override recomputes everything downstream — the fleet, the recommendations,
 * the calendar, the budget and, in the worker, the robustness sweep — and stays inside the evidenced
 * range, which is the ground the sweep covers. Everything is read from ASSUMPTION_INPUTS and the
 * sweep.
 */
export function WhatThisAssumes({
  assumptions,
  onChange,
  robustness,
  pending,
}: {
  assumptions: Assumptions;
  onChange: (a: Assumptions) => void;
  robustness: Robustness | null;
  pending: boolean;
}) {
  // The sweep comes back from a worker as a copy, so inputs are matched by id.
  const changing = new Set(robustness?.changing.map((x) => x.id));
  const moving = robustness?.changing.length ?? 0;
  const overridden = ASSUMPTION_INPUTS.filter((i) => readInput(assumptions, i.id) !== readInput(DEFAULT_ASSUMPTIONS, i.id)).length;
  return (
    <details className="mt-12">
      <summary className="cursor-pointer">
        <span className="caps">Assumptions behind these numbers</span>
        <span className="text-label text-slate-500">
          {' '}
          —{' '}
          {robustness ? (
            <span className={pending ? 'opacity-60' : ''}>
              {moving} of {ASSUMPTION_INPUTS.length} {moving === 1 ? 'moves' : 'move'} an answer
            </span>
          ) : (
            <span>checking which move an answer…</span>
          )}
          {overridden > 0 && <span className="ml-2 font-medium text-slate-900">· {overridden} overridden</span>}
        </span>
      </summary>
      <table className="mt-3 w-full">
        <thead className="caps">
          <tr className="border-b border-slate-200">
            <th className="pr-3 pb-3 text-left font-medium">Assumption</th>
            <th className="px-3 pb-3 text-left font-medium">Value used</th>
            <th className="px-3 pb-3 text-left font-medium">Evidenced range</th>
            <th className="px-3 pb-3 text-left font-medium">Real number from</th>
            <th className="px-3 pb-3 text-left font-medium" title="Whether moving it anywhere in its evidenced range changes any tail's recommendation.">
              Changes an answer
            </th>
            <th className="pb-3 pl-3 text-left font-medium">Override</th>
          </tr>
        </thead>
        <tbody>
          {ASSUMPTION_INPUTS.map((input) => {
            const value = readInput(assumptions, input.id);
            const stated = readInput(DEFAULT_ASSUMPTIONS, input.id);
            const set = (v: number) => onChange(writeInput(assumptions, input.id, v));
            return (
              <tr key={input.id} className="border-t border-slate-100 align-baseline first:border-t-0">
                <td className="py-3 pr-3 font-medium">{input.label}</td>
                <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                  {value === stated ? (
                    inputValue(input, value)
                  ) : (
                    <>
                      <span className="font-medium">{inputValue(input, value)}</span>
                      <span className="block text-label text-slate-500">stated {inputValue(input, stated)}</span>
                    </>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                  {inputValue(input, input.range.min)} to {inputValue(input, input.range.max)}
                </td>
                <td className="px-3 py-3 text-slate-500">{input.source}</td>
                <td className={`px-3 py-3 whitespace-nowrap ${pending ? 'opacity-60' : ''}`}>
                  {!robustness ? <span className="text-slate-400">checking…</span> : changing.has(input.id) ? <span className="font-medium">Yes</span> : <span className="text-slate-500">No</span>}
                </td>
                <td className="py-3 pl-3 whitespace-nowrap">
                  <Override input={input} value={value} stated={stated} onChange={set} />
                  {value !== stated && (
                    <button className="link ml-2 text-label" onClick={() => set(stated)}>
                      reset to {inputValue(input, stated)}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}

/**
 * An override that replaces the value, in the unit the value is shown in beside it — a multiple,
 * dollars a day, a share or months — so the field asks one question. Empty while the stated value
 * is in use, which the placeholder shows; held as typed while editing, so a figure that
 * passes through the stated value on the way to another does not clear itself; kept inside the
 * evidenced range.
 */
function Override({ input, value, stated, onChange }: { input: AssumptionInput; value: number; stated: number; onChange: (v: number) => void }) {
  const [typing, setTyping] = useState<string | null>(null);
  const share = input.unit === 'share';
  const toField = (v: number) => (share ? Math.round(v * 100) : input.unit === 'multiplier' ? Number(v.toFixed(2)) : v);
  const fromField = (f: number) => (share ? f / 100 : f);
  const prefix = input.unit === 'multiplier' ? '×' : input.unit === 'usd-per-day' ? '$' : '';
  const suffix = share ? '%' : input.unit === 'months' ? 'months' : input.unit === 'usd-per-day' ? '/day' : '';
  const step = share ? 1 : input.range.step;
  const inRange = (v: number) => Math.min(input.range.max, Math.max(input.range.min, v));
  return (
    <label className="inline-flex items-center gap-1">
      {prefix && <span className="text-label text-slate-500">{prefix}</span>}
      <input
        className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right tabular-nums"
        type="number"
        step={step}
        min={toField(input.range.min)}
        max={toField(input.range.max)}
        placeholder={input.unit === 'multiplier' ? stated.toFixed(2) : String(toField(stated))}
        value={typing ?? (value === stated ? '' : toField(value))}
        onChange={(e) => {
          setTyping(e.target.value);
          if (e.target.value === '') return onChange(stated);
          const f = Number(e.target.value);
          if (Number.isFinite(f)) onChange(inRange(fromField(f)));
        }}
        onBlur={() => setTyping(null)}
      />
      {suffix && <span className="text-label text-slate-500">{suffix}</span>}
    </label>
  );
}
