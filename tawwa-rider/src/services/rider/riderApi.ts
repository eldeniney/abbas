/**
 * The single entry point for Rider backend calls. UI code never calls
 * supabase.rpc directly.
 *
 * Every RPC is identified server-side by auth.uid(): no function here sends a
 * rider_id. Missing RPCs surface BACKEND_NOT_READY — never a fake success.
 */
import { supabase } from '@/lib/supabase';

import { mapPostgrestError, RiderApiError } from './errors';
import {
  ContractError,
  parseActiveJob,
  parseAvailability,
  parseEarnings,
  parseIssueReceipt,
  parseJobDetails,
  parseJobList,
  parseLocationAck,
  parseRiderContext,
} from './parse';
import type {
  EarningsPeriod,
  EarningsSummary,
  IssueReceipt,
  IssueType,
  JobDetails,
  JobSummary,
  LocationAck,
  LocationSample,
  RiderAvailability,
  RiderContext,
  TransitionResult,
} from './types';

export const RIDER_RPC = {
  myContext: 'rider_my_context',
  setOnline: 'rider_set_online',
  myActiveJob: 'rider_my_active_job',
  availableJobs: 'rider_available_jobs',
  acceptJob: 'rider_accept_job',
  jobDetails: 'rider_job_details',
  arrivedAtPickup: 'rider_arrived_at_pickup',
  confirmPickup: 'rider_confirm_pickup',
  startDelivery: 'rider_start_delivery',
  arrivedAtDropoff: 'rider_arrived_at_dropoff',
  completeDelivery: 'rider_complete_delivery',
  reportIssue: 'rider_report_issue',
  updateLocation: 'rider_update_location',
  myHistory: 'rider_my_history',
  myEarnings: 'rider_my_earnings',
} as const;

export type RiderRpcName = (typeof RIDER_RPC)[keyof typeof RIDER_RPC];

type RpcParams = Record<string, string | number | boolean | null>;

async function callRpc<T>(rpc: RiderRpcName, params: RpcParams, parse: (data: unknown) => T): Promise<T> {
  if (!supabase) throw new RiderApiError('CONFIG_MISSING', rpc);

  let result: { data: unknown; error: { code?: string; message?: string } | null };
  try {
    result = await supabase.rpc(rpc, params);
  } catch (cause) {
    throw new RiderApiError('NETWORK', rpc, cause instanceof Error ? cause.message : undefined);
  }

  if (result.error) throw mapPostgrestError(rpc, result.error);

  try {
    return parse(result.data);
  } catch (cause) {
    if (cause instanceof ContractError) throw new RiderApiError('INVALID_RESPONSE', rpc, cause.message);
    throw cause;
  }
}

export const riderApi = {
  myContext(): Promise<RiderContext> {
    return callRpc(RIDER_RPC.myContext, {}, parseRiderContext);
  },

  /** Location is sent with the request so the backend can validate zone presence. */
  setOnline(online: boolean, location: Pick<LocationSample, 'lat' | 'lng' | 'accuracy_m'> | null): Promise<RiderAvailability> {
    return callRpc(
      RIDER_RPC.setOnline,
      {
        p_online: online,
        p_lat: location?.lat ?? null,
        p_lng: location?.lng ?? null,
        p_accuracy_m: location?.accuracy_m ?? null,
      },
      parseAvailability,
    );
  },

  myActiveJob(): Promise<JobSummary | null> {
    return callRpc(RIDER_RPC.myActiveJob, {}, parseActiveJob);
  },

  availableJobs(): Promise<JobSummary[]> {
    return callRpc(RIDER_RPC.availableJobs, {}, (d) => parseJobList(d, RIDER_RPC.availableJobs));
  },

  jobDetails(jobId: string): Promise<JobDetails> {
    return callRpc(RIDER_RPC.jobDetails, { p_job_id: jobId }, (d) => parseJobDetails(d));
  },

  acceptJob(jobId: string): Promise<TransitionResult> {
    return callRpc(RIDER_RPC.acceptJob, { p_job_id: jobId }, (d) => parseJobDetails(d, RIDER_RPC.acceptJob));
  },

  arrivedAtPickup(jobId: string): Promise<TransitionResult> {
    return callRpc(RIDER_RPC.arrivedAtPickup, { p_job_id: jobId }, (d) =>
      parseJobDetails(d, RIDER_RPC.arrivedAtPickup),
    );
  },

  confirmPickup(jobId: string): Promise<TransitionResult> {
    return callRpc(RIDER_RPC.confirmPickup, { p_job_id: jobId }, (d) => parseJobDetails(d, RIDER_RPC.confirmPickup));
  },

  startDelivery(jobId: string): Promise<TransitionResult> {
    return callRpc(RIDER_RPC.startDelivery, { p_job_id: jobId }, (d) => parseJobDetails(d, RIDER_RPC.startDelivery));
  },

  arrivedAtDropoff(jobId: string): Promise<TransitionResult> {
    return callRpc(RIDER_RPC.arrivedAtDropoff, { p_job_id: jobId }, (d) =>
      parseJobDetails(d, RIDER_RPC.arrivedAtDropoff),
    );
  },

  /** COD amount is echoed back so the backend can verify it matches the order. */
  completeDelivery(jobId: string, codCollected: number | null): Promise<TransitionResult> {
    return callRpc(RIDER_RPC.completeDelivery, { p_job_id: jobId, p_cod_collected: codCollected }, (d) =>
      parseJobDetails(d, RIDER_RPC.completeDelivery),
    );
  },

  reportIssue(jobId: string, issueType: IssueType, note: string | null): Promise<IssueReceipt> {
    return callRpc(
      RIDER_RPC.reportIssue,
      { p_job_id: jobId, p_issue_type: issueType, p_note: note },
      parseIssueReceipt,
    );
  },

  updateLocation(sample: LocationSample): Promise<LocationAck> {
    return callRpc(
      RIDER_RPC.updateLocation,
      {
        p_lat: sample.lat,
        p_lng: sample.lng,
        p_accuracy_m: sample.accuracy_m,
        p_heading: sample.heading,
        p_speed_mps: sample.speed_mps,
        p_recorded_at: sample.recorded_at,
      },
      parseLocationAck,
    );
  },

  myHistory(limit = 30, before: string | null = null): Promise<JobSummary[]> {
    return callRpc(RIDER_RPC.myHistory, { p_limit: limit, p_before: before }, (d) =>
      parseJobList(d, RIDER_RPC.myHistory),
    );
  },

  myEarnings(period: EarningsPeriod): Promise<EarningsSummary> {
    return callRpc(RIDER_RPC.myEarnings, { p_period: period }, parseEarnings);
  },
};
