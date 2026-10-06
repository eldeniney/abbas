import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { useI18n, type TranslationKey } from '@/i18n';
import { isBackendNotReady } from '@/services/rider/errors';
import { useReportIssue } from '@/services/rider/queries';
import type { IssueType } from '@/services/rider/types';
import { colors, radius, spacing, touchTarget } from '@/theme/tokens';

const ISSUES: readonly { type: IssueType; label: TranslationKey }[] = [
  { type: 'cannot_find_customer', label: 'issue.cannot_find_customer' },
  { type: 'customer_unavailable', label: 'issue.customer_unavailable' },
  { type: 'merchant_delay', label: 'issue.merchant_delay' },
  { type: 'order_issue', label: 'issue.order_issue' },
  { type: 'vehicle_issue', label: 'issue.vehicle_issue' },
  { type: 'other', label: 'issue.other' },
];

const MAX_NOTE = 500;

interface Props {
  jobId: string;
  visible: boolean;
  onClose: () => void;
}

export function ProblemReportSheet({ jobId, visible, onClose }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<IssueType | null>(null);
  const [note, setNote] = useState('');
  const report = useReportIssue(jobId);

  const close = () => {
    setSelected(null);
    setNote('');
    report.reset();
    onClose();
  };

  const submit = () => {
    if (!selected) return;
    const trimmed = note.trim();
    report.mutate({ issueType: selected, note: trimmed ? trimmed.slice(0, MAX_NOTE) : null });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.flex}>
                <AppText variant="heading">{t('issue.title')}</AppText>
                <AppText variant="caption" tone="muted">
                  {t('issue.subtitle')}
                </AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} hitSlop={12}>
                <Icon name="close" size={26} color={colors.textMuted} />
              </Pressable>
            </View>

            {report.isSuccess ? (
              <View style={styles.result}>
                <Icon name="checkmark-circle" size={48} color={colors.success} />
                <AppText variant="bodyStrong" center>
                  {t('issue.sent')}
                </AppText>
                <OperationalButton label={t('common.close')} onPress={close} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                {ISSUES.map((issue) => {
                  const active = selected === issue.type;
                  return (
                    <Pressable
                      key={issue.type}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => setSelected(issue.type)}
                      style={[styles.option, active && styles.optionActive]}
                    >
                      <Icon
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={active ? colors.primary : colors.textMuted}
                      />
                      <AppText variant="bodyStrong">{t(issue.label)}</AppText>
                    </Pressable>
                  );
                })}
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('issue.notePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={MAX_NOTE}
                  style={styles.input}
                />
                {report.isError ? (
                  <AppText tone="danger" variant="caption">
                    {isBackendNotReady(report.error) ? t('backend.notReady') : t('issue.failed')}
                  </AppText>
                ) : null}
                <OperationalButton
                  label={t('common.send')}
                  onPress={submit}
                  disabled={!selected}
                  loading={report.isPending}
                  size="large"
                  variant="accent"
                />
              </ScrollView>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,22,48,0.4)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  flex: { flex: 1, gap: 2 },
  body: { gap: spacing.sm, paddingBottom: spacing.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  input: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  result: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
});
