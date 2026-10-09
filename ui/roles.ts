// Who sees what. No login: a role is picked in the header, to show the permissions the customer
// asked for. Each role sees only the pages it needs, and only some roles can change things.

export type Page = 'overview' | 'leases' | 'scenarios' | 'checklist';
export type Role = 'head' | 'leasing' | 'planning' | 'analyst';

export const PAGES: { id: Page; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'leases', label: 'Leases' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'checklist', label: 'Return checklist' },
];

export const ROLES: { id: Role; label: string; pages: Page[] }[] = [
  { id: 'head', label: 'Head of fleet', pages: ['overview', 'leases', 'scenarios', 'checklist'] },
  { id: 'leasing', label: 'Leasing team', pages: ['overview', 'leases', 'checklist'] },
  { id: 'planning', label: 'Maintenance planning', pages: ['overview', 'checklist'] },
  { id: 'analyst', label: 'Analyst', pages: ['overview', 'leases', 'scenarios', 'checklist'] },
];

export const roleLabel = (r: Role) => ROLES.find((x) => x.id === r)!.label;
export const canSee = (r: Role, p: Page) => ROLES.find((x) => x.id === r)!.pages.includes(p);
export const isPage = (s: string): s is Page => PAGES.some((p) => p.id === s);

/** Who approves or corrects how a lease was read, and adds a lease: the leasing team, who own the return conditions. */
export const canReviewLease = (r: Role) => r === 'leasing';

/** Who can assign a recommended action and notify its owner: the people who decide. */
export const canAssign = (r: Role) => r === 'head' || r === 'analyst';

const ROLE_FOR_OWNER: Record<string, Role> = { 'Maintenance planning': 'planning', 'Leasing team': 'leasing' };
/**
 * Who moves an assigned action to Accepted and Done: its owner. Technical records and Network
 * planning have no seat in the switcher, so for them the head of fleet records it, on their behalf.
 */
export const canProgress = (r: Role, owner: string) => (ROLE_FOR_OWNER[owner] ? ROLE_FOR_OWNER[owner] === r : r === 'head');
export const onBehalf = (r: Role, owner: string) => !ROLE_FOR_OWNER[owner] && r === 'head';
