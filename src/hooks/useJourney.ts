import { useCallback, useMemo, useState } from 'react';
import { distanceMeters } from '../lib/distance';
import { clearOrigin, loadOrigin, saveOrigin, type Origin } from '../lib/journey';
import type { CheckinRecord, Station } from '../lib/types';

export function useJourney(checkedStations: (Station & CheckinRecord)[]) {
  const [origin, setOriginState] = useState<Origin | null>(() => loadOrigin());

  const setOrigin = useCallback((next: Origin) => {
    saveOrigin(next);
    setOriginState(next);
  }, []);

  const removeOrigin = useCallback(() => {
    clearOrigin();
    setOriginState(null);
  }, []);

  const totalDistanceM = useMemo(() => {
    if (!origin) return 0;
    return checkedStations.reduce(
      (sum, s) => sum + distanceMeters(origin.lat, origin.lng, s.lat, s.lng),
      0,
    );
  }, [origin, checkedStations]);

  return { origin, setOrigin, removeOrigin, totalDistanceM };
}
