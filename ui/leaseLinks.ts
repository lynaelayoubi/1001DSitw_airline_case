import { createContext, useContext } from 'react';

import type { Lease } from '../calc/lease';

/**
 * What lets any clause reference on screen open the tail's lease: the lease itself, read from the
 * data in App, and the slide-over's open, held by the fleet screen. null outside the screen.
 */
export interface LeaseLinks {
  leaseOf: (tail: string) => Lease | null;
  open: (tail: string, anchor?: string) => void;
}

export const LeaseLinksContext = createContext<LeaseLinks | null>(null);
export const useLeaseLinks = () => useContext(LeaseLinksContext);
