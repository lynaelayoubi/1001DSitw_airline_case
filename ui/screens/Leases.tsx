import type { FleetExposure } from '../../calc/exposure';
import type { Lease } from '../../calc/lease';
import { date } from '../format';
import { useLeaseLinks } from '../leaseLinks';

/** The leases of the aircraft handing back: each opens as read from the data. */
export default function Leases({ fleet, leaseOf, onShowTail }: { fleet: FleetExposure; leaseOf: (tail: string) => Lease | null; onShowTail: (tail: string) => void }) {
  const links = useLeaseLinks();
  return (
    <section>
      <h2 className="caps mb-3">Leases of the aircraft handing back</h2>
      <table className="w-full">
        <thead className="caps">
          <tr className="border-b border-slate-200">
            <th className="pr-6 pb-3 text-left font-medium">Tail</th>
            <th className="pr-6 pb-3 text-left font-medium">Lessor</th>
            <th className="pr-6 pb-3 text-left font-medium">Lease</th>
            <th className="pr-6 pb-3 text-left font-medium">Return</th>
            <th className="pb-3 text-left font-medium" />
          </tr>
        </thead>
        <tbody>
          {fleet.returning.map((t) => {
            const l = leaseOf(t.tail);
            if (!l) return null;
            return (
              <tr key={t.tail} className="border-t border-slate-100 align-baseline first:border-t-0">
                <td className="py-3 pr-6 font-medium whitespace-nowrap">{t.tail}</td>
                <td className="py-3 pr-6">{l.lessor.name}</td>
                <td className="py-3 pr-6 text-slate-500">{l.lessor.architecture === 'reserve' ? 'Reserve lease' : 'No-reserve lease'}</td>
                <td className="py-3 pr-6 whitespace-nowrap">{date(l.leaseEnd)}</td>
                <td className="py-3 whitespace-nowrap">
                  <button className="link" onClick={() => links?.open(t.tail)}>
                    Open the lease
                  </button>
                  <button className="link ml-6" onClick={() => onShowTail(t.tail)}>
                    Show the aircraft
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
