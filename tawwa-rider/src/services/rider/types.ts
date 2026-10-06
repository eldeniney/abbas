/**
 * Rider backend contract (planned — Migration 012 not yet applied).
 *
 * These types describe what the Rider RPCs are expected to return. The rider
 * is always identified server-side by auth.uid(); no request carries a
 * rider_id. Field names are snake_case to match Postgres JSON output.
 */

export type VehicleType = 'bicycle' | 'motorcycle';

export type RiderApprovalStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'inactive';

export interface RiderZone {
  id: string;
  name_ar: string;
  name_en: string;
}

/** rider_my_context() */
export interface RiderContext {
  rider_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  approval_status: RiderApprovalStatus;
  /** Authoritative vehicle assignment set by Operations. */
  vehicle_type: VehicleType | null;
  /** Authoritative operating zone set by Operations. */
  zone: RiderZone | null;
  is_online: boolean;
  /** Backend decides whether going online is permitted right now. */
  can_go_online: boolean;
  active_job_id: string | null;
  today_completed_count: number | null;
}

export type DeliveryStatus =
  | 'offered'
  | 'assigned'
  | 'accepted'
  | 'arrived_at_pickup'
  | 'picked_up'
  | 'on_the_way'
  | 'arrived_at_dropoff'
  | 'delivered'
  | 'cancelled'
  | 'failed';

/** Actions the backend currently permits for this rider on this job. */
export type RiderJobAction =
  | 'accept'
  | 'arrived_at_pickup'
  | 'confirm_pickup'
  | 'start_delivery'
  | 'arrived_at_dropoff'
  | 'complete'
  | 'report_issue';

export type PaymentMethod = 'cod' | 'prepaid';

export interface JobPayment {
  method: PaymentMethod;
  /** Amount the rider must collect; null when nothing to collect. */
  cod_amount: number | null;
  currency: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Row in rider_available_jobs / rider_my_history / rider_my_active_job. */
export interface JobSummary {
  job_id: string;
  order_reference: string;
  status: DeliveryStatus;
  /** Required delivery mode decided by the backend. */
  delivery_mode: VehicleType;
  pickup_merchant_name: string;
  pickup_branch_name: string | null;
  dropoff_area: string | null;
  payment: JobPayment;
  /** Offer expiry for 'offered' jobs. */
  offer_expires_at: string | null;
  updated_at: string;
}

export interface JobPickup {
  merchant_name: string;
  branch_name: string | null;
  address: string | null;
  location: Coordinates | null;
  /** Present only when the backend permits contacting the merchant. */
  phone: string | null;
}

/**
 * Customer data is minimised server-side: address, coordinates and phone are
 * null until the job reaches a state where the rider needs them.
 */
export interface JobDropoff {
  area: string | null;
  customer_name: string | null;
  address: string | null;
  landmark: string | null;
  instructions: string | null;
  location: Coordinates | null;
  phone: string | null;
}

export interface JobItem {
  name: string;
  quantity: number;
}

/** rider_job_details(p_job_id) */
export interface JobDetails {
  job_id: string;
  order_reference: string;
  status: DeliveryStatus;
  delivery_mode: VehicleType;
  pickup: JobPickup;
  dropoff: JobDropoff;
  items: JobItem[];
  payment: JobPayment;
  allowed_actions: RiderJobAction[];
  updated_at: string;
}

/** rider_set_online(p_online, p_lat, p_lng, p_accuracy_m) */
export interface RiderAvailability {
  is_online: boolean;
  changed_at: string;
}

export interface LocationSample {
  lat: number;
  lng: number;
  accuracy_m: number | null;
  heading: number | null;
  speed_mps: number | null;
  recorded_at: string;
}

/** rider_update_location(...) */
export interface LocationAck {
  accepted: boolean;
  /** Server-suggested minimum seconds until the next update. */
  next_min_interval_s: number | null;
}

export type IssueType =
  | 'cannot_find_customer'
  | 'customer_unavailable'
  | 'merchant_delay'
  | 'order_issue'
  | 'vehicle_issue'
  | 'other';

/** rider_report_issue(p_job_id, p_issue_type, p_note) */
export interface IssueReceipt {
  issue_id: string;
  created_at: string;
}

export type EarningsPeriod = 'today' | 'week' | 'month';

/** rider_my_earnings(p_period) — all money values from the ledger, never computed client-side. */
export interface EarningsSummary {
  period: EarningsPeriod;
  period_start: string;
  period_end: string;
  currency: string;
  deliveries_completed: number;
  delivery_earnings: number;
  commission: number;
  bonuses: number;
  adjustments: number;
  net_total: number;
  cod_held: number;
}

/** Transition RPCs return the updated job. */
export type TransitionResult = JobDetails;
