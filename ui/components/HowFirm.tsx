import type { Robustness } from '../../calc/robustness';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * How firm the answers are: the model assessing itself (calc/robustness.ts). Useful, but not what a
 * head of fleet acts on, so it is one line carrying the finding, closed by default — like the
 * assumptions above it. Open: the close calls, the tails with no recommendation, and the one
 * limit of the sweep.
 */
export function HowFirm({ robustness: r, pending }: { robustness: Robustness | null; pending: boolean }) {
  return (
    <details className="mb-2 rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-2 text-sm text-slate-700">
        How firm these answers are —{' '}
        {r ? (
          <span className={pending ? 'opacity-60' : ''}>
            {r.firm.length} firm · {r.close.length} close{r.undecided.length > 0 && ` · ${r.undecided.length} with no recommendation`}
          </span>
        ) : (
          <span className="text-slate-500">checking…</span>
        )}
      </summary>
      {r && (
        <div className={`border-t border-slate-100 px-4 py-2 text-[13px] ${pending ? 'opacity-60' : ''}`}>
          {r.close.length > 0 && (
            <>
              <div className="text-xs text-slate-500">Close — an input inside its evidenced range would change the answer</div>
              <ul className="space-y-0.5">
                {r.close.map((c) => (
                  <li key={c.tail}>
                    <span className="font-medium">{c.tail}</span> <span className="text-slate-500">{c.label}</span> → <span className="text-violet-800">{c.flip.to}</span> if{' '}
                    {c.input.label.toLowerCase()} {c.flip.change} <span className="text-slate-400">(reach {pct(c.flip.reach)})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {r.undecided.length > 0 && (
            <>
              <div className="mt-2 text-xs text-slate-500">No recommendation — the options cannot be told apart within the cost estimates' precision</div>
              <ul className="space-y-0.5">
                {r.undecided.map((x) => (
                  <li key={x.tail}>
                    <span className="font-medium">{x.tail}</span> <span className="text-slate-500">{x.why}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-2 text-xs text-slate-500">One input at a time, so a lower bound: inputs that move together could change answers sooner.</p>
        </div>
      )}
    </details>
  );
}
