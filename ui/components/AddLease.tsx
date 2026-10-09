import { useState, type DragEvent } from 'react';

import { useDemo } from '../demo';
import { roleLabel } from '../roles';
import { Preview } from './Preview';

const READING_MS = 1500;

/**
 * Adding a lease, honestly: the leasing team drops the PDF (or chooses it), the tool reads it, and
 * its terms appear awaiting review. In this preview the file is not read — the terms that appear are
 * a sample from an existing lease — and the screen says so.
 */
export function AddLease({ sampleTail, onAdded, onCancel }: { sampleTail: string; onAdded: (id: string) => void; onCancel: () => void }) {
  const demo = useDemo();
  const [reading, setReading] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const take = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setRefused(`${f.name} is not a PDF. Add the lease as a PDF.`);
      return;
    }
    setRefused(null);
    setReading(f.name);
    setTimeout(() => {
      const id = demo.addLease(f.name, sampleTail);
      demo.record(`${roleLabel(demo.role)} added a lease, ${f.name}: read, awaiting review (a preview: the file was not read).`);
      onAdded(id);
    }, READING_MS);
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h3 className="caps">Add a lease</h3>
        <Preview />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!reading) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => (reading ? e.preventDefault() : drop(e))}
        className={`flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          over ? 'border-accent bg-accent-soft' : 'border-slate-200 bg-white'
        }`}
      >
        <svg viewBox="0 0 24 24" className={`h-10 w-10 ${over ? 'text-accent' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
          <path d="M14 3v5h5M12 17v-6M9.5 13.5 12 11l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {reading ? (
          <div className="mt-4 w-full max-w-sm">
            <div className="font-medium">{reading}</div>
            <div className="mt-1 text-slate-500">Reading the lease: return conditions, notice, replacement and maintenance terms…</div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-accent" style={{ animation: `fill ${READING_MS}ms ease-out forwards` }} />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 font-medium">Drop the lease PDF here</div>
            <div className="mt-1 text-slate-500">or</div>
            <label className="mt-2 cursor-pointer rounded-md border border-slate-200 bg-white px-4 py-2 font-medium text-accent hover:border-accent">
              Choose a file
              <input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(e) => take(e.target.files?.[0])} />
            </label>
            <div className="mt-3 text-label text-slate-500">PDF, as signed</div>
            {refused && <div className="mt-3 font-medium">{refused}</div>}
          </>
        )}
      </div>

      <p className="mt-3 text-label text-slate-500">
        In this preview the file is not read: the terms that appear are a sample taken from {sampleTail}'s lease, so the review can be shown. The new lease does
        not enter the calculation.
      </p>
      {!reading && (
        <button className="link mt-2 text-label" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
