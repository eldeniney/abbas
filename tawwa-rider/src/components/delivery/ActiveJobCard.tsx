import { StyleSheet, View } from 'react-native';

import { VehicleBadge } from '@/components/rider/VehicleBadge';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { Pill } from '@/components/ui/Pill';
import { hintLabelKey, statusLabelKey } from '@/features/delivery/labels';
import { nextStepHint } from '@/features/delivery/stateMachine';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import type { JobSummary } from '@/services/rider/types';
import { colors, radius, spacing } from '@/theme/tokens';

import { DeliveryStatusStepper } from './DeliveryStatusStepper';

/** Visual priority on Home whenever the rider has a job in progress. */
export function ActiveJobCard({ job, onContinue }: { job: JobSummary; onContinue: () => void }) {
  const { t, language } = useI18n();
  const cod = job.payment.method === 'cod' ? job.payment.cod_amount : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" tone="accent">
            {t('home.currentJob')}
          </AppText>
          <AppText variant="heading">{t('job.order', { ref: job.order_reference })}</AppText>
        </View>
        <Pill label={t(statusLabelKey[job.status])} tone="accent" />
      </View>

      <DeliveryStatusStepper status={job.status} />

      <View style={styles.legs}>
        <View style={styles.leg}>
          <Icon name="storefront-outline" size={20} color={colors.primary} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {job.pickup_merchant_name}
            {job.pickup_branch_name ? ` · ${job.pickup_branch_name}` : ''}
          </AppText>
        </View>
        <View style={styles.leg}>
          <Icon name="location-outline" size={20} color={colors.accent} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {job.dropoff_area ?? '—'}
          </AppText>
        </View>
      </View>

      <View style={styles.badges}>
        <VehicleBadge vehicle={job.delivery_mode} />
        {cod !== null ? (
          <Pill tone="accent" icon="cash-outline" label={formatMoney(cod, job.payment.currency, language)} />
        ) : null}
      </View>

      <View style={styles.nextStep}>
        <AppText variant="caption" tone="muted">
          {t('home.nextAction')}
        </AppText>
        <AppText variant="bodyStrong" tone="primary">
          {t(hintLabelKey[nextStepHint(job.status)])}
        </AppText>
      </View>

      <OperationalButton
        label={t('home.continue')}
        onPress={onContinue}
        size="large"
        icon="arrow-forward"
        iconDirectional
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  legs: { gap: spacing.sm },
  leg: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  nextStep: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, gap: 2 },
});
