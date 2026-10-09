import type { CloseCall } from '../../calc/robustness';
import { money } from '../format';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * The instruction for one close call: the move that would flip the answer, said as the condition
 * it holds under, and where the real number for that assumption lives.
 */
export function checkNote(c: CloseCall): string {
  const up = c.direction === 'up';
  const v = c.flip.value;
  const move = c.flip.change.replace(/^[+−-]/, '');
  const holds = (() => {
    switch (c.input.id) {
      case 'utilisation':
        return `holds unless it flies ${move} or more ${up ? 'above' : 'below'} plan`;
      case 'maintenanceCost':
        return `holds unless shop costs come in ${move} or more ${up ? 'above' : 'below'} the rates used`;
      case 'downtimeNarrowbody':
      case 'downtimeWidebody':
        return `holds unless a day on the ground costs ${money(v)} or ${up ? 'more' : 'less'}`;
      case 'lessorMarkup':
        return `holds unless the lessor's provider charges × ${v.toFixed(2)} our cost or ${up ? 'more' : 'less'}`;
      case 'reservesReclaim':
        return `holds unless ${pct(v)} or ${up ? 'more' : 'less'} of its reserves can be reclaimed`;
      case 'shopSlotLead':
        return `holds unless shop slots need ${v} months' lead or ${up ? 'more' : 'less'}`;
    }
  })();
  return `${holds}. Check ${c.input.source}.`;
}
