import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, type AssumptionInput } from '../../calc/constants';
import { readInput, writeInput } from '../../calc/robustness';
import type { Assumptions } from '../../calc/types';
import { money } from '../format';

/**
 * Every assumption the recommendations rest on, stated with its provenance: the value used, why
 * its plausible range stops where it does, and where the real number would come from in
 * deployment. Each can be overridden — the customer asked to set the cost of downtime themselves —
 * but none is front and centre: the robustness check says which ones matter.
 */
export function AssumptionsPanel({ assumptions, onChange }: { assumptions: Assumptions; onChange: (a: Assumptions) => void }) {
  const overridden = ASSUMPTION_INPUTS.filter((i) => readInput(assumptions, i.id) !== readInput(DEFAULT_ASSUMPTIONS, i.id)).length;
  return (
    <details className="mt-6 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-2 text-sm text-slate-700">
        Assumptions, with where each comes from{overridden > 0 && <span className="ml-2 font-medium text-violet-800">{overridden} overridden</span>}
      </summary>
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-[10.5px] font-medium tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Assumption</th>
            <th className="px-3 py-2 text-left font-medium">Value used</th>
            <th className="px-3 py-2 text-left font-medium">Plausible range, and why</th>
            <th className="px-3 py-2 text-left font-medium">In deployment, from</th>
          </tr>
        </thead>
        <tbody>
          {ASSUMPTION_INPUTS.map((input) => {
            const value = readInput(assumptions, input.id);
            const stated = readInput(DEFAULT_ASSUMPTIONS, input.id);
            return (
              <tr key={input.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 font-medium">{input.label}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Field input={input} value={value} onChange={(v) => onChange(writeInput(assumptions, input.id, v))} />
                  {value !== stated && (
                    <button className="ml-2 text-xs text-violet-800 underline" onClick={() => onChange(writeInput(assumptions, input.id, stated))}>
                      back to {shown(input, stated)}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <span className="whitespace-nowrap">
                    {shown(input, input.range.min)} to {shown(input, input.range.max)}
                  </span>
                  . {input.basis}
                </td>
                <td className="px-3 py-2 text-slate-600">{input.source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}

/** The value in the unit a person uses for it. */
function shown(input: AssumptionInput, v: number): string {
  switch (input.unit) {
    case 'multiplier':
      return input.id === 'lessorMarkup' ? `× ${v.toFixed(2)}` : `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
    case 'usd-per-day':
      return `${money(v)}/day`;
    case 'share':
      return `${Math.round(v * 100)}%`;
    case 'months':
      return `${v} months`;
  }
}

/** An override field in the same unit: percentage change, multiple, dollars a day, share or months. */
function Field({ input, value, onChange }: { input: AssumptionInput; value: number; onChange: (v: number) => void }) {
  const asPercentChange = input.unit === 'multiplier' && input.id !== 'lessorMarkup';
  const toField = (v: number) => (asPercentChange ? Math.round((v - 1) * 100) : input.unit === 'share' ? Math.round(v * 100) : v);
  const fromField = (f: number) => (asPercentChange ? 1 + f / 100 : input.unit === 'share' ? f / 100 : f);
  const suffix = asPercentChange ? '%' : input.unit === 'share' ? '%' : input.unit === 'months' ? 'months' : input.unit === 'usd-per-day' ? '$/day' : '×';
  const step = asPercentChange || input.unit === 'share' ? 1 : input.range.step;
  return (
    <label className="inline-flex items-center gap-1">
      <input
        className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-right tabular-nums"
        type="number"
        step={step}
        value={toField(value)}
        onChange={(e) => {
          const f = Number(e.target.value);
          if (Number.isFinite(f)) onChange(fromField(f));
        }}
      />
      <span className="text-xs text-slate-500">{suffix}</span>
    </label>
  );
}
