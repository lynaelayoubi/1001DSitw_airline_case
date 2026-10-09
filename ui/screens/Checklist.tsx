import type { Readiness } from '../../calc/readiness';
import { ReadinessList } from '../components/Readiness';

/** What must be true before each aircraft goes back: the readiness checklist, open. */
export default function Checklist({ readiness, onShowTail }: { readiness: Readiness; onShowTail: (tail: string) => void }) {
  return <ReadinessList readiness={readiness} onShowTail={onShowTail} open />;
}
