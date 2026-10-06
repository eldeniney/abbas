import { supabase } from '@/lib/supabase';

/** E.164: + followed by 8–15 digits. */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function client() {
  if (!supabase) throw new Error('CONFIG_MISSING');
  return supabase;
}

/** shouldCreateUser: false — riders are provisioned by Operations, never self-registered. */
export async function sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<void> {
  const { error } = await client().auth.verifyOtp({ phone, token: token.trim(), type: 'sms' });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}
