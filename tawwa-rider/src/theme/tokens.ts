/**
 * Tawwa design tokens for the Rider app.
 *
 * Brand values mirror the Tawwa identity (purple primary, orange accent,
 * warm cream surfaces). If the Customer App's token file differs, replace the
 * hex values here — every component reads colours from this module only.
 */
export const colors = {
  primary: '#5B2A86',
  primaryPressed: '#47206A',
  primarySoft: '#EFE7F6',
  accent: '#F28C28',
  accentSoft: '#FDEBD8',

  background: '#FBF7F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F4EFE7',
  border: '#E8E0D4',

  text: '#1F1630',
  textMuted: '#6B6378',
  textOnPrimary: '#FFFFFF',

  success: '#1E8E5A',
  successSoft: '#DFF3E9',
  warning: '#B26A00',
  warningSoft: '#FFF1D6',
  danger: '#C2352B',
  dangerSoft: '#FBE3E1',
  info: '#2B6CB0',
  infoSoft: '#E3EEF9',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  button: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
} as const;

/** Minimum touch target for outdoor / gloved use. */
export const touchTarget = {
  min: 48,
  primary: 60,
} as const;

export const shadow = {
  card: {
    shadowColor: '#1F1630',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
