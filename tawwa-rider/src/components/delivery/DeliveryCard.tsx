import { Pressable, StyleSheet, View } from 'react-native';

import { VehicleBadge } from '@/components/rider/VehicleBadge';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';
import { hintLabelKey, statusLabelKey, statusTone } from '@/features/delivery/labels';
import { nextStepHint } from '@/features/delivery/stateMachine';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import type { JobSummary } from '@/services/rider/types';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

interface Props {
  job: JobSummary;
  onPress: () => void;
}

export function DeliveryCard({ job, onPress }: Props) {
  const { t, language } = useI18n();
  const isCod = job.payment.method === 'cod' && job.payment.cod_amount !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('job.order', { ref: job.order_reference })}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <AppText variant="bodyStrong">{t('job.order', { ref: job.order_reference })}</AppText>
        <Pill label={t(statusLabelKey[job.status])} tone={statusTone[job.status]} />
      </View>

      <View style={styles.leg}>
        <Icon name="storefront-outline" size={20} color={colors.primary} />
        <View style={styles.legText}>
          <AppText variant="caption" tone="muted">
            {t('deliveries.pickupFrom')}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {job.pickup_merchant_name}
            {job.pickup_branch_name ? ` · ${job.pickup_branch_name}` : ''}
          </AppText>
        </View>
      </View>
      <View style={styles.leg}>
        <Icon name="location-outline" size={20} color={colors.accent} />
        <View style={styles.legText}>
          <AppText variant="caption" tone="muted">
            {t('deliveries.dropoffTo')}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {job.dropoff_area ?? '—'}
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <VehicleBadge vehicle={job.delivery_mode} />
        {isCod && job.payment.cod_amount !== null ? (
          <Pill
            tone="accent"
            icon="cash-outline"
            label={`${t('deliveries.cod')} · ${formatMoney(job.payment.cod_amount, job.payment.currency, language)}`}
          />
        ) : null}
      </View>

      <View style={styles.next}>
        <AppText variant="caption" tone="primary" style={styles.legText}>
          {t(hintLabelKey[nextStepHint(job.status)])}
        </AppText>
        <Icon name="chevron-forward" size={18} color={colors.primary} directional />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  pressed: { opacity: 0.9 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  leg: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  legText: { flex: 1 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
