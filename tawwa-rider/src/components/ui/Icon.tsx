import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { useI18n } from '@/i18n';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  name: IconName;
  size?: number;
  color: ColorValue;
  /** Mirror arrows/chevrons in RTL. */
  directional?: boolean;
}

export function Icon({ name, size = 22, color, directional }: Props) {
  const { isRTL } = useI18n();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={directional && isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
