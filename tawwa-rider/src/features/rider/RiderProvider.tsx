import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { requiresActiveTracking } from '@/features/delivery/stateMachine';
import { trackingModeFor } from '@/features/location/policy';
import { useLocationPublisher, type PublisherState } from '@/features/location/useLocationPublisher';
import { riderErrorCode } from '@/services/rider/errors';
import { useActiveJob, useRiderContext } from '@/services/rider/queries';
import type { JobSummary, RiderContext } from '@/services/rider/types';

import { computeGate, type RiderGate } from './gate';

interface RiderValue {
  gate: RiderGate;
  /** Present only when the backend returned a context. */
  context: RiderContext | null;
  /** Operational screens and actions are enabled only when true. */
  operational: boolean;
  backendPending: boolean;
  activeJob: JobSummary | null;
  activeJobLoading: boolean;
  publisherState: PublisherState;
  refetch: () => void;
}

const RiderContextValue = createContext<RiderValue | null>(null);

export function RiderProvider({ children }: { children: ReactNode }) {
  const contextQuery = useRiderContext();
  const { isLoading, data, error, isError } = contextQuery;
  const gate = useMemo(
    () => computeGate({ isLoading, context: data, errorCode: riderErrorCode(error), hasError: isError }),
    [isLoading, data, error, isError],
  );
  const operational = gate.kind === 'ready';

  const activeJobQuery = useActiveJob(operational);
  const activeJob = activeJobQuery.data ?? null;
  const context = data ?? null;

  const mode = operational
    ? trackingModeFor(context?.is_online ?? false, activeJob !== null && requiresActiveTracking(activeJob.status))
    : 'off';
  const publisherState = useLocationPublisher(mode);

  const { refetch: refetchContext } = contextQuery;
  const { refetch: refetchActive } = activeJobQuery;

  const value = useMemo<RiderValue>(
    () => ({
      gate,
      context,
      operational,
      backendPending: gate.kind === 'backend_pending',
      activeJob,
      activeJobLoading: activeJobQuery.isLoading,
      publisherState,
      refetch: () => {
        void refetchContext();
        if (operational) void refetchActive();
      },
    }),
    [gate, context, operational, activeJob, activeJobQuery.isLoading, publisherState, refetchContext, refetchActive],
  );

  return <RiderContextValue.Provider value={value}>{children}</RiderContextValue.Provider>;
}

export function useRider(): RiderValue {
  const value = useContext(RiderContextValue);
  if (!value) throw new Error('useRider must be used inside RiderProvider');
  return value;
}
