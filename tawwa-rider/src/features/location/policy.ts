/**
 * Location publishing policy — pure functions, no Expo imports, so the
 * throttling rules can be unit-tested and reasoned about in isolation.
 *
 * Goals: never flood the database, keep battery use proportional to need,
 * and recover from network failures without queueing stale points.
 */

export type TrackingMode = 'off' | 'online' | 'active_job';

export interface TrackingPolicy {
  /** OS-level watch interval (ms). */
  watchIntervalMs: number;
  /** OS-level watch distance threshold (m). */
  watchDistanceM: number;
  /** Never publish more often than this, regardless of movement. */
  minPublishIntervalMs: number;
  /** Publish only after moving at least this far... */
  minPublishDistanceM: number;
  /** ...unless this long has passed (heartbeat while stationary). */
  heartbeatMs: number;
  /** Prefer high accuracy (more battery) only during deliveries. */
  highAccuracy: boolean;
}

export const TRACKING_POLICIES: Record<Exclude<TrackingMode, 'off'>, TrackingPolicy> = {
  online: {
    watchIntervalMs: 30_000,
    watchDistanceM: 75,
    minPublishIntervalMs: 60_000,
    minPublishDistanceM: 150,
    heartbeatMs: 5 * 60_000,
    highAccuracy: false,
  },
  active_job: {
    watchIntervalMs: 10_000,
    watchDistanceM: 25,
    minPublishIntervalMs: 15_000,
    minPublishDistanceM: 40,
    heartbeatMs: 60_000,
    highAccuracy: true,
  },
};

/** Fixes worse than this are discarded rather than published. */
export const MAX_ACCEPTABLE_ACCURACY_M = 150;

export interface Point {
  lat: number;
  lng: number;
}

export interface PublishedPoint extends Point {
  at: number;
}

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function shouldPublish(
  last: PublishedPoint | null,
  next: Point & { accuracyM: number | null },
  now: number,
  policy: TrackingPolicy,
  serverMinIntervalMs: number | null = null,
): boolean {
  if (next.accuracyM !== null && next.accuracyM > MAX_ACCEPTABLE_ACCURACY_M) return false;
  if (!last) return true;

  const elapsed = now - last.at;
  const minInterval = Math.max(policy.minPublishIntervalMs, serverMinIntervalMs ?? 0);
  if (elapsed < minInterval) return false;
  if (elapsed >= policy.heartbeatMs) return true;
  return distanceMeters(last, next) >= policy.minPublishDistanceM;
}

/** Exponential backoff with a ceiling: 5s, 10s, 20s, 40s, 80s, 120s… */
export function retryDelayMs(failures: number): number {
  if (failures <= 0) return 0;
  return Math.min(5_000 * 2 ** (failures - 1), 120_000);
}

export function trackingModeFor(isOnline: boolean, hasActiveJob: boolean): TrackingMode {
  if (hasActiveJob) return 'active_job';
  if (isOnline) return 'online';
  return 'off';
}
