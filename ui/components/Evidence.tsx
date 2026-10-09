import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS } from '../../calc/constants';
import { readInput, type Robustness } from '../../calc/robustness';
import { inputValue } from '../format';

/**
 * The evidence behind each assumption, folded under the scenario builder: the figure today's plan
 * uses, the range the evidence supports (why it stops there is in ASSUMPTIONS §14), where the real
 * number should come from, and whether moving it anywhere in that range changes any recommendation
 * (the robustness sweep). Read only: a different figure belongs to a scenario, never to today's plan.
 */
export function Evidence({ robustness, pending }: { robustness: Robustness | null; pending: boolean }) {
  // The sweep comes back from a worker as a copy, so inputs are matched by id.
  const changing = new Set(robustness?.changing.map((x) => x.id));
  const moving = robustness?.changing.length ?? 0;
  return (
    <details>
      <summary className="cursor-pointer">
        <span className="caps">Show the evidence</span>
        <span className="ml-3 text-label text-slate-500">
          {robustness ? (
            <span className={pending ? 'opacity-60' : ''}>
              {moving} of {ASSUMPTION_INPUTS.length} assumptions {moving === 1 ? 'moves' : 'move'} an answer inside the range its evidence supports
            </span>
          ) : (
            'checking which assumptions move an answer…'
          )}
        </span>
      </summary>
      <table className="mt-3 w-full">
        <thead className="caps">
          <tr className="border-b border-slate-200">
            <th className="pr-3 pb-3 text-left font-medium">Assumption</th>
            <th className="px-3 pb-3 text-left font-medium">Today's plan uses</th>
            <th className="px-3 pb-3 text-left font-medium">Evidenced range</th>
            <th className="px-3 pb-3 text-left font-medium">Real number from</th>
            <th className="pb-3 pl-3 text-left font-medium" title="Whether moving it anywhere in its evidenced range changes any tail's recommendation.">
              Changes an answer
            </th>
          </tr>
        </thead>
        <tbody>
          {ASSUMPTION_INPUTS.map((input) => (
            <tr key={input.id} className="border-t border-slate-100 align-baseline first:border-t-0">
              <td className="py-3 pr-3 font-medium">{input.label}</td>
              <td className="px-3 py-3 whitespace-nowrap tabular-nums">{inputValue(input, readInput(DEFAULT_ASSUMPTIONS, input.id))}</td>
              <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                {inputValue(input, input.range.min)} to {inputValue(input, input.range.max)}
              </td>
              <td className="px-3 py-3 text-slate-500">{input.source}</td>
              <td className={`py-3 pl-3 whitespace-nowrap ${pending ? 'opacity-60' : ''}`}>
                {!robustness ? <span className="text-slate-400">checking…</span> : changing.has(input.id) ? <span className="font-medium">Yes</span> : <span className="text-slate-500">No</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
