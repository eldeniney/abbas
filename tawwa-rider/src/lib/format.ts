import type { Language } from '@/i18n';

/** Displays a backend-provided amount. Never used to compute money client-side. */
export function formatMoney(amount: number, currency: string, language: Language): string {
  try {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatTime(iso: string, language: Language): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
}
