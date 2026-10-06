import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DeliveryCard } from '@/components/delivery/DeliveryCard';
import { BackendPendingBanner } from '@/components/rider/BackendPendingBanner';
import { EmptyOperationalState } from '@/components/rider/EmptyOperationalState';
import { RemoteState } from '@/components/rider/RemoteState';
import { AppText } from '@/components/ui/AppText';
import type { IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useRider } from '@/features/rider/RiderProvider';
import { useI18n, type TranslationKey } from '@/i18n';
import { useAvailableJobs, useHistory } from '@/services/rider/queries';
import type { JobSummary } from '@/services/rider/types';
import { spacing } from '@/theme/tokens';

type Section = 'active' | 'available' | 'completed';

const emptyCopy: Record<Section, { icon: IconName; title: TranslationKey; body: TranslationKey }> = {
  active: { icon: 'bicycle-outline', title: 'deliveries.empty.active.title', body: 'deliveries.empty.active.body' },
  available: { icon: 'file-tray-outline', title: 'deliveries.empty.available.title', body: 'deliveries.empty.available.body' },
  completed: { icon: 'time-outline', title: 'deliveries.empty.completed.title', body: 'deliveries.empty.completed.body' },
};

export default function DeliveriesScreen() {
  const { t } = useI18n();
  const { operational, backendPending, context, activeJob, activeJobLoading, refetch } = useRider();
  const [section, setSection] = useState<Section>('active');

  const isOnline = context?.is_online ?? false;
  const available = useAvailableJobs(operational && isOnline && section === 'available');
  const history = useHistory(operational && section === 'completed');

  const open = (job: JobSummary) => router.push(`/job/${job.job_id}`);

  const renderList = (jobs: JobSummary[]) =>
    jobs.length === 0 ? (
      <EmptyOperationalState icon={emptyCopy[section].icon} title={t(emptyCopy[section].title)} body={t(emptyCopy[section].body)} />
    ) : (
      <View style={{ gap: spacing.md }}>
        {jobs.map((job) => (
          <DeliveryCard key={job.job_id} job={job} onPress={() => open(job)} />
        ))}
      </View>
    );

  const renderBody = () => {
    if (backendPending) {
      return (
        <EmptyOperationalState icon="construct-outline" tone="pending" title={t('backend.notReady.short')} body={t('backend.notReady')} />
      );
    }
    switch (section) {
      case 'active':
        if (activeJobLoading) return <RemoteState isLoading error={null} onRetry={refetch} />;
        return renderList(activeJob ? [activeJob] : []);
      case 'available':
        if (!isOnline) {
          return (
            <EmptyOperationalState
              icon="moon-outline"
              title={t('deliveries.empty.available.title')}
              body={t('deliveries.empty.available.offline')}
            />
          );
        }
        if (available.isLoading || available.error) {
          return <RemoteState isLoading={available.isLoading} error={available.error} onRetry={() => void available.refetch()} />;
        }
        return renderList(available.data ?? []);
      case 'completed':
        if (history.isLoading || history.error) {
          return <RemoteState isLoading={history.isLoading} error={history.error} onRetry={() => void history.refetch()} />;
        }
        return renderList(history.data ?? []);
    }
  };

  return (
    <Screen
      onRefresh={() => {
        refetch();
        if (section === 'available') void available.refetch();
        if (section === 'completed') void history.refetch();
      }}
      refreshing={false}
    >
      <AppText variant="title">{t('deliveries.title')}</AppText>
      {backendPending ? <BackendPendingBanner /> : null}
      <SegmentedControl
        value={section}
        onChange={setSection}
        options={[
          { value: 'active', label: t('deliveries.tab.active') },
          { value: 'available', label: t('deliveries.tab.available') },
          { value: 'completed', label: t('deliveries.tab.completed') },
        ]}
      />
      {renderBody()}
    </Screen>
  );
}
