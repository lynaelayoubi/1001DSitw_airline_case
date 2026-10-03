import { useState, type ReactNode } from 'react';

/**
 * Wraps a figure with its arithmetic. Hover or focus shows the trace string the calc layer
 * attached to the result — the point of the demo is that nothing on screen is untraceable.
 */
export function Trace({ text, children, align = 'left', className = '' }: { text: string; children: ReactNode; align?: 'left' | 'right'; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`relative inline-block cursor-help underline decoration-dotted decoration-slate-300 underline-offset-4 ${className}`}
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={`absolute top-full z-30 mt-1 block w-[36rem] max-w-[min(36rem,85vw)] rounded-md border border-slate-300 bg-white p-3 text-left text-xs font-normal leading-relaxed whitespace-pre-wrap text-slate-700 shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
