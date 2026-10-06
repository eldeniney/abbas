import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { OperationalButton } from '@/components/ui/OperationalButton';
import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  icon: IconName;
  title: string;
  body?: string;
  tone?: 'neutral' | 'pending' | 'danger';
  actionLabel?: string;
  onAction?: () => void;
}

const toneColors = {
  neutral: { bg: colors.primarySoft, fg: colors.primary },
  pending: { bg: colors.accentSoft, fg: colors.accent },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
} as const;

export function EmptyOperationalState({ icon, title, body, tone = 'neutral', actionLabel, onAction }: Props) {
  const c = toneColors[tone];
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
        <Icon name={icon} size={32} color={c.fg} />
      </View>
      <AppText variant="heading" center>
        {title}
      </AppText>
      {body ? (
        <AppText tone="muted" center>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <OperationalButton label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconWrap: { width: 72, height: 72, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});
