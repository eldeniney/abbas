import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { StatusScreen } from '@/components/rider/StatusScreen';
import { useAuth } from '@/features/auth/AuthProvider';
import type { BlockReason } from '@/features/rider/gate';
import { RiderProvider, useRider } from '@/features/rider/RiderProvider';
import { useI18n, type TranslationKey } from '@/i18n';
import { colors } from '@/theme/tokens';

const blockCopy: Record<BlockReason, { title: TranslationKey; body: TranslationKey; tone: 'info' | 'warning' | 'danger' }> = {
  pending_approval: { title: 'gate.pending.title', body: 'gate.pending.body', tone: 'info' },
  rejected: { title: 'gate.rejected.title', body: 'gate.rejected.body', tone: 'danger' },
  suspended: { title: 'gate.suspended.title', body: 'gate.suspended.body', tone: 'danger' },
  inactive: { title: 'gate.inactive.title', body: 'gate.inactive.body', tone: 'warning' },
  no_zone: { title: 'gate.noZone.title', body: 'gate.noZone.body', tone: 'warning' },
  no_vehicle: { title: 'gate.noVehicle.title', body: 'gate.noVehicle.body', tone: 'warning' },
};

/**
 * Rider gate. Operational screens mount only for an approved rider with a
 * zone and vehicle, or in "backend pending" mode where every screen renders
 * without data and every action is disabled.
 */
function RiderGate() {
  const { gate, refetch } = useRider();
  const { signOut } = useAuth();
  const { t } = useI18n();

  switch (gate.kind) {
    case 'loading':
      return (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    case 'error':
      return (
        <StatusScreen
          icon="cloud-offline-outline"
          tone="warning"
          title={t('gate.error.title')}
          body={t('gate.error.body')}
          onRetry={refetch}
          onSignOut={() => void signOut()}
        />
      );
    case 'no_profile':
      return (
        <StatusScreen
          icon="person-remove-outline"
          tone="danger"
          title={t('gate.noProfile.title')}
          body={t('gate.noProfile.body')}
          onSignOut={() => void signOut()}
        />
      );
    case 'blocked': {
      const copy = blockCopy[gate.reason];
      return (
        <StatusScreen
          icon={gate.reason === 'pending_approval' ? 'hourglass-outline' : 'alert-circle-outline'}
          tone={copy.tone}
          title={t(copy.title)}
          body={t(copy.body)}
          onRetry={refetch}
          onSignOut={() => void signOut()}
        />
      );
    }
    case 'ready':
    case 'backend_pending':
      return (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="job/[id]"
            options={{
              headerShown: true,
              title: t('job.title'),
              headerTintColor: colors.primary,
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
            }}
          />
        </Stack>
      );
  }
}

export default function AppLayout() {
  return (
    <RiderProvider>
      <RiderGate />
    </RiderProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
