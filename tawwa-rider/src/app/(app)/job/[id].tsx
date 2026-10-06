import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { CodCard } from '@/components/delivery/CodCard';
import { DeliveryStatusStepper } from '@/components/delivery/DeliveryStatusStepper';
import { JobActionBar } from '@/components/delivery/JobActionBar';
import { DropoffSection, ItemsSection, PickupSection } from '@/components/delivery/JobSections';
import { ProblemReportSheet } from '@/components/delivery/ProblemReportSheet';
import { BackendPendingBanner } from '@/components/rider/BackendPendingBanner';
import { EmptyOperationalState } from '@/components/rider/EmptyOperationalState';
import { VehicleBadge } from '@/components/rider/VehicleBadge';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { Pill } from '@/components/ui/Pill';
import { hintLabelKey, statusLabelKey, statusTone } from '@/features/delivery/labels';
import { canReportIssue, isTerminal, nextStepHint } from '@/features/delivery/stateMachine';
import { useRider } from '@/features/rider/RiderProvider';
import { useI18n, type TranslationKey } from '@/i18n';
import { isBackendNotReady, riderErrorCode } from '@/services/rider/errors';
import { useJobDetails } from '@/services/rider/queries';
import type { DeliveryStatus } from '@/services/rider/types';
import { colors, spacing } from '@/theme/tokens';

const terminalCopy: Partial<Record<DeliveryStatus, TranslationKey>> = {
  delivered: 'job.terminal.delivered',
  cancelled: 'job.terminal.cancelled',
  failed: 'job.terminal.failed',
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : '';
  const { t } = useI18n();
  const { operational, backendPending } = useRider();
  const query = useJobDetails(jobId, operational);
  const [reporting, setReporting] = useState(false);

  if (backendPending) {
    return (
      <View style={styles.screen}>
        <View style={styles.pad}>
          <BackendPendingBanner />
          <EmptyOperationalState icon="construct-outline" tone="pending" title={t('backend.notReady.short')} body={t('backend.notReady')} />
        </View>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    const code = riderErrorCode(query.error);
    return (
      <View style={styles.screen}>
        <View style={styles.pad}>
          <EmptyOperationalState
            icon={code === 'NOT_FOUND' || code === 'FORBIDDEN' ? 'lock-closed-outline' : 'cloud-offline-outline'}
            tone={isBackendNotReady(query.error) ? 'pending' : 'danger'}
            title={
              isBackendNotReady(query.error)
                ? t('backend.notReady.short')
                : code === 'NOT_FOUND' || code === 'FORBIDDEN'
                  ? t('job.notFound')
                  : t('job.loadError')
            }
            actionLabel={code === 'NOT_FOUND' || code === 'FORBIDDEN' ? undefined : t('common.retry')}
            onAction={() => void query.refetch()}
          />
        </View>
      </View>
    );
  }

  const job = query.data;
  const terminal = isTerminal(job.status);
  const terminalKey = terminalCopy[job.status];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.headerRow}>
            <AppText variant="heading" style={styles.flex}>
              {t('job.order', { ref: job.order_reference })}
            </AppText>
            <Pill label={t(statusLabelKey[job.status])} tone={statusTone[job.status]} />
          </View>
          <DeliveryStatusStepper status={job.status} />
          {terminal && terminalKey ? (
            <AppText variant="bodyStrong" tone={job.status === 'delivered' ? 'success' : 'muted'}>
              {t(terminalKey)}
            </AppText>
          ) : (
            <AppText variant="bodyStrong" tone="primary">
              {t(hintLabelKey[nextStepHint(job.status)])}
            </AppText>
          )}
          <View style={styles.headerRow}>
            <AppText variant="caption" tone="muted">
              {t('job.deliveryMode')}
            </AppText>
            <VehicleBadge vehicle={job.delivery_mode} />
          </View>
        </Card>

        <PickupSection job={job} />
        <ItemsSection job={job} />
        <DropoffSection job={job} />
        <CodCard payment={job.payment} />

        {canReportIssue(job.status, job.allowed_actions) ? (
          <OperationalButton
            label={t('job.section.problems')}
            icon="alert-circle-outline"
            variant="danger"
            onPress={() => setReporting(true)}
          />
        ) : null}
      </ScrollView>

      {!terminal ? <JobActionBar job={job} disabled={!operational} /> : null}
      <ProblemReportSheet jobId={job.job_id} visible={reporting} onClose={() => setReporting(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  pad: { padding: spacing.lg, gap: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  flex: { flex: 1 },
});
