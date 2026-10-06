import { OperationalButton } from '@/components/ui/OperationalButton';
import { callPhone } from '@/features/maps/openNavigation';
import { useI18n } from '@/i18n';

/** Rendered only when the backend shares a phone number for the current job state. */
export function ContactButton({ phone }: { phone: string | null }) {
  const { t } = useI18n();
  if (!phone) return null;
  return <OperationalButton label={t('common.call')} icon="call-outline" variant="ghost" onPress={() => void callPhone(phone)} />;
}
