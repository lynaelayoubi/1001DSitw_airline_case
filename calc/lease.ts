// The lease behind a tail, as the data holds it — for the lease view (BRIEF #8: "be confident the
// recommendations are really based on the actual leases"). Pure: the dataset in, this tail's
// lessor terms and return conditions out, each condition with the requirement rows it drives, and
// the anchors that a clause reference elsewhere on screen opens. It quotes; it computes nothing.

import { num } from './format';
import type { Aircraft, ComponentKind, Dataset, Lessor, ReturnCondition } from './types';

export interface LeaseCondition extends ReturnCondition {
  /** The components this condition is applied to — one requirement row on each. */
  drives: { position: string; componentId: string }[];
}

export interface Lease {
  tail: string;
  type: Aircraft['type'];
  lessor: Lessor;
  leaseStart: string;
  leaseEnd: string;
  conditions: LeaseCondition[];
  /** Clause references as they appear on screen, longest first, and the part of this lease each opens. */
  anchors: { ref: string; anchor: string }[];
}

/** The anchor id of a return condition inside the lease view. */
export const conditionAnchor = (rc: Pick<ReturnCondition, 'id'>) => `rc:${rc.id}`;

export function leaseOf(data: Pick<Dataset, 'aircraft' | 'lessors' | 'returnConditions'>, tail: string): Lease | null {
  const ac = data.aircraft.find((x) => x.tail === tail);
  const lessor = ac && data.lessors.find((l) => l.id === ac.lessorId);
  if (!ac || !lessor) return null;
  const conditions = data.returnConditions
    .filter((rc) => rc.tail === tail)
    .map((rc) => ({ ...rc, drives: ac.components.filter((c) => c.kind === rc.componentKind).map((c) => ({ position: c.position, componentId: c.id })) }));
  const anchors = [
    ...conditions.map((rc) => ({ ref: rc.clauseRef, anchor: conditionAnchor(rc) })),
    { ref: lessor.qmeClauseRef, anchor: 'qme' },
    // The QME clause is also cited by its number alone: "Clause 15.2".
    { ref: lessor.qmeClauseRef.replace(/\s*\(.*\)$/, ''), anchor: 'qme' },
    { ref: lessor.replacementClauseRef, anchor: 'replacement' },
    { ref: lessor.noticeClauseRef, anchor: 'notice' },
    { ref: lessor.temporaryInstallClauseRef, anchor: 'temporary' },
  ]
    .filter((x, i, all) => x.ref && all.findIndex((y) => y.ref === x.ref) === i)
    .sort((x, y) => y.ref.length - x.ref.length);
  return { tail, type: ac.type, lessor, leaseStart: ac.leaseStart, leaseEnd: ac.leaseEnd, conditions, anchors };
}

/** The documents a lessor's QME clause requires, as it lists them: "(i) …, (ii) … and (iii) …". */
export function qmeDocuments(clauseText: string): string {
  const m = clauseText.match(/delivered to Lessor (\(i\).*?), in each case/);
  return m ? m[1]! : 'the evidence the clause requires';
}

/** One term the tool reads from a lease and uses: what it says, and the clause it came from. */
export interface LeaseTerm {
  /** 'rc:<condition id>' for a return condition (conditionAnchor), else 'notice', 'replacement', 'qme', 'reserves'. */
  id: string;
  label: string;
  /** As read: a number for a threshold or a notice period, words for a rule. */
  value: number | string;
  display: string;
  /** For a number: what it counts. */
  unit?: string;
  clauseRef: string;
  clauseText: string;
  /**
   * Whether a correction flows into the calculation straight away (calc/corrections.ts): a return
   * condition's threshold and the notice period are numbers the levers already take. The rest change
   * how a lever works, so a correction to them is recorded and applies on the next recalculation.
   */
  live: boolean;
}

const KIND_NAME: Record<ComponentKind, string> = { engine: 'Engines', 'landing-gear': 'Landing gear', airframe: 'Airframe', apu: 'APU' };
const UNIT_WORD: Record<ReturnCondition['unit'], string> = { FH: 'flight hours', FC: 'cycles', months: 'months', 'APU-FH': 'APU hours' };

/** Every term this lease gives the calculation, in the order a reader checks them. */
export function leaseTerms(lease: Lease): LeaseTerm[] {
  const l = lease.lessor;
  const conditions = lease.conditions.map((rc): LeaseTerm => {
    const unit = UNIT_WORD[rc.unit];
    return {
      id: conditionAnchor(rc),
      label: `${KIND_NAME[rc.componentKind]}: ${unit} left${rc.metric.startsWith('llp') ? ' on life-limited parts' : ''} at handback`,
      value: rc.threshold,
      display: `at least ${num(rc.threshold)} ${unit}`,
      unit,
      clauseRef: rc.clauseRef,
      clauseText: rc.clauseText,
      live: true,
    };
  });
  const first = lease.conditions[0];
  const settlement = first?.clauseText.match(/Any shortfall shall[^.]*\./)?.[0] ?? '';
  return [
    ...conditions,
    {
      id: 'notice',
      label: 'Notice of a planned engine removal',
      value: l.engineRemovalNoticeDays,
      display: `${l.engineRemovalNoticeDays} days`,
      unit: 'days',
      clauseRef: l.noticeClauseRef,
      clauseText: l.noticeClauseText,
      live: true,
    },
    {
      id: 'replacement',
      label: 'Replacement engine rule',
      value: 'No less life than the engine it replaces, on every clock the clause names',
      display: 'No less life than the engine it replaces, on every clock the clause names',
      clauseRef: l.replacementClauseRef,
      clauseText: l.replacementClauseText,
      live: false,
    },
    {
      id: 'qme',
      label: 'What makes a shop visit count',
      value: qmeDocuments(l.qmeClauseText),
      display: `Only with ${qmeDocuments(l.qmeClauseText)}`,
      clauseRef: l.qmeClauseRef,
      clauseText: l.qmeClauseText,
      live: false,
    },
    {
      id: 'reserves',
      label: 'Maintenance reserves',
      value: l.architecture === 'reserve' ? 'Reserve lease' : 'No-reserve lease',
      display:
        l.architecture === 'reserve'
          ? 'Reserve lease: a shortfall is settled from the reserves the lessor holds first'
          : 'No-reserve lease: a shortfall is paid in cash at handback',
      clauseRef: first?.clauseRef ?? '',
      clauseText: settlement,
      live: false,
    },
  ];
}
