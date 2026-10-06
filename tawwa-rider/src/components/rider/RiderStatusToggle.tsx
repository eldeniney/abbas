import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, touchTarget } from '@/theme/tokens';

interface Props {
  isOnline: boolean;
  /** Target state of an in-flight request; null when idle. */
  pendingTarget: boolean | null;
  disabled: boolean;
  onToggle: () => void;
}

/** Primary control on Home: big status block with a single switch-like action. */
export function RiderStatusToggle({ isOnline, pendingTarget, disabled, onToggle }: Props) {
  const { t } = useI18n();
  const pending = pendingTarget !== null;
  const title = pending
    ? t(pendingTarget ? 'status.goingOnline' : 'status.goingOffline')
    : t(isOnline ? 'status.online' : 'status.offline');
  const hint = isOnline ? t('status.online.hint') : t('status.offline.hint');
  const actionLabel = disabled
    ? t('status.toggle.disabled')
    : t(isOnline ? 'status.toggle.goOffline' : 'status.toggle.goOnline');

  return (
    <View style={[styles.card, isOnline ? styles.online : styles.offline]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: isOnline ? '#4ADE80' : colors.textMuted }]} />
        <View style={styles.titles}>
          <AppText variant="title" tone={isOnline ? 'inverse' : 'default'}>
            {title}
          </AppText>
          <AppText variant="caption" style={{ color: isOnline ? '#E9DDF5' : colors.textMuted }}>
            {hint}
          </AppText>
        </View>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isOnline, disabled: disabled || pending, busy: pending }}
        accessibilityLabel={actionLabel}
        disabled={disabled || pending}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.button,
          isOnline ? styles.buttonOnline : styles.buttonOffline,
          pressed && styles.pressed,
          (disabled || pending) && styles.inactive,
        ]}
      >
        {pending ? (
          <ActivityIndicator color={isOnline ? colors.primary : colors.textOnPrimary} />
        ) : (
          <AppText variant="button" style={{ color: isOnline ? colors.primary : colors.textOnPrimary }}>
            {actionLabel}
          </AppText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg },
  online: { backgroundColor: colors.primary },
  offline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7 },
  titles: { flex: 1, gap: 2 },
  button: {
    minHeight: touchTarget.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOffline: { backgroundColor: colors.accent },
  buttonOnline: { backgroundColor: colors.surface },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.55 },
});
