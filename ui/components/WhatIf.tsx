import { useState } from 'react';

import { LEASE_EXTENSION_CONTROL } from '../../calc/constants';
import type { ExtensionEffects } from '../../calc/robustness';
import type { Proposal } from '../../calc/types';
import type { TailChoices, WhatIf as WhatIfResult } from '../../calc/whatif';
import { date, money } from '../format';
import { ClauseText } from './ClauseText';

/** The four decisions the customer controls. Not the seven assumptions: those are the world's, and the sweep moves them. */
const KINDS: { kind: Proposal['kind']; label: string }[] = [
  { kind: 'swap', label: 'Swap a component' },
  { kind: 'visit', label: 'Send one to the shop' },
  { kind: 'route', label: 'Change its route' },
  { kind: 'return', label: 'Move its return date' },
];

const signed = (n: number) => (Math.abs(n) < 0.5 ? 'no change' : `${n > 0 ? '+' : ''}${money(n)}`);
const select = 'rounded-md border border-slate-200 bg-white px-2 py-1';

/**
 * What if: the head of fleet proposes his own actions — several at once — and sees what they
 * change against today's plan, which stays on screen throughout (calc/whatif.ts). The output is
 * the difference. A proposal the model knows cannot happen is listed as refused, with the reason.
 */
export function WhatIf({
  choices,
  proposals,
  onProposals,
  result,
  extension,
}: {
  choices: TailChoices[];
  proposals: Proposal[];
  onProposals: (p: Proposal[]) => void;
  result: WhatIfResult | null;
  extension: ExtensionEffects | null;
}) {
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
      {c && <Details key={`${c.tail}:${kind}`} c={c} kind={kind} extension={extension} onAdd={(p) => onProposals([...proposals, p])} />}

      {proposals.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="caps">Your changes</span>
            <button className="link text-label" onClick={() => onProposals([])}>
              Clear — back to today's plan
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {proposals.map((p, k) => {
              const r = result?.proposals[k];
              const instead = r && !r.refused && p.kind !== 'return' ? result!.changed.find((x) => x.tail === p.tail)?.from : undefined;
              return (
                <li key={k} className="flex gap-2">
                  <button className="text-slate-400 hover:text-slate-900" aria-label="Remove this change" onClick={() => onProposals(proposals.filter((_, j) => j !== k))}>
                    ×
                  </button>
                  <span>
                    <span className="font-medium">{p.tail}</span> {r ? (r.refused ? r.asked : r.label) : '…'}
                    {r?.refused && (
                      <span className="block text-label font-medium">
                        Refused: <ClauseText tail={p.tail} text={r.refused} />
                      </span>
                    )}
                    {instead && <span className="block text-label text-slate-500">instead of {instead}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {result && <Difference result={result} />}
        </div>
      )}
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

/** Today's plan beside the plan with the changes: exposure, spend, all-in, and the tails whose action changes. */
function Difference({ result }: { result: WhatIfResult }) {
  if (result.applied === 0) return <p className="mt-3 text-label text-slate-500">Nothing applied: today's plan stands.</p>;
  // Your own actions are listed above, with what each replaces; below, the tails that change as a result — a moved return date's included.
  const knockOn = result.changed.filter((x) => !result.scenario.byTail[x.tail]?.proposed);
  const rows = [
    { label: 'Still owed at handback', d: result.owed },
    { label: 'Maintenance spend', d: result.spend },
    { label: 'All-in, with downtime', d: result.allIn },
  ];
  return (
    <div className="mt-6">
      <table className="w-full tabular-nums">
        <thead className="caps">
          <tr className="border-b border-slate-200">
            <th className="pb-2 text-left font-medium">Against today's plan</th>
            <th className="pb-2 text-right font-medium">Today</th>
            <th className="pb-2 text-right font-medium">With yours</th>
            <th className="pb-2 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, d }) => (
            <tr key={label} className="border-t border-slate-100 first:border-t-0">
              <td className="py-2">{label}</td>
              <td className="py-2 text-right text-slate-500">{money(d.before)}</td>
              <td className="py-2 text-right">{money(d.after)}</td>
              <td className={`py-2 text-right ${Math.abs(d.change) > 0.5 ? 'font-medium' : 'text-slate-500'}`}>{signed(d.change)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-label text-slate-500">
        {knockOn.length === 0 ? 'No other tail changes its action.' : `${knockOn.length} ${knockOn.length === 1 ? 'tail changes its' : 'tails change their'} action as a result:`}
      </div>
      <ul className="mt-1 space-y-1">
        {knockOn.map((x) => (
          <li key={x.tail}>
            <span className="font-medium">{x.tail}</span> <span className="text-slate-500">{x.from}</span> → <span className="font-medium">{x.to}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
