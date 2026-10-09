// The demo's working state — who is looking, what has been assigned and to whom, and the log of it
// — kept in this browser's local storage (store.ts) so it survives a reload. Nothing here leaves the
// app: sending is a preview. Reset demo clears it all.

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { MaintenanceRequest } from '../calc/assign';
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

interface Demo {
  role: Role;
  setRole: (r: Role) => void;
  assignments: Record<string, Assignment>;
  assign: (a: Omit<Assignment, 'status' | 'history'>) => void;
  advance: (id: string, status: Status, note?: string) => void;
  log: LogEntry[];
  record: (text: string) => void;
  reset: () => void;
}

const DemoContext = createContext<Demo | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = usePersisted<Role>('role', 'head');
  const [assignments, setAssignments] = usePersisted<Record<string, Assignment>>('assignments', {});
  const [log, setLog] = usePersisted<LogEntry[]>('log', []);
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
      reset: () => {
        setAssignments({});
        setLog([]);
      },
    };
  }, [role, setRole, assignments, setAssignments, log, setLog]);
  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>;
}

export function useDemo(): Demo {
  const d = useContext(DemoContext);
  if (!d) throw new Error('useDemo outside DemoProvider');
  return d;
}

/** A moment as the log shows it: "9 Oct, 14:02". */
export const moment = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
