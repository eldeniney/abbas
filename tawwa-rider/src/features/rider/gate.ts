import type { RiderErrorCode } from '../../services/rider/errors';
import type { RiderContext } from '../../services/rider/types';

export type BlockReason = 'pending_approval' | 'rejected' | 'suspended' | 'inactive' | 'no_zone' | 'no_vehicle';

/**
 * What the signed-in user is allowed to see.
 *
 * - ready:            approved rider with zone + vehicle → operational screens
 * - backend_pending:  Rider RPCs not deployed → app shell with no data, all actions disabled
 * - blocked / no_profile / error: full-screen state, no operational screens
 */
export type RiderGate =
  | { kind: 'loading' }
  | { kind: 'ready'; context: RiderContext }
  | { kind: 'backend_pending' }
  | { kind: 'no_profile' }
  | { kind: 'blocked'; reason: BlockReason; context: RiderContext }
  | { kind: 'error' };

export function computeGate(input: {
  isLoading: boolean;
  context: RiderContext | undefined;
  errorCode: RiderErrorCode | null;
  hasError: boolean;
}): RiderGate {
  if (input.context) {
    const ctx = input.context;
    if (ctx.approval_status !== 'approved') return { kind: 'blocked', reason: ctx.approval_status, context: ctx };
    if (!ctx.zone) return { kind: 'blocked', reason: 'no_zone', context: ctx };
    if (!ctx.vehicle_type) return { kind: 'blocked', reason: 'no_vehicle', context: ctx };
    return { kind: 'ready', context: ctx };
  }
  if (input.hasError) {
    if (input.errorCode === 'BACKEND_NOT_READY') return { kind: 'backend_pending' };
    if (input.errorCode === 'NO_RIDER_PROFILE' || input.errorCode === 'FORBIDDEN') return { kind: 'no_profile' };
    return { kind: 'error' };
  }
  return { kind: 'loading' };
}
