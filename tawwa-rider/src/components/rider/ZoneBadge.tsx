import { Pill } from '@/components/ui/Pill';
import { useI18n } from '@/i18n';
import type { RiderZone } from '@/services/rider/types';

export function ZoneBadge({ zone }: { zone: RiderZone | null }) {
  const { t, language } = useI18n();
  const name = zone ? (language === 'ar' ? zone.name_ar : zone.name_en) : t('zone.unknown');
  return <Pill label={name} tone={zone ? 'primary' : 'neutral'} icon="map-outline" />;
}
