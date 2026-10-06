export type RiderErrorCode =
  /** The RPC does not exist on the backend yet (Migration 012 not applied). */
  | 'BACKEND_NOT_READY'
  /** Supabase env vars are missing from the bundle. */
  | 'CONFIG_MISSING'
  | 'NOT_AUTHENTICATED'
  /** Authenticated user has no rider profile. */
  | 'NO_RIDER_PROFILE'
  /** Backend refused: wrong rider, wrong status, not permitted. */
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  /** Backend rejected a delivery state transition. */
  | 'INVALID_TRANSITION'
  /** Backend returned data that does not match the contract. */
  | 'INVALID_RESPONSE'
  | 'NETWORK'
  | 'UNKNOWN';

export class RiderApiError extends Error {
  readonly code: RiderErrorCode;
  readonly rpc: string;

  constructor(code: RiderErrorCode, rpc: string, message?: string) {
    super(message ?? `${rpc}: ${code}`);
    this.name = 'RiderApiError';
    this.code = code;
    this.rpc = rpc;
  }
}

export function isRiderApiError(error: unknown): error is RiderApiError {
  return error instanceof RiderApiError;
}

export function riderErrorCode(error: unknown): RiderErrorCode | null {
  return isRiderApiError(error) ? error.code : null;
}

export function isBackendNotReady(error: unknown): boolean {
  return riderErrorCode(error) === 'BACKEND_NOT_READY';
}

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
  hint?: string | null;
}

/**
 * Maps a PostgREST / Postgres error to a rider error code.
 *
 * PGRST202 = function not found in schema cache, 42883 = undefined function:
 * both mean the Rider RPC has not been deployed — surface BACKEND_NOT_READY,
 * never a fake success. Custom RAISE codes (P0001 + message prefix) are the
 * proposed convention for Migration 012 RPCs.
 */
export function mapPostgrestError(rpc: string, error: PostgrestLikeError): RiderApiError {
  const code = error.code ?? '';
  const message = error.message ?? '';

  if (code === 'PGRST202' || code === '42883') return new RiderApiError('BACKEND_NOT_READY', rpc, message);
  if (code === 'PGRST301' || code === '28000') return new RiderApiError('NOT_AUTHENTICATED', rpc, message);
  if (code === '42501') return new RiderApiError('FORBIDDEN', rpc, message);

  if (code === 'P0001') {
    if (message.startsWith('RIDER_NOT_FOUND')) return new RiderApiError('NO_RIDER_PROFILE', rpc, message);
    if (message.startsWith('FORBIDDEN')) return new RiderApiError('FORBIDDEN', rpc, message);
    if (message.startsWith('JOB_NOT_FOUND')) return new RiderApiError('NOT_FOUND', rpc, message);
    if (message.startsWith('INVALID_TRANSITION')) return new RiderApiError('INVALID_TRANSITION', rpc, message);
  }

  if (/fetch|network|timeout/i.test(message)) return new RiderApiError('NETWORK', rpc, message);
  return new RiderApiError('UNKNOWN', rpc, message);
}
