import { Alert, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { actionLabelKey } from '@/features/delivery/labels';
import { primaryAction, type ProgressAction } from '@/features/delivery/stateMachine';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { riderErrorCode } from '@/services/rider/errors';
import { useJobTransition, type JobTransition } from '@/services/rider/queries';
import type { JobDetails } from '@/services/rider/types';
import { colors, spacing } from '@/theme/tokens';

function confirm(title: string, body: string, ok: string, cancel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${body}`) ?? false);
  return new Promise((resolve) => {
    Alert.alert(title, body, [
      { text: cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: ok, onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Sticky primary CTA. Only the next valid step that the backend also lists in
 * allowed_actions is ever rendered; nothing is rendered otherwise.
 */
export function JobActionBar({ job, disabled }: { job: JobDetails; disabled: boolean }) {
  const { t, language } = useI18n();
  const transition = useJobTransition(job.job_id);
  const action = primaryAction(job.status, job.allowed_actions);
  if (!action) return null;

  const codAmount = job.payment.method === 'cod' ? job.payment.cod_amount : null;

  const run = async (a: ProgressAction) => {
    let request: JobTransition;
    if (a === 'complete') {
      const body =
        codAmount !== null
          ? t('action.confirm.complete.cod', { amount: formatMoney(codAmount, job.payment.currency, language) })
          : t('action.confirm.complete.body');
      const ok = await confirm(t('action.confirm.complete.title'), body, t('action.complete'), t('common.cancel'));
      if (!ok) return;
      request = { action: 'complete', codCollected: codAmount };
    } else {
      request = { action: a };
    }
    transition.mutate(request);
  };

  const code = riderErrorCode(transition.error);
  const errorText =
    code === 'BACKEND_NOT_READY'
      ? t('backend.notReady')
      : code === 'INVALID_TRANSITION' || code === 'FORBIDDEN'
        ? t('job.actionRejected')
        : transition.isError
          ? t('job.actionError')
          : null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      {errorText ? (
        <AppText variant="caption" tone="danger" center>
          {errorText}
        </AppText>
      ) : null}
      <View>
        <OperationalButton
          label={t(actionLabelKey[action])}
          onPress={() => void run(action)}
          loading={transition.isPending}
          disabled={disabled}
          size="large"
          variant={action === 'accept' || action === 'complete' ? 'accent' : 'primary'}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
});
