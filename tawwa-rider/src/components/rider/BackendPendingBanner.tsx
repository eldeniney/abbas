import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

/** Shown on every operational screen while the Rider RPCs are not deployed. */
export function BackendPendingBanner() {
  const { t } = useI18n();
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Icon name="construct-outline" size={18} color={colors.warning} />
      <AppText variant="caption" tone="warning" style={styles.text}>
        {t('gate.backendPending.banner')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1 },
});
