import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n';
import { isBackendNotReady } from '@/services/rider/errors';
import { colors, spacing } from '@/theme/tokens';

import { EmptyOperationalState } from './EmptyOperationalState';

interface Props {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Loading / error rendering shared by remote lists; render only while loading or errored. */
export function RemoteState({ isLoading, error, onRetry }: Props) {
  const { t } = useI18n();
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error) {
    if (isBackendNotReady(error)) {
      return <EmptyOperationalState icon="construct-outline" tone="pending" title={t('backend.notReady.short')} body={t('backend.notReady')} />;
    }
    return (
      <EmptyOperationalState
        icon="cloud-offline-outline"
        tone="danger"
        title={t('gate.error.body')}
        actionLabel={t('common.retry')}
        onAction={onRetry}
      />
    );
  }
  return null;
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
});
