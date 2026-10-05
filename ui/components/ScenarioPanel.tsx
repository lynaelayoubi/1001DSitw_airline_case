import { useState } from 'react';

import { DEFAULT_ASSUMPTIONS, SCENARIO_CONTROLS, SCENARIO_PRESETS, type ScenarioPreset } from '../../calc/constants';
import type { ScenarioComparison } from '../../calc/recommend';
import type { Assumptions } from '../../calc/types';
import { money } from '../format';
import { Trace } from './Trace';

/**
 * SPEC §3.4 — the four controls the customer named, written as the questions a Head of Fleet
 * asks: shop costs rise, aircraft fly more, a lease is extended, a day on the ground costs this
 * much. Presets set one control to a real question and leave the rest at rest; each slider stops
 * where the evidence stops (ASSUMPTIONS §14). The output that matters is how many tails change
 * what they are told to do.
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
  const same = (x: Assumptions, y: Assumptions) => JSON.stringify(x) === JSON.stringify(y);
  const atRest = same(assumptions, DEFAULT_ASSUMPTIONS);

  const presetState = (p: ScenarioPreset): Assumptions => ({
    ...DEFAULT_ASSUMPTIONS,
    ...(p.maintenanceCostMultiplier !== undefined && { maintenanceCostMultiplier: p.maintenanceCostMultiplier }),
    ...(p.utilisationMultiplier !== undefined && { utilisationMultiplier: p.utilisationMultiplier }),
    ...(p.leaseExtensionMonths !== undefined && { leaseExtensionMonths: { [extended]: p.leaseExtensionMonths } }),
  });
  const active = SCENARIO_PRESETS.find((p) => same(assumptions, presetState(p)));

  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="mr-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase">What if</h2>
        {SCENARIO_PRESETS.map((p) => (
          <button
            key={p.id}
            title={p.basis}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              active?.id === p.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => onChange(presetState(p))}
          >
            {p.label}
            {p.leaseExtensionMonths !== undefined && extended ? ` (${extended})` : ''}
          </button>
        ))}
        <button
          className="ml-auto rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 enabled:hover:bg-slate-50 disabled:opacity-40"
          disabled={atRest}
          onClick={() => onChange(DEFAULT_ASSUMPTIONS)}
        >
          Reset
        </button>
      </div>
      {active && <p className="mb-2 text-xs text-slate-500">Basis: {active.basis}</p>}

      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
        <Slider
          question={change('Shop costs', assumptions.maintenanceCostMultiplier, 'rise', 'fall')}
          value={assumptions.maintenanceCostMultiplier}
          range={c.maintenanceCost}
          ends={[signedPct(c.maintenanceCost.min), signedPct(c.maintenanceCost.max)]}
          onChange={(v) => set({ maintenanceCostMultiplier: v })}
        />
        <Slider
          question={change('Aircraft fly', assumptions.utilisationMultiplier, 'more', 'less', true)}
          value={assumptions.utilisationMultiplier}
          range={c.utilisation}
          ends={[signedPct(c.utilisation.min), signedPct(c.utilisation.max)]}
          onChange={(v) => set({ utilisationMultiplier: v })}
        />
        <div>
          <div className="text-sm text-slate-800">
            Extend the lease on{' '}
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
            <span className="font-medium">{months === 0 ? '— not extended' : `by ${months} ${months === 1 ? 'month' : 'months'}`}</span>
          </div>
          <Range value={months} range={c.leaseExtensionMonths} ends={[`${c.leaseExtensionMonths.min}`, `${c.leaseExtensionMonths.max} mo`]} onChange={(v) => extend(extended, v)} />
        </div>
        <div>
          <div className="text-sm text-slate-800">
            A day on the ground costs <span className="font-medium">{money(assumptions.downtimeCostPerDay.narrowbody)}</span> NB ·{' '}
            <span className="font-medium">{money(assumptions.downtimeCostPerDay.widebody)}</span> WB
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Range
              value={assumptions.downtimeCostPerDay.narrowbody}
              range={c.downtimeCostPerDay.narrowbody}
              ends={[money(c.downtimeCostPerDay.narrowbody.min), money(c.downtimeCostPerDay.narrowbody.max)]}
              onChange={(v) => set({ downtimeCostPerDay: { ...assumptions.downtimeCostPerDay, narrowbody: v } })}
            />
            <Range
              value={assumptions.downtimeCostPerDay.widebody}
              range={c.downtimeCostPerDay.widebody}
              ends={[money(c.downtimeCostPerDay.widebody.min), money(c.downtimeCostPerDay.widebody.max)]}
              onChange={(v) => set({ downtimeCostPerDay: { ...assumptions.downtimeCostPerDay, widebody: v } })}
            />
          </div>
        </div>
      </div>

      <div className={`mt-3 border-t pt-2 text-sm ${comparison.changed.length ? 'border-violet-200' : 'border-slate-100'}`}>
        <Trace text={comparison.trace}>
          <span className={comparison.changed.length ? 'font-semibold text-violet-800' : 'text-slate-500'}>
            {comparison.changed.length
              ? comparison.changed.length === 1
                ? `1 of ${comparison.tails} tails changes its recommended action`
                : `${comparison.changed.length} of ${comparison.tails} tails change their recommended action`
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

/** A multiplier read as the question it answers: "Shop costs rise 30%", "Aircraft fly 10% less". */
function change(subject: string, multiplier: number, up: string, down: string, after = false): React.ReactNode {
  const pct = Math.round(Math.abs(multiplier - 1) * 100);
  if (pct === 0) return `${subject} as planned`;
  const word = multiplier > 1 ? up : down;
  return (
    <>
      {subject} <span className="font-medium">{after ? `${pct}% ${word}` : `${word} ${pct}%`}</span>
    </>
  );
}

const signedPct = (multiplier: number) => {
  const pct = Math.round((multiplier - 1) * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
};

function Slider({
  question,
  value,
  range,
  ends,
  onChange,
}: {
  question: React.ReactNode;
  value: number;
  range: { min: number; max: number; step: number };
  ends: [string, string];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-sm text-slate-800">{question}</div>
      <Range value={value} range={range} ends={ends} onChange={onChange} />
    </div>
  );
}

/** A slider with its evidenced ends printed under it. */
function Range({ value, range, ends, onChange }: { value: number; range: { min: number; max: number; step: number }; ends: [string, string]; onChange: (v: number) => void }) {
  return (
    <div>
      <input className="mt-1 w-full accent-slate-900" type="range" min={range.min} max={range.max} step={range.step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}
