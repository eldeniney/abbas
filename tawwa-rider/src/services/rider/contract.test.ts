/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapPostgrestError } from './errors.ts';
import { ContractError, parseJobDetails, parseRiderContext } from './parse.ts';

test('missing RPC maps to BACKEND_NOT_READY, never success', () => {
  assert.equal(mapPostgrestError('rider_my_context', { code: 'PGRST202', message: 'Could not find the function' }).code, 'BACKEND_NOT_READY');
  assert.equal(mapPostgrestError('rider_my_context', { code: '42883', message: 'function does not exist' }).code, 'BACKEND_NOT_READY');
  assert.equal(mapPostgrestError('rider_accept_job', { code: 'P0001', message: 'INVALID_TRANSITION: offered -> delivered' }).code, 'INVALID_TRANSITION');
  assert.equal(mapPostgrestError('rider_job_details', { code: '42501', message: 'permission denied' }).code, 'FORBIDDEN');
});

test('context parser rejects malformed payloads', () => {
  assert.throws(() => parseRiderContext(null), ContractError);
  assert.throws(() => parseRiderContext({ rider_id: 'x', approval_status: 'superuser' }), ContractError);
});

test('job details parser drops unknown actions and validates coordinates', () => {
  const job = parseJobDetails({
    job_id: 'j1',
    order_reference: 'TWA-1001',
    status: 'accepted',
    delivery_mode: 'motorcycle',
    pickup: { merchant_name: 'M', branch_name: null, address: null, location: { lat: 25.2, lng: 55.3 }, phone: null },
    dropoff: { area: 'Al Barsha' },
    items: [{ name: 'Item', quantity: '2' }],
    payment: { method: 'cod', cod_amount: '45.50', currency: 'AED' },
    allowed_actions: ['arrived_at_pickup', 'teleport'],
    updated_at: '2026-01-01T00:00:00Z',
  });
  assert.deepEqual(job.allowed_actions, ['arrived_at_pickup']);
  assert.equal(job.payment.cod_amount, 45.5);
  assert.equal(job.items[0]?.quantity, 2);
  assert.equal(job.dropoff.location, null);

  assert.throws(
    () =>
      parseJobDetails({
        job_id: 'j1',
        order_reference: 'r',
        status: 'accepted',
        delivery_mode: 'bicycle',
        pickup: { merchant_name: 'M', location: { lat: 200, lng: 0 } },
        dropoff: {},
        payment: { method: 'prepaid', currency: 'AED' },
        updated_at: 'x',
      }),
    ContractError,
  );
});
