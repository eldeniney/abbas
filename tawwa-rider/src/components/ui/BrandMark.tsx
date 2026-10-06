import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { Icon } from './Icon';

/**
 * Single swap point for the Tawwa logo. Replace the icon with
 * <Image source={require('@/../assets/tawwa-logo.png')} /> once the brand
 * asset from the Customer App is copied into /assets.
 */
export function BrandMark({ size = 80 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size }]}>
      <Icon name="bicycle" size={size / 2} color={colors.textOnPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
