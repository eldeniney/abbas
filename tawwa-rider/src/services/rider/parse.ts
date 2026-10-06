/**
 * Runtime validation of Rider RPC responses. The backend is the authority,
 * but the app must never render data that does not match the contract —
 * a mismatch becomes INVALID_RESPONSE instead of a silent wrong screen.
 */
import type {
  Coordinates,
  DeliveryStatus,
  EarningsPeriod,
  EarningsSummary,
  IssueReceipt,
  JobDetails,
  JobItem,
  JobPayment,
  JobSummary,
  LocationAck,
  RiderApprovalStatus,
  RiderAvailability,
  RiderContext,
  RiderJobAction,
  RiderZone,
  VehicleType,
} from './types';

export class ContractError extends Error {
  constructor(path: string, expected: string) {
    super(`Contract mismatch at ${path}: expected ${expected}`);
    this.name = 'ContractError';
  }
}

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function obj(value: unknown, path: string): Obj {
  if (!isObj(value)) throw new ContractError(path, 'object');
  return value;
}

function str(o: Obj, key: string, path: string): string {
  const v = o[key];
  if (typeof v !== 'string') throw new ContractError(`${path}.${key}`, 'string');
  return v;
}

function strOrNull(o: Obj, key: string, path: string): string | null {
  const v = o[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new ContractError(`${path}.${key}`, 'string | null');
  return v;
}

/** Postgres numeric may arrive as string; accept both, reject NaN. */
function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function num(o: Obj, key: string, path: string): number {
  const n = toNumber(o[key]);
  if (n === null) throw new ContractError(`${path}.${key}`, 'number');
  return n;
}

function numOrNull(o: Obj, key: string, path: string): number | null {
  const v = o[key];
  if (v === null || v === undefined) return null;
  const n = toNumber(v);
  if (n === null) throw new ContractError(`${path}.${key}`, 'number | null');
  return n;
}

function bool(o: Obj, key: string, path: string): boolean {
  const v = o[key];
  if (typeof v !== 'boolean') throw new ContractError(`${path}.${key}`, 'boolean');
  return v;
}

function oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], path: string): T {
  const v = o[key];
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new ContractError(`${path}.${key}`, allowed.join(' | '));
  }
  return v as T;
}

function arr(o: Obj, key: string, path: string): unknown[] {
  const v = o[key];
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) throw new ContractError(`${path}.${key}`, 'array');
  return v;
}

export const VEHICLE_TYPES = ['bicycle', 'motorcycle'] as const satisfies readonly VehicleType[];
export const APPROVAL_STATUSES = [
  'pending_approval',
  'approved',
  'rejected',
  'suspended',
  'inactive',
] as const satisfies readonly RiderApprovalStatus[];
export const DELIVERY_STATUSES = [
  'offered',
  'assigned',
  'accepted',
  'arrived_at_pickup',
  'picked_up',
  'on_the_way',
  'arrived_at_dropoff',
  'delivered',
  'cancelled',
  'failed',
] as const satisfies readonly DeliveryStatus[];
export const JOB_ACTIONS = [
  'accept',
  'arrived_at_pickup',
  'confirm_pickup',
  'start_delivery',
  'arrived_at_dropoff',
  'complete',
  'report_issue',
] as const satisfies readonly RiderJobAction[];
const EARNINGS_PERIODS = ['today', 'week', 'month'] as const satisfies readonly EarningsPeriod[];

function vehicleOrNull(o: Obj, key: string, path: string): VehicleType | null {
  if (o[key] === null || o[key] === undefined) return null;
  return oneOf(o, key, VEHICLE_TYPES, path);
}

function zone(value: unknown, path: string): RiderZone | null {
  if (value === null || value === undefined) return null;
  const o = obj(value, path);
  return { id: str(o, 'id', path), name_ar: str(o, 'name_ar', path), name_en: str(o, 'name_en', path) };
}

function coords(value: unknown, path: string): Coordinates | null {
  if (value === null || value === undefined) return null;
  const o = obj(value, path);
  const lat = num(o, 'lat', path);
  const lng = num(o, 'lng', path);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ContractError(path, 'valid coordinates');
  return { lat, lng };
}

function payment(value: unknown, path: string): JobPayment {
  const o = obj(value, path);
  return {
    method: oneOf(o, 'method', ['cod', 'prepaid'] as const, path),
    cod_amount: numOrNull(o, 'cod_amount', path),
    currency: str(o, 'currency', path),
  };
}

export function parseRiderContext(value: unknown): RiderContext {
  const p = 'rider_my_context';
  const o = obj(value, p);
  return {
    rider_id: str(o, 'rider_id', p),
    full_name: strOrNull(o, 'full_name', p),
    phone: strOrNull(o, 'phone', p),
    avatar_url: strOrNull(o, 'avatar_url', p),
    approval_status: oneOf(o, 'approval_status', APPROVAL_STATUSES, p),
    vehicle_type: vehicleOrNull(o, 'vehicle_type', p),
    zone: zone(o.zone, `${p}.zone`),
    is_online: bool(o, 'is_online', p),
    can_go_online: bool(o, 'can_go_online', p),
    active_job_id: strOrNull(o, 'active_job_id', p),
    today_completed_count: numOrNull(o, 'today_completed_count', p),
  };
}

export function parseJobSummary(value: unknown, path = 'job'): JobSummary {
  const o = obj(value, path);
  return {
    job_id: str(o, 'job_id', path),
    order_reference: str(o, 'order_reference', path),
    status: oneOf(o, 'status', DELIVERY_STATUSES, path),
    delivery_mode: oneOf(o, 'delivery_mode', VEHICLE_TYPES, path),
    pickup_merchant_name: str(o, 'pickup_merchant_name', path),
    pickup_branch_name: strOrNull(o, 'pickup_branch_name', path),
    dropoff_area: strOrNull(o, 'dropoff_area', path),
    payment: payment(o.payment, `${path}.payment`),
    offer_expires_at: strOrNull(o, 'offer_expires_at', path),
    updated_at: str(o, 'updated_at', path),
  };
}

export function parseJobList(value: unknown, rpc: string): JobSummary[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new ContractError(rpc, 'array');
  return value.map((row, i) => parseJobSummary(row, `${rpc}[${i}]`));
}

/** rider_my_active_job returns the job or null. */
export function parseActiveJob(value: unknown): JobSummary | null {
  if (value === null || value === undefined) return null;
  return parseJobSummary(value, 'rider_my_active_job');
}

function item(value: unknown, path: string): JobItem {
  const o = obj(value, path);
  return { name: str(o, 'name', path), quantity: num(o, 'quantity', path) };
}

export function parseJobDetails(value: unknown, rpc = 'rider_job_details'): JobDetails {
  const o = obj(value, rpc);
  const pickup = obj(o.pickup, `${rpc}.pickup`);
  const dropoff = obj(o.dropoff, `${rpc}.dropoff`);
  const actions = arr(o, 'allowed_actions', rpc).filter(
    (a): a is RiderJobAction => typeof a === 'string' && (JOB_ACTIONS as readonly string[]).includes(a),
  );
  return {
    job_id: str(o, 'job_id', rpc),
    order_reference: str(o, 'order_reference', rpc),
    status: oneOf(o, 'status', DELIVERY_STATUSES, rpc),
    delivery_mode: oneOf(o, 'delivery_mode', VEHICLE_TYPES, rpc),
    pickup: {
      merchant_name: str(pickup, 'merchant_name', `${rpc}.pickup`),
      branch_name: strOrNull(pickup, 'branch_name', `${rpc}.pickup`),
      address: strOrNull(pickup, 'address', `${rpc}.pickup`),
      location: coords(pickup.location, `${rpc}.pickup.location`),
      phone: strOrNull(pickup, 'phone', `${rpc}.pickup`),
    },
    dropoff: {
      area: strOrNull(dropoff, 'area', `${rpc}.dropoff`),
      customer_name: strOrNull(dropoff, 'customer_name', `${rpc}.dropoff`),
      address: strOrNull(dropoff, 'address', `${rpc}.dropoff`),
      landmark: strOrNull(dropoff, 'landmark', `${rpc}.dropoff`),
      instructions: strOrNull(dropoff, 'instructions', `${rpc}.dropoff`),
      location: coords(dropoff.location, `${rpc}.dropoff.location`),
      phone: strOrNull(dropoff, 'phone', `${rpc}.dropoff`),
    },
    items: arr(o, 'items', rpc).map((it, i) => item(it, `${rpc}.items[${i}]`)),
    payment: payment(o.payment, `${rpc}.payment`),
    allowed_actions: actions,
    updated_at: str(o, 'updated_at', rpc),
  };
}

export function parseAvailability(value: unknown): RiderAvailability {
  const p = 'rider_set_online';
  const o = obj(value, p);
  return { is_online: bool(o, 'is_online', p), changed_at: str(o, 'changed_at', p) };
}

export function parseLocationAck(value: unknown): LocationAck {
  const p = 'rider_update_location';
  const o = obj(value, p);
  return { accepted: bool(o, 'accepted', p), next_min_interval_s: numOrNull(o, 'next_min_interval_s', p) };
}

export function parseIssueReceipt(value: unknown): IssueReceipt {
  const p = 'rider_report_issue';
  const o = obj(value, p);
  return { issue_id: str(o, 'issue_id', p), created_at: str(o, 'created_at', p) };
}

export function parseEarnings(value: unknown): EarningsSummary {
  const p = 'rider_my_earnings';
  const o = obj(value, p);
  return {
    period: oneOf(o, 'period', EARNINGS_PERIODS, p),
    period_start: str(o, 'period_start', p),
    period_end: str(o, 'period_end', p),
    currency: str(o, 'currency', p),
    deliveries_completed: num(o, 'deliveries_completed', p),
    delivery_earnings: num(o, 'delivery_earnings', p),
    commission: num(o, 'commission', p),
    bonuses: num(o, 'bonuses', p),
    adjustments: num(o, 'adjustments', p),
    net_total: num(o, 'net_total', p),
    cod_held: num(o, 'cod_held', p),
  };
}
