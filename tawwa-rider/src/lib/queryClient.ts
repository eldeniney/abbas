import { QueryClient } from '@tanstack/react-query';

import { riderErrorCode } from '@/services/rider/errors';

/** Errors where retrying cannot help — surface them immediately. */
const NON_RETRYABLE = new Set([
  'BACKEND_NOT_READY',
  'CONFIG_MISSING',
  'NOT_AUTHENTICATED',
  'NO_RIDER_PROFILE',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_TRANSITION',
  'INVALID_RESPONSE',
]);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) => {
        const code = riderErrorCode(error);
        if (code && NON_RETRYABLE.has(code)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Delivery transitions are never retried automatically: the rider confirms each one.
      retry: false,
    },
  },
});
