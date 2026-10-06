/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceMeters, retryDelayMs, shouldPublish, TRACKING_POLICIES, trackingModeFor } from './policy.ts';

const online = TRACKING_POLICIES.online;
const here = { lat: 25.2048, lng: 55.2708 };
// ~222 m north
const moved = { lat: 25.2068, lng: 55.2708 };

test('distance is roughly correct', () => {
  const d = distanceMeters(here, moved);
  assert.ok(d > 200 && d < 240, `got ${d}`);
});

test('first fix publishes; inaccurate fixes never do', () => {
  assert.equal(shouldPublish(null, { ...here, accuracyM: 10 }, 0, online), true);
  assert.equal(shouldPublish(null, { ...here, accuracyM: 500 }, 0, online), false);
});

test('respects min interval, distance and heartbeat', () => {
  const last = { ...here, at: 0 };
  assert.equal(shouldPublish(last, { ...moved, accuracyM: 10 }, 30_000, online), false, 'too soon');
  assert.equal(shouldPublish(last, { ...moved, accuracyM: 10 }, 61_000, online), true, 'moved enough');
  assert.equal(shouldPublish(last, { ...here, accuracyM: 10 }, 61_000, online), false, 'stationary');
  assert.equal(shouldPublish(last, { ...here, accuracyM: 10 }, online.heartbeatMs, online), true, 'heartbeat');
});

test('server min interval can only slow publishing down', () => {
  const last = { ...here, at: 0 };
  assert.equal(shouldPublish(last, { ...moved, accuracyM: 10 }, 61_000, online, 120_000), false);
  assert.equal(shouldPublish(last, { ...moved, accuracyM: 10 }, 61_000, online, 1_000), true);
});

test('backoff grows and caps', () => {
  assert.equal(retryDelayMs(0), 0);
  assert.equal(retryDelayMs(1), 5_000);
  assert.equal(retryDelayMs(3), 20_000);
  assert.equal(retryDelayMs(20), 120_000);
});

test('active job keeps tracking even when offline', () => {
  assert.equal(trackingModeFor(false, true), 'active_job');
  assert.equal(trackingModeFor(true, false), 'online');
  assert.equal(trackingModeFor(false, false), 'off');
});
