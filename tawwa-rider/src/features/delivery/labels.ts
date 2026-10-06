import type { PillTone } from '@/components/ui/Pill';
import type { TranslationKey } from '@/i18n';
import type { DeliveryStatus, VehicleType } from '@/services/rider/types';

import type { NextStepHint, ProgressAction } from './stateMachine';

export const statusLabelKey: Record<DeliveryStatus, TranslationKey> = {
  offered: 'state.offered',
  assigned: 'state.assigned',
  accepted: 'state.accepted',
  arrived_at_pickup: 'state.arrived_at_pickup',
  picked_up: 'state.picked_up',
  on_the_way: 'state.on_the_way',
  arrived_at_dropoff: 'state.arrived_at_dropoff',
  delivered: 'state.delivered',
  cancelled: 'state.cancelled',
  failed: 'state.failed',
};

export const statusTone: Record<DeliveryStatus, PillTone> = {
  offered: 'accent',
  assigned: 'accent',
  accepted: 'primary',
  arrived_at_pickup: 'primary',
  picked_up: 'info',
  on_the_way: 'info',
  arrived_at_dropoff: 'info',
  delivered: 'success',
  cancelled: 'neutral',
  failed: 'danger',
};

export const actionLabelKey: Record<ProgressAction, TranslationKey> = {
  accept: 'action.accept',
  arrived_at_pickup: 'action.arrivedAtPickup',
  confirm_pickup: 'action.confirmPickup',
  start_delivery: 'action.startDelivery',
  arrived_at_dropoff: 'action.arrivedAtDropoff',
  complete: 'action.complete',
};

export const hintLabelKey: Record<NextStepHint, TranslationKey> = {
  accept: 'action.hint.accept',
  goToPickup: 'action.hint.goToPickup',
  collect: 'action.hint.collect',
  start: 'action.hint.start',
  goToCustomer: 'action.hint.goToCustomer',
  handover: 'action.hint.handover',
  done: 'action.hint.done',
};

export const vehicleLabelKey: Record<VehicleType, TranslationKey> = {
  bicycle: 'vehicle.bicycle',
  motorcycle: 'vehicle.motorcycle',
};
