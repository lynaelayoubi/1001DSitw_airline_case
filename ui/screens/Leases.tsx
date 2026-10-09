import { useEffect, useState } from 'react';

import type { FleetExposure } from '../../calc/exposure';
import { leaseTerms, type Lease, type LeaseTerm } from '../../calc/lease';
import { AddLease } from '../components/AddLease';
import { LeaseReview } from '../components/LeaseReview';
import { Preview } from '../components/Preview';
import { useDemo, type LeaseReview as Review } from '../demo';
import { date } from '../format';
import { canReviewLease } from '../roles';

/** Where a lease stands: read and awaiting review, or approved by the leasing team once every term is. */
function status(terms: LeaseTerm[], r: Review | undefined): { done: boolean; text: string } {
  const reviewed = terms.filter((t) => r?.terms[t.id]).length;
  const corrected = terms.filter((t) => r?.terms[t.id]?.status === 'corrected').length;
  if (reviewed === terms.length)
    return { done: true, text: `Approved by leasing team${corrected ? `, ${corrected} ${corrected === 1 ? 'correction' : 'corrections'}` : ''}` };
  return { done: false, text: `Read, awaiting review${reviewed ? ` · ${reviewed} of ${terms.length} terms reviewed` : ''}` };
}

/**
 * The leases of the aircraft handing back, as the tool read them: each term the calculation uses,
 * with the clause it came from, for the leasing team to approve or correct. Added leases come in
 * through "Add a lease".
 */
export default function Leases({ fleet, leaseAsRead, onShowTail }: { fleet: FleetExposure; leaseAsRead: (tail: string) => Lease | null; onShowTail: (tail: string) => void }) {
  const demo = useDemo();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // A lease opens at its top, wherever the list was scrolled.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [selected]);
  // An in-service aircraft's lease stands in for an uploaded one in this preview.
  const sampleTail = fleet.tails.find((t) => t.status !== 'returning')?.tail ?? fleet.returning[0]!.tail;
  const rows = [
    ...fleet.returning.map((t) => ({ id: t.tail, tail: t.tail, lease: leaseAsRead(t.tail)!, added: null as null | (typeof demo.added)[number] })),
    ...demo.added.map((a) => ({ id: a.id, tail: a.fileName, lease: leaseAsRead(a.sampleTail)!, added: a })),
  ].filter((r) => r.lease);
  const row = rows.find((r) => r.id === selected);

  if (row) {
    const terms = leaseTerms(row.lease);
    const s = status(terms, demo.reviews[row.id]);
    return (
      <section>
        <button className="link" onClick={() => setSelected(null)}>
          ← All leases
        </button>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="caps">Lease</div>
            <h2 className="mt-1 font-semibold">{row.added ? `${row.added.fileName} · sample terms from ${row.added.sampleTail}` : `${row.tail} · ${row.lease.type} · ${row.lease.lessor.name}`}</h2>
            <div className="text-slate-500">
              {row.added ? `Added ${date(row.added.at.slice(0, 10))}` : `${date(row.lease.leaseStart)} to ${date(row.lease.leaseEnd)}`} · {s.text}
            </div>
          </div>
          {!row.added && (
            <button className="link" onClick={() => onShowTail(row.tail)}>
              Show {row.tail} on the Overview
            </button>
          )}
        </div>
        {row.added && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-slate-500">
            <Preview />
            <span>The file was not read: these terms are a sample from {row.added.sampleTail}'s lease, to show the review. This lease is not in the calculation.</span>
          </div>
        )}
        <div className="mt-12">
          <LeaseReview leaseId={row.id} title={row.added ? row.added.fileName : row.tail} terms={terms} inCalculation={!row.added} />
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="caps mb-3">Leases</h2>
          <p className="text-slate-500">
            What the tool read from each lease and uses in the calculation. The leasing team approves each term, or corrects it with a reason; every change is kept.
          </p>
        </div>
        {canReviewLease(demo.role) && !adding && (
          <button className="link" onClick={() => setAdding(true)}>
            Add a lease
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-6">
          <AddLease
            sampleTail={sampleTail}
            onCancel={() => setAdding(false)}
            onAdded={(id) => {
              setAdding(false);
              setSelected(id);
            }}
          />
        </div>
      )}
      <table className="mt-6 w-full">
        <thead className="caps">
          <tr className="border-b border-slate-200">
            <th className="pr-6 pb-3 text-left font-medium">Aircraft</th>
            <th className="pr-6 pb-3 text-left font-medium">Lessor</th>
            <th className="pr-6 pb-3 text-left font-medium">Lease</th>
            <th className="pr-6 pb-3 text-left font-medium">Return</th>
            <th className="pb-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = status(leaseTerms(r.lease), demo.reviews[r.id]);
            return (
              <tr key={r.id} className="cursor-pointer border-t border-slate-100 align-baseline first:border-t-0 hover:bg-slate-50" onClick={() => setSelected(r.id)}>
                <td className="py-3 pr-6 font-medium whitespace-nowrap">
                  <button className="link">{r.tail}</button>
                </td>
                <td className="py-3 pr-6">{r.added ? <span className="text-slate-500">sample: {r.lease.lessor.name}</span> : r.lease.lessor.name}</td>
                <td className="py-3 pr-6 text-slate-500">{r.lease.lessor.architecture === 'reserve' ? 'Reserve lease' : 'No-reserve lease'}</td>
                <td className="py-3 pr-6 whitespace-nowrap">{r.added ? '—' : date(r.lease.leaseEnd)}</td>
                <td className={`py-3 ${s.done ? 'font-medium' : 'text-slate-500'}`}>{s.text}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
