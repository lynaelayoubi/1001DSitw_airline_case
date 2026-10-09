import { useEffect, useRef, useState } from 'react';

import type { Scenario } from '../../calc/scenario';
import type { Proposal, RouteProfile } from '../../calc/types';
import type { TailChoices } from '../../calc/whatif';
import { visitName } from '../../calc/levers';
import { date } from '../format';
import {
  DECISIONS,
  MARKET,
  MARKET_FIELDS,
  RETURN_MONTHS,
  decisionSentence,
  marketChanges,
  marketNumber,
  marketProblem,
  marketValue,
  type DecisionKind,
  type MarketField,
} from '../questions';

const field = 'rounded-md border border-slate-200 bg-white px-2 py-1';

/**
 * The aircraft a decision can be about. Those with nothing to decide are listed, but cannot be
 * picked: a decision on one cannot be priced fairly yet (calc/scenario.ts, CLEARED_REFUSAL).
 */
export function AircraftSelect({ choices, cleared, value, onChange }: { choices: TailChoices[]; cleared: string[]; value: string; onChange: (tail: string) => void }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Aircraft">
      {choices.map((x) => (
        <option key={x.tail} value={x.tail}>
          {x.tail} · {x.type}
        </option>
      ))}
      {cleared.map((t) => (
        <option key={t} value={`cleared:${t}`} disabled>
          {t} · Cleared: nothing to decide
        </option>
      ))}
    </select>
  );
}

/**
 * The market changes: one row of fields, always showing, each starting at no change — shop costs and
 * flying hours at 0%, reserves at what can be claimed back today, a day on the ground at today's
 * figure. A value outside the evidence is refused with one sentence saying the range, and not taken.
 */
export function MarketRow({ scenario, onScenario }: { scenario: Scenario; onScenario: (s: Scenario) => void }) {
  const shown = () => Object.fromEntries(MARKET_FIELDS.map((f) => [f, String(marketValue(f, scenario.world))])) as Record<MarketField, string>;
  const [raw, setRaw] = useState(shown);
  // A change from elsewhere — Reset demo — shows in the fields; what is being typed and still reads the same stays as typed.
  useEffect(() => {
    setRaw((r) => {
      const next = { ...r };
      for (const f of MARKET_FIELDS) if (marketProblem(f, r[f]) || marketNumber(f, r[f]) !== marketValue(f, scenario.world)) next[f] = String(marketValue(f, scenario.world));
      return next;
    });
  }, [scenario.world]);

  const set = (f: MarketField, text: string) => {
    const next = { ...raw, [f]: text };
    setRaw(next);
    if (marketProblem(f, text)) return;
    // Every field that reads cleanly; one that does not keeps the value already taken.
    const values = Object.fromEntries(MARKET_FIELDS.map((g) => [g, marketProblem(g, next[g]) ? marketValue(g, scenario.world) : marketNumber(g, next[g])]));
    onScenario({ ...scenario, world: marketChanges(values) });
  };
  const problems = MARKET_FIELDS.map((f) => marketProblem(f, raw[f])).filter((x): x is string => !!x);
  const input = (f: MarketField, width: string) => (
    <input
      className={`${field} ${width} text-right tabular-nums ${marketProblem(f, raw[f]) ? 'border-amber-500' : ''}`}
      type="number"
      step={MARKET[f].unit === '%' ? 1 : 5}
      value={raw[f]}
      onChange={(e) => set(f, e.target.value)}
      aria-label={MARKET[f].unit === '$K' ? `A day on the ground, ${MARKET[f].label}, thousands of dollars` : MARKET[f].label}
    />
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {(['shop', 'fly', 'reserves'] as const).map((f) => (
          <label key={f} className="flex items-center gap-2">
            <span>{MARKET[f].label}</span>
            {input(f, 'w-20')}
            <span className="text-slate-500">%</span>
          </label>
        ))}
        <span className="flex flex-wrap items-center gap-2">
          <span>Day on the ground</span>
          {(['narrowbody', 'widebody'] as const).map((f) => (
            <label key={f} className="flex items-center gap-1">
              <span className="text-slate-500">{MARKET[f].label} $</span>
              {input(f, 'w-20')}
              <span className="text-slate-500">K</span>
            </label>
          ))}
        </span>
      </div>
      <p className="mt-2 text-label text-slate-500">
        Zero means no change; reserves and a day on the ground start at today's figures.
      </p>
      {problems.map((p) => (
        <p key={p} className="mt-1 text-slate-700">
          {p}
        </p>
      ))}
    </div>
  );
}

/**
 * The aircraft decisions: one picker — a shop visit, a swap, a return date, a route — each with its own
 * values, added with one button to a list that reads each back as the same sentence. "Try a scenario"
 * on the Overview arrives here with its aircraft already picked.
 */
export function DecisionPicker({
  scenario,
  onScenario,
  choices,
  cleared,
  named,
  focus,
}: {
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  /** The aircraft a decision can be about, and the cleared ones, listed but not offered. */
  choices: TailChoices[];
  cleared: string[];
  /** Every returning aircraft, so a decision already in the list reads back in full. */
  named: TailChoices[];
  /** An aircraft to start on, from "Try a scenario"; `at` tells one arrival from the next. */
  focus: { tail: string; at: number } | null;
}) {
  const [kind, setKind] = useState<DecisionKind>('visit');
  const [tail, setTail] = useState(choices[0]?.tail ?? '');
  const c = choices.find((x) => x.tail === tail);
  const [position, setPosition] = useState(c?.components[0]?.position ?? '');
  const [unit, setUnit] = useState('');
  const [month, setMonth] = useState(Math.min(c?.firstSlot ?? 1, c?.months.length ?? 1) || 1);
  const [workscope, setWorkscope] = useState<'build-for-cash' | 'build-for-interval'>('build-for-cash');
  const [months, setMonths] = useState(RETURN_MONTHS[0] ?? 1);
  const [profile, setProfile] = useState<RouteProfile | null>(c?.profiles[0] ?? null);
  const here = useRef<HTMLDivElement>(null);

  const pickTail = (t: string) => {
    const next = choices.find((x) => x.tail === t);
    setTail(t);
    setPosition(next?.components[0]?.position ?? '');
    setUnit('');
    setMonth(Math.min(next?.firstSlot ?? 1, next?.months.length ?? 1) || 1);
    setProfile(next?.profiles[0] ?? null);
  };
  useEffect(() => {
    if (!focus || !choices.some((x) => x.tail === focus.tail)) return;
    pickTail(focus.tail);
    here.current?.scrollIntoView({ block: 'center' });
    here.current?.querySelector('select')?.focus();
    // Only a new arrival moves the picker: pickTail reads the choices, which do not change while the page is open.
  }, [focus]);

  const component = c?.components.find((x) => x.position === position);
  const problem = kind === 'route' && !profile ? `${tail} flies only one route profile in this network.` : null;
  const add = () => {
    if (problem || !c) return;
    const p: Proposal =
      kind === 'swap'
        ? { kind, tail, position, unit: unit || null }
        : kind === 'visit'
          ? { kind, tail, position, month, workscope }
          : kind === 'route'
            ? { kind, tail, profile }
            : { kind, tail, months };
    onScenario({ ...scenario, decisions: [...scenario.decisions, p] });
  };

  return (
    <div ref={here}>
      <div className="flex flex-wrap items-center gap-2">
        <select className={field} value={kind} onChange={(e) => setKind(e.target.value as DecisionKind)} aria-label="Decision">
          {DECISIONS.map((q) => (
            <option key={q.kind} value={q.kind}>
              {q.label}
            </option>
          ))}
        </select>
        <AircraftSelect choices={choices} cleared={cleared} value={tail} onChange={pickTail} />
        {(kind === 'visit' || kind === 'swap') && c && (
          <select
            className={field}
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setUnit('');
            }}
            aria-label="Component"
          >
            {c.components.map((x) => (
              <option key={x.position} value={x.position}>
                {x.position}
              </option>
            ))}
          </select>
        )}
        {kind === 'swap' && (
          <>
            <span>for</span>
            <select className={field} value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
              <option value="">the right-sized unit</option>
              {component?.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.serial} · {u.where}
                </option>
              ))}
            </select>
          </>
        )}
        {kind === 'visit' && c && (
          <>
            <span>in</span>
            <select className={field} value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Month">
              {c.months.map((m) => (
                <option key={m.month} value={m.month}>
                  {date(m.date)}
                </option>
              ))}
            </select>
            {component?.kind === 'engine' && (
              <select className={field} value={workscope} onChange={(e) => setWorkscope(e.target.value as typeof workscope)} aria-label="Workscope">
                <option value="build-for-cash">{visitName('engine', 'build-for-cash')}</option>
                <option value="build-for-interval">{visitName('engine', 'build-for-interval')}</option>
              </select>
            )}
          </>
        )}
        {kind === 'return' && (
          <>
            <span>by</span>
            <select className={field} value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Months">
              {RETURN_MONTHS.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'month' : 'months'}
                </option>
              ))}
            </select>
          </>
        )}
        {kind === 'route' && c && c.profiles.length > 0 && (
          <>
            <span>from {c.profile} to</span>
            <select className={field} value={profile ?? ''} onChange={(e) => setProfile(e.target.value as RouteProfile)} aria-label="Route profile">
              {c.profiles.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </>
        )}
        <button className="rounded-md bg-slate-900 px-4 py-1 font-medium text-white hover:bg-slate-700 disabled:opacity-40" disabled={!!problem || !c} onClick={add}>
          Add
        </button>
      </div>
      {problem && <p className="mt-2 text-slate-500">{problem}</p>}
      {cleared.length > 0 && (
        <p className="mt-2 text-label text-slate-500">Not offered, cleared with nothing to decide: {cleared.join(', ')}. A decision on a cleared aircraft cannot be priced fairly yet.</p>
      )}

      {scenario.decisions.length > 0 && (
        <ul className="mt-6">
          {scenario.decisions.map((d, k) => (
            <li key={`d${k}`} className="flex items-baseline gap-4 border-t border-slate-100 py-2 first:border-t-0">
              <span className="flex-1">{decisionSentence(d, named)}</span>
              <button
                className="text-slate-400 hover:text-slate-900"
                aria-label="Remove"
                onClick={() => onScenario({ ...scenario, decisions: scenario.decisions.filter((_, j) => j !== k) })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
