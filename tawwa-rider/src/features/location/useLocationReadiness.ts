import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getLocationReadiness, requestLocationReadiness, type LocationReadiness } from './permissions';

/** Tracks permission + GPS state and re-checks when the app returns from Settings. */
export function useLocationReadiness() {
  const [readiness, setReadiness] = useState<LocationReadiness | null>(null);

  const request = useCallback(async () => {
    const next = await requestLocationReadiness().catch((): LocationReadiness => 'services_disabled');
    setReadiness(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    const check = () =>
      getLocationReadiness()
        .catch((): LocationReadiness => 'services_disabled')
        .then((next) => {
          if (active) setReadiness(next);
        });
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return { readiness, request };
}
