/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RiderContext } from '../../services/rider/types.ts';
import { computeGate } from './gate.ts';

const base: RiderContext = {
  rider_id: 'r1',
  full_name: 'Test',
  phone: null,
  avatar_url: null,
  approval_status: 'approved',
  vehicle_type: 'bicycle',
  zone: { id: 'z', name_ar: 'ز', name_en: 'Z' },
  is_online: false,
  can_go_online: true,
  active_job_id: null,
  today_completed_count: null,
};

const ok = (context: RiderContext) => computeGate({ isLoading: false, context, errorCode: null, hasError: false });

test('approved rider with zone and vehicle is ready', () => {
  assert.equal(ok(base).kind, 'ready');
});

test('non-approved statuses and missing assignments block', () => {
  for (const s of ['pending_approval', 'rejected', 'suspended', 'inactive'] as const) {
    const g = ok({ ...base, approval_status: s });
    assert.equal(g.kind === 'blocked' && g.reason, s);
  }
  const noZone = ok({ ...base, zone: null });
  assert.equal(noZone.kind === 'blocked' && noZone.reason, 'no_zone');
  const noVehicle = ok({ ...base, vehicle_type: null });
  assert.equal(noVehicle.kind === 'blocked' && noVehicle.reason, 'no_vehicle');
});

test('errors map to the right gate', () => {
  const g = (errorCode: Parameters<typeof computeGate>[0]['errorCode']) =>
    computeGate({ isLoading: false, context: undefined, errorCode, hasError: true }).kind;
  assert.equal(g('BACKEND_NOT_READY'), 'backend_pending');
  assert.equal(g('NO_RIDER_PROFILE'), 'no_profile');
  assert.equal(g('NETWORK'), 'error');
  assert.equal(computeGate({ isLoading: true, context: undefined, errorCode: null, hasError: false }).kind, 'loading');
});
