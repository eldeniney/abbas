/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canReportIssue, currentLeg, isValidTransition, primaryAction, stepIndex } from './stateMachine.ts';

test('primary action requires both the expected step and backend permission', () => {
  assert.equal(primaryAction('offered', ['accept']), 'accept');
  assert.equal(primaryAction('offered', []), null);
  assert.equal(primaryAction('accepted', ['complete']), null);
  assert.equal(primaryAction('arrived_at_pickup', ['confirm_pickup', 'report_issue']), 'confirm_pickup');
});

test('on_the_way prefers arrived_at_dropoff but allows direct completion', () => {
  assert.equal(primaryAction('on_the_way', ['arrived_at_dropoff', 'complete']), 'arrived_at_dropoff');
  assert.equal(primaryAction('on_the_way', ['complete']), 'complete');
});

test('terminal states expose no actions', () => {
  for (const s of ['delivered', 'cancelled', 'failed'] as const) {
    assert.equal(primaryAction(s, ['accept', 'complete', 'report_issue']), null);
    assert.equal(canReportIssue(s, ['report_issue']), false);
  }
});

test('invalid transitions are rejected', () => {
  assert.equal(isValidTransition('offered', 'complete'), false);
  assert.equal(isValidTransition('picked_up', 'start_delivery'), true);
  assert.equal(isValidTransition('accepted', 'confirm_pickup'), false);
});

test('legs and steps', () => {
  assert.equal(currentLeg('accepted'), 'pickup');
  assert.equal(currentLeg('picked_up'), 'dropoff');
  assert.equal(currentLeg('delivered'), null);
  assert.equal(stepIndex('offered'), 0);
  assert.equal(stepIndex('delivered'), 4);
  assert.equal(stepIndex('cancelled'), -1);
});
