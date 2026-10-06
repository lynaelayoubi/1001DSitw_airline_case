import { useEffect, useRef } from 'react';

import { conditionAnchor, type Lease } from '../../calc/lease';
import { date, int, kindLabel, perUnit } from '../format';

/** What each lease architecture means, in one line. */
const ARCHITECTURE: Record<Lease['lessor']['architecture'], { label: string; means: string }> = {
  reserve: {
    label: 'Reserve lease',
    means: 'The airline pays maintenance reserves monthly; the lessor holds them, qualifying work is reclaimed against them, and a shortfall at handback is settled from them first.',
  },
  'no-reserve': { label: 'No-reserve lease', means: 'No reserves are held: any shortfall at handback is paid in cash on the redelivery date.' },
};

/**
 * The tail's lease, over the right side of the screen (BRIEF #8). Opened from the lessor's name or
 * any clause reference, scrolled to that clause; Esc or a click outside closes it. It quotes the
 * data and computes nothing: the lessor and architecture, every return condition with its threshold,
 * rate and text — each linked back to the requirement rows it drives — and the lease's terms on
 * qualifying maintenance (QME), replacement (12.2), notice (12.3(b)) and temporary installs (12.3(c)).
 */
export function LeaseView({
  lease,
  anchor,
  onClose,
  onGoToRow,
}: {
  lease: Lease;
  anchor?: string;
  onClose: () => void;
  onGoToRow: (componentId: string, conditionId: string) => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  useEffect(() => {
    const el = anchor ? panel.current?.querySelector(`[data-anchor="${CSS.escape(anchor)}"]`) : null;
    if (el) el.scrollIntoView({ block: 'start' });
    else panel.current?.scrollTo({ top: 0 });
  }, [anchor, lease.tail]);

  const l = lease.lessor;
  const arch = ARCHITECTURE[l.architecture];
  const ring = (a: string) => (a === anchor ? 'ring-2 ring-violet-300' : '');
  const kinds = [...new Set(lease.conditions.map((rc) => rc.componentKind))];
  const term = (a: string, title: string, ref: string, text: string, extra?: string) => (
    <section data-anchor={a} className={`scroll-mt-4 rounded-md border border-slate-200 px-3 py-2 ${ring(a)}`}>
      <div className="text-sm font-semibold">
        {title} <span className="font-normal text-slate-500">· {ref}</span>
      </div>
      {extra && <div className="mt-0.5 text-xs text-slate-600">{extra}</div>}
      <blockquote className="mt-1 border-l-2 border-slate-200 pl-3 text-[13px] leading-relaxed text-slate-700">{text}</blockquote>
    </section>
  );

  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/20" onClick={onClose} aria-hidden />
      <aside ref={panel} role="dialog" aria-label={`Lease for ${lease.tail}`} className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto bg-white px-5 py-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Lease</div>
            <h2 className="text-lg font-semibold">
              {lease.tail} · {lease.type} · {l.name}
            </h2>
            <div className="text-sm text-slate-600">
              {date(lease.leaseStart)} to {date(lease.leaseEnd)}
            </div>
          </div>
          <button className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <section className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold">{arch.label}.</span> <span className="text-slate-700">{arch.means}</span>
        </section>

        <h3 className="mt-5 mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">Return conditions</h3>
        <div className="space-y-4">
          {kinds.map((k) => (
            <div key={k}>
              <div className="mb-1 text-sm font-semibold">{kindLabel[k]}</div>
              <div className="space-y-2">
                {lease.conditions
                  .filter((rc) => rc.componentKind === k)
                  .map((rc) => (
                    <section key={rc.id} data-anchor={conditionAnchor(rc)} className={`scroll-mt-4 rounded-md border border-slate-200 px-3 py-2 ${ring(conditionAnchor(rc))}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold">{rc.clauseRef}</span>
                        <span className="text-xs text-slate-600 tabular-nums">
                          at handback ≥ {int(rc.threshold)} {rc.unit === 'months' ? 'months' : rc.unit}
                          {rc.metric.startsWith('llp') ? ' of LLP life' : ''} · {perUnit(rc.compensationRate)} per {rc.unit === 'months' ? 'month' : rc.unit} short
                        </span>
                      </div>
                      <blockquote className="mt-1 border-l-2 border-slate-200 pl-3 text-[13px] leading-relaxed text-slate-700">{rc.clauseText}</blockquote>
                      <div className="mt-1 text-xs text-slate-500">
                        Applies to{' '}
                        {rc.drives.map((d, i) => (
                          <span key={d.componentId}>
                            {i > 0 && ', '}
                            <button className="text-violet-800 underline decoration-dotted underline-offset-2" onClick={() => onGoToRow(d.componentId, rc.id)}>
                              show {d.position}'s row
                            </button>
                          </span>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-5 mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">Lease terms applied</h3>
        <div className="space-y-2">
          {term('qme', 'Qualified maintenance event', l.qmeClauseRef, l.qmeClauseText)}
          {term('replacement', 'Replacement engines and parts', l.replacementClauseRef, l.replacementClauseText)}
          {term('notice', 'Notice of engine removal', l.noticeClauseRef, l.noticeClauseText, `${l.engineRemovalNoticeDays} days`)}
          {term('temporary', 'Temporary installation', l.temporaryInstallClauseRef, l.temporaryInstallClauseText)}
        </div>
      </aside>
    </>
  );
}
