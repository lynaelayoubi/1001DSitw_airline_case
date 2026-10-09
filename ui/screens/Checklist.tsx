import type { FleetExposure } from '../../calc/exposure';
import type { Readiness } from '../../calc/readiness';
import { Documents } from '../components/Documents';
import { ReadinessList } from '../components/Readiness';

/** What must be true before each aircraft goes back: the readiness checklist, open, and the documents each return needs. */
export default function Checklist({ fleet, readiness, onShowTail }: { fleet: FleetExposure; readiness: Readiness; onShowTail: (tail: string) => void }) {
  return (
    <div className="space-y-12">
      <ReadinessList readiness={readiness} onShowTail={onShowTail} open />
      <Documents tails={fleet.returning} />
    </div>
  );
}
