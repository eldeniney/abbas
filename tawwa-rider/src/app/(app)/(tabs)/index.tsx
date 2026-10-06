import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActiveJobCard } from '@/components/delivery/ActiveJobCard';
import { BackendPendingBanner } from '@/components/rider/BackendPendingBanner';
import { EmptyOperationalState } from '@/components/rider/EmptyOperationalState';
import { LocationPermissionCard } from '@/components/rider/LocationPermissionCard';
import { RiderStatusToggle } from '@/components/rider/RiderStatusToggle';
import { VehicleBadge } from '@/components/rider/VehicleBadge';
import { ZoneBadge } from '@/components/rider/ZoneBadge';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useRider } from '@/features/rider/RiderProvider';
import { useOnlineToggle } from '@/features/rider/useOnlineToggle';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const { t } = useI18n();
  const { context, backendPending, activeJob, publisherState, refetch } = useRider();
  const online = useOnlineToggle();

  const name = context?.full_name?.split(' ')[0];

  return (
    <Screen onRefresh={refetch} refreshing={false}>
      <View style={styles.header}>
        <AppText variant="title">{name ? t('home.greeting', { name }) : t('home.greetingNoName')}</AppText>
        {context ? (
          <View style={styles.badges}>
            <ZoneBadge zone={context.zone} />
            <VehicleBadge vehicle={context.vehicle_type} />
          </View>
        ) : null}
      </View>

      {backendPending ? <BackendPendingBanner /> : null}

      <RiderStatusToggle
        isOnline={online.isOnline}
        pendingTarget={online.pendingTarget}
        disabled={!online.canToggle}
        onToggle={() => void online.toggle()}
      />

      {online.failed ? (
        <AppText tone="danger" variant="caption">
          {t('status.error')}
        </AppText>
      ) : null}

      {online.showLocationPrompt && online.readiness && online.readiness !== 'ready' ? (
        <LocationPermissionCard readiness={online.readiness} onRequest={() => void online.requestLocation()} />
      ) : null}

      {online.isOnline && (publisherState === 'publishing' || publisherState === 'retrying') ? (
        <View style={styles.publisher}>
          <Icon
            name={publisherState === 'publishing' ? 'radio-outline' : 'warning-outline'}
            size={16}
            color={publisherState === 'publishing' ? colors.success : colors.warning}
          />
          <AppText variant="caption" tone={publisherState === 'publishing' ? 'success' : 'warning'}>
            {t(publisherState === 'publishing' ? 'location.publishing' : 'location.publishFailed')}
          </AppText>
        </View>
      ) : null}

      {activeJob ? (
        <>
          {!online.isOnline ? (
            <AppText variant="caption" tone="muted">
              {t('status.offlineWithActiveJob')}
            </AppText>
          ) : null}
          <ActiveJobCard job={activeJob} onContinue={() => router.push(`/job/${activeJob.job_id}`)} />
        </>
      ) : backendPending ? (
        <Card>
          <EmptyOperationalState
            icon="construct-outline"
            tone="pending"
            title={t('gate.backendPending.title')}
            body={t('gate.backendPending.body')}
          />
        </Card>
      ) : (
        <Card>
          <EmptyOperationalState
            icon={online.isOnline ? 'search-outline' : 'moon-outline'}
            title={t(online.isOnline ? 'home.waiting.title' : 'home.offline.title')}
            body={t(online.isOnline ? 'home.waiting.body' : 'home.offline.body')}
          />
        </Card>
      )}

      <Card tone="muted">
        <View style={styles.statRow}>
          <Icon name="checkmark-done-outline" size={22} color={colors.primary} />
          <AppText variant="bodyStrong" style={styles.flex}>
            {t('home.today')}
          </AppText>
          {context?.today_completed_count !== null && context?.today_completed_count !== undefined ? (
            <AppText variant="title" tone="primary">
              {context.today_completed_count}
            </AppText>
          ) : null}
        </View>
        {context?.today_completed_count === null || !context ? (
          <AppText variant="caption" tone="muted">
            {t('home.todayUnavailable')}
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  publisher: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
