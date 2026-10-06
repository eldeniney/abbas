import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { openAppSettings, type LocationReadiness } from '@/features/location/permissions';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

interface Props {
  readiness: Exclude<LocationReadiness, 'ready'>;
  onRequest: () => void;
}

export function LocationPermissionCard({ readiness, onRequest }: Props) {
  const { t } = useI18n();
  const content =
    readiness === 'blocked'
      ? { title: t('location.denied.title'), body: t('location.denied.body'), cta: t('location.openSettings'), act: () => void openAppSettings() }
      : readiness === 'services_disabled'
        ? { title: t('location.servicesOff.title'), body: t('location.servicesOff.body'), cta: t('common.retry'), act: onRequest }
        : { title: t('location.title'), body: t('location.body'), cta: t('location.allow'), act: onRequest };

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
        <Icon name="location-outline" size={26} color={colors.accent} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="bodyStrong">{content.title}</AppText>
          <AppText variant="caption" tone="muted">
            {content.body}
          </AppText>
        </View>
      </View>
      <OperationalButton label={content.cta} onPress={content.act} variant="secondary" />
    </Card>
  );
}
