import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { riderApi } from './riderApi';
import type { EarningsPeriod, IssueType, JobDetails, LocationSample } from './types';

/** Query keys are scoped by auth user id so sessions never share cache entries. */
export const riderKeys = {
  all: (uid: string) => ['rider', uid] as const,
  context: (uid: string) => ['rider', uid, 'context'] as const,
  activeJob: (uid: string) => ['rider', uid, 'active-job'] as const,
  available: (uid: string) => ['rider', uid, 'available'] as const,
  history: (uid: string) => ['rider', uid, 'history'] as const,
  job: (uid: string, jobId: string) => ['rider', uid, 'job', jobId] as const,
  earnings: (uid: string, period: EarningsPeriod) => ['rider', uid, 'earnings', period] as const,
};

function useUid(): string | null {
  return useAuth().session?.user.id ?? null;
}

export function useRiderContext() {
  const uid = useUid();
  return useQuery({
    queryKey: riderKeys.context(uid ?? 'anon'),
    queryFn: () => riderApi.myContext(),
    enabled: uid !== null,
    refetchInterval: 60_000,
  });
}

export function useActiveJob(enabled: boolean) {
  const uid = useUid();
  return useQuery({
    queryKey: riderKeys.activeJob(uid ?? 'anon'),
    queryFn: () => riderApi.myActiveJob(),
    enabled: enabled && uid !== null,
    refetchInterval: 20_000,
  });
}

export function useAvailableJobs(enabled: boolean) {
  const uid = useUid();
  return useQuery({
    queryKey: riderKeys.available(uid ?? 'anon'),
    queryFn: () => riderApi.availableJobs(),
    enabled: enabled && uid !== null,
    refetchInterval: 20_000,
  });
}

export function useHistory(enabled: boolean) {
  const uid = useUid();
  return useQuery({
    queryKey: riderKeys.history(uid ?? 'anon'),
    queryFn: () => riderApi.myHistory(),
    enabled: enabled && uid !== null,
  });
}

export function useJobDetails(jobId: string, enabled: boolean) {
  const uid = useUid();
  return useQuery({
    queryKey: riderKeys.job(uid ?? 'anon', jobId),
    queryFn: () => riderApi.jobDetails(jobId),
    enabled: enabled && uid !== null && jobId.length > 0,
    refetchInterval: 15_000,
  });
}

export function useEarnings(period: EarningsPeriod, enabled: boolean) {
  const uid = useUid();
  return useQuery({
    queryKey: riderKeys.earnings(uid ?? 'anon', period),
    queryFn: () => riderApi.myEarnings(period),
    enabled: enabled && uid !== null,
  });
}

/** Online state is confirmed by the backend; the UI only shows a pending state meanwhile. */
export function useSetOnline() {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { online: boolean; location: Pick<LocationSample, 'lat' | 'lng' | 'accuracy_m'> | null }) =>
      riderApi.setOnline(args.online, args.location),
    onSettled: () => {
      if (uid) void qc.invalidateQueries({ queryKey: riderKeys.all(uid) });
    },
  });
}

export type JobTransition =
  | { action: 'accept' }
  | { action: 'arrived_at_pickup' }
  | { action: 'confirm_pickup' }
  | { action: 'start_delivery' }
  | { action: 'arrived_at_dropoff' }
  | { action: 'complete'; codCollected: number | null };

function runTransition(jobId: string, t: JobTransition): Promise<JobDetails> {
  switch (t.action) {
    case 'accept':
      return riderApi.acceptJob(jobId);
    case 'arrived_at_pickup':
      return riderApi.arrivedAtPickup(jobId);
    case 'confirm_pickup':
      return riderApi.confirmPickup(jobId);
    case 'start_delivery':
      return riderApi.startDelivery(jobId);
    case 'arrived_at_dropoff':
      return riderApi.arrivedAtDropoff(jobId);
    case 'complete':
      return riderApi.completeDelivery(jobId, t.codCollected);
  }
}

export function useJobTransition(jobId: string) {
  const uid = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (t: JobTransition) => runTransition(jobId, t),
    onSuccess: (job) => {
      if (uid) qc.setQueryData(riderKeys.job(uid, jobId), job);
    },
    onSettled: () => {
      if (uid) void qc.invalidateQueries({ queryKey: riderKeys.all(uid) });
    },
  });
}

export function useReportIssue(jobId: string) {
  return useMutation({
    mutationFn: (args: { issueType: IssueType; note: string | null }) =>
      riderApi.reportIssue(jobId, args.issueType, args.note),
  });
}
