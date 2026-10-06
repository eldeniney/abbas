import { useCallback, useState } from 'react';

import { getCurrentFix } from '@/features/location/permissions';
import { useLocationReadiness } from '@/features/location/useLocationReadiness';
import { useSetOnline } from '@/services/rider/queries';

import { useRider } from './RiderProvider';

/**
 * Online/offline control. The displayed state is always the backend's
 * is_online; while a request is in flight the UI shows the *pending* target,
 * never an assumed result.
 */
export function useOnlineToggle() {
  const { context, operational } = useRider();
  const { readiness, request } = useLocationReadiness();
  const mutation = useSetOnline();
  const [locationBlocked, setLocationBlocked] = useState(false);

  const isOnline = context?.is_online ?? false;
  const canToggle = operational && (isOnline || (context?.can_go_online ?? false));
  const pendingTarget = mutation.isPending ? (mutation.variables?.online ?? null) : null;

  const toggle = useCallback(async () => {
    if (!canToggle || mutation.isPending) return;
    mutation.reset();
    if (isOnline) {
      mutation.mutate({ online: false, location: null });
      return;
    }
    const ready = await request();
    if (ready !== 'ready') {
      setLocationBlocked(true);
      return;
    }
    setLocationBlocked(false);
    try {
      const fix = await getCurrentFix();
      mutation.mutate({ online: true, location: fix });
    } catch {
      setLocationBlocked(true);
    }
  }, [canToggle, isOnline, mutation, request]);

  return {
    isOnline,
    canToggle,
    pendingTarget,
    failed: mutation.isError,
    toggle,
    readiness,
    requestLocation: request,
    showLocationPrompt: locationBlocked && readiness !== null && readiness !== 'ready',
  };
}
