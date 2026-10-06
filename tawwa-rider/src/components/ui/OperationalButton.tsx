import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, touchTarget } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'large' | 'regular';
  icon?: IconName;
  iconDirectional?: boolean;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

const palette: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.textOnPrimary },
  accent: { bg: colors.accent, pressed: '#D97A1C', fg: colors.textOnPrimary },
  secondary: { bg: colors.surface, pressed: colors.primarySoft, fg: colors.primary, border: colors.primary },
  danger: { bg: colors.dangerSoft, pressed: '#F6CFCB', fg: colors.danger },
  ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.primary },
};

/** Large, high-contrast button sized for outdoor one-handed use. */
export function OperationalButton({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  iconDirectional,
  loading,
  disabled,
  accessibilityHint,
}: Props) {
  const p = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: size === 'large' ? touchTarget.primary : touchTarget.min },
        { backgroundColor: pressed ? p.pressed : p.bg },
        p.border ? { borderWidth: 1.5, borderColor: p.border } : null,
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : icon ? (
          <Icon name={icon} color={p.fg} size={size === 'large' ? 24 : 20} directional={iconDirectional} />
        ) : null}
        <AppText variant="button" style={{ color: p.fg }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inactive: { opacity: 0.5 },
});
