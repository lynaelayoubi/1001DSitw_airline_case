import { useEffect, useMemo, useState } from 'react';

import type { BudgetPlan } from '../../calc/budget';
import type { ClosingDecisions } from '../../calc/deadlines';
import type { FleetExposure } from '../../calc/exposure';
import type { Lease } from '../../calc/lease';
import type { Readiness } from '../../calc/readiness';
import type { FleetRecommendation } from '../../calc/recommend';
import type { ExtensionEffects, Robustness } from '../../calc/robustness';
import type { Assumptions, Proposal } from '../../calc/types';
import type { TailChoices, WhatIf as WhatIfResult } from '../../calc/whatif';
import { draftAssignment, type AssignmentDraft } from '../../calc/assign';
import { AssignPanel } from '../components/AssignPanel';
import { Header } from '../components/Header';
import { PageGuard } from '../components/PageGuard';
import { LeaseView } from '../components/LeaseView';
import { LeaseLinksContext } from '../leaseLinks';
import { useDemo } from '../demo';
import { canSee, isPage, type Page } from '../roles';
import Checklist from './Checklist';
import Leases from './Leases';
import Overview from './Overview';
import Scenarios from './Scenarios';

const pageFromHash = (): Page => {
  const h = window.location.hash.slice(1);
  return isPage(h) ? h : 'overview';
};

export interface ScreenProps {
  fleet: FleetExposure;
  plans: FleetRecommendation;
  atRest: FleetRecommendation;
  robustness: Robustness | null;
  extension: ExtensionEffects | null;
  robustnessPending: boolean;
  assumptions: Assumptions;
  onAssumptions: (a: Assumptions) => void;
  budget: number | null;
  onBudget: (b: number | null) => void;
  budgetPlan: BudgetPlan;
  closing: ClosingDecisions;
  choices: TailChoices[];
  proposals: Proposal[];
  onProposals: (p: Proposal[]) => void;
  whatIf: WhatIfResult | null;
  leaseOf: (tail: string) => Lease | null;
  /** The lease as read, before any correction: what the leasing team reviews. */
  leaseAsRead: (tail: string) => Lease | null;
  readiness: Readiness;
}

/**
 * The app around the pages: the header with its navigation and role, the page the address names
 * (#overview, #leases, #scenarios, #checklist — no routing library), and what any page can open:
 * the lease slide-over from a clause reference, and an aircraft on the Overview.
 */
export default function Shell(props: ScreenProps) {
  const { leaseOf, closing, plans, fleet } = props;
  const { role, setRole } = useDemo();
  const [page, setPage] = useState<Page>(pageFromHash);
  useEffect(() => {
    const on = () => setPage(pageFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (p: Page) => {
    if (window.location.hash !== `#${p}`) window.location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0 });
  };
  // A role that cannot see this page is taken to the Overview.
  const shownPage: Page = canSee(role, page) ? page : 'overview';

  // The Overview's state, held here so other pages can open an aircraft on it.
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const showTail = (tail: string, row?: string) => {
    setShowAll(false);
    setOpen(tail);
    setFlash(row ?? `tail-${tail}`);
    go('overview');
  };
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => document.getElementById(flash)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
    const off = setTimeout(() => setFlash(null), 2500);
    return () => {
      clearTimeout(t);
      clearTimeout(off);
    };
  }, [flash]);

  // The lease slide-over, opened from the lessor's name or any clause reference.
  const [lease, setLease] = useState<{ tail: string; anchor?: string } | null>(null);
  const links = useMemo(() => ({ leaseOf, open: (tail: string, anchor?: string) => setLease({ tail, anchor }) }), [leaseOf]);
  const shown = lease ? leaseOf(lease.tail) : null;

  // Each recommended action, drafted for assigning (calc/assign.ts), and the one being assigned.
  const drafts = useMemo(() => {
    const out: Record<string, AssignmentDraft> = {};
    for (const x of closing.items) {
      const t = fleet.returning.find((r) => r.tail === x.tail);
      const l = leaseOf(x.tail);
      const p = plans.byTail[x.tail];
      if (t && l && p) out[x.tail] = draftAssignment(x, p, t, l, fleet.asOf);
    }
    return out;
  }, [closing, plans, fleet, leaseOf]);
  const [assigning, setAssigning] = useState<AssignmentDraft | null>(null);

  return (
    <LeaseLinksContext.Provider value={links}>
      <main className="mx-auto max-w-[1440px] px-4 py-12 md:px-8">
        <Header page={shownPage} role={role} onPage={go} onRole={setRole} />
        {/* Each page behind its own guard: a page that fails says so, and the header stays. */}
        <PageGuard key={shownPage}>
          {shownPage === 'overview' && (
            <Overview {...props} showAll={showAll} onShowAll={setShowAll} open={open} onOpen={setOpen} flash={flash} drafts={drafts} onAssign={setAssigning} />
          )}
          {shownPage === 'leases' && <Leases fleet={props.fleet} leaseAsRead={props.leaseAsRead} onShowTail={showTail} />}
          {shownPage === 'scenarios' && <Scenarios {...props} />}
          {shownPage === 'checklist' && <Checklist fleet={props.fleet} readiness={props.readiness} onShowTail={showTail} />}
        </PageGuard>
      </main>
      {assigning && <AssignPanel draft={assigning} onClose={() => setAssigning(null)} />}
      {lease && shown && (
        <LeaseView
          lease={shown}
          anchor={lease.anchor}
          onClose={() => setLease(null)}
          onGoToRow={(componentId, conditionId) => {
            setLease(null);
            showTail(shown.tail, `req-${componentId}-${conditionId}`);
          }}
        />
      )}
    </LeaseLinksContext.Provider>
  );
}
