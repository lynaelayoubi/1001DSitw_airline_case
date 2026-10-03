import { useMemo } from 'react';

import { DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { assessFleet } from '../calc/exposure';
import type { Dataset } from '../calc/types';
import dataset from '../data/fleet.json';
import FleetScreen from './screens/FleetScreen';

// The only place the dataset is read. Everything on screen comes out of assessFleet.
const data = dataset as unknown as Dataset;

export default function App() {
  const fleet = useMemo(() => assessFleet(data, DEFAULT_ASSUMPTIONS), []);
  return <FleetScreen fleet={fleet} />;
}
