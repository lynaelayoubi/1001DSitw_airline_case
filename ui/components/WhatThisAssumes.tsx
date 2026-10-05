import { useState } from 'react';

import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, type AssumptionInput } from '../../calc/constants';
import { readInput, writeInput, type Robustness } from '../../calc/robustness';
import type { Assumptions } from '../../calc/types';
import { inputShown, inputValue } from '../format';
import { Trace } from './Trace';

/**
 * What the recommendations rest on: the one place the seven assumptions live, collapsed directly
 * above the panel. The label carries the finding; open, each input's value, evidenced range, the
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
  const none = robustness?.holding.length ?? 0;
  const overridden = ASSUMPTION_INPUTS.filter((i) => readInput(assumptions, i.id) !== readInput(DEFAULT_ASSUMPTIONS, i.id)).length;
  return (
    <details className="mb-2 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-2 text-sm text-slate-700">
        What this assumes — {ASSUMPTION_INPUTS.length} inputs ·{' '}
        {robustness ? (
          <span className={pending ? 'opacity-60' : ''}>
            {none} {none === 1 ? 'changes' : 'change'} no answer anywhere
          </span>
        ) : (
          <span className="text-slate-500">checking which change an answer…</span>
        )}
        {overridden > 0 && <span className="ml-2 font-medium text-violet-800">· {overridden} overridden</span>}
      </summary>
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-[10.5px] font-medium tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Input</th>
            <th className="px-3 py-2 text-left font-medium">Value used</th>
            <th className="px-3 py-2 text-left font-medium">Evidenced range</th>
            <th className="px-3 py-2 text-left font-medium">Real number from</th>
            <th className="px-3 py-2 text-left font-medium">Changes a recommendation in its range?</th>
            <th className="px-3 py-2 text-left font-medium">Override</th>
          </tr>
        </thead>
        <tbody>
          {ASSUMPTION_INPUTS.map((input) => {
            const value = readInput(assumptions, input.id);
            const stated = readInput(DEFAULT_ASSUMPTIONS, input.id);
            const set = (v: number) => onChange(writeInput(assumptions, input.id, v));
            return (
              <tr key={input.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 font-medium">{input.label}</td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                  {value === stated ? (
                    inputValue(input, value)
                  ) : (
                    <>
                      <span className="font-medium text-violet-800">{inputValue(input, value)}</span>
                      <span className="block text-xs text-slate-500">stated {inputValue(input, stated)}</span>
                    </>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                  <Trace text={input.basis}>
                    {inputShown(input, input.range.min)} to {inputShown(input, input.range.max)}
                  </Trace>
                </td>
                <td className="px-3 py-2 text-slate-600">{input.source}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${pending ? 'opacity-60' : ''}`}>
                  {!robustness ? <span className="text-slate-400">checking…</span> : changing.has(input.id) ? <span className="font-medium text-violet-800">Yes</span> : <span className="text-slate-500">No</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Override input={input} value={value} stated={stated} onChange={set} />
                  {value !== stated && (
                    <button className="ml-2 text-xs text-violet-800 underline" onClick={() => set(stated)}>
                      back to {inputShown(input, stated)}
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
 * An override in the unit a person uses for it: percentage change, multiple, dollars a day, share
 * or months. Empty while the stated value is in use; held as typed while editing, so a figure that
 * passes through the stated value on the way to another does not clear itself; kept inside the
 * evidenced range.
 */
function Override({ input, value, stated, onChange }: { input: AssumptionInput; value: number; stated: number; onChange: (v: number) => void }) {
  const [typing, setTyping] = useState<string | null>(null);
  const asPercentChange = input.unit === 'multiplier' && input.id !== 'lessorMarkup';
  const toField = (v: number) => (asPercentChange ? Math.round((v - 1) * 100) : input.unit === 'share' ? Math.round(v * 100) : v);
  const fromField = (f: number) => (asPercentChange ? 1 + f / 100 : input.unit === 'share' ? f / 100 : f);
  const suffix = asPercentChange || input.unit === 'share' ? '%' : input.unit === 'months' ? 'months' : input.unit === 'usd-per-day' ? '$/day' : '×';
  const step = asPercentChange || input.unit === 'share' ? 1 : input.range.step;
  const inRange = (v: number) => Math.min(input.range.max, Math.max(input.range.min, v));
  return (
    <label className="inline-flex items-center gap-1">
      <input
        className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-right tabular-nums"
        type="number"
        step={step}
        min={toField(input.range.min)}
        max={toField(input.range.max)}
        placeholder={String(toField(stated))}
        value={typing ?? (value === stated ? '' : toField(value))}
        onChange={(e) => {
          setTyping(e.target.value);
          if (e.target.value === '') return onChange(stated);
          const f = Number(e.target.value);
          if (Number.isFinite(f)) onChange(inRange(fromField(f)));
        }}
        onBlur={() => setTyping(null)}
      />
      <span className="text-xs text-slate-500">{suffix}</span>
    </label>
  );
}
