import type { Readiness as ReadinessResult, ReadinessItem } from '../../calc/readiness';
import { date } from '../format';
import { useLeaseLinks } from '../leaseLinks';

const STATUS: Record<ReadinessItem['status'], string> = {
  overdue: 'font-medium text-amber-800',
  'due soon': 'font-medium text-slate-900',
  open: 'text-slate-500',
};

/** Where an item comes from: the lease clause (opens the lease), the tail's recommendation (opens the tail), or the template. */
function Source({ x, onShowTail }: { x: ReadinessItem; onShowTail?: (tail: string) => void }) {
  const links = useLeaseLinks();
  switch (x.source.kind) {
    case 'lease': {
      const { anchor, ref } = x.source;
      return (
        <button className="link" onClick={() => links?.open(x.tail, anchor)}>
          {ref}
        </button>
      );
    }
    case 'template':
      return (
        <span className="cursor-help text-slate-400" title={`Standard for every return: ${x.source.basis}.`}>
          standard for every return
        </span>
      );
    default:
      return onShowTail ? (
        <button className="link" onClick={() => onShowTail(x.tail)}>
          show {x.tail}
        </button>
      ) : (
        <span className="text-slate-400">this tail's plan</span>
      );
  }
}

function Rows({ items, withTail, onShowTail }: { items: ReadinessItem[]; withTail: boolean; onShowTail?: (tail: string) => void }) {
  return (
    <table className="w-full">
      <thead className="caps">
        <tr className="border-b border-slate-200">
          <th className="pb-3 pr-6 text-left font-medium">Due</th>
          <th className="pb-3 pr-6 text-left font-medium">Status</th>
          {withTail && <th className="pb-3 pr-6 text-left font-medium">Tail</th>}
          <th className="pb-3 pr-6 text-left font-medium">Item</th>
          <th className="pb-3 pr-6 text-left font-medium">Owner</th>
          <th className="pb-3 text-left font-medium">From</th>
        </tr>
      </thead>
      <tbody>
        {items.map((x, k) => (
          <tr key={k} className="border-t border-slate-100 align-baseline first:border-t-0">
            <td className={`py-3 pr-6 whitespace-nowrap tabular-nums ${x.status === 'overdue' ? 'text-amber-800' : ''}`}>{date(x.due)}</td>
            <td className={`py-3 pr-6 whitespace-nowrap ${STATUS[x.status]}`}>{x.status}</td>
            {withTail && <td className="py-3 pr-6 font-medium whitespace-nowrap">{x.tail}</td>}
            <td className="py-3 pr-6">
              {x.title}
              {x.detail && <div className="mt-1 text-label text-slate-500">{x.detail}</div>}
            </td>
            <td className="py-3 pr-6 whitespace-nowrap text-slate-500">{x.owner}</td>
            <td className="py-3 whitespace-nowrap">
              <Source x={x} onShowTail={onShowTail} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Shown by default: an item from the recommendations or the lease, or anything due in the next 90 days. */
const upFront = (x: ReadinessItem) => x.kind === 'derived' || x.status !== 'open';

/** The standard items not yet due, folded into one line per tail. */
function Standard({ tail, items }: { tail?: string; items: ReadinessItem[] }) {
  if (!items.length) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-slate-500">
        {tail && <span className="font-medium text-slate-900">{tail} </span>}
        {items.length} {items.length === 1 ? 'item' : 'items'} standard for every return, the first due {date(items[0]!.due)}
      </summary>
      <div className="mt-2 pl-4">
        <Rows items={items} withTail={false} />
      </div>
    </details>
  );
}

/**
 * The readiness checklist (BRIEF #7), for the leasing team and whoever runs each return, collapsed
 * under its digest line. Open, it shows what comes from the recommendations and the lease, and
 * anything due in the next 90 days, soonest first across the fleet; the standard items not yet due
 * are folded into one line per tail. Derived items point at their source; standard items say they
 * come from the template. Status comes from the due date (calc/readiness.ts); nothing here is set by hand.
 */
export function ReadinessList({ readiness: r, onShowTail }: { readiness: ReadinessResult; onShowTail: (tail: string) => void }) {
  const later = Object.entries(r.byTail)
    .map(([tail, items]) => [tail, items.filter((x) => !upFront(x))] as const)
    .filter(([, items]) => items.length)
    .sort(([, x], [, y]) => x[0]!.due.localeCompare(y[0]!.due));
  return (
    <details className="mt-12">
      <summary className="cursor-pointer">
        <span className="caps">Readiness checklist</span>
        <span className="ml-3 text-label text-slate-500">
          next {r.next.days} days: <span className="font-medium text-slate-900">{r.next.items} items</span> across {r.next.tails} {r.next.tails === 1 ? 'tail' : 'tails'}
        </span>
      </summary>
      <div className="mt-3">
        <Rows items={r.items.filter(upFront)} withTail onShowTail={onShowTail} />
        <div className="mt-3">
          {later.map(([tail, items]) => (
            <Standard key={tail} tail={tail} items={items} />
          ))}
        </div>
      </div>
    </details>
  );
}

/** The same list, for one tail, inside its detail: the standard items not yet due folded the same way. */
export function TailReadiness({ items }: { items: ReadinessItem[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="caps mb-2">Readiness checklist</div>
      <Rows items={items.filter(upFront)} withTail={false} />
      <Standard items={items.filter((x) => !upFront(x))} />
    </div>
  );
}
