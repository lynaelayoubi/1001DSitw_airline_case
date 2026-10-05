import { useState } from 'react';

import { DEFAULT_ASSUMPTIONS, SCENARIO_CONTROLS } from '../../calc/constants';
import type { ScenarioComparison } from '../../calc/recommend';
import type { Assumptions } from '../../calc/types';
import { money } from '../format';
import { Trace } from './Trace';

/**
 * SPEC §3.4 — the four controls the customer named: maintenance cost, utilisation, extend a
 * named lease by N months, downtime cost per day. Everything on screen recomputes from them.
 * The output that matters is how many tails change what they are told to do; the totals
 * moving is expected.
 */
export function ScenarioPanel({
  assumptions,
  onChange,
  tails,
  comparison,
}: {
  assumptions: Assumptions;
  onChange: (a: Assumptions) => void;
  tails: { tail: string; type: string }[];
  comparison: ScenarioComparison;
}) {
  const c = SCENARIO_CONTROLS;
  const [extended, setExtended] = useState(tails[0]?.tail ?? '');
  const months = assumptions.leaseExtensionMonths[extended] ?? 0;
  const set = (over: Partial<Assumptions>) => onChange({ ...assumptions, ...over });
  const extend = (tail: string, n: number) => set({ leaseExtensionMonths: n > 0 ? { [tail]: n } : {} });
  const atRest = JSON.stringify(assumptions) === JSON.stringify(DEFAULT_ASSUMPTIONS);

  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Scenario</h2>
        <button
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 enabled:hover:bg-slate-50 disabled:opacity-40"
          disabled={atRest}
          onClick={() => onChange(DEFAULT_ASSUMPTIONS)}
        >
          Reset
        </button>
      </div>

      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
        <Slider
          label="Maintenance cost"
          value={assumptions.maintenanceCostMultiplier}
          range={c.maintenanceCost}
          shown={`× ${assumptions.maintenanceCostMultiplier.toFixed(2)}`}
          onChange={(v) => set({ maintenanceCostMultiplier: v })}
        />
        <Slider
          label="Utilisation"
          value={assumptions.utilisationMultiplier}
          range={c.utilisation}
          shown={`× ${assumptions.utilisationMultiplier.toFixed(2)}`}
          onChange={(v) => set({ utilisationMultiplier: v })}
        />
        <div>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <label className="text-slate-700">
              Extend{' '}
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
              </select>{' '}
              lease by
            </label>
            <span className="font-medium tabular-nums">
              {months} {months === 1 ? 'month' : 'months'}
            </span>
          </div>
          <input
            className="mt-1 w-full accent-slate-900"
            type="range"
            min={c.leaseExtensionMonths.min}
            max={c.leaseExtensionMonths.max}
            step={c.leaseExtensionMonths.step}
            value={months}
            onChange={(e) => extend(extended, Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Slider
            label="Downtime, NB"
            value={assumptions.downtimeCostPerDay.narrowbody}
            range={c.downtimeCostPerDay.narrowbody}
            shown={`${money(assumptions.downtimeCostPerDay.narrowbody)}/day`}
            onChange={(v) => set({ downtimeCostPerDay: { ...assumptions.downtimeCostPerDay, narrowbody: v } })}
          />
          <Slider
            label="Downtime, WB"
            value={assumptions.downtimeCostPerDay.widebody}
            range={c.downtimeCostPerDay.widebody}
            shown={`${money(assumptions.downtimeCostPerDay.widebody)}/day`}
            onChange={(v) => set({ downtimeCostPerDay: { ...assumptions.downtimeCostPerDay, widebody: v } })}
          />
        </div>
      </div>

      <div className={`mt-3 border-t pt-2 text-sm ${comparison.changed.length ? 'border-violet-200' : 'border-slate-100'}`}>
        <Trace text={comparison.trace}>
          <span className={comparison.changed.length ? 'font-semibold text-violet-800' : 'text-slate-500'}>
            {comparison.changed.length
              ? `${comparison.changed.length} of ${comparison.tails} tails change their recommended action`
              : `No tail changes its recommended action${atRest ? '' : ' — the totals move, the decisions do not'}`}
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
    </section>
  );
}

function Slider({
  label,
  value,
  range,
  shown,
  onChange,
}: {
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  shown: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium tabular-nums">{shown}</span>
      </div>
      <input
        className="mt-1 w-full accent-slate-900"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
