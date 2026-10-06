import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import type { JobPayment } from '@/services/rider/types';
import { colors, radius, spacing } from '@/theme/tokens';

export function CodCard({ payment }: { payment: JobPayment }) {
  const { t, language } = useI18n();
  const collect = payment.method === 'cod' && payment.cod_amount !== null && payment.cod_amount > 0;

  return (
    <Card>
      <AppText variant="heading">{t('job.section.payment')}</AppText>
      <View style={styles.row}>
        <Icon name={collect ? 'cash-outline' : 'card-outline'} size={22} color={collect ? colors.accent : colors.success} />
        <AppText variant="bodyStrong">{t(payment.method === 'cod' ? 'job.payment.cod' : 'job.payment.prepaid')}</AppText>
      </View>
      {collect && payment.cod_amount !== null ? (
        <View style={styles.amount}>
          <AppText variant="caption" tone="muted">
            {t('job.payment.collect')}
          </AppText>
          <AppText variant="display" style={{ color: '#A85A10' }}>
            {formatMoney(payment.cod_amount, payment.currency, language)}
          </AppText>
        </View>
      ) : (
        <AppText tone="muted">{t('job.payment.noCollect')}</AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amount: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: spacing.lg, gap: spacing.xs },
});
