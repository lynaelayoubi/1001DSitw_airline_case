import { DOCUMENT_STATUSES, documentsFor, type DocumentStatus } from '../../calc/documents';
import type { TailResult } from '../../calc/exposure';
import { useDemo } from '../demo';
import { date } from '../format';
import { canUpdateDocuments, roleLabel } from '../roles';

const WORD: Record<DocumentStatus, string> = { 'to do': 'To do', 'in progress': 'In progress', ready: 'Ready', missing: 'Missing' };

/**
 * The documents each returning aircraft needs at redelivery: a standard template, not read from the
 * lease, laid over the aircraft's own engines, APU and gear (calc/documents.ts). Each has an owner
 * and a status; the leasing team and maintenance planning update it, and each change is logged.
 */
export function Documents({ tails }: { tails: TailResult[] }) {
  const demo = useDemo();
  const can = canUpdateDocuments(demo.role);
  const soonest = [...tails].sort((a, b) => a.projection.effectiveLeaseEnd.localeCompare(b.projection.effectiveLeaseEnd));
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="caps">Documents for redelivery</h2>
        <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-label text-slate-500">Standard template, not read from a lease</span>
      </div>
      <p className="mb-3 text-slate-500">
        The records a return asks for, by aircraft, soonest return first. Each has an owner and a status
        {can ? '; change a status as the document comes together.' : `; the leasing team and maintenance planning update them. Viewing as ${roleLabel(demo.role)}: read only.`}
      </p>
      {soonest.map((t) => {
        const docs = documentsFor(t);
        const status = (id: string, initial: DocumentStatus) => demo.docs[id] ?? initial;
        const missing = docs.filter((d) => status(d.id, d.initial) === 'missing').length;
        const ready = docs.filter((d) => status(d.id, d.initial) === 'ready').length;
        return (
          <details key={t.tail} className="border-t border-slate-100 py-3 first:border-t-0">
            <summary className="cursor-pointer">
              <span className="font-medium">{t.tail}</span>
              <span className="ml-3 text-slate-500">
                returns {date(t.projection.effectiveLeaseEnd)} · {docs.length} documents · {ready} ready
                {missing ? (
                  <>
                    {' '}
                    · <span className="font-medium text-slate-900">{missing} missing</span>
                  </>
                ) : null}
              </span>
            </summary>
            <table className="mt-3 w-full">
              <thead className="caps">
                <tr className="border-b border-slate-200">
                  <th className="pr-6 pb-2 text-left font-medium">Document</th>
                  <th className="pr-6 pb-2 text-left font-medium">For</th>
                  <th className="pr-6 pb-2 text-left font-medium">Owner</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const s = status(d.id, d.initial);
                  return (
                    <tr key={d.id} className="border-t border-slate-100 align-baseline first:border-t-0">
                      <td className="py-2 pr-6">
                        {d.title}
                        {d.fromRecord && s === 'missing' && <div className="mt-1 text-label text-slate-500">From the record: {d.fromRecord}</div>}
                      </td>
                      <td className="py-2 pr-6 whitespace-nowrap text-slate-500">{d.component ?? 'The aircraft'}</td>
                      <td className="py-2 pr-6 whitespace-nowrap text-slate-500">{d.owner}</td>
                      <td className="py-2 whitespace-nowrap">
                        {can ? (
                          <select
                            className="rounded-md border border-slate-200 bg-white px-2 py-1"
                            value={s}
                            onChange={(e) => {
                              const next = e.target.value as DocumentStatus;
                              demo.setDoc(d.id, next);
                              demo.record(`${roleLabel(demo.role)} marked ${t.tail}'s ${d.title.toLowerCase()}${d.component ? ` (${d.component})` : ''}: ${WORD[next].toLowerCase()}.`);
                            }}
                          >
                            {DOCUMENT_STATUSES.map((x) => (
                              <option key={x} value={x}>
                                {WORD[x]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={s === 'missing' ? 'font-medium' : ''}>{WORD[s]}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        );
      })}
    </section>
  );
}
