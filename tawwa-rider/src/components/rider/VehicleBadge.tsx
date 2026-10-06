import { Pill } from '@/components/ui/Pill';
import { vehicleLabelKey } from '@/features/delivery/labels';
import { useI18n } from '@/i18n';
import type { VehicleType } from '@/services/rider/types';

export function VehicleBadge({ vehicle }: { vehicle: VehicleType | null }) {
  const { t } = useI18n();
  if (!vehicle) return <Pill label={t('vehicle.unknown')} icon="help-circle-outline" />;
  return (
    <Pill
      label={t(vehicleLabelKey[vehicle])}
      tone={vehicle === 'motorcycle' ? 'accent' : 'primary'}
      icon={vehicle === 'motorcycle' ? 'speedometer-outline' : 'bicycle-outline'}
    />
  );
}
