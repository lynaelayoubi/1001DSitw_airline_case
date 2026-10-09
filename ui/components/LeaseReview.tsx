import { useState } from 'react';

import type { LeaseTerm } from '../../calc/lease';
import { moment, useDemo, type TermReview } from '../demo';
import { int } from '../format';
import { canReviewLease, roleLabel } from '../roles';

/** A corrected value, said the way the term says it. */
function shown(term: LeaseTerm, value: number | string): string {
  if (typeof value === 'string') return value;
  return term.id === 'notice' ? `${int(value)} days` : `at least ${int(value)} ${term.unit}`;
}

/** What a corrected number must be: whole days up to a year for notice, a positive amount for a threshold. */
function invalid(term: LeaseTerm, raw: string): string {
  if (typeof term.value !== 'number') return raw.trim() ? '' : 'Say what the lease says.';
  const v = Number(raw);
  if (!raw.trim() || !Number.isFinite(v)) return 'A number.';
  if (term.id === 'notice') return Number.isInteger(v) && v >= 0 && v <= 365 ? '' : 'Whole days, from 0 to 365.';
  return v > 0 && v < 100_000 ? '' : `A positive number of ${term.unit}.`;
}

/**
 * Each term the tool read from one lease and uses, with the clause it came from — for the leasing
 * team to approve, or correct with a reason. A corrected threshold or notice period flows into the
 * calculation at once (calc/corrections.ts); a corrected rule is recorded and applies on the next
 * recalculation. Every approval and correction goes into the lease's change history.
 */
export function LeaseReview({ leaseId, title, terms, inCalculation }: { leaseId: string; title: string; terms: LeaseTerm[]; inCalculation: boolean }) {
  const demo = useDemo();
  const review = demo.reviews[leaseId];
  const can = canReviewLease(demo.role);
  const [editing, setEditing] = useState<string | null>(null);
  const [raw, setRaw] = useState('');
  const [reason, setReason] = useState('');
  const current = (t: LeaseTerm, r?: TermReview) => (r?.status === 'corrected' ? r.display : t.display);
  const open = (t: LeaseTerm) => {
    setEditing(t.id);
    setRaw(String(review?.terms[t.id]?.value ?? t.value));
    setReason('');
  };
  return (
    <div>
      {!can && <p className="mb-6 text-slate-500">Only the leasing team approves or corrects lease terms. Viewing as {roleLabel(demo.role)}: read only.</p>}
      <ul>
        {terms.map((t) => {
          const r = review?.terms[t.id];
          const problem = editing === t.id ? invalid(t, raw) : '';
          return (
            <li key={t.id} className="grid gap-x-6 gap-y-2 border-t border-slate-100 py-4 first:border-t-0 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className="font-medium">{t.label}</div>
                <div className="mt-1 text-label text-slate-500">
                  {t.clauseRef} · “{t.clauseText}”
                </div>
              </div>
              <div className="lg:col-span-4">
                {r?.status === 'corrected' ? (
                  <>
                    <div>
                      <span className="text-slate-400 line-through">{t.display}</span>
                    </div>
                    <div className="font-medium">{r.display}</div>
                    <div className="mt-1 text-label text-slate-500">
                      Corrected by {r.by}, {moment(r.at)}: “{r.reason}”.{' '}
                      {r.live && inCalculation ? 'Applied to the calculation.' : 'Applies on next recalculation.'}
                    </div>
                  </>
                ) : (
                  <>
                    <div>{t.display}</div>
                    <div className="mt-1 text-label text-slate-500">{r ? `Approved by ${r.by}, ${moment(r.at)}` : 'As read, awaiting review'}</div>
                  </>
                )}
              </div>
              <div className="flex items-start gap-4 lg:col-span-2 lg:justify-end">
                {can && editing !== t.id && (
                  <>
                    {r?.status !== 'approved' && (
                      <button className="link" onClick={() => demo.approveTerm(leaseId, t, current(t, r))}>
                        Approve
                      </button>
                    )}
                    <button className="link" onClick={() => open(t)}>
                      Correct
                    </button>
                  </>
                )}
              </div>
              {editing === t.id && (
                <div className="rounded-lg border border-slate-200 px-4 py-3 lg:col-span-12">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="caps">What the lease says</span>
                      <span className="flex items-center gap-2">
                        <input
                          className="w-full rounded-md border border-slate-200 px-2 py-1"
                          type={typeof t.value === 'number' ? 'number' : 'text'}
                          value={raw}
                          onChange={(e) => setRaw(e.target.value)}
                        />
                        {t.unit && <span className="text-slate-500">{t.unit}</span>}
                      </span>
                      {problem && <span className="text-label text-slate-500">{problem}</span>}
                    </label>
                    <label className="grid gap-1">
                      <span className="caps">Reason (required)</span>
                      <input className="rounded-md border border-slate-200 px-2 py-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: side letter of March 2024" />
                    </label>
                  </div>
                  <p className="mt-2 text-label text-slate-500">
                    {t.live && inCalculation ? 'A corrected figure here is used by the calculation straight away.' : 'A correction here is recorded, and applies on the next recalculation.'}
                  </p>
                  <div className="mt-3 flex gap-4">
                    <button
                      className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white disabled:opacity-40"
                      disabled={!!problem || !reason.trim()}
                      onClick={() => {
                        const value = typeof t.value === 'number' ? Number(raw) : raw.trim();
                        demo.correctTerm(leaseId, t, value, shown(t, value), current(t, r), reason.trim());
                        demo.record(
                          `${roleLabel(demo.role)} corrected ${title}'s lease, ${t.label}: ${current(t, r)} → ${shown(t, value)}. ` +
                            (t.live && inCalculation ? 'The calculation now uses it.' : 'Applies on next recalculation.'),
                        );
                        setEditing(null);
                      }}
                    >
                      Save the correction
                    </button>
                    <button className="link" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="caps mt-12 mb-3">Change history</h3>
      {!review?.history.length ? (
        <p className="text-slate-500">No approval or correction yet.</p>
      ) : (
        <ul className="space-y-2">
          {review.history.map((h, k) => (
            <li key={k} className="flex gap-6">
              <span className="w-28 shrink-0 text-slate-500 tabular-nums">{moment(h.at)}</span>
              <span>
                {h.by} {h.action === 'approved' ? `approved ${h.label}: ${h.to}.` : `corrected ${h.label}: ${h.from} → ${h.to}. “${h.reason}”`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
