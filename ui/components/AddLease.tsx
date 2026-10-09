import { useState } from 'react';

import { useDemo } from '../demo';
import { roleLabel } from '../roles';
import { Preview } from './Preview';

/**
 * Adding a lease, honestly: the leasing team uploads the PDF, the tool reads it, and its terms
 * appear awaiting review. In this preview the file is not read — the terms that appear are a sample
 * from an existing lease — and the screen says so.
 */
export function AddLease({ sampleTail, onAdded, onCancel }: { sampleTail: string; onAdded: (id: string) => void; onCancel: () => void }) {
  const demo = useDemo();
  const [reading, setReading] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="caps">Add a lease</h3>
        <Preview />
      </div>
      {reading ? (
        <p className="mt-3">Reading {reading}: finding the return conditions, notice, replacement and maintenance terms…</p>
      ) : (
        <>
          <label className="mt-3 flex flex-wrap items-center gap-3">
            <span>The lease PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setReading(f.name);
                setTimeout(() => {
                  const id = demo.addLease(f.name, sampleTail);
                  demo.record(`${roleLabel(demo.role)} added a lease, ${f.name}: read, awaiting review (a preview: the file was not read).`);
                  onAdded(id);
                }, 1500);
              }}
            />
          </label>
          <p className="mt-2 text-label text-slate-500">
            In this preview the file is not read: the terms that appear are a sample taken from {sampleTail}'s lease, so the review can be shown. The new
            lease does not enter the calculation.
          </p>
          <button className="link mt-2 text-label" onClick={onCancel}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
