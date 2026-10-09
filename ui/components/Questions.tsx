import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { AssignmentDraft } from '../../calc/assign';
import { visitName } from '../../calc/levers';
import type { DecisionVerdict, Scenario } from '../../calc/scenario';
import type { Proposal, RouteProfile } from '../../calc/types';
import type { TailChoices } from '../../calc/whatif';
import { useDemo } from '../demo';
import { date, decideBy, money } from '../format';
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
  verdictSentence,
  type DecisionKind,
  type MarketField,
} from '../questions';
import { canAssign } from '../roles';
import { ClauseText } from './ClauseText';

const field = 'w-full rounded-md border border-slate-200 bg-white px-2 py-1';

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

const LABEL: Record<MarketField, string> = {
  shop: 'Shop costs',
  fly: 'Flying hours',
  reserves: 'Reserves we can claim back',
  narrowbody: 'Day on the ground, narrowbody',
  widebody: 'Day on the ground, widebody',
};
/** Today's figure, as the field's own terms: "0%", "$45K". */
const today = (f: MarketField) => (MARKET[f].unit === '%' ? `${MARKET[f].none}%` : money(MARKET[f].none * 1000));

/**
 * The market: one row per figure, always showing — the field with its unit inside it, and today's
 * figure beside it. A changed field is edged in the accent and can be reset; a value outside the
 * evidence is refused with one sentence under its own field, and not taken.
 */
export function MarketPanel({ scenario, onScenario }: { scenario: Scenario; onScenario: (s: Scenario) => void }) {
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
  return (
    <section>
      <div className="mb-1 grid grid-cols-[1fr_7.5rem_4rem_2.5rem] gap-x-3">
        <h3 className="caps">The market</h3>
        <span />
        <span className="caps text-right">Today</span>
      </div>
      {MARKET_FIELDS.map((f) => {
        const problem = marketProblem(f, raw[f]);
        const changed = marketValue(f, scenario.world) !== MARKET[f].none;
        const dollars = MARKET[f].unit === '$K';
        return (
          <div key={f} className="grid grid-cols-[1fr_7.5rem_4rem_2.5rem] items-center gap-x-3 border-t border-slate-100 py-2">
            <label htmlFor={`market-${f}`}>{LABEL[f]}</label>
            <span
              className={`flex items-center gap-1 rounded-md border px-2 py-1 focus-within:border-slate-400 ${
                problem ? 'border-amber-500 bg-white' : changed ? 'border-accent bg-accent-soft' : 'border-slate-200 bg-white'
              }`}
            >
              {dollars && <span className="text-slate-400">$</span>}
              <input
                id={`market-${f}`}
                className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
                type="number"
                step={dollars ? 5 : 1}
                value={raw[f]}
                onChange={(e) => set(f, e.target.value)}
                aria-label={dollars ? `A day on the ground, ${MARKET[f].label}, thousands of dollars` : MARKET[f].label}
              />
              <span className="text-slate-400">{dollars ? 'K' : '%'}</span>
            </span>
            <span className="text-right text-slate-500 tabular-nums">{today(f)}</span>
            <span className="text-right">
              {changed && (
                <button className="link text-label" onClick={() => set(f, String(MARKET[f].none))}>
                  reset
                </button>
              )}
            </span>
            {problem && <p className="col-span-4 mt-1 text-slate-700">{problem}</p>}
          </div>
        );
      })}
      <p className="mt-2 text-label text-slate-500">Zero means no change.</p>
    </section>
  );
}

const KIND_LABEL: Record<DecisionKind, string> = { visit: 'Shop visit', swap: 'Swap', return: 'Return date', route: 'Route' };

/** A labelled row of the decision form. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="text-slate-500">{label}</span>
      <div className="min-w-0">{children}</div>
    </>
  );
}

/**
 * Adding a decision: four kinds — a shop visit, a swap, a return date, a route — then the aircraft and
 * the kind's own fields, labelled, in a fixed order. "Try a scenario" on the Overview arrives here with
 * its aircraft already picked.
 */
export function DecisionBuilder({
  scenario,
  onScenario,
  choices,
  cleared,
  focus,
}: {
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  /** The aircraft a decision can be about, and the cleared ones, listed but not offered. */
  choices: TailChoices[];
  cleared: string[];
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
  const here = useRef<HTMLElement>(null);

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
    here.current?.querySelector<HTMLSelectElement>('select[aria-label="Aircraft"]')?.focus();
    // Only a new arrival moves the form: pickTail reads the choices, which do not change while the page is open.
  }, [focus]);

  const component = c?.components.find((x) => x.position === position);
  const problem = kind === 'route' && c && !profile ? `${tail} flies only one route profile in this network.` : null;
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
  const componentSelect = c && (
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
  );

  return (
    <section ref={here}>
      <h3 className="caps mb-3">Add a decision</h3>
      <div className="inline-flex rounded-md border border-slate-200 p-0.5" role="group" aria-label="Decision">
        {DECISIONS.map((q) => (
          <button
            key={q.kind}
            className={`rounded px-3 py-1 ${kind === q.kind ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            aria-pressed={kind === q.kind}
            title={q.label}
            onClick={() => setKind(q.kind)}
          >
            {KIND_LABEL[q.kind]}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[7rem_1fr] items-center gap-x-3 gap-y-2">
        <Row label="Aircraft">
          <AircraftSelect choices={choices} cleared={cleared} value={tail} onChange={pickTail} />
        </Row>
        {kind === 'visit' && c && (
          <>
            <Row label="Component">{componentSelect}</Row>
            <Row label="Into the shop">
              <select className={field} value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Month">
                {c.months.map((m) => (
                  <option key={m.month} value={m.month}>
                    {date(m.date)}
                  </option>
                ))}
              </select>
            </Row>
            {component?.kind === 'engine' && (
              <Row label="Workscope">
                <select className={field} value={workscope} onChange={(e) => setWorkscope(e.target.value as typeof workscope)} aria-label="Workscope">
                  <option value="build-for-cash">{visitName('engine', 'build-for-cash')}</option>
                  <option value="build-for-interval">{visitName('engine', 'build-for-interval')}</option>
                </select>
              </Row>
            )}
          </>
        )}
        {kind === 'swap' && c && (
          <>
            <Row label="Component">{componentSelect}</Row>
            <Row label="Swap it for">
              <select className={field} value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
                <option value="">the right-sized unit</option>
                {component?.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.serial} · {u.where}
                  </option>
                ))}
              </select>
            </Row>
          </>
        )}
        {kind === 'return' && (
          <Row label="Hand it back">
            <select className={field} value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Months">
              {RETURN_MONTHS.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'month' : 'months'} later
                </option>
              ))}
            </select>
          </Row>
        )}
        {kind === 'route' && c && c.profiles.length > 0 && (
          <Row label={`From ${c.profile} to`}>
            <select className={field} value={profile ?? ''} onChange={(e) => setProfile(e.target.value as RouteProfile)} aria-label="Route profile">
              {c.profiles.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Row>
        )}
        {problem && (
          <>
            <span />
            <p className="text-slate-500">{problem}</p>
          </>
        )}
        <span />
        <div>
          <button className="mt-2 rounded-md bg-slate-900 px-4 py-1 font-medium text-white hover:bg-slate-700 disabled:opacity-40" disabled={!!problem || !c} onClick={add}>
            Add decision
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Your decisions, each once, with its verdict straight under it: better than today's plan, with its
 * date and Assign and notify (a return date is agreed with the lessor); not recommended, with no
 * action; or not possible, with the clause. A decision just added says so until it is priced.
 */
export function DecisionList({
  scenario,
  onScenario,
  priced,
  verdicts,
  drafts,
  onAssign,
  named,
  asOf,
}: {
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  /** The decisions the verdicts were worked out for: the list may run ahead of them while they are. */
  priced: Proposal[];
  verdicts: DecisionVerdict[];
  /** Each assignable decision, drafted, by its place in `priced`. */
  drafts: Record<number, AssignmentDraft>;
  onAssign: (d: AssignmentDraft) => void;
  named: TailChoices[];
  asOf: string;
}) {
  const { role } = useDemo();
  if (!scenario.decisions.length) return null;
  return (
    <section>
      <h3 className="caps mb-1">Your decisions</h3>
      <ul>
        {scenario.decisions.map((d, k) => {
          const j = priced.indexOf(d);
          const v = j >= 0 ? verdicts[j] : undefined;
          const c = v?.closing;
          return (
            <li key={k} className="border-t border-slate-100 py-3 first:border-t-0">
              <div className="flex items-baseline gap-3">
                <span className="flex-1">{decisionSentence(d, named)}</span>
                <button
                  className="text-slate-400 hover:text-slate-900"
                  aria-label="Remove"
                  onClick={() => onScenario({ ...scenario, decisions: scenario.decisions.filter((_, i) => i !== k) })}
                >
                  ×
                </button>
              </div>
              <div className="mt-1">
                {!v ? (
                  <span className="text-slate-400">working it out…</span>
                ) : v.verdict === 'refused' ? (
                  <span className="text-slate-500">
                    <span className="font-medium text-slate-900">Not possible:</span> <ClauseText tail={d.tail} text={v.refused!} />
                  </span>
                ) : (
                  <span className={v.verdict === 'better' ? 'font-medium text-accent-strong' : 'text-slate-500'}>{verdictSentence(v)}</span>
                )}
              </div>
              {v?.verdict === 'better' && (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-4 text-label">
                  {d.kind === 'return' ? (
                    <span className="text-slate-500">agree it with the lessor</span>
                  ) : (
                    <>
                      {c && <span>{c.startNow ? 'no deadline' : decideBy(c.decideBy ?? c.grounded?.from ?? asOf, asOf, c.slotMonth)}</span>}
                      {drafts[j] && canAssign(role) && (
                        <button className="link" onClick={() => onAssign(drafts[j]!)}>
                          Assign and notify
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
