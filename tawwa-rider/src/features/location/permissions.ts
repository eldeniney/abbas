import * as Location from 'expo-location';
import { Linking } from 'react-native';

export type LocationReadiness =
  | 'ready'
  | 'undetermined'
  /** Denied but the OS will show the prompt again. */
  | 'denied'
  /** Denied permanently — only the Settings app can fix it. */
  | 'blocked'
  | 'services_disabled';

export async function getLocationReadiness(): Promise<LocationReadiness> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    if (permission.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
    return permission.canAskAgain ? 'denied' : 'blocked';
  }
  const servicesOn = await Location.hasServicesEnabledAsync();
  return servicesOn ? 'ready' : 'services_disabled';
}

/** Foreground ("while using the app") only — background needs a dev build and a separate review. */
export async function requestLocationReadiness(): Promise<LocationReadiness> {
  const current = await getLocationReadiness();
  if (current !== 'undetermined' && current !== 'denied') return current;
  await Location.requestForegroundPermissionsAsync();
  return getLocationReadiness();
}

export interface CurrentFix {
  lat: number;
  lng: number;
  accuracy_m: number | null;
}

export async function getCurrentFix(): Promise<CurrentFix> {
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy_m: position.coords.accuracy,
  };
}

export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}
