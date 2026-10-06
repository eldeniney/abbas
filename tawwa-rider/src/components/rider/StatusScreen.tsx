import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  icon: IconName;
  tone: 'info' | 'warning' | 'danger';
  title: string;
  body: string;
  onRetry?: () => void;
  onSignOut?: () => void;
}

const tones = {
  info: { bg: colors.primarySoft, fg: colors.primary },
  warning: { bg: colors.accentSoft, fg: colors.accent },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
} as const;

/** Full-screen account state (pending, suspended, …). Operational screens stay unreachable. */
export function StatusScreen({ icon, tone, title, body, onRetry, onSignOut }: Props) {
  const { t } = useI18n();
  const c = tones[tone];
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: c.bg }]}>
          <Icon name={icon} size={44} color={c.fg} />
        </View>
        <AppText variant="title" center>
          {title}
        </AppText>
        <AppText tone="muted" center>
          {body}
        </AppText>
      </View>
      <View style={styles.actions}>
        {onRetry ? <OperationalButton label={t('common.retry')} onPress={onRetry} size="large" icon="refresh" /> : null}
        {onSignOut ? (
          <OperationalButton label={t('common.signOut')} onPress={onSignOut} variant="ghost" icon="log-out-outline" />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  icon: { width: 96, height: 96, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: spacing.sm },
});
