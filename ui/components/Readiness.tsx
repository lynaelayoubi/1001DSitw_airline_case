import type { Readiness as ReadinessResult, ReadinessItem } from '../../calc/readiness';
import { date } from '../format';
import { useLeaseLinks } from '../leaseLinks';

const STATUS: Record<ReadinessItem['status'], string> = {
  overdue: 'font-medium text-amber-900',
  'due soon': 'font-medium text-slate-900',
  open: 'text-slate-500',
};

/** Where an item comes from: the lease clause (opens the lease), the tail's recommendation (opens the tail), or the template. */
function Source({ x, onShowTail }: { x: ReadinessItem; onShowTail?: (tail: string) => void }) {
  const links = useLeaseLinks();
  const link = 'text-violet-800 underline decoration-dotted underline-offset-2';
  switch (x.source.kind) {
    case 'lease': {
      const { anchor, ref } = x.source;
      return (
        <button className={link} onClick={() => links?.open(x.tail, anchor)}>
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
        <button className={link} onClick={() => onShowTail(x.tail)}>
          show {x.tail}
        </button>
      ) : (
        <span className="text-slate-400">this tail's plan</span>
      );
  }
}

function Rows({ items, withTail, onShowTail }: { items: ReadinessItem[]; withTail: boolean; onShowTail?: (tail: string) => void }) {
  return (
    <table className="w-full text-[13px]">
      <thead className="text-[10.5px] font-medium tracking-wide text-slate-500 uppercase">
        <tr>
          <th className="py-1 pr-3 text-left font-medium">Due</th>
          <th className="py-1 pr-3 text-left font-medium">Status</th>
          {withTail && <th className="py-1 pr-3 text-left font-medium">Tail</th>}
          <th className="py-1 pr-3 text-left font-medium">Item</th>
          <th className="py-1 pr-3 text-left font-medium">Owner</th>
          <th className="py-1 text-left font-medium">From</th>
        </tr>
      </thead>
      <tbody>
        {items.map((x, k) => (
          <tr key={k} className="border-t border-slate-100 align-top">
            <td className="py-1 pr-3 whitespace-nowrap tabular-nums">{date(x.due)}</td>
            <td className={`py-1 pr-3 whitespace-nowrap ${STATUS[x.status]}`}>{x.status}</td>
            {withTail && <td className="py-1 pr-3 font-medium whitespace-nowrap">{x.tail}</td>}
            <td className="py-1 pr-3">
              {x.title}
              {x.detail && <div className="text-xs text-slate-500">{x.detail}</div>}
            </td>
            <td className="py-1 pr-3 whitespace-nowrap text-slate-600">{x.owner}</td>
            <td className="py-1 text-xs whitespace-nowrap">
              <Source x={x} onShowTail={onShowTail} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The readiness checklist (BRIEF #7), for the leasing team and whoever runs each return: every item
 * that must be true before handback, soonest first across the fleet, collapsed under its digest line.
 * Derived items point at their source; standard items say they come from the template. Status comes
 * from the due date (calc/readiness.ts); nothing here is set by hand.
 */
export function ReadinessList({ readiness: r, onShowTail }: { readiness: ReadinessResult; onShowTail: (tail: string) => void }) {
  return (
    <details className="mt-6 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-2 text-sm text-slate-700">
        Readiness checklist
        <span className="ml-2 text-xs text-slate-500">
          next {r.next.days} days: <span className="font-medium text-slate-900">{r.next.items} items</span> across {r.next.tails} {r.next.tails === 1 ? 'tail' : 'tails'}
        </span>
      </summary>
      <div className="border-t border-slate-100 px-4 py-2">
        <Rows items={r.items} withTail onShowTail={onShowTail} />
      </div>
    </details>
  );
}

/** The same list, for one tail, inside its detail. */
export function TailReadiness({ items }: { items: ReadinessItem[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="mb-1 text-sm font-semibold">Readiness checklist</div>
      <Rows items={items} withTail={false} />
    </div>
  );
}
