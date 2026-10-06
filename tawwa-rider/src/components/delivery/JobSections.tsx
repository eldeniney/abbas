import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { InfoRow } from '@/components/ui/InfoRow';
import { currentLeg } from '@/features/delivery/stateMachine';
import { useI18n } from '@/i18n';
import type { JobDetails } from '@/services/rider/types';
import { colors, spacing } from '@/theme/tokens';

import { ContactButton } from './ContactButton';
import { NavigationButton } from './NavigationButton';

function SectionTitle({ icon, title, active }: { icon: 'storefront-outline' | 'location-outline' | 'list-outline'; title: string; active?: boolean }) {
  return (
    <View style={styles.titleRow}>
      <Icon name={icon} size={22} color={active ? colors.accent : colors.primary} />
      <AppText variant="heading" style={styles.flex}>
        {title}
      </AppText>
    </View>
  );
}

export function PickupSection({ job }: { job: JobDetails }) {
  const { t } = useI18n();
  const active = currentLeg(job.status) === 'pickup';
  return (
    <Card style={active ? styles.activeCard : undefined}>
      <SectionTitle icon="storefront-outline" title={t('job.section.pickup')} active={active} />
      <InfoRow label={t('job.merchant')} value={job.pickup.merchant_name} />
      <InfoRow label={t('job.branch')} value={job.pickup.branch_name} />
      <InfoRow label={t('job.address')} value={job.pickup.address} />
      {active ? (
        <View style={styles.actions}>
          <NavigationButton
            label={t('job.navigateToMerchant')}
            target={job.pickup.location}
            mode={job.delivery_mode}
            placeLabel={job.pickup.merchant_name}
          />
          <ContactButton phone={job.pickup.phone} />
        </View>
      ) : null}
    </Card>
  );
}

export function DropoffSection({ job }: { job: JobDetails }) {
  const { t } = useI18n();
  const active = currentLeg(job.status) === 'dropoff';
  const { dropoff } = job;
  return (
    <Card style={active ? styles.activeCard : undefined}>
      <SectionTitle icon="location-outline" title={t('job.section.dropoff')} active={active} />
      <InfoRow label={t('job.area')} value={dropoff.area} />
      {dropoff.customer_name ? <InfoRow label={t('job.customer')} value={dropoff.customer_name} /> : null}
      {dropoff.address ? <InfoRow label={t('job.address')} value={dropoff.address} /> : null}
      {dropoff.landmark ? <InfoRow label={t('job.landmark')} value={dropoff.landmark} /> : null}
      {dropoff.instructions ? <InfoRow label={t('job.instructions')} value={dropoff.instructions} /> : null}
      {!dropoff.address && !dropoff.location ? (
        <View style={styles.notice}>
          <Icon name="lock-closed-outline" size={16} color={colors.textMuted} />
          <AppText variant="caption" tone="muted" style={styles.flex}>
            {t('job.exactHidden')}
          </AppText>
        </View>
      ) : null}
      {active ? (
        <View style={styles.actions}>
          <NavigationButton
            label={t('job.navigateToCustomer')}
            target={dropoff.location}
            mode={job.delivery_mode}
            placeLabel={dropoff.area ?? undefined}
          />
          <ContactButton phone={dropoff.phone} />
        </View>
      ) : null}
    </Card>
  );
}

export function ItemsSection({ job }: { job: JobDetails }) {
  const { t } = useI18n();
  if (job.items.length === 0) return null;
  const count = job.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Card>
      <SectionTitle icon="list-outline" title={t('job.section.items')} />
      <AppText variant="caption" tone="muted">
        {t('job.itemsCount', { count })}
      </AppText>
      {job.items.map((item, i) => (
        <View key={`${item.name}-${i}`} style={styles.item}>
          <AppText variant="bodyStrong" tone="primary">
            {item.quantity}×
          </AppText>
          <AppText style={styles.flex}>{item.name}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  activeCard: { borderColor: colors.accent, borderWidth: 2 },
  actions: { gap: spacing.sm },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
});
