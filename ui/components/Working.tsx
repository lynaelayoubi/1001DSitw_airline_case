import { useState } from 'react';

import { ClauseText } from './ClauseText';

/**
 * The working behind a figure: the arithmetic the calc layer attached to it, opened deliberately
 * and shown in place, below what it explains — never on hover, never over the content. Only where
 * a reader would check it: how a tail's recommendation was reached, how a component's exposure
 * adds up. Every clause reference in it opens the tail's lease at that clause.
 */
export function Working({ tail, text }: { tail: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="link text-label"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {open ? 'Hide the calculation' : 'Show the calculation'}
      </button>
      {open && (
        <div className="mt-2 border-l-2 border-slate-200 pl-3 text-label whitespace-pre-wrap text-slate-500 normal-case">
          <ClauseText tail={tail} text={text} />
        </div>
      )}
    </div>
  );
}
