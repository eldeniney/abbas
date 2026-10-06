import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackendPendingBanner } from '@/components/rider/BackendPendingBanner';
import { EmptyOperationalState } from '@/components/rider/EmptyOperationalState';
import { RemoteState } from '@/components/rider/RemoteState';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useRider } from '@/features/rider/RiderProvider';
import { useI18n, type TranslationKey } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { isBackendNotReady } from '@/services/rider/errors';
import { useEarnings } from '@/services/rider/queries';
import type { EarningsPeriod } from '@/services/rider/types';
import { colors, spacing } from '@/theme/tokens';

const LINES: readonly { key: 'delivery_earnings' | 'commission' | 'bonuses' | 'adjustments'; label: TranslationKey }[] = [
  { key: 'delivery_earnings', label: 'earnings.deliveryEarnings' },
  { key: 'commission', label: 'earnings.commission' },
  { key: 'bonuses', label: 'earnings.bonuses' },
  { key: 'adjustments', label: 'earnings.adjustments' },
];

/** Every figure comes from rider_my_earnings (ledger-backed). No client-side money maths. */
export default function EarningsScreen() {
  const { t, language } = useI18n();
  const { operational, backendPending } = useRider();
  const [period, setPeriod] = useState<EarningsPeriod>('today');
  const earnings = useEarnings(period, operational);

  const pendingState = (
    <EmptyOperationalState icon="wallet-outline" tone="pending" title={t('earnings.pending.title')} body={t('earnings.pending.body')} />
  );

  const renderBody = () => {
    if (backendPending) return pendingState;
    if (earnings.error && isBackendNotReady(earnings.error)) return pendingState;
    if (earnings.isLoading || earnings.error) {
      return <RemoteState isLoading={earnings.isLoading} error={earnings.error} onRetry={() => void earnings.refetch()} />;
    }
    const data = earnings.data;
    if (!data) return null;
    const money = (value: number) => formatMoney(value, data.currency, language);

    return (
      <>
        <Card tone="primary">
          <AppText variant="caption" style={styles.onPrimaryMuted}>
            {t('earnings.total')}
          </AppText>
          <AppText variant="display" tone="inverse">
            {money(data.net_total)}
          </AppText>
          <AppText variant="caption" style={styles.onPrimaryMuted}>
            {t('earnings.deliveries')}: {data.deliveries_completed}
          </AppText>
        </Card>
        {data.deliveries_completed === 0 && data.net_total === 0 ? (
          <AppText tone="muted" center>
            {t('earnings.empty')}
          </AppText>
        ) : null}
        <Card>
          {LINES.map((line) => (
            <View key={line.key} style={styles.line}>
              <AppText style={styles.flex}>{t(line.label)}</AppText>
              <AppText variant="bodyStrong">{money(data[line.key])}</AppText>
            </View>
          ))}
        </Card>
        <Card tone="muted">
          <View style={styles.line}>
            <AppText style={styles.flex}>{t('earnings.codHeld')}</AppText>
            <AppText variant="bodyStrong" tone="accent">
              {money(data.cod_held)}
            </AppText>
          </View>
        </Card>
      </>
    );
  };

  return (
    <Screen onRefresh={() => void earnings.refetch()} refreshing={false}>
      <AppText variant="title">{t('earnings.title')}</AppText>
      {backendPending ? <BackendPendingBanner /> : null}
      <SegmentedControl
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: t('earnings.period.today') },
          { value: 'week', label: t('earnings.period.week') },
          { value: 'month', label: t('earnings.period.month') },
        ]}
      />
      {renderBody()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  flex: { flex: 1 },
  onPrimaryMuted: { color: colors.primarySoft },
});
