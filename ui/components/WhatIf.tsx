import { useState } from 'react';

import { LEASE_EXTENSION_CONTROL } from '../../calc/constants';
import type { ExtensionEffects } from '../../calc/robustness';
import type { Proposal } from '../../calc/types';
import type { TailChoices } from '../../calc/whatif';
import { date } from '../format';

/** The four decisions the customer controls. Not the seven assumptions: those are the world's, and the sweep moves them. */
const KINDS: { kind: Proposal['kind']; label: string }[] = [
  { kind: 'swap', label: 'Swap a component' },
  { kind: 'visit', label: 'Send one to the shop' },
  { kind: 'route', label: 'Change its route' },
  { kind: 'return', label: 'Move its return date' },
];

const select = 'rounded-md border border-slate-200 bg-white px-2 py-1';

/**
 * A decision for the scenario: the head of fleet picks a tail and one of four actions, and adds it.
 * Pricing, refusals and what it changes are the scenario builder's (calc/scenario.ts, calc/whatif.ts).
 */
export function DecisionPicker({ choices, extension, onAdd }: { choices: TailChoices[]; extension: ExtensionEffects | null; onAdd: (p: Proposal) => void }) {
  const [tail, setTail] = useState(choices[0]?.tail ?? '');
  const [kind, setKind] = useState<Proposal['kind']>('swap');
  const c = choices.find((x) => x.tail === tail);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span>What if</span>
        <select className={select} value={tail} onChange={(e) => setTail(e.target.value)}>
          {choices.map((x) => (
            <option key={x.tail} value={x.tail}>
              {x.tail} · {x.type}
            </option>
          ))}
        </select>
        <select className={select} value={kind} onChange={(e) => setKind(e.target.value as Proposal['kind'])}>
          {KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      {c && <Details key={`${c.tail}:${kind}`} c={c} kind={kind} extension={extension} onAdd={onAdd} />}
    </div>
  );
}

/** The choices for one decision on one tail, and the button that proposes it. */
function Details({ c, kind, extension, onAdd }: { c: TailChoices; kind: Proposal['kind']; extension: ExtensionEffects | null; onAdd: (p: Proposal) => void }) {
  const [position, setPosition] = useState(c.components[0]?.position ?? '');
  const [unit, setUnit] = useState('');
  const [month, setMonth] = useState(Math.min(c.firstSlot, c.months.length) || 1);
  const [workscope, setWorkscope] = useState<'build-for-cash' | 'build-for-interval'>('build-for-cash');
  const [profile, setProfile] = useState(c.profiles[0] ?? null);
  const [months, setMonths] = useState(LEASE_EXTENSION_CONTROL.min + LEASE_EXTENSION_CONTROL.step);
  const component = c.components.find((x) => x.position === position);
  const ext = extension?.byTail[c.tail];
  const proposal: Proposal =
    kind === 'swap'
      ? { kind, tail: c.tail, position, unit: unit || null }
      : kind === 'visit'
        ? { kind, tail: c.tail, position, month, workscope }
        : kind === 'route'
          ? { kind, tail: c.tail, profile }
          : { kind, tail: c.tail, months };
  const positions = (
    <select
      className={select}
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
  );
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        {kind === 'swap' && (
          <>
            {positions}
            <span>for</span>
            <select className={select} value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">the right-sized unit</option>
              {component?.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.serial} · {u.where}
                </option>
              ))}
            </select>
          </>
        )}
        {kind === 'visit' && (
          <>
            {positions}
            <span>in</span>
            <select className={select} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {c.months.map((m) => (
                <option key={m.month} value={m.month}>
                  month {m.month} · {date(m.date)}
                </option>
              ))}
            </select>
            {component?.kind === 'engine' && (
              <select className={select} value={workscope} onChange={(e) => setWorkscope(e.target.value as typeof workscope)}>
                <option value="build-for-cash">build-for-cash</option>
                <option value="build-for-interval">build-for-interval</option>
              </select>
            )}
          </>
        )}
        {kind === 'route' && (
          <>
            <span>from {c.profile} to</span>
            <select className={select} value={profile ?? ''} onChange={(e) => setProfile(e.target.value as typeof profile)}>
              {c.profiles.length === 0 && <option value="">no other profile</option>}
              {c.profiles.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </>
        )}
        {kind === 'return' && (
          <>
            <span>later by</span>
            <select className={select} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {Array.from({ length: (LEASE_EXTENSION_CONTROL.max - LEASE_EXTENSION_CONTROL.min) / LEASE_EXTENSION_CONTROL.step }, (_, k) => {
                const n = LEASE_EXTENSION_CONTROL.min + (k + 1) * LEASE_EXTENSION_CONTROL.step;
                return (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'month' : 'months'}
                  </option>
                );
              })}
            </select>
          </>
        )}
        <button className="link rounded-md border border-slate-200 bg-white px-3 py-1 hover:border-accent hover:no-underline" onClick={() => onAdd(proposal)}>
          Add to the scenario
        </button>
      </div>
      {kind === 'return' && extension && (
        <p className="mt-2 text-label text-slate-500">
          {!ext || ext.months === null
            ? `On its own, moving ${c.tail}'s return changes no recommendation at any length up to ${extension.maxMonths} months.`
            : `On its own, moving ${c.tail}'s return first changes a recommendation at ${ext.months} ${ext.months === 1 ? 'month' : 'months'}: ${ext.changes
                .map((x) => `${x.tail} ${x.from} → ${x.to}`)
                .join('; ')}.`}
        </p>
      )}
    </div>
  );
}
