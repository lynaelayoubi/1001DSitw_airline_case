// The leasing team's corrections to how a lease was read, applied to the data the calculation
// runs on. Pure: the dataset and the corrections in, a corrected copy out — and with no corrections,
// the dataset itself, so no default figure can move. Only the terms the levers already take as
// numbers flow in: a return condition's threshold and the notice period (calc/lease.ts, LeaseTerm.live).

import type { Dataset } from './types';

export interface Correction {
  tail: string;
  /** A LeaseTerm id: 'rc:<condition id>' or 'notice'. */
  term: string;
  value: number;
}

export function applyCorrections<D extends Pick<Dataset, 'aircraft' | 'lessors' | 'returnConditions'>>(data: D, corrections: Correction[]): D {
  if (!corrections.length) return data;
  const thresholds = new Map(corrections.filter((c) => c.term.startsWith('rc:')).map((c) => [c.term.slice(3), c.value]));
  const notice = new Map(corrections.filter((c) => c.term === 'notice').map((c) => [c.tail, c.value]));
  // The notice period sits on the lessor, which other aircraft share: a correction on one aircraft's
  // lease gives that aircraft its own copy of the lessor's terms, so no other lease moves with it.
  const lessors = [...data.lessors];
  const aircraft = data.aircraft.map((ac) => {
    const days = notice.get(ac.tail);
    if (days === undefined) return ac;
    const base = data.lessors.find((l) => l.id === ac.lessorId);
    if (!base) return ac;
    const id = `${base.id}~${ac.tail}`;
    lessors.push({ ...base, id, engineRemovalNoticeDays: days });
    return { ...ac, lessorId: id };
  });
  const returnConditions = data.returnConditions.map((rc) => (thresholds.has(rc.id) ? { ...rc, threshold: thresholds.get(rc.id)! } : rc));
  return { ...data, aircraft, lessors, returnConditions };
}
