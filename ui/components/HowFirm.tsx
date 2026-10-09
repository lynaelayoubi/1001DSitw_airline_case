import type { CloseCall, Robustness } from '../../calc/robustness';
import { money } from '../format';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * The instruction for one close call: the move that would flip the answer, said as the condition
 * it holds under, and where the real number for that assumption lives.
 */
export function checkNote(c: CloseCall): string {
  const up = c.direction === 'up';
  const v = c.flip.value;
  const move = c.flip.change.replace(/^[+−-]/, '');
  const holds = (() => {
    switch (c.input.id) {
      case 'utilisation':
        return `holds unless it flies ${move} or more ${up ? 'above' : 'below'} plan`;
      case 'maintenanceCost':
        return `holds unless shop costs come in ${move} or more ${up ? 'above' : 'below'} the rates used`;
      case 'downtimeNarrowbody':
      case 'downtimeWidebody':
        return `holds unless a day on the ground costs ${money(v)} or ${up ? 'more' : 'less'}`;
      case 'lessorMarkup':
        return `holds unless the lessor's provider charges × ${v.toFixed(2)} our cost or ${up ? 'more' : 'less'}`;
      case 'reservesReclaim':
        return `holds unless ${pct(v)} or ${up ? 'more' : 'less'} of its reserves can be reclaimed`;
      case 'shopSlotLead':
        return `holds unless shop slots need ${v} months' lead or ${up ? 'more' : 'less'}`;
    }
  })();
  return `${holds}. Check ${c.input.source}.`;
}

/**
 * Confirm before you act: the recommendations an assumption could flip within the first half of its
 * evidenced range (calc/robustness.ts), each as an instruction — not a grade of the model. The full
 * sweep runs behind it and behind the assumptions' "Changes an answer" column; its method is in
 * ASSUMPTIONS §14, not on the screen.
 */
export function HowFirm({ robustness: r, pending }: { robustness: Robustness | null; pending: boolean }) {
  return (
    <section className={pending ? 'opacity-60' : ''}>
      <h2 className="caps mb-2">Confirm before you act</h2>
      <p className="mb-3 text-slate-500">
        These recommendations would change if one assumption turned out a little different from the figure used, so confirm the real number before acting on them.
      </p>
      {!r ? (
        <p className="text-slate-500">Checking which answers turn on an assumption…</p>
      ) : r.close.length === 0 ? (
        <p className="text-slate-500">Every recommendation holds across the believable range of every assumption.</p>
      ) : r.checks.length === 0 ? (
        <p className="text-slate-500">No recommendation turns on an assumption inside the first half of its evidenced range.</p>
      ) : (
        <ul className="space-y-2">
          {r.checks.map((c) => (
            <li key={c.tail}>
              <span className="font-medium">{c.tail}</span>: {checkNote(c)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
