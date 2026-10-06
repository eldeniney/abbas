import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/theme/tokens';

export type TextVariant = keyof typeof typography;
export type TextTone = 'default' | 'muted' | 'primary' | 'accent' | 'inverse' | 'success' | 'warning' | 'danger';

const toneColor: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  primary: colors.primary,
  accent: colors.accent,
  inverse: colors.textOnPrimary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

interface Props extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  center?: boolean;
}

/**
 * Native RN treats textAlign 'left' as "start" under RTL, so Arabic aligns
 * right automatically. On web the document `dir` attribute handles it.
 */
const startAlign = Platform.OS === 'web' ? undefined : ('left' as const);

export function AppText({ variant = 'body', tone = 'default', center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        styles.base,
        { color: toneColor[tone], textAlign: center ? 'center' : startAlign },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { writingDirection: 'auto' },
});
