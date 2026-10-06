import { Linking, Platform } from 'react-native';

import type { Coordinates, VehicleType } from '@/services/rider/types';

/**
 * Hands navigation to the installed maps app — Tawwa does not do
 * turn-by-turn itself. Coordinates come from the backend and are only
 * present once the rider is permitted to see them.
 */
export async function openNavigation(target: Coordinates, mode: VehicleType | null, label?: string): Promise<boolean> {
  const dest = `${target.lat},${target.lng}`;
  const travel = mode === 'bicycle' ? 'bicycling' : 'driving';

  const candidates: string[] = [];
  if (Platform.OS === 'android') {
    // 'b' = bicycling, 'l' = two-wheeler (motorcycle) in Google Maps navigation.
    candidates.push(`google.navigation:q=${dest}&mode=${mode === 'bicycle' ? 'b' : 'l'}`);
  } else if (Platform.OS === 'ios') {
    candidates.push(`comgooglemaps://?daddr=${dest}&directionsmode=${travel}`);
    const q = label ? `&q=${encodeURIComponent(label)}` : '';
    candidates.push(`maps://?daddr=${dest}&dirflg=${mode === 'bicycle' ? 'c' : 'd'}${q}`);
  }
  candidates.push(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=${travel}`);

  for (const url of candidates) {
    try {
      // openURL rejects when no app handles the scheme, so no canOpenURL /
      // LSApplicationQueriesSchemes / Android <queries> entries are needed.
      await Linking.openURL(url);
      return true;
    } catch {
      // try the next handler
    }
  }
  return false;
}

export async function callPhone(phone: string): Promise<boolean> {
  const url = `tel:${phone.replace(/[^\d+]/g, '')}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
