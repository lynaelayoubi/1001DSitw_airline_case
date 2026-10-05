import { useState, type ReactNode } from 'react';

/**
 * The working behind a figure: the arithmetic the calc layer attached to it, opened deliberately
 * and shown in place, below what it explains — never on hover, never over the content. Only where
 * a reader would check it: how a tail's recommendation was reached, how a component's exposure
 * adds up.
 */
export function Working({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="text-xs text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-800"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {open ? 'Hide the working' : 'Show the working'}
      </button>
      {open && <div className="mt-1 border-l-2 border-slate-200 pl-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-600 normal-case">{children}</div>}
    </div>
  );
}
