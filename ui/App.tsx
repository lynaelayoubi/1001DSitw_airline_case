import { useMemo } from 'react';

import { DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { assessFleet } from '../calc/exposure';
import { recommendFleet } from '../calc/recommend';
import type { Dataset } from '../calc/types';
import dataset from '../data/fleet.json';
import FleetScreen from './screens/FleetScreen';

// The only place the dataset is read. Everything on screen comes out of assessFleet and recommendFleet.
const data = dataset as unknown as Dataset;

export default function App() {
  const fleet = useMemo(() => assessFleet(data, DEFAULT_ASSUMPTIONS), []);
  const plans = useMemo(() => recommendFleet(data, fleet, DEFAULT_ASSUMPTIONS), [fleet]);
  return <FleetScreen fleet={fleet} plans={plans} />;
}
