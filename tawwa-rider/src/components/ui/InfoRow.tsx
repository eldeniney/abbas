import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface Props {
  label: string;
  value: string | null;
  icon?: IconName;
  fallback?: string;
}

export function InfoRow({ label, value, icon, fallback = '—' }: Props) {
  return (
    <View style={styles.row}>
      {icon ? <Icon name={icon} size={20} color={colors.textMuted} /> : null}
      <View style={styles.text}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText variant="bodyStrong">{value ?? fallback}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  text: { flex: 1, gap: 2 },
});
