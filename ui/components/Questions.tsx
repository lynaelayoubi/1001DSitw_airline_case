import { useState } from 'react';

import type { Scenario, WorldChange } from '../../calc/scenario';
import type { Proposal, RouteProfile } from '../../calc/types';
import type { TailChoices } from '../../calc/whatif';
import { date } from '../format';
import { DOWNTIME_INPUT, PERCENT, QUESTIONS, RETURN_MONTHS, decisionSentence, outsideRange, workscopeWords, worldSentence, type Kind } from '../questions';

const field = 'rounded-md border border-slate-200 bg-white px-2 py-1';

/**
 * The aircraft a question can be about. Those with nothing to decide are listed, but cannot be
 * picked: a decision on one cannot be priced fairly yet (calc/scenario.ts, CLEARED_REFUSAL).
 */
export function AircraftSelect({ choices, cleared, value, onChange }: { choices: TailChoices[]; cleared: string[]; value: string; onChange: (tail: string) => void }) {
  return (
    <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
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
 * The questions: one picker of plain-English questions, each with its own values, added with one
 * button to a list that reads each back as the same sentence. A value outside its evidenced range is
 * refused with one sentence saying the range. Two questions setting the same figure — shop costs up,
 * and a renegotiated contract — cannot both hold: the later replaces the earlier, and the list says so.
 */
export function Questions({
  scenario,
  onScenario,
  choices,
  cleared,
  named,
}: {
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  /** The aircraft a question can be about, and the cleared ones, listed but not offered. */
  choices: TailChoices[];
  cleared: string[];
  /** Every returning aircraft, so a question already in the list reads back in full. */
  named: TailChoices[];
}) {
  const [kind, setKind] = useState<Kind>('shopUp');
  const [raw, setRaw] = useState(String(PERCENT.shopUp.start));
  const [body, setBody] = useState<'narrowbody' | 'widebody'>('narrowbody');
  const [tail, setTail] = useState(choices[0]?.tail ?? '');
  const c = choices.find((x) => x.tail === tail);
  const [position, setPosition] = useState(c?.components[0]?.position ?? '');
  const [unit, setUnit] = useState('');
  const [month, setMonth] = useState(Math.min(c?.firstSlot ?? 1, c?.months.length ?? 1) || 1);
  const [workscope, setWorkscope] = useState<'build-for-cash' | 'build-for-interval'>('build-for-cash');
  const [months, setMonths] = useState(RETURN_MONTHS[0] ?? 1);
  const [profile, setProfile] = useState<RouteProfile | null>(c?.profiles[0] ?? null);
  // What each item replaced, kept beside it until it is removed or replaced again.
  const [replaced, setReplaced] = useState<Record<string, string>>({});

  const pickKind = (k: Kind) => {
    setKind(k);
    if (k in PERCENT) setRaw(String(PERCENT[k as keyof typeof PERCENT].start));
  };
  const pickTail = (t: string) => {
    const next = choices.find((x) => x.tail === t);
    setTail(t);
    setPosition(next?.components[0]?.position ?? '');
    setUnit('');
    setMonth(Math.min(next?.firstSlot ?? 1, next?.months.length ?? 1) || 1);
    setProfile(next?.profiles[0] ?? null);
  };
  const component = c?.components.find((x) => x.position === position);
  const decision = kind === 'visit' || kind === 'swap' || kind === 'return' || kind === 'route';
  const problem = decision ? (kind === 'route' && !profile ? `${tail} flies only one route profile in this network.` : null) : outsideRange(kind, raw, body);

  const add = () => {
    if (problem) return;
    if (decision) {
      const p: Proposal =
        kind === 'swap'
          ? { kind, tail, position, unit: unit || null }
          : kind === 'visit'
            ? { kind, tail, position, month, workscope }
            : kind === 'route'
              ? { kind, tail, profile }
              : { kind, tail, months };
      onScenario({ ...scenario, decisions: [...scenario.decisions, p] });
      return;
    }
    const change: WorldChange =
      kind === 'downtime' ? { input: DOWNTIME_INPUT[body], value: Number(raw) } : { input: PERCENT[kind as keyof typeof PERCENT].input, value: PERCENT[kind as keyof typeof PERCENT].toValue(Number(raw)) };
    const before = scenario.world.find((w) => w.input === change.input);
    setReplaced((r) => {
      const { [change.input]: _gone, ...rest } = r;
      return before ? { ...rest, [change.input]: worldSentence(before) } : rest;
    });
    onScenario(
      before ? { ...scenario, world: scenario.world.map((w) => (w.input === change.input ? change : w)) } : { ...scenario, world: [...scenario.world, change] },
    );
  };

  const empty = !scenario.world.length && !scenario.decisions.length;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <select className={field} value={kind} onChange={(e) => pickKind(e.target.value as Kind)} aria-label="Question">
          {QUESTIONS.map((q) => (
            <option key={q.kind} value={q.kind}>
              {q.label}
            </option>
          ))}
        </select>

        {kind in PERCENT && (
          <span className="flex items-center gap-1">
            <input className={`${field} w-20 text-right tabular-nums`} type="number" value={raw} onChange={(e) => setRaw(e.target.value)} aria-label="Per cent" />
            <span className="text-slate-500">%</span>
          </span>
        )}
        {kind === 'downtime' && (
          <>
            <span className="flex items-center gap-1">
              <span className="text-slate-500">$</span>
              <input className={`${field} w-28 text-right tabular-nums`} type="number" step={5000} value={raw} onChange={(e) => setRaw(e.target.value)} aria-label="Dollars a day" />
              <span className="text-slate-500">a day, for a</span>
            </span>
            <select className={field} value={body} onChange={(e) => setBody(e.target.value as typeof body)}>
              <option value="narrowbody">narrowbody</option>
              <option value="widebody">widebody</option>
            </select>
          </>
        )}

        {decision && <AircraftSelect choices={choices} cleared={cleared} value={tail} onChange={pickTail} />}
        {(kind === 'visit' || kind === 'swap') && c && (
          <select
            className={field}
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setUnit('');
            }}
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
            <select className={field} value={unit} onChange={(e) => setUnit(e.target.value)}>
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
            <select className={field} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {c.months.map((m) => (
                <option key={m.month} value={m.month}>
                  {date(m.date)}
                </option>
              ))}
            </select>
            {component?.kind === 'engine' && (
              <select className={field} value={workscope} onChange={(e) => setWorkscope(e.target.value as typeof workscope)}>
                <option value="build-for-cash">{workscopeWords('build-for-cash')}</option>
                <option value="build-for-interval">{workscopeWords('build-for-interval')}</option>
              </select>
            )}
          </>
        )}
        {kind === 'return' && (
          <>
            <span>by</span>
            <select className={field} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
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
            <select className={field} value={profile ?? ''} onChange={(e) => setProfile(e.target.value as RouteProfile)}>
              {c.profiles.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </>
        )}

        <button className="rounded-md bg-slate-900 px-4 py-1 font-medium text-white hover:bg-slate-700 disabled:opacity-40" disabled={!!problem} onClick={add}>
          Add
        </button>
      </div>
      {problem && <p className="mt-2 text-slate-500">{problem}</p>}
      {decision && cleared.length > 0 && (
        <p className="mt-2 text-label text-slate-500">Not offered, cleared with nothing to decide: {cleared.join(', ')}. A decision on a cleared aircraft cannot be priced fairly yet.</p>
      )}

      {!empty && (
        <ul className="mt-6">
          {scenario.world.map((w) => (
            <li key={w.input} className="flex items-baseline gap-4 border-t border-slate-100 py-2 first:border-t-0">
              <span className="flex-1">
                {worldSentence(w)}
                {replaced[w.input] && <span className="mt-1 block text-label text-slate-500">Replaced “{replaced[w.input]}”</span>}
              </span>
              <button
                className="text-slate-400 hover:text-slate-900"
                aria-label="Remove"
                onClick={() => {
                  setReplaced(({ [w.input]: _gone, ...rest }) => rest);
                  onScenario({ ...scenario, world: scenario.world.filter((x) => x.input !== w.input) });
                }}
              >
                ×
              </button>
            </li>
          ))}
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
