import { useDemo } from '../demo';
import { PAGES, ROLES, canSee, type Page, type Role } from '../roles';

/** The name, the pages this role can see, and who is looking. */
export function Header({ page, role, onPage, onRole }: { page: Page; role: Role; onPage: (p: Page) => void; onRole: (r: Role) => void }) {
  const demo = useDemo();
  return (
    <header className="mb-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-display font-semibold tracking-tight">Handback</h1>
        <label className="flex items-center gap-2 text-slate-500">
          Viewing as
          <select className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900" value={role} onChange={(e) => onRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-2 flex justify-end">
        <button className="link text-label" onClick={demo.reset} title="Clear every assignment, review and status made in this browser, and start the demo again.">
          Reset demo
        </button>
      </div>
      <nav className="mt-6 flex gap-6 border-b border-slate-200">
        {PAGES.filter((p) => canSee(role, p.id)).map((p) => (
          <a
            key={p.id}
            href={`#${p.id}`}
            onClick={(e) => {
              e.preventDefault();
              onPage(p.id);
            }}
            className={`-mb-px border-b-2 pb-3 ${page === p.id ? 'border-accent font-medium text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            aria-current={page === p.id ? 'page' : undefined}
          >
            {p.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
