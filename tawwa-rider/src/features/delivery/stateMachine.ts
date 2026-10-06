/**
 * Delivery state machine — UI side only.
 *
 * The backend is authoritative: a CTA is shown only when it is both the
 * expected next step for the current status AND listed in the job's
 * allowed_actions from the server. Transitions themselves are executed by
 * rider_* RPCs; the app never writes delivery state.
 *
 *   offered/assigned → accepted → arrived_at_pickup → picked_up
 *     → on_the_way → arrived_at_dropoff → delivered
 */
import type { DeliveryStatus, RiderJobAction } from '../../services/rider/types';

export type ProgressAction = Exclude<RiderJobAction, 'report_issue'>;

/** Ordered candidates: the first one the backend allows becomes the primary CTA. */
const PROGRESS_CANDIDATES: Record<DeliveryStatus, readonly ProgressAction[]> = {
  offered: ['accept'],
  assigned: ['accept'],
  accepted: ['arrived_at_pickup'],
  arrived_at_pickup: ['confirm_pickup'],
  picked_up: ['start_delivery'],
  on_the_way: ['arrived_at_dropoff', 'complete'],
  arrived_at_dropoff: ['complete'],
  delivered: [],
  cancelled: [],
  failed: [],
};

export const TERMINAL_STATUSES: readonly DeliveryStatus[] = ['delivered', 'cancelled', 'failed'];

export function isTerminal(status: DeliveryStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** The single primary action for this job, or null when nothing is permitted. */
export function primaryAction(status: DeliveryStatus, allowed: readonly RiderJobAction[]): ProgressAction | null {
  return PROGRESS_CANDIDATES[status].find((action) => allowed.includes(action)) ?? null;
}

/** Whether the UI would ever offer `action` from `status` (independent of the backend). */
export function isValidTransition(status: DeliveryStatus, action: ProgressAction): boolean {
  return PROGRESS_CANDIDATES[status].includes(action);
}

export function canReportIssue(status: DeliveryStatus, allowed: readonly RiderJobAction[]): boolean {
  return !isTerminal(status) && allowed.includes('report_issue');
}

export type DeliveryStep = 'accept' | 'pickup' | 'collect' | 'deliver' | 'done';
export const DELIVERY_STEPS: readonly DeliveryStep[] = ['accept', 'pickup', 'collect', 'deliver', 'done'];

const STEP_FOR_STATUS: Record<DeliveryStatus, number> = {
  offered: 0,
  assigned: 0,
  accepted: 1,
  arrived_at_pickup: 1,
  picked_up: 2,
  on_the_way: 3,
  arrived_at_dropoff: 3,
  delivered: 4,
  cancelled: -1,
  failed: -1,
};

/** Index into DELIVERY_STEPS, or -1 for cancelled/failed. */
export function stepIndex(status: DeliveryStatus): number {
  return STEP_FOR_STATUS[status];
}

export type NavigationLeg = 'pickup' | 'dropoff' | null;

/** Which destination the rider should be heading to right now. */
export function currentLeg(status: DeliveryStatus): NavigationLeg {
  switch (status) {
    case 'offered':
    case 'assigned':
    case 'accepted':
    case 'arrived_at_pickup':
      return 'pickup';
    case 'picked_up':
    case 'on_the_way':
    case 'arrived_at_dropoff':
      return 'dropoff';
    default:
      return null;
  }
}

export type NextStepHint =
  | 'accept'
  | 'goToPickup'
  | 'collect'
  | 'start'
  | 'goToCustomer'
  | 'handover'
  | 'done';

export function nextStepHint(status: DeliveryStatus): NextStepHint {
  switch (status) {
    case 'offered':
    case 'assigned':
      return 'accept';
    case 'accepted':
      return 'goToPickup';
    case 'arrived_at_pickup':
      return 'collect';
    case 'picked_up':
      return 'start';
    case 'on_the_way':
      return 'goToCustomer';
    case 'arrived_at_dropoff':
      return 'handover';
    default:
      return 'done';
  }
}

/** Jobs in these states keep location tracking at active-job frequency. */
export function requiresActiveTracking(status: DeliveryStatus): boolean {
  return !isTerminal(status) && status !== 'offered';
}
