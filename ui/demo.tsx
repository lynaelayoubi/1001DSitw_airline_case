// The demo's working state — who is looking, what has been assigned and to whom, and the log of it
// — kept in this browser's local storage (store.ts) so it survives a reload. Nothing here leaves the
// app: sending is a preview. Reset demo clears it all.

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { MaintenanceRequest } from '../calc/assign';
import type { Correction } from '../calc/corrections';
import type { LeaseTerm } from '../calc/lease';
import { roleLabel, type Role } from './roles';
import { usePersisted } from './store';

export type Status = 'sent' | 'accepted' | 'done';
export const STATUS_WORD: Record<Status | 'open', string> = { open: 'Open', sent: 'Sent', accepted: 'Accepted', done: 'Done' };

export interface Assignment {
  id: string;
  tail: string;
  action: string;
  owner: string;
  due: string;
  channel: 'email' | 'request';
  message: string;
  request: MaintenanceRequest | null;
  status: Status;
  history: { status: Status; at: string; by: string }[];
}

export interface LogEntry {
  at: string;
  by: string;
  text: string;
}

/** The leasing team's verdict on one term of a lease: approved as read, or corrected with a reason. */
export interface TermReview {
  status: 'approved' | 'corrected';
  value: number | string;
  display: string;
  /** A corrected number the calculation takes now (LeaseTerm.live), rather than on the next recalculation. */
  live: boolean;
  reason?: string;
  at: string;
  by: string;
}

export interface LeaseChange {
  at: string;
  by: string;
  term: string;
  label: string;
  action: 'approved' | 'corrected';
  from: string;
  to: string;
  reason?: string;
}

export interface LeaseReview {
  terms: Record<string, TermReview>;
  history: LeaseChange[];
}

/** A lease added through "Add a lease": in this preview its terms are a sample from another lease. */
export interface AddedLease {
  id: string;
  fileName: string;
  sampleTail: string;
  at: string;
  by: string;
}

interface Demo {
  role: Role;
  setRole: (r: Role) => void;
  assignments: Record<string, Assignment>;
  assign: (a: Omit<Assignment, 'status' | 'history'>) => void;
  advance: (id: string, status: Status, note?: string) => void;
  log: LogEntry[];
  record: (text: string) => void;
  /** Lease reviews, by lease: a returning tail, or an added lease's id. */
  reviews: Record<string, LeaseReview>;
  approveTerm: (lease: string, term: LeaseTerm, current: string) => void;
  correctTerm: (lease: string, term: LeaseTerm, value: number | string, display: string, current: string, reason: string) => void;
  added: AddedLease[];
  addLease: (fileName: string, sampleTail: string) => string;
  /** The corrections the calculation takes now: corrected numbers on the returning tails' leases. */
  corrections: Correction[];
  reset: () => void;
}

const DemoContext = createContext<Demo | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = usePersisted<Role>('role', 'head');
  const [assignments, setAssignments] = usePersisted<Record<string, Assignment>>('assignments', {});
  const [log, setLog] = usePersisted<LogEntry[]>('log', []);
  const [reviews, setReviews] = usePersisted<Record<string, LeaseReview>>('reviews', {});
  const [added, setAdded] = usePersisted<AddedLease[]>('added-leases', []);
  const corrections = useMemo<Correction[]>(
    () =>
      Object.entries(reviews).flatMap(([tail, r]) =>
        added.some((a) => a.id === tail)
          ? []
          : Object.entries(r.terms).flatMap(([term, v]) => (v.status === 'corrected' && v.live && typeof v.value === 'number' ? [{ tail, term, value: v.value }] : [])),
      ),
    [reviews, added],
  );
  const demo = useMemo<Demo>(() => {
    const by = roleLabel(role);
    const record = (text: string) => setLog((l) => [{ at: new Date().toISOString(), by, text }, ...l]);
    return {
      role,
      setRole,
      assignments,
      assign: (a) => {
        const at = new Date().toISOString();
        setAssignments((s) => ({ ...s, [a.id]: { ...a, status: 'sent', history: [{ status: 'sent', at, by }] } }));
      },
      advance: (id, status) => {
        const at = new Date().toISOString();
        setAssignments((s) => (s[id] ? { ...s, [id]: { ...s[id]!, status, history: [...s[id]!.history, { status, at, by }] } } : s));
      },
      log,
      record,
      reviews,
      approveTerm: (lease, term, current) => {
        const at = new Date().toISOString();
        setReviews((s) => {
          const r = s[lease] ?? { terms: {}, history: [] };
          const prev = r.terms[term.id];
          const kept = prev?.status === 'corrected' ? prev : null;
          return {
            ...s,
            [lease]: {
              terms: { ...r.terms, [term.id]: kept ? { ...kept, at, by } : { status: 'approved', value: term.value, display: term.display, live: term.live, at, by } },
              history: [{ at, by, term: term.id, label: term.label, action: 'approved', from: current, to: current }, ...r.history],
            },
          };
        });
      },
      correctTerm: (lease, term, value, display, current, reason) => {
        const at = new Date().toISOString();
        setReviews((s) => {
          const r = s[lease] ?? { terms: {}, history: [] };
          return {
            ...s,
            [lease]: {
              terms: { ...r.terms, [term.id]: { status: 'corrected', value, display, live: term.live, reason, at, by } },
              history: [{ at, by, term: term.id, label: term.label, action: 'corrected', from: current, to: display, reason }, ...r.history],
            },
          };
        });
      },
      added,
      addLease: (fileName, sampleTail) => {
        const id = `added-${Date.now()}`;
        setAdded((a) => [...a, { id, fileName, sampleTail, at: new Date().toISOString(), by }]);
        return id;
      },
      corrections,
      reset: () => {
        setAssignments({});
        setLog([]);
        setReviews({});
        setAdded([]);
      },
    };
  }, [role, setRole, assignments, setAssignments, log, setLog, reviews, setReviews, added, setAdded, corrections]);
  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>;
}

export function useDemo(): Demo {
  const d = useContext(DemoContext);
  if (!d) throw new Error('useDemo outside DemoProvider');
  return d;
}

/** A moment as the log shows it: "9 Oct, 14:02". */
export const moment = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
