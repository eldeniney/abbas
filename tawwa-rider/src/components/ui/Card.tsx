import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme/tokens';

interface Props extends ViewProps {
  tone?: 'default' | 'primary' | 'muted';
}

export function Card({ tone = 'default', style, ...rest }: Props) {
  return <View {...rest} style={[styles.base, toneStyles[tone], style]} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});

const toneStyles = StyleSheet.create({
  default: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  primary: { backgroundColor: colors.primary },
  muted: { backgroundColor: colors.surfaceMuted },
});
