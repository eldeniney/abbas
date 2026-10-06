import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { DELIVERY_STEPS, stepIndex, type DeliveryStep } from '@/features/delivery/stateMachine';
import { useI18n, type TranslationKey } from '@/i18n';
import type { DeliveryStatus } from '@/services/rider/types';
import { colors, spacing } from '@/theme/tokens';

const stepLabel: Record<DeliveryStep, TranslationKey> = {
  accept: 'step.accept',
  pickup: 'step.pickup',
  collect: 'step.collect',
  deliver: 'step.deliver',
  done: 'step.done',
};

export function DeliveryStatusStepper({ status }: { status: DeliveryStatus }) {
  const { t } = useI18n();
  const current = stepIndex(status);
  if (current < 0) return null;

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 4, now: current }}>
      {DELIVERY_STEPS.map((step, i) => {
        const done = i < current || status === 'delivered';
        const active = i === current && status !== 'delivered';
        return (
          <View key={step} style={styles.step}>
            <View style={styles.track}>
              <View style={[styles.line, i === 0 && styles.hidden, (done || active) && styles.lineDone]} />
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done ? <Icon name="checkmark" size={14} color={colors.textOnPrimary} /> : null}
              </View>
              <View
                style={[styles.line, i === DELIVERY_STEPS.length - 1 && styles.hidden, done && styles.lineDone]}
              />
            </View>
            <AppText variant="caption" tone={active ? 'primary' : done ? 'default' : 'muted'} center numberOfLines={1}>
              {t(stepLabel[step])}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  step: { flex: 1, gap: spacing.xs },
  track: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: 3, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.primary },
  hidden: { backgroundColor: 'transparent' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: { borderColor: colors.accent, borderWidth: 6 },
});
