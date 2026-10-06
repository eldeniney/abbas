import { useState } from 'react';

import { OperationalButton, type ButtonVariant } from '@/components/ui/OperationalButton';
import { openNavigation } from '@/features/maps/openNavigation';
import type { Coordinates, VehicleType } from '@/services/rider/types';

interface Props {
  label: string;
  target: Coordinates | null;
  mode: VehicleType | null;
  placeLabel?: string;
  variant?: ButtonVariant;
}

/** Opens the device's maps app. Disabled until the backend reveals coordinates. */
export function NavigationButton({ label, target, mode, placeLabel, variant = 'secondary' }: Props) {
  const [opening, setOpening] = useState(false);
  return (
    <OperationalButton
      label={label}
      icon="navigate-outline"
      variant={variant}
      disabled={!target}
      loading={opening}
      onPress={() => {
        if (!target) return;
        setOpening(true);
        void openNavigation(target, mode, placeLabel).finally(() => setOpening(false));
      }}
    />
  );
}
