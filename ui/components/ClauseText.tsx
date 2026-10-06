import type { ReactNode } from 'react';

import { useLeaseLinks } from '../leaseLinks';

/**
 * Text with every clause reference this tail's lease holds turned into a link that opens the lease
 * at that clause. Only references the lease itself carries are linked — matched as written, the
 * longest first — so nothing is guessed.
 */
export function ClauseText({ tail, text }: { tail: string; text: string }) {
  const links = useLeaseLinks();
  const lease = links?.leaseOf(tail);
  if (!links || !lease) return <>{text}</>;
  const parts: ReactNode[] = [];
  let rest = text;
  while (rest) {
    let hit: { at: number; ref: string; anchor: string } | null = null;
    for (const a of lease.anchors) {
      const at = rest.indexOf(a.ref);
      if (at >= 0 && (!hit || at < hit.at || (at === hit.at && a.ref.length > hit.ref.length))) hit = { at, ...a };
    }
    if (!hit) {
      parts.push(rest);
      break;
    }
    const { at, ref, anchor } = hit;
    parts.push(rest.slice(0, at));
    parts.push(
      <button
        key={parts.length}
        className="link"
        title="Open the lease at this clause."
        onClick={(e) => {
          e.stopPropagation();
          links.open(tail, anchor);
        }}
      >
        {ref}
      </button>,
    );
    rest = rest.slice(at + ref.length);
  }
  return <>{parts}</>;
}
