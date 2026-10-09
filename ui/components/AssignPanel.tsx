import { useEffect, useState } from 'react';

import { OWNERS, type AssignmentDraft } from '../../calc/assign';
import { useDemo } from '../demo';
import { date } from '../format';
import { roleLabel } from '../roles';
import { Preview } from './Preview';

/**
 * Assign a recommended action and notify its owner. Everything is prefilled from the
 * recommendation (calc/assign.ts) — owner, due date, the message, the structured request — and can
 * be changed before sending. Sending is a preview: it records the action and its status here, and
 * nothing leaves the app.
 */
export function AssignPanel({ draft, source, onClose }: { draft: AssignmentDraft; source?: string; onClose: () => void }) {
  const demo = useDemo();
  const [owner, setOwner] = useState<string>(draft.owner);
  const [due, setDue] = useState(draft.due);
  const [channel, setChannel] = useState<'email' | 'request'>('email');
  const [message, setMessage] = useState(draft.message);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  const request = { ...draft.request, due, owner };
  const send = () => {
    demo.assign({ id: draft.id, tail: draft.tail, action: draft.action, owner, due, channel, message, request: channel === 'request' ? request : null });
    demo.record(
      `${roleLabel(demo.role)} sent ${draft.tail}: ${draft.action} to ${owner} by ${channel === 'email' ? 'email' : 'maintenance request'}, due ${date(due)}${source ? ` (from ${source})` : ''}.`,
    );
    onClose();
  };
  const field = 'rounded-md border border-slate-200 bg-white px-2 py-1';
  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/20" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-label={`Assign ${draft.tail}`} className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto bg-white px-6 py-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="caps">Assign and notify</div>
            <h2 className="mt-1 font-semibold">
              {draft.tail} · {draft.action}
            </h2>
          </div>
          <button className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="caps">Owner</span>
            <select className={field} value={owner} onChange={(e) => setOwner(e.target.value)}>
              {OWNERS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="caps">Due</span>
            <input className={field} type="date" value={due} onChange={(e) => e.target.value && setDue(e.target.value)} />
          </label>
        </div>

        <fieldset className="mt-6">
          <legend className="caps">Send as</legend>
          <div className="mt-2 flex gap-6">
            <label className="flex items-center gap-2">
              <input type="radio" name="channel" checked={channel === 'email'} onChange={() => setChannel('email')} /> Email
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="channel" checked={channel === 'request'} onChange={() => setChannel('request')} /> Maintenance request
            </label>
          </div>
        </fieldset>

        {channel === 'email' ? (
          <label className="mt-6 grid gap-1">
            <span className="caps">Message</span>
            <textarea className={`${field} min-h-56 leading-relaxed`} value={message} onChange={(e) => setMessage(e.target.value)} />
            <span className="text-label text-slate-500">Written from the recommendation: what to do, by when, what it is worth and the lease behind it. Edit it as you like.</span>
          </label>
        ) : (
          <div className="mt-6">
            <div className="caps">What the maintenance system would receive</div>
            <dl className="mt-2 grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 rounded-lg border border-slate-200 px-4 py-3">
              <dt className="text-slate-500">Aircraft</dt>
              <dd>{request.aircraft}</dd>
              <dt className="text-slate-500">Component</dt>
              <dd>{request.component}</dd>
              <dt className="text-slate-500">Action</dt>
              <dd>{request.action}</dd>
              <dt className="text-slate-500">Due</dt>
              <dd>{date(request.due)}</dd>
              <dt className="text-slate-500">Reason</dt>
              <dd>{request.reason}</dd>
              <dt className="text-slate-500">Lease reference</dt>
              <dd>{request.reference}</dd>
              <dt className="text-slate-500">Assigned to</dt>
              <dd>{request.owner}</dd>
            </dl>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700" onClick={send}>
            Send
          </button>
          <Preview />
        </div>
      </aside>
    </>
  );
}
