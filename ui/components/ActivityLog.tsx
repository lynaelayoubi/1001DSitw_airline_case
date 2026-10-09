import { moment, useDemo } from '../demo';
import { Preview } from './Preview';

/** Who did what, when: every assignment and every change of status, newest first. Hidden until something is logged. */
export function ActivityLog() {
  const { log } = useDemo();
  if (log.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="caps">Activity</h2>
        <Preview />
      </div>
      <ul className="space-y-2">
        {log.map((e, k) => (
          <li key={k} className="flex gap-6">
            <span className="w-28 shrink-0 text-slate-500 tabular-nums">{moment(e.at)}</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
