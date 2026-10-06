import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { riderApi } from '@/services/rider/riderApi';
import { riderErrorCode } from '@/services/rider/errors';

import {
  retryDelayMs,
  shouldPublish,
  TRACKING_POLICIES,
  type PublishedPoint,
  type TrackingMode,
} from './policy';

export type PublisherState = 'idle' | 'publishing' | 'retrying' | 'backend_not_ready' | 'stopped';

/**
 * Foreground location publisher.
 *
 * - Runs only when mode !== 'off' and the app is in the foreground.
 * - Throttled by TRACKING_POLICIES and the server's next_min_interval_s.
 * - Keeps only the latest fix while a send is in flight or backing off,
 *   so reconnecting never replays a burst of stale points.
 * - Stops for the session if the RPC does not exist or the rider is not
 *   permitted (no point hammering the backend).
 *
 * Background tracking requires a development build with
 * expo-task-manager + background permission; see README.md (Location).
 */
export function useLocationPublisher(mode: TrackingMode): PublisherState {
  const [activeState, setActiveState] = useState<'publishing' | 'retrying' | null>(null);
  const [halted, setHalted] = useState<'backend_not_ready' | 'stopped' | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (mode === 'off' || !foreground || halted) return;

    const policy = TRACKING_POLICIES[mode];
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    let lastPublished: PublishedPoint | null = null;
    let pending: Location.LocationObject | null = null;
    let inFlight = false;
    let failures = 0;
    let serverMinIntervalMs: number | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const flush = async () => {
      if (cancelled || inFlight || retryTimer || !pending) return;
      const fix = pending;
      const point = { lat: fix.coords.latitude, lng: fix.coords.longitude, accuracyM: fix.coords.accuracy };
      if (!shouldPublish(lastPublished, point, Date.now(), policy, serverMinIntervalMs)) return;

      pending = null;
      inFlight = true;
      try {
        const ack = await riderApi.updateLocation({
          lat: point.lat,
          lng: point.lng,
          accuracy_m: point.accuracyM,
          heading: fix.coords.heading,
          speed_mps: fix.coords.speed,
          recorded_at: new Date(fix.timestamp).toISOString(),
        });
        failures = 0;
        lastPublished = { lat: point.lat, lng: point.lng, at: Date.now() };
        serverMinIntervalMs = ack.next_min_interval_s !== null ? ack.next_min_interval_s * 1000 : null;
        if (!cancelled) setActiveState('publishing');
      } catch (error) {
        const code = riderErrorCode(error);
        if (code === 'BACKEND_NOT_READY' || code === 'FORBIDDEN' || code === 'NO_RIDER_PROFILE') {
          if (!cancelled) setHalted(code === 'BACKEND_NOT_READY' ? 'backend_not_ready' : 'stopped');
          return;
        }
        failures += 1;
        // Keep the newest fix: a newer one from the watcher replaces this one.
        pending = pending ?? fix;
        if (!cancelled) setActiveState('retrying');
        retryTimer = setTimeout(() => {
          retryTimer = null;
          void flush();
        }, retryDelayMs(failures));
      } finally {
        inFlight = false;
      }
    };

    Location.watchPositionAsync(
      {
        accuracy: policy.highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeInterval: policy.watchIntervalMs,
        distanceInterval: policy.watchDistanceM,
      },
      (fix) => {
        pending = fix;
        void flush();
      },
    )
      .then((sub) => {
        if (cancelled) {
          sub.remove();
          return;
        }
        subscription = sub;
        // The OS watcher is distance-gated, so a stationary rider produces no
        // fixes; the heartbeat keeps "last seen" fresh at a low rate.
        heartbeatTimer = setInterval(() => {
          void Location.getLastKnownPositionAsync({ maxAge: policy.heartbeatMs }).then((fix) => {
            if (!fix || cancelled) return;
            pending = pending ?? fix;
            void flush();
          });
        }, policy.heartbeatMs);
      })
      .catch(() => {
        if (!cancelled) setHalted('stopped');
      });

    return () => {
      cancelled = true;
      subscription?.remove();
      if (retryTimer) clearTimeout(retryTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      setActiveState(null);
    };
  }, [mode, foreground, halted]);

  if (halted) return halted;
  if (mode === 'off' || !foreground) return 'idle';
  return activeState ?? 'idle';
}
