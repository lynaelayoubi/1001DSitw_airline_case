import { useDeferredValue, useMemo, useState } from 'react';

import { DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { assessFleet } from '../calc/exposure';
import { compareRecommendations, recommendFleet } from '../calc/recommend';
import type { Assumptions, Dataset } from '../calc/types';
import dataset from '../data/fleet.json';
import FleetScreen from './screens/FleetScreen';

// The only place the dataset is read. Everything on screen comes out of assessFleet and
// recommendFleet, recomputed from the scenario panel's assumptions (SPEC §3.4).
const data = dataset as unknown as Dataset;

export default function App() {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  // A full recompute is tens of milliseconds; deferring it keeps a dragged slider responsive.
  const live = useDeferredValue(assumptions);
  const atRest = useMemo(() => recommendFleet(data, assessFleet(data, DEFAULT_ASSUMPTIONS), DEFAULT_ASSUMPTIONS), []);
  const fleet = useMemo(() => assessFleet(data, live), [live]);
  const plans = useMemo(() => recommendFleet(data, fleet, live), [fleet, live]);
  const comparison = useMemo(() => compareRecommendations(atRest, plans), [atRest, plans]);
  return <FleetScreen fleet={fleet} plans={plans} atRest={atRest} comparison={comparison} assumptions={assumptions} onAssumptions={setAssumptions} />;
}
