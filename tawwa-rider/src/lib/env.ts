/**
 * Public, bundle-safe configuration. Only EXPO_PUBLIC_* values are read here,
 * and every one of them ships inside the app binary — never add secrets.
 */
function optional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const env = {
  supabaseUrl: optional(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: optional(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  supportPhone: optional(process.env.EXPO_PUBLIC_RIDER_SUPPORT_PHONE),
  termsUrl: optional(process.env.EXPO_PUBLIC_TERMS_URL),
  privacyUrl: optional(process.env.EXPO_PUBLIC_PRIVACY_URL),
} as const;
